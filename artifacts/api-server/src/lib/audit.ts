import { sbInsert } from "./supabase";

/**
 * Fire-and-forget audit log writer. Never throws — logs errors to stderr.
 */
export async function writeAudit(
  action: string,
  objectType: string,
  actorName = "Admin",
  type: "Admin" | "User" | "System" = "Admin"
): Promise<void> {
  try {
    await sbInsert("auditLogs", {
      actorName,
      action,
      objectType,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
