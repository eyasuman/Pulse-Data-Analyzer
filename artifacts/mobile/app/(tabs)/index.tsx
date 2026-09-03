import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Platform, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { StatCard } from "@/components/StatCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";

const TOOLS = [
  { title: "Institutes", sub: (d: any) => `${d.institutes.filter((i: any) => i.status === "Active").length} active`, icon: "grid" as const, color: "#818cf8", route: "/institutes" },
  { title: "Banners", sub: (d: any) => `${d.banners.filter((b: any) => b.isActive).length} live`, icon: "image" as const, color: "#f59e0b", route: "/banners" },
  { title: "License Review", sub: (d: any) => { const n = d.doctors.filter((doc: any) => doc.licenseFile && doc.status === "Pending").length; return n > 0 ? `${n} pending` : "All verified"; }, icon: "shield" as const, color: "#10b981", route: "/license-review" },
  { title: "Payment Review", sub: (d: any) => { const n = d.appointments.filter((a: any) => a.paymentStatus === "pending" && a.paymentProofUrl).length; return n > 0 ? `${n} pending` : "All reviewed"; }, icon: "credit-card" as const, color: "#f59e0b", route: "/payment-review" },
  { title: "Reviews", sub: (d: any) => `${d.reviews.filter((r: any) => r.status === "visible" || r.status === "pinned").length} visible`, icon: "star" as const, color: "#818cf8", route: "/reviews" },
  { title: "Patients", sub: (d: any) => `${d.patients.filter((p: any) => p.status === "active").length} active`, icon: "users" as const, color: "#10b981", route: "/patients" },
  { title: "Teleradiology", sub: (d: any) => `${d.teleradiologyCases.filter((c: any) => c.status === "urgent").length} urgent`, icon: "radio" as const, color: "#ef4444", route: "/teleradiology" },
  { title: "Audit Log", sub: (d: any) => `${d.auditLogs.length} entries`, icon: "list" as const, color: "#94a3b8", route: "/audit" },
  { title: "Settings", sub: (d: any) => `Fee: ${d.settings.platformFee}%`, icon: "sliders" as const, color: "#6366f1", route: "/settings" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const data = useData();
  const { doctors, appointments, revenue, institutes, banners, reviews, patients, teleradiologyCases, settings, refresh } = data;
  const [refreshing, setRefreshing] = React.useState(false);

  const stats = useMemo(() => {
    const active = doctors.filter((d) => d.status === "Active").length;
    const pending = doctors.filter((d) => d.status === "Pending").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const platformRevenue = appointments.filter((a) => a.status === "completed").reduce((acc, a) => acc + a.platformFee, 0);
    const urgentCases = teleradiologyCases.filter((c) => c.status === "urgent").length;
    const bannedReviews = reviews.filter((r) => r.status === "banned" || r.status === "shadow_banned").length;
    return { active, pending, completed, platformRevenue, total: doctors.length, urgentCases, bannedReviews };
  }, [doctors, appointments, teleradiologyCases, reviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const recentAppts = appointments.slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>PULSE NETWORK</Text>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Admin Console</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.25)" }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: "#10b981" }]}>LIVE</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.row}>
          <StatCard label="Active Providers" value={stats.active} color="#10b981" trend="up" trendValue={`${stats.total} total`} onPress={() => router.push("/(tabs)/providers")} />
          <StatCard label="Pending Review" value={stats.pending} color="#f59e0b" onPress={() => router.push("/license-review")} />
        </View>
        <View style={styles.row}>
          <StatCard label="Completed Appts" value={stats.completed} color="#818cf8" onPress={() => router.push("/(tabs)/appointments")} />
          <StatCard label="Platform Revenue" value={`AED ${stats.platformRevenue.toLocaleString()}`} color="#6366f1" onPress={() => router.push("/(tabs)/revenue")} />
        </View>
      </View>

      {/* Alert row */}
      <View style={styles.row}>
        <View style={[styles.alertCard, { backgroundColor: stats.urgentCases > 0 ? "#ef444415" : colors.card, borderColor: stats.urgentCases > 0 ? "#ef444430" : colors.border }]}>
          <Feather name="alert-triangle" size={16} color={stats.urgentCases > 0 ? "#ef4444" : colors.mutedForeground} />
          <View>
            <Text style={[styles.alertLabel, { color: colors.mutedForeground }]}>URGENT CASES</Text>
            <Text style={[styles.alertValue, { color: stats.urgentCases > 0 ? "#ef4444" : colors.foreground }]}>{stats.urgentCases}</Text>
          </View>
        </View>
        <View style={[styles.alertCard, { backgroundColor: stats.bannedReviews > 0 ? "#f59e0b15" : colors.card, borderColor: stats.bannedReviews > 0 ? "#f59e0b30" : colors.border }]}>
          <Feather name="flag" size={16} color={stats.bannedReviews > 0 ? "#f59e0b" : colors.mutedForeground} />
          <View>
            <Text style={[styles.alertLabel, { color: colors.mutedForeground }]}>FLAGGED REVIEWS</Text>
            <Text style={[styles.alertValue, { color: stats.bannedReviews > 0 ? "#f59e0b" : colors.foreground }]}>{stats.bannedReviews}</Text>
          </View>
        </View>
      </View>

      {/* System Status */}
      <View style={[styles.systemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.systemTitle, { color: colors.mutedForeground }]}>SYSTEM</Text>
        <View style={styles.systemRow}>
          <SystemDot label="API" color="#10b981" colors={colors} />
          <SystemDot label="DB" color="#10b981" colors={colors} />
          <SystemDot label="AUTH" color="#10b981" colors={colors} />
          <SystemDot label={`FEE ${settings.platformFee}%`} color="#818cf8" colors={colors} />
        </View>
      </View>

      {/* Admin Tools Grid */}
      <SectionHeader title="Admin Tools" />
      <View style={styles.toolsGrid}>
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.title}
            onPress={() => router.push(tool.route as any)}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: tool.color + "15", borderColor: tool.color + "30" }]}>
              <Feather name={tool.icon} size={18} color={tool.color} />
            </View>
            <Text style={[styles.toolTitle, { color: colors.foreground }]}>{tool.title}</Text>
            <Text style={[styles.toolSub, { color: colors.mutedForeground }]}>{tool.sub(data)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Overview */}
      <SectionHeader title="Platform Overview" />
      <View style={[styles.tripleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tripleItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
          <Text style={[styles.tripleVal, { color: colors.foreground }]}>{institutes.filter(i => i.status === "Active").length}</Text>
          <Text style={[styles.tripleLabel, { color: colors.mutedForeground }]}>INSTITUTES</Text>
        </View>
        <View style={[styles.tripleItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
          <Text style={[styles.tripleVal, { color: colors.foreground }]}>{patients.filter(p => p.status === "active").length}</Text>
          <Text style={[styles.tripleLabel, { color: colors.mutedForeground }]}>PATIENTS</Text>
        </View>
        <View style={styles.tripleItem}>
          <Text style={[styles.tripleVal, { color: colors.foreground }]}>{banners.filter(b => b.isActive).length}</Text>
          <Text style={[styles.tripleLabel, { color: colors.mutedForeground }]}>BANNERS</Text>
        </View>
      </View>

      {/* Recent Appointments */}
      {recentAppts.length > 0 && (
        <>
          <SectionHeader title="Recent Appointments" actionLabel="See All" onAction={() => router.push("/(tabs)/appointments")} />
          {recentAppts.map((a) => <AppointmentCard key={a.id} appointment={a} />)}
        </>
      )}
    </ScrollView>
  );
}

function SystemDot({ label, color, colors }: { label: string; color: string; colors: any }) {
  return (
    <View style={sysStyles.item}>
      <View style={[sysStyles.dot, { backgroundColor: color }]} />
      <Text style={[sysStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const sysStyles = StyleSheet.create({
  item: { alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 9, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, marginBottom: 4, fontFamily: "Inter_700Bold" },
  pageTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  liveText: { fontSize: 9, fontWeight: "700", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  statsGrid: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  alertCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 10 },
  alertLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  alertValue: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  systemCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  systemTitle: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  systemRow: { flexDirection: "row", justifyContent: "space-around" },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: { width: "47%", borderRadius: 16, borderWidth: 1, padding: 14, gap: 6 },
  toolIcon: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  toolTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  toolSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tripleCard: { borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  tripleItem: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 4 },
  tripleVal: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  tripleLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" },
});
