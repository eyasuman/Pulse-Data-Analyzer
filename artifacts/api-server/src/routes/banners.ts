import { Router } from "express";
import { sbSelect, sbInsert, sbUpdate, sbDelete } from "../lib/supabase";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/banners", async (req, res) => {
  try {
    const rows = await sbSelect("banners", "?order=priority.asc");
    res.json(rows.map(normalizeBanner));
  } catch (err) {
    req.log.error({ err }, "GET /banners failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/banners", async (req, res) => {
  try {
    const created = await sbInsert("banners", { ...req.body });
    await writeAudit(`created new banner "${created.title}" (${created.type})`, "banner");
    res.status(201).json(normalizeBanner(created));
  } catch (err) {
    req.log.error({ err }, "POST /banners failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

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

function normalizeBanner(row: any) {
  return {
    id: row.id,
    title: row.title ?? "",
    message: row.message ?? "",
    type: row.type ?? "info",
    isActive: row.isActive ?? true,
    priority: row.priority ?? 0,
    promoCode: row.promoCode ?? null,
    linkUrl: row.linkUrl ?? null,
    displayDuration: row.displayDuration ?? 5,
    targetAudience: row.targetAudience ?? "All",
    createdAt: row.createdAt ?? new Date().toISOString(),
    expiresAt: row.expiresAt ?? null,
  };
}

export default router;
