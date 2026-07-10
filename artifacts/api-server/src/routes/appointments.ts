import { Router } from "express";
import { sbSelect } from "../lib/supabase";

const router = Router();

router.get("/appointments", async (req, res) => {
  try {
    const rows = await sbSelect("appointments", "?order=createdAt.desc");
    res.json(rows.map(normalizeAppointment));
  } catch (err) {
    req.log.error({ err }, "GET /appointments failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeAppointment(row: any) {
  const consultationFee = row.consultationFee ?? row.consultation_fee ?? 0;
  const platformFeePercent = parseFloat(process.env["PLATFORM_FEE_PERCENT"] ?? "10") / 100;
  const platformFee = row.platformFee ?? row.platform_fee ?? Math.round(consultationFee * platformFeePercent);
  const totalPrice = row.totalPrice ?? row.total_price ?? consultationFee + platformFee;

  return {
    id: row.id,
    doctorName: row.doctorName ?? row.doctor_name ?? "",
    patientName: row.patientName ?? row.patient_name ?? "",
    specialty: row.specialty ?? "",
    status: row.status ?? "pending",
    consultationFee,
    platformFee,
    totalPrice,
    date: row.date ?? row.scheduledAt ?? row.scheduled_at ?? new Date().toISOString(),
    serviceType: row.serviceType ?? row.service_type ?? "In-Person Visit",
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

export default router;
