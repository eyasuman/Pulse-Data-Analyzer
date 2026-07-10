import { Router } from "express";
import { sbSelect, sbUpdate } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/providers", async (req, res) => {
  try {
    const rows = await sbSelect("providers", "?order=createdAt.desc");
    res.json(rows.map(normalizeProvider));
  } catch (err) {
    req.log.error({ err }, "GET /providers failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/providers/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const valid = ["Active", "Pending", "Disabled", "Declined"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const [current] = await sbSelect("providers", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("providers", `id=eq.${id}`, { status });
    await writeAudit(`set provider ${current.name} status to ${status}`, "provider");
    res.json(normalizeProvider(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /providers/:id/status failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeProvider(row: any) {
  const providerType = row.providerType ?? row.provider_type ?? "Doctor";
  return {
    id: row.id,
    name: row.name ?? "",
    category: providerType.toLowerCase(),
    providerType,
    specialty: row.specialty ?? "",
    status: row.status ?? "Pending",
    email: row.email ?? "",
    phone: row.phone ?? null,
    city: row.city ?? null,
    consultationFee: row.consultationFee ?? row.consultation_fee ?? 0,
    experienceYears: row.experienceYears ?? row.experience_years ?? null,
    licenseNo: row.licenseNo ?? row.license_no ?? "",
    avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
    bio: row.bio ?? null,
    serviceModes: row.serviceModes ?? {
      video: row.video ?? false,
      audio: row.audio ?? false,
      inPerson: row.inPerson ?? false,
      homeVisit: row.homeVisit ?? false,
    },
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

export default router;
