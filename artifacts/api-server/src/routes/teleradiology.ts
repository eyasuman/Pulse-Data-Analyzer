import { Router } from "express";
import { sbSelect, sbUpdate } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/teleradiology", async (req, res) => {
  try {
    const rows = await sbSelect("teleradiologyCases", "?order=createdAt.desc");
    res.json(rows.map(normalizeCase));
  } catch (err) {
    req.log.error({ err }, "GET /teleradiology failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/teleradiology/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const valid = ["pending", "in-review", "completed", "urgent"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
  try {
    const [current] = await sbSelect("teleradiologyCases", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("teleradiologyCases", `id=eq.${id}`, { status });
    await writeAudit(`updated teleradiology case ${current.caseId} status to ${status}`, "teleradiology");
    res.json(normalizeCase(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /teleradiology/:id/status failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeCase(row: any) {
  return {
    id: row.id,
    caseId: row.caseId ?? row.case_id ?? `CASE-${row.id?.slice(-6) ?? "000000"}`,
    patientName: row.patientName ?? row.patient_name ?? "",
    radiologistName: row.radiologistName ?? row.radiologist_name ?? null,
    modality: row.modality ?? "MRI",
    bodyPart: row.bodyPart ?? row.body_part ?? "",
    status: row.status ?? "pending",
    priority: row.priority ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

export default router;
