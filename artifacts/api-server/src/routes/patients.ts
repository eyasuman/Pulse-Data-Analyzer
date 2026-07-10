import { Router } from "express";
import { sbSelect, sbUpdate } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/patients", async (req, res) => {
  try {
    const rows = await sbSelect("patients", "?order=createdAt.desc");
    res.json(rows.map(normalizePatient));
  } catch (err) {
    req.log.error({ err }, "GET /patients failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/patients/:id/toggle", async (req, res) => {
  const { id } = req.params;
  try {
    const [current] = await sbSelect("patients", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const newStatus = current.status === "active" ? "suspended" : "active";
    const updated = await sbUpdate("patients", `id=eq.${id}`, { status: newStatus });
    await writeAudit(
      `${newStatus === "suspended" ? "suspended" : "reactivated"} patient account for ${current.name}`,
      "patient"
    );
    res.json(normalizePatient(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /patients/:id/toggle failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function normalizePatient(row: any) {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? null,
    city: row.city ?? null,
    status: row.status ?? "active",
    totalAppointments: row.totalAppointments ?? row.total_appointments ?? 0,
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

export default router;
