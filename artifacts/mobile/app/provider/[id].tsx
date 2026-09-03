import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useData, DoctorStatus } from "@/context/DataContext";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_ACTIONS: Array<{ status: DoctorStatus; color: string; label: string }> = [
  { status: "Active", color: "#10b981", label: "Activate" },
  { status: "Pending", color: "#f59e0b", label: "Set Pending" },
  { status: "Disabled", color: "#94a3b8", label: "Disable" },
  { status: "Declined", color: "#ef4444", label: "Decline" },
];

function DetailItem({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={[detailStyles.item]}>
      <Feather name={icon} size={12} color={colors.mutedForeground} />
      <View style={detailStyles.copy}>
        <Text style={[detailStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[detailStyles.value, { color: colors.foreground }]} numberOfLines={2}>{value || "—"}</Text>
      </View>
    </View>
  );
}
const detailStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "flex-start", gap: 8, width: "47%", minWidth: 135 },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 9, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { fontSize: 12, fontWeight: "500", marginTop: 2, lineHeight: 17, fontFamily: "Inter_500Medium" },
});

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doctors, updateDoctorStatus } = useData();
  const [isUpdating, setIsUpdating] = useState(false);

  const doctor = doctors.find((d) => d.id === id);

  if (!doctor) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Provider not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn2, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleStatusChange = (newStatus: DoctorStatus) => {
    Alert.alert(
      `${newStatus} Provider`,
      `Are you sure you want to set ${doctor.name} to ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "Declined" || newStatus === "Disabled" ? "destructive" : "default",
          onPress: async () => {
            setIsUpdating(true);
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await updateDoctorStatus(doctor.id, newStatus);
              Alert.alert("Updated", `Provider status set to ${newStatus}.`);
            } catch (error: any) {
              Alert.alert("Update Failed", error?.message ?? "Could not update provider status.");
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 30) }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Nav */}
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.mutedForeground }]}>PROVIDER DETAIL</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.profileTop}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {doctor.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <StatusBadge status={doctor.status} size="md" />
            <Text style={[styles.name, { color: colors.foreground }]}>{doctor.name}</Text>
            <Text style={[styles.specialty, { color: colors.mutedForeground }]}>
              {doctor.specialty}{doctor.providerType ? ` · ${doctor.providerType}` : ""}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.detailGrid}>
          <DetailItem icon="mail" label="Email" value={doctor.email} colors={colors} />
          {doctor.phone ? <DetailItem icon="phone" label="Phone" value={doctor.phone} colors={colors} /> : null}
          {doctor.city ? <DetailItem icon="map-pin" label="City" value={doctor.city} colors={colors} /> : null}
          <DetailItem icon="dollar-sign" label="Consultation Fee" value={`AED ${doctor.consultationFee}`} colors={colors} />
          {doctor.experienceYears ? <DetailItem icon="award" label="Experience" value={`${doctor.experienceYears} years`} colors={colors} /> : null}
          <DetailItem icon="file-text" label="License No." value={doctor.licenseNo} colors={colors} />
        </View>

        {doctor.bio ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.bioLabel, { color: colors.mutedForeground }]}>BIO</Text>
            <Text style={[styles.bio, { color: colors.foreground }]}>{doctor.bio}</Text>
          </>
        ) : null}
      </View>

      {/* Service Modes */}
      <View style={[styles.modesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Service Modes</Text>
        <View style={styles.modesGrid}>
          {doctor.serviceModes?.video && <ModeTag icon="video" label="Video" active colors={colors} />}
          {doctor.serviceModes?.audio && <ModeTag icon="phone" label="Audio" active colors={colors} />}
          {doctor.serviceModes?.inPerson && <ModeTag icon="user" label="In-Person" active colors={colors} />}
          {doctor.serviceModes?.homeVisit && <ModeTag icon="home" label="Home Visit" active colors={colors} />}
        </View>
      </View>

      {/* Status Actions */}
      <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Change Status</Text>
        <View style={styles.actionsGrid}>
          {STATUS_ACTIONS.filter((a) => a.status !== doctor.status).map((action) => (
            <Pressable
              key={action.status}
              onPress={() => handleStatusChange(action.status)}
              disabled={isUpdating}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: action.color + "15",
                  borderColor: action.color + "30",
                  opacity: pressed || isUpdating ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Meta */}
      <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>
          Joined {new Date(doctor.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </Text>
        <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>ID: {doctor.id}</Text>
      </View>
    </ScrollView>
  );
}

function ModeTag({ icon, label, active, colors }: { icon: any; label: string; active: boolean; colors: any }) {
  return (
    <View style={[styles.modeTag, { backgroundColor: active ? colors.primary + "15" : colors.muted, borderColor: active ? colors.primary + "30" : colors.border }]}>
      <Feather name={icon} size={12} color={active ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.modeTagLabel, { color: active ? colors.primary : colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtn2: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  profileCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  profileTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  avatar: { width: 56, height: 56, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  specialty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: 1 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 16 },
  bioLabel: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modesCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  modesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  modeTag: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  modeTagLabel: { fontSize: 12, fontWeight: "500", fontFamily: "Inter_500Medium" },
  actionsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionLabel: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  metaCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  metaItem: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.2 },
});
