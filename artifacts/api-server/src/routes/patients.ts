import { Router } from "express";
import { sbSelect } from "../lib/supabase";

const router = Router();

router.get("/patients", async (req, res) => {
  try {
    const appointments = await sbSelect(
      "appointments",
      "?select=patientId,patientName,patientEmail,createdAt&order=createdAt.desc"
    );
    const byPatient = new Map<string, any>();
    for (const appointment of appointments) {
      const key = appointment.patientId || appointment.patientEmail || appointment.patientName;
      if (!key) continue;
      const existing = byPatient.get(key);
      if (existing) {
        existing.totalAppointments += 1;
      } else {
        byPatient.set(key, {
          id: appointment.patientId || `email:${appointment.patientEmail || appointment.patientName}`,
          name: appointment.patientName || "Unknown patient",
          email: appointment.patientEmail || "",
          phone: null,
          city: null,
          status: "active",
          totalAppointments: 1,
          createdAt: appointment.createdAt || new Date().toISOString(),
          manageable: false,
        });
      }
    }
    res.json(Array.from(byPatient.values()));
  } catch (err) {
    req.log.error({ err }, "GET /patients failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/patients/:id/toggle", async (req, res) => {
  res.status(409).json({
    error: "Patient accounts are derived from appointments and cannot be suspended from this database schema.",
  });
});

export default router;
