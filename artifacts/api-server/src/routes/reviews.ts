import { Router } from "express";
import { sbSelect, sbUpdate } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/reviews", async (req, res) => {
  try {
    const rows = await sbSelect("reviews", "?order=createdAt.desc");
    res.json(rows.map(normalizeReview));
  } catch (err) {
    req.log.error({ err }, "GET /reviews failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/reviews/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const valid = ["visible", "pinned", "banned", "shadow_banned"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
  try {
    const [current] = await sbSelect("reviews", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("reviews", `id=eq.${id}`, { status });
    await writeAudit(`updated review by ${current.patientName} — status set to ${status}`, "review");
    res.json(normalizeReview(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /reviews/:id/status failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeReview(row: any) {
  return {
    id: row.id,
    doctorId: row.doctorId ?? row.doctor_id ?? "",
    doctorName: row.doctorName ?? row.doctor_name ?? "",
    patientName: row.patientName ?? row.patient_name ?? "",
    rating: row.rating ?? 0,
    comment: row.comment ?? "",
    status: row.status ?? "visible",
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

export default router;
