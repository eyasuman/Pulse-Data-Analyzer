import { Router } from "express";
import { sbSelect, sbUpdate, sbSignedUrl } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

// ─── All providers ────────────────────────────────────────────────────────────

router.get("/providers", async (req, res) => {
  try {
    const rows = await sbSelect("doctors", "?order=createdAt.desc");
    res.json(rows.map(normalizeDoctor));
  } catch (err) {
    req.log.error({ err }, "GET /providers failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Update status ────────────────────────────────────────────────────────────

router.patch("/providers/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const valid = ["Active", "Pending", "Disabled", "Declined"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const [current] = await sbSelect("doctors", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("doctors", `id=eq.${id}`, { status });
    void writeAudit(`set provider ${current.name} status to ${status}`, "provider");
    res.json(normalizeDoctor(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /providers/:id/status failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── License verification ─────────────────────────────────────────────────────

/**
 * Doctors pending license verification:
 * those with a licenseFile uploaded but status still Pending.
 */
router.get("/providers/license-pending", async (req, res) => {
  try {
    const rows = await sbSelect("doctors", "?status=eq.Pending&licenseFile=not.is.null&order=createdAt.asc");
    res.json(rows.map(normalizeDoctor));
  } catch (err) {
    req.log.error({ err }, "GET /providers/license-pending failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Generate a short-lived signed URL for a doctor's license file.
 * The medical-licenses bucket is private — never return a public URL.
 */
router.get("/providers/:id/license-url", async (req, res) => {
  const { id } = req.params;
  try {
    const [doctor] = await sbSelect("doctors", `?id=eq.${id}`);
    if (!doctor) return res.status(404).json({ error: "Not found" });
    const licenseFile = doctor.licenseFile as {
      path?: string;
      name?: string;
      type?: string;
      size?: number;
      uploadId?: string;
    } | string | null;
    const uploadId =
      (typeof licenseFile === "object" ? licenseFile?.uploadId : null)
      ?? doctor.licenseUploadId
      ?? doctor.license_upload_id;

    let bucket = "medical-licenses";
    let path = typeof licenseFile === "string" ? licenseFile : licenseFile?.path;
    let fileName = typeof licenseFile === "object" ? licenseFile?.name : undefined;
    let mimeType = typeof licenseFile === "object" ? licenseFile?.type : undefined;
    let size = typeof licenseFile === "object" ? licenseFile?.size : undefined;

    if (uploadId) {
      const [upload] = await sbSelect(
        "user_uploads",
        `?id=eq.${encodeURIComponent(uploadId)}&status=eq.active&select=bucket,storage_path,original_name,mime_type,size_bytes`
      );
      if (upload?.storage_path) {
        bucket = upload.bucket || "user-uploads";
        path = upload.storage_path;
        fileName = upload.original_name || fileName;
        mimeType = upload.mime_type || mimeType;
        size = upload.size_bytes ?? size;
      }
    }

    if (!path) {
      return res.status(404).json({ error: "No license file uploaded" });
    }
    const signedUrl = await sbSignedUrl(bucket, path, 600);
    res.json({ signedUrl, fileName: fileName ?? "license", mimeType, size });
  } catch (err) {
    req.log.error({ err }, "GET /providers/:id/license-url failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Approve or reject a doctor's license.
 * approved=true → status "Active"
 * approved=false → status "Declined"
 */
router.patch("/providers/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body as { approved: boolean };
  if (typeof approved !== "boolean") {
    return res.status(400).json({ error: "approved must be a boolean" });
  }
  const newStatus = approved ? "Active" : "Declined";
  try {
    const [current] = await sbSelect("doctors", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("doctors", `id=eq.${id}`, { status: newStatus });
    void writeAudit(
      `${approved ? "approved" : "rejected"} license for provider ${current.name}`,
      "provider"
    );
    res.json(normalizeDoctor(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /providers/:id/verify failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeDoctor(row: any) {
  const providerType = row.providerType ?? row.provider_type ?? "Doctor";
  return {
    id: row.id,
    userId: row.userId ?? row.user_id ?? null,
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
    licenseFile: row.licenseFile ?? row.license_file ?? null,
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
