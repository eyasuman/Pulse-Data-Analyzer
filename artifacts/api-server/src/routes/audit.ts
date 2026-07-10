import { Router } from "express";
import { sbSelect } from "../lib/supabase";

const router = Router();

router.get("/audit", async (req, res) => {
  try {
    const rows = await sbSelect("auditLogs", "?order=timestamp.desc");
    res.json(rows.map((r: any) => ({
      id: r.id,
      actorName: r.actorName ?? r.actor_name ?? "System",
      action: r.action ?? "",
      objectType: r.objectType ?? r.object_type ?? "",
      type: r.type ?? "System",
      timestamp: r.timestamp ?? r.createdAt ?? new Date().toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "GET /audit failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
