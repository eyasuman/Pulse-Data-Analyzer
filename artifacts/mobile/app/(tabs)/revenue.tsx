import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { SectionHeader } from "@/components/SectionHeader";

function MetricCard({ label, value, icon, color, colors }: { label: string; value: string; icon: any; color: string; colors: any }) {
  return (
    <View style={[metricStyles.card, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
      <View style={[metricStyles.icon, { backgroundColor: color + "15", borderColor: color + "30" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[metricStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[metricStyles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}
const metricStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  icon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

export default function RevenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { revenue, appointments, settings } = useData();

  const stats = useMemo(() => {
    const totalRevenue = revenue.reduce((acc, r) => acc + r.revenue, 0);
    const totalAppointments = revenue.reduce((acc, r) => acc + r.appointments, 0);
    const platformFees = appointments.filter((a) => a.status === "completed").reduce((acc, a) => acc + a.platformFee, 0);
    const avgFee = appointments.length > 0
      ? Math.round(appointments.reduce((acc, a) => acc + a.consultationFee, 0) / appointments.length)
      : 0;
    const latestMonth = revenue[revenue.length - 1];
    const prevMonth = revenue[revenue.length - 2];
    const growth = prevMonth && prevMonth.revenue > 0
      ? (((latestMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100).toFixed(1)
      : "0";
    return { totalRevenue, totalAppointments, platformFees, avgFee, growth };
  }, [revenue, appointments]);

  const maxRevenue = Math.max(...revenue.map((r) => r.revenue), 1);
  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Revenue</Text>

      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: "#4f46e5" }]}>
        <Text style={styles.heroLabel}>TOTAL PLATFORM REVENUE</Text>
        <Text style={styles.heroValue}>AED {stats.totalRevenue.toLocaleString()}</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>↑ {stats.growth}% this month</Text>
          </View>
          <Text style={styles.heroSub}>{stats.totalAppointments} appointments</Text>
        </View>
      </View>

      {/* Metric cards */}
      <View style={styles.metricsRow}>
        <MetricCard label="Platform Fees" value={`AED ${stats.platformFees}`} icon="dollar-sign" color="#10b981" colors={colors} />
        <MetricCard label="Avg Consultation" value={`AED ${stats.avgFee}`} icon="bar-chart-2" color="#818cf8" colors={colors} />
      </View>

      {/* Bar chart */}
      <SectionHeader title="Monthly Breakdown" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.barChart}>
          {revenue.map((r, i) => {
            const height = Math.max(8, (r.revenue / maxRevenue) * 120);
            const isLast = i === revenue.length - 1;
            return (
              <View key={r.month} style={styles.barItem}>
                <Text style={[styles.barValue, { color: colors.mutedForeground }]}>
                  {r.revenue >= 1000 ? `${(r.revenue / 1000).toFixed(0)}k` : r.revenue}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: isLast ? "#6366f1" : colors.primary + "40",
                      borderColor: isLast ? "#818cf8" : colors.primary + "60",
                    },
                  ]}
                />
                <Text style={[styles.barMonth, { color: colors.mutedForeground }]}>{r.month.slice(0, 3)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Monthly table */}
      <SectionHeader title="Monthly Details" />
      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {revenue.map((r, i) => (
          <View key={r.month} style={[styles.tableRow, i < revenue.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[styles.tableMonth, { color: colors.foreground }]}>{r.month}</Text>
            <Text style={[styles.tableAppts, { color: colors.mutedForeground }]}>{r.appointments} appts</Text>
            <Text style={[styles.tableRevenue, { color: colors.foreground }]}>AED {r.revenue.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {/* Fee Settings */}
      <SectionHeader title="Fee Configuration" />
      <View style={[styles.feeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.feeRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.feeLabel, { color: colors.foreground }]}>Platform Fee</Text>
          <View style={[styles.feeBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.feeBadgeText, { color: colors.primary }]}>{settings.platformFee}%</Text>
          </View>
        </View>
        <View style={[styles.feeRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.feeLabel, { color: colors.foreground }]}>Cancellation Notice</Text>
          <Text style={[styles.feeValue, { color: colors.mutedForeground }]}>{settings.cancellationNoticePeriodHours}h</Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={[styles.feeLabel, { color: colors.foreground }]}>Cancellation Penalty</Text>
          <Text style={[styles.feeValue, { color: colors.mutedForeground }]}>AED {settings.cancellationPenaltyFee}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  title: { fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  heroCard: { borderRadius: 20, padding: 20, gap: 8 },
  heroLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" },
  heroValue: { fontSize: 32, fontWeight: "700", color: "#fff", letterSpacing: -1, fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  metricsRow: { flexDirection: "row", gap: 10 },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  barChart: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 160 },
  barItem: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 8 },
  bar: { width: "100%", borderRadius: 4, borderWidth: 1 },
  barMonth: { fontSize: 7, fontWeight: "600", letterSpacing: 0.3 },
  tableCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tableRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  tableMonth: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  tableAppts: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, textAlign: "center" },
  tableRevenue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  feeCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  feeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0 },
  feeLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  feeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  feeBadgeText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  feeValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
