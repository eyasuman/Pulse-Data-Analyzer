import { Router } from "express";
import { sbSelect, sbInsert, sbUpdate } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/institutes", async (req, res) => {
  try {
    const rows = await sbSelect("institute_pulse", "?order=createdAt.desc");
    res.json(rows.map(normalizeInstitute));
  } catch (err) {
    req.log.error({ err }, "GET /institutes failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/institutes", async (req, res) => {
  try {
    const {
      name, type, status, city, address, phone, email, licenseNo,
      totalDoctors, totalBeds, services, accreditations,
    } = req.body;
    const created = await sbInsert("institute_pulse", {
      name,
      type,
      status,
      city,
      address,
      phone: phone || null,
      email: email || null,
      licenseNo: licenseNo || null,
      totalDoctors: totalDoctors ?? 0,
      totalBeds: totalBeds ?? null,
      services: Array.isArray(services) ? services : [],
      accreditations: Array.isArray(accreditations) ? accreditations : [],
    });
    await writeAudit(`added institute "${created.name}" (${created.type})`, "institute");
    res.status(201).json(normalizeInstitute(created));
  } catch (err) {
    req.log.error({ err }, "POST /institutes failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/institutes/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const valid = ["Active", "Pending", "Suspended"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
  try {
    const [current] = await sbSelect("institute_pulse", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("institute_pulse", `id=eq.${id}`, { status });
    await writeAudit(`set institute ${current.name} status to ${status}`, "institute");
    res.json(normalizeInstitute(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /institutes/:id/status failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeInstitute(row: any) {
  return {
    id: row.id,
    name: row.name ?? "",
    type: row.type ?? "Clinic",
    status: row.status ?? "Pending",
    city: row.city ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    licenseNo: row.licenseNo ?? row.license_no ?? "",
    totalDoctors: row.totalDoctors ?? row.total_doctors ?? 0,
    totalBeds: row.totalBeds ?? row.total_beds ?? null,
    services: Array.isArray(row.services) ? row.services : [],
    accreditations: Array.isArray(row.accreditations) ? row.accreditations : [],
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

export default router;
