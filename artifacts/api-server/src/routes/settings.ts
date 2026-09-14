import { Router } from "express";
import { sbSelect, sbUpdate, sbInsert } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

const DEFAULT_SETTINGS = {
  platformFee: 10,
  cancellationNoticePeriodHours: 24,
  cancellationPenaltyFee: 50,
  reminderCadence: "daily",
  gatewayPassword: "0000",
  inactivityTimeoutMinutes: 5,
  globalTelebirrNumber: "",
  globalTelebirrName: "",
  globalCbeNumber: "",
  globalCbeName: "",
};

router.get("/settings", async (req, res) => {
  try {
    const rows = await sbSelect("settings", "?limit=1");
    if (!rows.length) {
      const created = await sbInsert("settings", toSettingsRow(DEFAULT_SETTINGS));
      return res.json(created ?? DEFAULT_SETTINGS);
    }
    res.json(normalizeSettings(rows[0]));
  } catch (err) {
    req.log.error({ err }, "GET /settings failed");
    // Return defaults on error so the app can still start
    res.json(DEFAULT_SETTINGS);
  }
});

router.get("/settings/payment-methods", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const rows = await sbSelect("settings", "?limit=1");
    const settings = rows.length ? normalizeSettings(rows[0]) : DEFAULT_SETTINGS;
    res.json({
      global_telebirr_number: settings.globalTelebirrNumber,
      global_telebirr_name: settings.globalTelebirrName,
      global_cbe_number: settings.globalCbeNumber,
      global_cbe_name: settings.globalCbeName,
    });
  } catch (err) {
    req.log.error({ err }, "GET /settings/payment-methods failed");
    res.status(503).json({ error: "Payment methods are temporarily unavailable" });
  }
});

router.put("/settings", async (req, res) => {
  const paymentSettings = validatePaymentSettings(req.body);
  if ("error" in paymentSettings) {
    return res.status(400).json({ error: paymentSettings.error });
  }

  try {
    const rows = await sbSelect("settings", "?limit=1");
    const payload = toSettingsRow({ ...req.body, ...paymentSettings });
    let updated: any;
    if (rows.length) {
      updated = await sbUpdate("settings", `id=eq.${rows[0].id}`, payload);
    } else {
      updated = await sbInsert("settings", toSettingsRow({ ...DEFAULT_SETTINGS, ...req.body }));
    }
    await writeAudit("updated platform settings", "settings");
    res.json(normalizeSettings(updated));
  } catch (err) {
    req.log.error({ err }, "PUT /settings failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/settings/gateway-password", async (req, res) => {
  const { password } = req.body as { password: string };
  if (!password || password.length < 4) return res.status(400).json({ error: "Password too short" });
  try {
    const rows = await sbSelect("settings", "?limit=1");
    if (!rows.length) return res.status(404).json({ error: "Settings not found" });
    const updated = await sbUpdate("settings", `id=eq.${rows[0].id}`, { gatewayPassword: password });
    await writeAudit("changed gateway password", "settings");
    res.json({ success: true, settings: normalizeSettings(updated) });
  } catch (err) {
    req.log.error({ err }, "PATCH /settings/gateway-password failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeSettings(row: any) {
  return {
    id: row.id,
    platformFee: row.fixedPlatformFee ?? row.platformFee ?? DEFAULT_SETTINGS.platformFee,
    cancellationNoticePeriodHours: row.noticePeriodHours ?? row.cancellationNoticePeriodHours ?? DEFAULT_SETTINGS.cancellationNoticePeriodHours,
    cancellationPenaltyFee: row.penaltyFee ?? row.cancellationPenaltyFee ?? DEFAULT_SETTINGS.cancellationPenaltyFee,
    reminderCadence: row.reminderCadence ?? DEFAULT_SETTINGS.reminderCadence,
    gatewayPassword: row.gatewayPassword ?? DEFAULT_SETTINGS.gatewayPassword,
    inactivityTimeoutMinutes: row.inactivityTimeoutMinutes ?? DEFAULT_SETTINGS.inactivityTimeoutMinutes,
    globalTelebirrNumber: row.globalTelebirrNumber ?? DEFAULT_SETTINGS.globalTelebirrNumber,
    globalTelebirrName: row.globalTelebirrName ?? DEFAULT_SETTINGS.globalTelebirrName,
    globalCbeNumber: row.globalCbeNumber ?? DEFAULT_SETTINGS.globalCbeNumber,
    globalCbeName: row.globalCbeName ?? DEFAULT_SETTINGS.globalCbeName,
  };
}

function toSettingsRow(settings: Partial<typeof DEFAULT_SETTINGS>) {
  return removeUndefined({
    fixedPlatformFee: settings.platformFee,
    noticePeriodHours: settings.cancellationNoticePeriodHours,
    penaltyFee: settings.cancellationPenaltyFee,
    reminderCadence: settings.reminderCadence,
    gatewayPassword: settings.gatewayPassword,
    inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
    globalTelebirrNumber: settings.globalTelebirrNumber,
    globalTelebirrName: settings.globalTelebirrName,
    globalCbeNumber: settings.globalCbeNumber,
    globalCbeName: settings.globalCbeName,
  });
}

type PaymentSettings = Pick<
  typeof DEFAULT_SETTINGS,
  "globalTelebirrNumber" | "globalTelebirrName" | "globalCbeNumber" | "globalCbeName"
>;

function validatePaymentSettings(body: any): Partial<PaymentSettings> | { error: string } {
  const values: Partial<PaymentSettings> = {};
  const fields = [
    "globalTelebirrNumber",
    "globalTelebirrName",
    "globalCbeNumber",
    "globalCbeName",
  ] as const;

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body ?? {}, field)) {
      values[field] = cleanText(body[field]);
    }
  }

  if (Object.values(values).some((value) => value.length > 100)) {
    return { error: "Payment account fields must be 100 characters or fewer." };
  }
  const hasTelebirrUpdate = "globalTelebirrNumber" in values || "globalTelebirrName" in values;
  if (hasTelebirrUpdate && (!("globalTelebirrNumber" in values) || !("globalTelebirrName" in values))) {
    return { error: "Telebirr account number and account name must be updated together." };
  }
  if (hasTelebirrUpdate && !!values.globalTelebirrNumber !== !!values.globalTelebirrName) {
    return { error: "Telebirr account number and account name must both be provided." };
  }
  const hasCbeUpdate = "globalCbeNumber" in values || "globalCbeName" in values;
  if (hasCbeUpdate && (!("globalCbeNumber" in values) || !("globalCbeName" in values))) {
    return { error: "CBE account number and account name must be updated together." };
  }
  if (hasCbeUpdate && !!values.globalCbeNumber !== !!values.globalCbeName) {
    return { error: "CBE account number and account name must both be provided." };
  }
  return values;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

export default router;
