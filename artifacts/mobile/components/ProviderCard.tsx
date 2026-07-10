import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Doctor } from "@/context/DataContext";
import { StatusBadge } from "./StatusBadge";

const TYPE_ICONS: Record<string, any> = {
  Doctor: "activity",
  doctor: "activity",
  Nurse: "heart",
  nurse: "heart",
  "Home Care": "home",
  "home care": "home",
  Physiotherapist: "zap",
  physiotherapist: "zap",
  "Healthcare Facility": "grid",
  "healthcare facility": "grid",
};

export function ProviderCard({ doctor, onPress }: { doctor: Doctor; onPress?: () => void }) {
  const colors = useColors();
  const initials = doctor.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const typeKey = doctor.providerType ?? doctor.category ?? "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed ? { opacity: 0.88 } : undefined,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "33" }]}>
          <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{doctor.name}</Text>
          <Text style={[styles.specialty, { color: colors.mutedForeground }]}>{doctor.specialty}</Text>
          <View style={styles.tagRow}>
            <View style={[styles.typeTag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name={TYPE_ICONS[typeKey] || "user"} size={9} color={colors.mutedForeground} />
              <Text style={[styles.typeText, { color: colors.mutedForeground }]}>{typeKey}</Text>
            </View>
            {doctor.city ? (
              <View style={[styles.typeTag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="map-pin" size={9} color={colors.mutedForeground} />
                <Text style={[styles.typeText, { color: colors.mutedForeground }]}>{doctor.city}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.right}>
          <StatusBadge status={doctor.status} />
          <Text style={[styles.fee, { color: colors.foreground }]}>AED {doctor.consultationFee}</Text>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.modeRow}>
        {doctor.serviceModes?.video && <ModeChip icon="video" label="Video" colors={colors} />}
        {doctor.serviceModes?.audio && <ModeChip icon="phone" label="Audio" colors={colors} />}
        {doctor.serviceModes?.inPerson && <ModeChip icon="user" label="In-Person" colors={colors} />}
        {doctor.serviceModes?.homeVisit && <ModeChip icon="home" label="Home" colors={colors} />}
        {doctor.experienceYears ? (
          <View style={[styles.modeChip, { backgroundColor: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)" }]}>
            <Feather name="award" size={9} color={colors.primary} />
            <Text style={[styles.modeLabel, { color: colors.primary }]}>{doctor.experienceYears}y exp</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function ModeChip({ icon, label, colors }: { icon: any; label: string; colors: any }) {
  return (
    <View style={[styles.modeChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Feather name={icon} size={9} color={colors.mutedForeground} />
      <Text style={[styles.modeLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: { width: 48, height: 48, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  specialty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", gap: 5, marginTop: 4, flexWrap: "wrap" },
  typeTag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeText: { fontSize: 9, fontWeight: "500", fontFamily: "Inter_500Medium" },
  right: { alignItems: "flex-end", gap: 6 },
  fee: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginVertical: 12 },
  modeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  modeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  modeLabel: { fontSize: 10, fontWeight: "500", fontFamily: "Inter_500Medium" },
});
