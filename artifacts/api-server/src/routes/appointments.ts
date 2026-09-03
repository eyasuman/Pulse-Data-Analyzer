import { Router } from "express";
import { sbPublicUrl, sbSelect, sbUpdate } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

// ─── All appointments ─────────────────────────────────────────────────────────

router.get("/appointments", async (req, res) => {
  try {
    const rows = await sbSelect("appointments", "?order=createdAt.desc");
    res.json(rows.map(normalizeAppointment));
  } catch (err) {
    req.log.error({ err }, "GET /appointments failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Pending payment proof review ─────────────────────────────────────────────

/**
 * Returns appointments where paymentStatus = 'pending'.
 * These are the ones the admin needs to manually review.
 */
router.get("/appointments/payment-pending", async (req, res) => {
  try {
    const rows = await sbSelect(
      "appointments",
      "?paymentStatus=eq.pending&order=createdAt.asc"
    );
    res.json(rows.map(normalizeAppointment));
  } catch (err) {
    req.log.error({ err }, "GET /appointments/payment-pending failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Update payment status ────────────────────────────────────────────────────

/**
 * Admin verifies or rejects a payment proof.
 * Setting paymentStatus = 'verified' on a 'scheduled' appointment
 * automatically unlocks the patient's video consultation in real time
 * (the mobile app subscribes to changes on this row via Supabase Realtime).
 */
router.patch("/appointments/:id/payment-status", async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body as { paymentStatus: string };
  const valid = ["verified", "rejected", "pending"];
  if (!valid.includes(paymentStatus)) {
    return res.status(400).json({ error: "Invalid paymentStatus. Use: verified, rejected, pending" });
  }
  try {
    const [current] = await sbSelect("appointments", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("appointments", `id=eq.${id}`, { paymentStatus });
    await writeAudit(
      `payment status set to ${paymentStatus} for appointment #${id.slice(-6)} (${current.patientName ?? current.patient_name ?? ""})`,
      "appointment"
    );
    res.json(normalizeAppointment(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /appointments/:id/payment-status failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeAppointment(row: any) {
  const consultationFee = row.consultationFee ?? row.consultation_fee ?? 0;
  const platformFeePercent = parseFloat(process.env["PLATFORM_FEE_PERCENT"] ?? "10") / 100;
  const platformFee = row.platformFee ?? row.platform_fee ?? Math.round(consultationFee * platformFeePercent);
  const totalPrice = row.totalPrice ?? row.total_price ?? consultationFee + platformFee;
  const storedPaymentProofUrl = row.paymentProofUrl ?? row.payment_proof_url ?? null;
  const paymentProofUrl = storedPaymentProofUrl && !storedPaymentProofUrl.startsWith("http")
    ? sbPublicUrl("payment-proofs", storedPaymentProofUrl)
    : storedPaymentProofUrl;

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
    // Payment proof fields — treat null status as 'pending' when proof exists
    paymentStatus: (row.paymentStatus ?? row.payment_status) ||
      (paymentProofUrl ? "pending" : null),
    paymentProofUrl,
    transactionId: row.transactionId ?? row.transaction_id ?? null,
    senderName: row.senderName ?? row.sender_name ?? null,
    paymentMethod: row.paymentMethod ?? row.payment_method ?? null,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

export default router;
