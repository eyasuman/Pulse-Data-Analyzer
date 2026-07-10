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
};

router.get("/settings", async (req, res) => {
  try {
    const rows = await sbSelect("platformSettings", "?limit=1");
    if (!rows.length) {
      // Seed defaults if table is empty
      const created = await sbInsert("platformSettings", DEFAULT_SETTINGS);
      return res.json(created ?? DEFAULT_SETTINGS);
    }
    res.json(normalizeSettings(rows[0]));
  } catch (err) {
    req.log.error({ err }, "GET /settings failed");
    // Return defaults on error so the app can still start
    res.json(DEFAULT_SETTINGS);
  }
});

router.put("/settings", async (req, res) => {
  try {
    const rows = await sbSelect("platformSettings", "?limit=1");
    let updated: any;
    if (rows.length) {
      updated = await sbUpdate("platformSettings", `id=eq.${rows[0].id}`, { ...req.body });
    } else {
      updated = await sbInsert("platformSettings", { ...DEFAULT_SETTINGS, ...req.body });
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
    const rows = await sbSelect("platformSettings", "?limit=1");
    if (!rows.length) return res.status(404).json({ error: "Settings not found" });
    const updated = await sbUpdate("platformSettings", `id=eq.${rows[0].id}`, { gatewayPassword: password });
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
    platformFee: row.platformFee ?? DEFAULT_SETTINGS.platformFee,
    cancellationNoticePeriodHours: row.cancellationNoticePeriodHours ?? DEFAULT_SETTINGS.cancellationNoticePeriodHours,
    cancellationPenaltyFee: row.cancellationPenaltyFee ?? DEFAULT_SETTINGS.cancellationPenaltyFee,
    reminderCadence: row.reminderCadence ?? DEFAULT_SETTINGS.reminderCadence,
    gatewayPassword: row.gatewayPassword ?? DEFAULT_SETTINGS.gatewayPassword,
    inactivityTimeoutMinutes: row.inactivityTimeoutMinutes ?? DEFAULT_SETTINGS.inactivityTimeoutMinutes,
  };
}

export default router;
