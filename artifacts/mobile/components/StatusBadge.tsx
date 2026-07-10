import React from "react";
import { View, Text, StyleSheet } from "react-native";

type StatusType =
  | "Active" | "Pending" | "Disabled" | "Declined"
  | "pending" | "scheduled" | "completed" | "cancelled" | "declined"
  | "visible" | "pinned" | "banned" | "shadow_banned"
  | "active" | "suspended"
  | "Suspended";

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label?: string }> = {
  Active: { bg: "#10b98115", border: "#10b98130", text: "#10b981" },
  active: { bg: "#10b98115", border: "#10b98130", text: "#10b981" },
  Pending: { bg: "#f59e0b15", border: "#f59e0b30", text: "#f59e0b" },
  pending: { bg: "#f59e0b15", border: "#f59e0b30", text: "#f59e0b" },
  Disabled: { bg: "#94a3b815", border: "#94a3b830", text: "#94a3b8" },
  disabled: { bg: "#94a3b815", border: "#94a3b830", text: "#94a3b8" },
  Declined: { bg: "#ef444415", border: "#ef444430", text: "#ef4444" },
  declined: { bg: "#ef444415", border: "#ef444430", text: "#ef4444" },
  Suspended: { bg: "#ef444415", border: "#ef444430", text: "#ef4444" },
  suspended: { bg: "#ef444415", border: "#ef444430", text: "#ef4444", label: "SUSPENDED" },
  scheduled: { bg: "#6366f115", border: "#6366f130", text: "#818cf8" },
  completed: { bg: "#10b98115", border: "#10b98130", text: "#10b981" },
  cancelled: { bg: "#94a3b815", border: "#94a3b830", text: "#94a3b8" },
  visible: { bg: "#10b98115", border: "#10b98130", text: "#10b981" },
  pinned: { bg: "#818cf815", border: "#818cf830", text: "#818cf8" },
  banned: { bg: "#ef444415", border: "#ef444430", text: "#ef4444" },
  shadow_banned: { bg: "#94a3b815", border: "#94a3b830", text: "#94a3b8", label: "SHADOW" },
};

interface StatusBadgeProps {
  status: StatusType | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { bg: "#94a3b815", border: "#94a3b830", text: "#94a3b8" };
  const label = config.label ?? status.toUpperCase();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.text, { color: config.text, fontSize: size === "md" ? 10 : 8 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  text: { fontWeight: "700", letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
});
