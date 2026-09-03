import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  Image, ActivityIndicator, Modal, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useData, Appointment, PaymentStatus } from "@/context/DataContext";
import { ActionModal, NoticeModal } from "@/components/ActionModal";

const PAYMENT_STATUS_META: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "#f59e0b", icon: "clock", label: "PENDING" },
  verified: { color: "#10b981", icon: "check-circle", label: "VERIFIED" },
  rejected: { color: "#ef4444", icon: "x-circle", label: "REJECTED" },
};

export default function PaymentReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { appointments, updatePaymentStatus } = useData();
  const [filter, setFilter] = useState<PaymentStatus | "all">("pending");
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ appointment: Appointment; status: PaymentStatus } | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  // Only show appointments that have a paymentProofUrl (payment was submitted)
  const withProof = useMemo(
    () => appointments.filter((a) => a.paymentProofUrl),
    [appointments]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return withProof;
    return withProof.filter((a) => a.paymentStatus === filter);
  }, [withProof, filter]);

  const counts = useMemo(() => ({
    all: withProof.length,
    pending: withProof.filter((a) => a.paymentStatus === "pending").length,
    verified: withProof.filter((a) => a.paymentStatus === "verified").length,
    rejected: withProof.filter((a) => a.paymentStatus === "rejected").length,
  }), [withProof]);

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleAction = (appt: Appointment, status: PaymentStatus) => {
    const isVerify = status === "verified";
    setActionTarget({ appointment: appt, status });
  };

  const performAction = async () => {
    if (!actionTarget || loadingId) return;
    const { appointment, status } = actionTarget;
    setLoadingId(appointment.id);
    setSelectedAppt(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updatePaymentStatus(appointment.id, status);
      setNotice({
        title: status === "verified" ? "Payment Verified" : "Payment Rejected",
        message: `Payment for ${appointment.patientName} has been ${status === "verified" ? "verified" : "rejected"}.`,
      });
    } catch (err: any) {
      setNotice({ title: "Error", message: err?.message ?? "Update failed." });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN · PAYMENTS</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Payment Review</Text>
          </View>
          {counts.pending > 0 && (
            <View style={[styles.urgentBadge, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
              <Feather name="alert-circle" size={11} color="#f59e0b" />
              <Text style={[styles.urgentText, { color: "#f59e0b" }]}>{counts.pending} pending</Text>
            </View>
          )}
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          {(["pending", "verified", "rejected"] as PaymentStatus[]).map((s) => {
            const m = PAYMENT_STATUS_META[s];
            return (
              <View key={s} style={[styles.summaryChip, { backgroundColor: m.color + "10", borderColor: m.color + "20", flex: 1 }]}>
                <Text style={[styles.summaryVal, { color: m.color }]}>{counts[s]}</Text>
                <Text style={[styles.summaryLabel, { color: m.color }]}>{m.label.slice(0, 3)}</Text>
              </View>
            );
          })}
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(["all", "pending", "verified", "rejected"] as const).map((f) => {
            const m = f !== "all" ? PAYMENT_STATUS_META[f] : null;
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[
                styles.chip,
                { backgroundColor: filter === f ? (m?.color ?? colors.primary) : colors.card, borderColor: filter === f ? (m?.color ?? colors.primary) : colors.border },
              ]}>
                <Text style={[styles.chipLabel, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
                  {f === "all" ? `All ${counts.all}` : `${m!.label} ${counts[f as PaymentStatus]}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <PaymentCard
            appointment={item}
            colors={colors}
            isLoading={loadingId === item.id}
            onViewProof={() => setSelectedAppt(item)}
            onVerify={() => handleAction(item, "verified")}
            onReject={() => handleAction(item, "rejected")}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: "#10b98115", borderColor: "#10b98130" }]}>
              <Feather name="check-circle" size={32} color="#10b981" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filter === "pending" ? "No Pending Payments" : "Nothing here"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "pending"
                ? "All submitted payment proofs have been reviewed."
                : "No appointments match this filter."}
            </Text>
          </View>
        }
      />

      <ActionModal
        visible={!!actionTarget}
        title={actionTarget?.status === "verified" ? "Verify Payment" : "Reject Payment"}
        message={actionTarget ? `${actionTarget.status === "verified" ? "Verify" : "Reject"} payment for ${actionTarget.appointment.patientName}?\n\n${actionTarget.status === "verified" ? "This will unlock the patient's video consultation screen in real time." : "The patient will be notified their payment was rejected."}` : undefined}
        options={actionTarget ? [{
          label: actionTarget.status === "verified" ? "Verify" : "Reject",
          destructive: actionTarget.status === "rejected",
          onPress: performAction,
        }] : []}
        onClose={() => setActionTarget(null)}
      />
      <NoticeModal
        visible={!!notice}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />

      {/* Proof image modal */}
      <Modal
        visible={!!selectedAppt}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedAppt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Payment Proof</Text>
                {selectedAppt && (
                  <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                    {selectedAppt.patientName} · AED {selectedAppt.totalPrice}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => setSelectedAppt(null)} style={[styles.closeBtn, { borderColor: colors.border }]}>
                <Feather name="x" size={16} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedAppt?.paymentProofUrl ? (
                <Image
                  source={{ uri: selectedAppt.paymentProofUrl }}
                  style={styles.proofImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.noImage, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="image" size={32} color={colors.mutedForeground} />
                  <Text style={[styles.noImageText, { color: colors.mutedForeground }]}>No image URL</Text>
                </View>
              )}

              {/* Metadata */}
              {selectedAppt && (
                <View style={[styles.metaGrid, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  {selectedAppt.transactionId && <MetaRow icon="hash" label="Transaction ID" value={selectedAppt.transactionId} colors={colors} />}
                  {selectedAppt.senderName && <MetaRow icon="user" label="Sender" value={selectedAppt.senderName} colors={colors} />}
                  {selectedAppt.paymentMethod && <MetaRow icon="credit-card" label="Method" value={selectedAppt.paymentMethod} colors={colors} />}
                  <MetaRow icon="dollar-sign" label="Amount" value={`AED ${selectedAppt.totalPrice}`} colors={colors} />
                  <MetaRow icon="user" label="Patient" value={selectedAppt.patientName} colors={colors} />
                  <MetaRow icon="activity" label="Doctor" value={selectedAppt.doctorName} colors={colors} />
                </View>
              )}
            </ScrollView>

            {selectedAppt?.paymentStatus === "pending" && (
              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <Pressable onPress={() => handleAction(selectedAppt, "rejected")} style={[styles.modalActionBtn, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
                  <Feather name="x-circle" size={14} color="#ef4444" />
                  <Text style={[styles.modalActionText, { color: "#ef4444" }]}>Reject</Text>
                </Pressable>
                <Pressable onPress={() => handleAction(selectedAppt, "verified")} style={[styles.modalActionBtn, { backgroundColor: "#10b98115", borderColor: "#10b98130" }]}>
                  <Feather name="check-circle" size={14} color="#10b981" />
                  <Text style={[styles.modalActionText, { color: "#10b981" }]}>Verify Payment</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetaRow({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={metaStyles.row}>
      <Feather name={icon} size={11} color={colors.mutedForeground} />
      <Text style={[metaStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[metaStyles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}
const metaStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  label: { fontSize: 11, flex: 1, fontFamily: "Inter_400Regular" },
  value: { fontSize: 11, fontWeight: "500", fontFamily: "Inter_500Medium", textAlign: "right", flex: 2 },
});

function PaymentCard({
  appointment, colors, isLoading, onViewProof, onVerify, onReject,
}: {
  appointment: Appointment;
  colors: any;
  isLoading: boolean;
  onViewProof: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const ps = appointment.paymentStatus ?? "pending";
  const m = PAYMENT_STATUS_META[ps] ?? PAYMENT_STATUS_META.pending;
  const isPending = ps === "pending";

  return (
    <View style={[pcStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={pcStyles.header}>
        <View style={[pcStyles.statusIcon, { backgroundColor: m.color + "15", borderColor: m.color + "30" }]}>
          <Feather name={m.icon} size={16} color={m.color} />
        </View>
        <View style={pcStyles.headerInfo}>
          <Text style={[pcStyles.patientName, { color: colors.foreground }]}>{appointment.patientName}</Text>
          <Text style={[pcStyles.doctorName, { color: colors.mutedForeground }]}>{appointment.doctorName} · {appointment.serviceType}</Text>
        </View>
        <View style={pcStyles.headerRight}>
          <View style={[pcStyles.statusBadge, { backgroundColor: m.color + "15", borderColor: m.color + "30" }]}>
            <Text style={[pcStyles.statusText, { color: m.color }]}>{m.label}</Text>
          </View>
          <Text style={[pcStyles.amount, { color: colors.foreground }]}>AED {appointment.totalPrice}</Text>
        </View>
      </View>

      {/* Details row */}
      <View style={pcStyles.detailsRow}>
        {appointment.paymentMethod && (
          <View style={[pcStyles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="credit-card" size={9} color={colors.mutedForeground} />
            <Text style={[pcStyles.chipText, { color: colors.mutedForeground }]}>{appointment.paymentMethod}</Text>
          </View>
        )}
        {appointment.transactionId && (
          <View style={[pcStyles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="hash" size={9} color={colors.mutedForeground} />
            <Text style={[pcStyles.chipText, { color: colors.mutedForeground }]}>{appointment.transactionId.slice(0, 12)}…</Text>
          </View>
        )}
        {appointment.senderName && (
          <View style={[pcStyles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="user" size={9} color={colors.mutedForeground} />
            <Text style={[pcStyles.chipText, { color: colors.mutedForeground }]}>{appointment.senderName}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[pcStyles.actions, { borderTopColor: colors.border }]}>
        <Pressable onPress={onViewProof} style={({ pressed }) => [pcStyles.viewBtn, { backgroundColor: "#818cf815", borderColor: "#818cf830", opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="image" size={13} color="#818cf8" />
          <Text style={[pcStyles.viewText, { color: "#818cf8" }]}>View Proof</Text>
        </Pressable>

        {isPending && (
          <>
            <Pressable testID={`payment-reject-${appointment.id}`} accessibilityLabel="Reject payment" onPress={onReject} disabled={isLoading} style={({ pressed }) => [pcStyles.actionBtn, { backgroundColor: "#ef444415", borderColor: "#ef444430", opacity: pressed || isLoading ? 0.7 : 1 }]}>
              {isLoading ? <ActivityIndicator size={12} color="#ef4444" /> : <Feather name="x" size={13} color="#ef4444" />}
              <Text style={[pcStyles.actionText, { color: "#ef4444" }]}>Reject</Text>
            </Pressable>
            <Pressable testID={`payment-verify-${appointment.id}`} accessibilityLabel="Verify payment" onPress={onVerify} disabled={isLoading} style={({ pressed }) => [pcStyles.actionBtn, { backgroundColor: "#10b98115", borderColor: "#10b98130", opacity: pressed || isLoading ? 0.7 : 1, flex: 2 }]}>
              {isLoading ? <ActivityIndicator size={12} color="#10b981" /> : <Feather name="check" size={13} color="#10b981" />}
              <Text style={[pcStyles.actionText, { color: "#10b981" }]}>Verify</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const pcStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  doctorName: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  headerRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  amount: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  detailsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, paddingTop: 10 },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  viewText: { fontSize: 12, fontWeight: "600" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: "600" },
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
  summaryRow: { flexDirection: "row", gap: 6 },
  summaryChip: { borderRadius: 10, borderWidth: 1, padding: 8, alignItems: "center", gap: 2 },
  summaryVal: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 7, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  filterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipLabel: { fontSize: 10, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxHeight: "90%", borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  closeBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalContent: { padding: 16, gap: 12 },
  proofImage: { width: "100%", height: 300, borderRadius: 12, backgroundColor: "#1e293b" },
  noImage: { height: 180, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  noImageText: { fontSize: 13 },
  metaGrid: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  modalActions: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1 },
  modalActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  modalActionText: { fontSize: 13, fontWeight: "700" },
});
