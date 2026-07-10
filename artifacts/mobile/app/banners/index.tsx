import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, Alert,
  Modal, ScrollView, TextInput, Switch, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, Banner, BannerType } from "@/context/DataContext";

const TYPE_META: Record<BannerType, { color: string; icon: any; label: string }> = {
  image: { color: "#818cf8", icon: "image", label: "Image" },
  promo: { color: "#f59e0b", icon: "tag", label: "Promo" },
  alert: { color: "#ef4444", icon: "alert-triangle", label: "Alert" },
  info: { color: "#10b981", icon: "info", label: "Info" },
};
const AUDIENCE_OPTIONS = ["All", "Patients", "Providers"] as const;

function SummaryPill({ label, value, color, colors }: any) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <Text style={[pillStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[pillStyles.value, { color }]}>{value}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 2 },
  label: { fontSize: 8, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

export default function BannersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { banners, addBanner, toggleBanner, deleteBanner } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState({ title: "", message: "", type: "info" as BannerType, isActive: true, priority: 5, promoCode: "", targetAudience: "All" as "All" | "Patients" | "Providers", displayDuration: 5 });
  const [saving, setSaving] = useState(false);

  const filtered = banners
    .filter((b) => activeFilter === "active" ? b.isActive : activeFilter === "inactive" ? !b.isActive : true)
    .sort((a, b) => a.priority - b.priority);
  const activeCt = banners.filter((b) => b.isActive).length;
  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleAdd = async () => {
    if (!form.title.trim() || !form.message.trim()) { Alert.alert("Required", "Title and message required."); return; }
    setSaving(true);
    try {
      await addBanner({ ...form, linkUrl: undefined, expiresAt: undefined });
      setShowAddModal(false);
      setForm({ title: "", message: "", type: "info", isActive: true, priority: 5, promoCode: "", targetAudience: "All", displayDuration: 5 });
    } catch { Alert.alert("Error", "Failed to add banner."); }
    finally { setSaving(false); }
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
            <Text style={[styles.title, { color: colors.foreground }]}>Banners</Text>
          </View>
          <Pressable onPress={() => setShowAddModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <SummaryPill label="Total" value={banners.length} color={colors.primary} colors={colors} />
          <SummaryPill label="Active" value={activeCt} color="#10b981" colors={colors} />
          <SummaryPill label="Inactive" value={banners.length - activeCt} color="#94a3b8" colors={colors} />
        </View>

        <View style={styles.filterRow}>
          {(["all", "active", "inactive"] as const).map((f) => (
            <Pressable key={f} onPress={() => setActiveFilter(f)} style={[styles.filterChip, { backgroundColor: activeFilter === f ? colors.primary : colors.card, borderColor: activeFilter === f ? colors.primary : colors.border }]}>
              <Text style={[styles.filterLabel, { color: activeFilter === f ? "#fff" : colors.mutedForeground }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BannerCard
            banner={item}
            colors={colors}
            onToggle={() => toggleBanner(item.id)}
            onDelete={() => Alert.alert("Delete Banner", `Delete "${item.title}"?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteBanner(item.id) },
            ])}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="image" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No banners found</Text>
            <Pressable onPress={() => setShowAddModal(true)} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Banner</Text>
            </Pressable>
          </View>
        }
      />

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Banner</Text>
                <Pressable onPress={() => setShowAddModal(false)} style={[styles.closeBtn, { borderColor: colors.border }]}>
                  <Feather name="x" size={16} color={colors.foreground} />
                </Pressable>
              </View>

              <ModalField label="Title *" value={form.title} onChangeText={(v) => setForm(f => ({ ...f, title: v }))} placeholder="Banner title" colors={colors} />
              <ModalField label="Message *" value={form.message} onChangeText={(v) => setForm(f => ({ ...f, message: v }))} placeholder="Banner message" colors={colors} multiline />
              <ModalField label="Promo Code" value={form.promoCode} onChangeText={(v) => setForm(f => ({ ...f, promoCode: v }))} placeholder="Optional promo code" colors={colors} />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TYPE</Text>
              <View style={styles.optionRow}>
                {(Object.keys(TYPE_META) as BannerType[]).map((t) => {
                  const m = TYPE_META[t];
                  return (
                    <Pressable key={t} onPress={() => setForm(f => ({ ...f, type: t }))} style={[styles.typeOption, { backgroundColor: form.type === t ? m.color + "20" : colors.card, borderColor: form.type === t ? m.color : colors.border }]}>
                      <Feather name={m.icon} size={12} color={form.type === t ? m.color : colors.mutedForeground} />
                      <Text style={[styles.typeOptionText, { color: form.type === t ? m.color : colors.foreground }]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>AUDIENCE</Text>
              <View style={styles.optionRow}>
                {AUDIENCE_OPTIONS.map((a) => (
                  <Pressable key={a} onPress={() => setForm(f => ({ ...f, targetAudience: a }))} style={[styles.typeOption, { backgroundColor: form.targetAudience === a ? colors.primary + "20" : colors.card, borderColor: form.targetAudience === a ? colors.primary : colors.border }]}>
                    <Text style={[styles.typeOptionText, { color: form.targetAudience === a ? colors.primary : colors.foreground }]}>{a}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.switchRow, { borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Active</Text>
                <Switch value={form.isActive} onValueChange={(v) => setForm(f => ({ ...f, isActive: v }))} trackColor={{ false: colors.border, true: colors.primary + "88" }} thumbColor={form.isActive ? colors.primary : colors.mutedForeground} />
              </View>

              <View style={styles.modalFooter}>
                <Pressable onPress={() => setShowAddModal(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleAdd} disabled={saving} style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.submitText}>{saving ? "Adding..." : "Add Banner"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ModalField({ label, value, onChangeText, placeholder, colors, multiline, keyboardType }: any) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, ...(multiline ? { minHeight: 80, textAlignVertical: "top" } : {}) }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} multiline={multiline} keyboardType={keyboardType}
      />
    </View>
  );
}

function BannerCard({ banner, colors, onToggle, onDelete }: { banner: Banner; colors: any; onToggle: () => void; onDelete: () => void }) {
  const m = TYPE_META[banner.type] ?? TYPE_META.info;
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.typeIcon, { backgroundColor: m.color + "15", borderColor: m.color + "30" }]}>
          <Feather name={m.icon} size={16} color={m.color} />
        </View>
        <View style={cardStyles.headerMid}>
          <Text style={[cardStyles.bannerTitle, { color: colors.foreground }]}>{banner.title}</Text>
          <View style={cardStyles.metaRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: m.color + "15", borderColor: m.color + "30" }]}>
              <Text style={[cardStyles.typeBadgeText, { color: m.color }]}>{m.label.toUpperCase()}</Text>
            </View>
            <View style={[cardStyles.audienceBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="users" size={9} color={colors.mutedForeground} />
              <Text style={[cardStyles.audienceText, { color: colors.mutedForeground }]}>{banner.targetAudience}</Text>
            </View>
          </View>
        </View>
        <Switch value={banner.isActive} onValueChange={onToggle} trackColor={{ false: colors.border, true: "#10b98188" }} thumbColor={banner.isActive ? "#10b981" : colors.mutedForeground} ios_backgroundColor={colors.border} />
      </View>
      <Text style={[cardStyles.message, { color: colors.mutedForeground }]} numberOfLines={2}>{banner.message}</Text>
      <View style={[cardStyles.footer, { borderTopColor: colors.border }]}>
        <View style={cardStyles.footerLeft}>
          <View style={[cardStyles.priorityBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="layers" size={9} color={colors.mutedForeground} />
            <Text style={[cardStyles.priorityText, { color: colors.mutedForeground }]}>P{banner.priority}</Text>
          </View>
          {banner.promoCode ? (
            <View style={[cardStyles.promoBadge, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
              <Feather name="tag" size={9} color="#f59e0b" />
              <Text style={[cardStyles.promoText, { color: "#f59e0b" }]}>{banner.promoCode}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={onDelete} style={[cardStyles.deleteBtn, { borderColor: "#ef444430" }]}>
          <Feather name="trash-2" size={12} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerMid: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeBadgeText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
  audienceBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  audienceText: { fontSize: 9, fontWeight: "500" },
  message: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1 },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  priorityText: { fontSize: 9, fontWeight: "500" },
  promoBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  promoText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  addBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 8 },
  filterRow: { flexDirection: "row", gap: 7 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14 },
  emptyText: { fontSize: 14 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  modalContainer: { flex: 1 },
  modalContent: { padding: 20, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  closeBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeOption: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeOptionText: { fontSize: 12, fontWeight: "500" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderTopWidth: 1 },
  switchLabel: { fontSize: 14, fontWeight: "500" },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },
  submitBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
