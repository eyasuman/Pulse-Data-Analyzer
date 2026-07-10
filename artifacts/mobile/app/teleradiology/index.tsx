import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, TeleradiologyCase } from "@/context/DataContext";

type CaseStatus = TeleradiologyCase["status"];
const STATUS_META: Record<CaseStatus, { color: string; icon: any; label: string }> = {
  pending: { color: "#f59e0b", icon: "clock", label: "PENDING" },
  "in-review": { color: "#818cf8", icon: "eye", label: "IN REVIEW" },
  completed: { color: "#10b981", icon: "check-circle", label: "COMPLETED" },
  urgent: { color: "#ef4444", icon: "alert-triangle", label: "URGENT" },
};
const MODALITY_ICONS: Record<string, any> = {
  MRI: "activity", "CT Scan": "layers", "X-Ray": "radio", Ultrasound: "radio", "PET Scan": "zap", Mammography: "circle",
};

export default function TeleradiologyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { teleradiologyCases, updateCaseStatus } = useData();
  const [filter, setFilter] = useState<CaseStatus | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return teleradiologyCases;
    return teleradiologyCases.filter((c) => c.status === filter);
  }, [teleradiologyCases, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: teleradiologyCases.length };
    (["pending", "in-review", "completed", "urgent"] as CaseStatus[]).forEach((s) => {
      c[s] = teleradiologyCases.filter((tc) => tc.status === s).length;
    });
    return c;
  }, [teleradiologyCases]);

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleAction = (c: TeleradiologyCase) => {
    const options = (["pending", "in-review", "completed", "urgent"] as CaseStatus[])
      .filter((s) => s !== c.status)
      .map((s) => ({
        text: STATUS_META[s].label,
        style: s === "urgent" ? "destructive" as const : "default" as const,
        onPress: () => updateCaseStatus(c.id, s),
      }));
    Alert.alert(`Case ${c.caseId}`, `Assigned to ${c.radiologistName ?? "Unassigned"}`, [
      ...options,
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Teleradiology</Text>
          </View>
          <View style={[styles.urgentBadge, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
            <Feather name="alert-triangle" size={12} color="#ef4444" />
            <Text style={[styles.urgentText, { color: "#ef4444" }]}>{counts["urgent"] ?? 0} Urgent</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {(["pending", "in-review", "completed", "urgent"] as CaseStatus[]).map((s) => {
            const m = STATUS_META[s];
            return (
              <View key={s} style={[styles.statChip, { backgroundColor: m.color + "10", borderColor: m.color + "20", flex: 1 }]}>
                <Text style={[styles.statVal, { color: m.color }]}>{counts[s] ?? 0}</Text>
                <Text style={[styles.statLabel, { color: m.color }]}>{m.label.slice(0, 3)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {(["all", "pending", "in-review", "completed", "urgent"] as const).map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, {
              backgroundColor: filter === f ? (f === "all" ? colors.primary : STATUS_META[f]?.color ?? colors.primary) : colors.card,
              borderColor: filter === f ? (f === "all" ? colors.primary : STATUS_META[f]?.color ?? colors.primary) : colors.border,
            }]}>
              <Text style={[styles.chipLabel, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
                {f === "all" ? `All ${counts.all}` : STATUS_META[f as CaseStatus].label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CaseCard tc={item} colors={colors} onAction={() => handleAction(item)} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><Feather name="radio" size={32} color={colors.mutedForeground} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No cases found</Text></View>}
      />
    </View>
  );
}

function CaseCard({ tc, colors, onAction }: { tc: TeleradiologyCase; colors: any; onAction: () => void }) {
  const m = STATUS_META[tc.status];
  const modalityIcon = MODALITY_ICONS[tc.modality] ?? "activity";
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {tc.status === "urgent" && (
        <View style={cardStyles.urgentBanner}>
          <Feather name="alert-triangle" size={12} color="#ef4444" />
          <Text style={cardStyles.urgentLabel}>URGENT — Immediate attention required</Text>
        </View>
      )}
      <View style={cardStyles.header}>
        <View style={[cardStyles.iconBox, { backgroundColor: m.color + "15", borderColor: m.color + "30" }]}>
          <Feather name={modalityIcon} size={16} color={m.color} />
        </View>
        <View style={cardStyles.headerInfo}>
          <Text style={[cardStyles.caseId, { color: colors.foreground }]}>{tc.caseId}</Text>
          <Text style={[cardStyles.modality, { color: colors.mutedForeground }]}>{tc.modality} · {tc.bodyPart}</Text>
        </View>
        <View style={cardStyles.headerRight}>
          <View style={[cardStyles.statusBadge, { backgroundColor: m.color + "15", borderColor: m.color + "30" }]}>
            <Feather name={m.icon} size={9} color={m.color} />
            <Text style={[cardStyles.statusText, { color: m.color }]}>{m.label}</Text>
          </View>
          <Pressable onPress={onAction} style={[cardStyles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="more-horizontal" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
      <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />
      <View style={cardStyles.detailsGrid}>
        <DetailItem icon="user" label="Patient" value={tc.patientName} colors={colors} />
        {tc.radiologistName ? <DetailItem icon="activity" label="Radiologist" value={tc.radiologistName} colors={colors} /> : null}
        <DetailItem icon="calendar" label="Created" value={new Date(tc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} colors={colors} />
        {tc.priority ? <DetailItem icon="flag" label="Priority" value={tc.priority} colors={colors} /> : null}
      </View>
      {tc.notes && (
        <View style={[cardStyles.notes, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[cardStyles.notesText, { color: colors.mutedForeground }]}>{tc.notes}</Text>
        </View>
      )}
    </View>
  );
}

function DetailItem({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={detailStyles.item}>
      <Feather name={icon} size={11} color={colors.mutedForeground} />
      <View>
        <Text style={[detailStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[detailStyles.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "flex-start", gap: 6, flex: 1 },
  label: { fontSize: 8, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { fontSize: 11, fontWeight: "500", marginTop: 1 },
});

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  urgentBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ef444410", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  urgentLabel: { fontSize: 10, fontWeight: "700", color: "#ef4444", flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  caseId: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modality: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  headerRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  divider: { height: 1 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  notes: { borderRadius: 8, borderWidth: 1, padding: 10 },
  notesText: { fontSize: 11, lineHeight: 17 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  urgentBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  urgentText: { fontSize: 11, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 6 },
  statChip: { borderRadius: 10, borderWidth: 1, padding: 8, alignItems: "center", gap: 2 },
  statVal: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 7, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  filterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipLabel: { fontSize: 10, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
});
