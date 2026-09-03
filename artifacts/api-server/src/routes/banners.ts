import { Router } from "express";
import { sbSelect, sbInsert, sbUpdate, sbDelete, sbStorageUpload, sbPublicUrl } from "../lib/supabase";
import { writeAudit } from "../lib/audit";
import { randomUUID } from "crypto";

const router = Router();

// ─── List ─────────────────────────────────────────────────────────────────────

router.get("/banners", async (req, res) => {
  try {
    // Higher priority shows first → DESC
    const rows = await sbSelect("banners", "?order=priority.desc");
    res.json(rows.map(normalizeBanner));
  } catch (err) {
    req.log.error({ err }, "GET /banners failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────

router.post("/banners", async (req, res) => {
  try {
    const payload = {
      title: req.body.title ?? "",
      message: req.body.message ?? "",
      promoCode: req.body.promoCode ?? null,
      imageUrl: req.body.imageUrl ?? null,
      videoUrl: req.body.videoUrl ?? null,
      linkUrl: req.body.linkUrl ?? null,
      isActive: req.body.isActive ?? true,
      type: req.body.type ?? "photo",
      displayDuration: req.body.displayDuration ?? 5,
      priority: req.body.priority ?? 0,
    };
    const created = await sbInsert("banners", payload);
    await writeAudit(`created banner "${created.title}" (${created.type})`, "banner");
    res.status(201).json(normalizeBanner(created));
  } catch (err) {
    req.log.error({ err }, "POST /banners failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Upload image to banners storage bucket ───────────────────────────────────

/**
 * Accepts { base64: string, contentType: string, ext: string }
 * Uploads to the public `banners` bucket at `banners/<uuid>.<ext>`
 * Returns { imageUrl: string }
 */
router.post("/banners/upload-image", async (req, res) => {
  const { base64, contentType, ext } = req.body as { base64: string; contentType: string; ext: string };
  if (!base64 || !contentType) {
    return res.status(400).json({ error: "base64 and contentType are required" });
  }
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(contentType)) {
    return res.status(400).json({ error: "Invalid content type. Allowed: png, jpeg, webp, gif" });
  }
  try {
    const fileExt = ext ?? contentType.split("/")[1] ?? "jpg";
    const path = `banners/${randomUUID()}.${fileExt}`;
    const buffer = Buffer.from(base64, "base64");
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large (max 5MB)" });
    }
    const imageUrl = await sbStorageUpload("banners", path, buffer, contentType);
    res.json({ imageUrl });
  } catch (err) {
    req.log.error({ err }, "POST /banners/upload-image failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

// ─── Toggle active ────────────────────────────────────────────────────────────

router.patch("/banners/:id/toggle", async (req, res) => {
  const { id } = req.params;
  try {
    const [current] = await sbSelect("banners", `?id=eq.${id}`);
    if (!current) return res.status(404).json({ error: "Not found" });
    const updated = await sbUpdate("banners", `id=eq.${id}`, { isActive: !current.isActive });
    await writeAudit(`${updated.isActive ? "activated" : "deactivated"} banner "${current.title}"`, "banner");
    res.json(normalizeBanner(updated));
  } catch (err) {
    req.log.error({ err }, "PATCH /banners/:id/toggle failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────

router.delete("/banners/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [current] = await sbSelect("banners", `?id=eq.${id}`);
    await sbDelete("banners", `id=eq.${id}`);
    await writeAudit(`deleted banner "${current?.title ?? id}"`, "banner");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /banners/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeBanner(row: any) {
  return {
    id: row.id,
    title: row.title ?? "",
    message: row.message ?? "",
    type: row.type ?? "photo",
    isActive: row.isActive ?? true,
    priority: row.priority ?? 0,
    promoCode: row.promoCode ?? null,
    imageUrl: row.imageUrl ?? null,
    videoUrl: row.videoUrl ?? null,
    linkUrl: row.linkUrl ?? null,
    displayDuration: row.displayDuration ?? 5,
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

export default router;
