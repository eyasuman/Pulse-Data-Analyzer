import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform,
  Modal, ScrollView, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, Institute, InstituteStatus, InstituteType } from "@/context/DataContext";
import { ActionModal, NoticeModal } from "@/components/ActionModal";

const TYPE_ICONS: Record<InstituteType, any> = {
  Hospital: "activity", Clinic: "user", "Diagnostic Center": "search",
  Pharmacy: "package", Rehabilitation: "zap", Dental: "smile", "Specialty Center": "star",
};
const STATUS_FILTERS: Array<InstituteStatus | "All"> = ["All", "Active", "Pending", "Suspended"];
const INSTITUTE_TYPES: InstituteType[] = ["Hospital", "Clinic", "Diagnostic Center", "Pharmacy", "Rehabilitation", "Dental", "Specialty Center"];

const STATUS_COLORS: Record<string, string> = {
  Active: "#10b981", Pending: "#f59e0b", Suspended: "#ef4444",
};

export default function InstitutesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { institutes, addInstitute, updateInstituteStatus } = useData();
  const [activeFilter, setActiveFilter] = useState<InstituteStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Hospital" as InstituteType, city: "", address: "", phone: "", email: "", licenseNo: "" });
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMenu, setStatusMenu] = useState<{ id: string; name: string; statuses: InstituteStatus[] } | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  const filtered = useMemo(() => {
    let result = institutes;
    if (activeFilter !== "All") result = result.filter((i) => i.status === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || i.city.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
    }
    return result;
  }, [institutes, activeFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: institutes.length };
    (["Active", "Pending", "Suspended"] as InstituteStatus[]).forEach((s) => { c[s] = institutes.filter((i) => i.status === s).length; });
    return c;
  }, [institutes]);

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleAdd = async () => {
    if (!form.name.trim() || !form.city.trim()) { setNotice({ title: "Required", message: "Name and city are required." }); return; }
    setSaving(true);
    try {
      await addInstitute({ ...form, status: "Pending", totalDoctors: 0, services: [] });
      setShowAddModal(false);
      setForm({ name: "", type: "Hospital", city: "", address: "", phone: "", email: "", licenseNo: "" });
    } catch (error: any) { setNotice({ title: "Error", message: error?.message ?? "Failed to add institute." }); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: InstituteStatus) => {
    setUpdatingId(id);
    try {
      await updateInstituteStatus(id, status);
      setNotice({ title: "Updated", message: `Institute status set to ${status}.` });
    } catch (error: any) {
      setNotice({ title: "Update Failed", message: error?.message ?? "Could not update institute status." });
    } finally {
      setUpdatingId(null);
    }
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
            <Text style={[styles.title, { color: colors.foreground }]}>Institutes</Text>
          </View>
          <Pressable onPress={() => setShowAddModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput style={[styles.searchInput, { color: colors.foreground }]} placeholder="Search institutes..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
          {search ? <Pressable onPress={() => setSearch("")}><Feather name="x" size={15} color={colors.mutedForeground} /></Pressable> : null}
        </View>

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <Pressable key={f} onPress={() => setActiveFilter(f)} style={[styles.filterChip, { backgroundColor: activeFilter === f ? colors.primary : colors.card, borderColor: activeFilter === f ? colors.primary : colors.border }]}>
              <Text style={[styles.filterLabel, { color: activeFilter === f ? "#fff" : colors.mutedForeground }]}>{f}</Text>
              <Text style={[styles.filterCount, { color: activeFilter === f ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{counts[f] ?? 0}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InstituteCard
            institute={item}
            colors={colors}
            disabled={updatingId === item.id}
            onOpenStatusMenu={() => setStatusMenu({
              id: item.id,
              name: item.name,
              statuses: (["Active", "Pending", "Suspended"] as InstituteStatus[]).filter((s) => s !== item.status),
            })}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><Feather name="grid" size={32} color={colors.mutedForeground} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No institutes found</Text></View>}
      />

      <ActionModal
        visible={!!statusMenu}
        title="Change Institute Status"
        message={statusMenu ? `Choose a new status for ${statusMenu.name}.` : undefined}
        options={(statusMenu?.statuses ?? []).map((status) => ({
          label: status,
          destructive: status === "Suspended",
          onPress: () => handleStatusChange(statusMenu!.id, status),
        }))}
        onClose={() => setStatusMenu(null)}
      />
      <NoticeModal
        visible={!!notice}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Institute</Text>
                <Pressable onPress={() => setShowAddModal(false)} style={[styles.closeBtn, { borderColor: colors.border }]}>
                  <Feather name="x" size={16} color={colors.foreground} />
                </Pressable>
              </View>

              <FieldInput label="Name *" value={form.name} onChangeText={(v: string) => setForm(f => ({ ...f, name: v }))} placeholder="Institute name" colors={colors} />
              <FieldInput label="City *" value={form.city} onChangeText={(v: string) => setForm(f => ({ ...f, city: v }))} placeholder="City" colors={colors} />
              <FieldInput label="Address" value={form.address} onChangeText={(v: string) => setForm(f => ({ ...f, address: v }))} placeholder="Full address" colors={colors} />
              <FieldInput label="Phone" value={form.phone} onChangeText={(v: string) => setForm(f => ({ ...f, phone: v }))} placeholder="+971..." colors={colors} keyboardType="phone-pad" />
              <FieldInput label="Email" value={form.email} onChangeText={(v: string) => setForm(f => ({ ...f, email: v }))} placeholder="contact@..." colors={colors} keyboardType="email-address" />
              <FieldInput label="License No." value={form.licenseNo} onChangeText={(v: string) => setForm(f => ({ ...f, licenseNo: v }))} placeholder="LIC-..." colors={colors} />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TYPE</Text>
              <View style={styles.typeGrid}>
                {INSTITUTE_TYPES.map((t) => (
                  <Pressable key={t} onPress={() => setForm(f => ({ ...f, type: t }))} style={[styles.typeOption, { backgroundColor: form.type === t ? colors.primary + "20" : colors.card, borderColor: form.type === t ? colors.primary : colors.border }]}>
                    <Feather name={TYPE_ICONS[t]} size={12} color={form.type === t ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.typeOptionText, { color: form.type === t ? colors.primary : colors.foreground }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalFooter}>
                <Pressable onPress={() => setShowAddModal(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleAdd} disabled={saving} style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.submitText}>{saving ? "Adding..." : "Add Institute"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FieldInput({ label, value, onChangeText, placeholder, colors, keyboardType }: any) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType} />
    </View>
  );
}

function InstituteCard({ institute, colors, disabled, onOpenStatusMenu }: { institute: Institute; colors: any; disabled: boolean; onOpenStatusMenu: () => void }) {
  const statusColor = STATUS_COLORS[institute.status] ?? "#94a3b8";
  const nextStatuses = (["Active", "Pending", "Suspended"] as InstituteStatus[]).filter(s => s !== institute.status);
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.icon, { backgroundColor: "#818cf815", borderColor: "#818cf830" }]}>
          <Feather name={TYPE_ICONS[institute.type as InstituteType] ?? "grid"} size={16} color="#818cf8" />
        </View>
        <View style={cardStyles.headerMid}>
          <Text style={[cardStyles.name, { color: colors.foreground }]}>{institute.name}</Text>
          <View style={cardStyles.metaRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: "#818cf815", borderColor: "#818cf830" }]}>
              <Text style={[cardStyles.typeBadgeText, { color: "#818cf8" }]}>{institute.type.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[cardStyles.locText, { color: colors.mutedForeground }]}>{institute.city}</Text>
        </View>
        <View style={cardStyles.headerRight}>
          <View style={[cardStyles.statusBadge, { backgroundColor: statusColor + "15", borderColor: statusColor + "30" }]}>
            <Text style={[cardStyles.statusText, { color: statusColor }]}>{institute.status.toUpperCase()}</Text>
          </View>
            <Pressable testID={`institute-status-menu-${institute.id}`} accessibilityRole="button" accessibilityLabel={`Change status for ${institute.name}`} disabled={disabled} onPress={onOpenStatusMenu} style={{ opacity: disabled ? 0.5 : 1 }}>
            <Feather name="more-horizontal" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
      {institute.services.length > 0 && (
        <View style={cardStyles.servicesRow}>
          {institute.services.slice(0, 4).map((s) => (
            <View key={s} style={[cardStyles.serviceChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[cardStyles.serviceText, { color: colors.mutedForeground }]}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 42, height: 42, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerMid: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeBadgeText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
  locText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  headerRight: { alignItems: "flex-end", gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  servicesRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  serviceChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  serviceText: { fontSize: 9, fontWeight: "500" },
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
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  filterCount: { fontSize: 10 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
  modalContainer: { flex: 1 },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  closeBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  typeOption: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  typeOptionText: { fontSize: 11, fontWeight: "500" },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },
  submitBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
