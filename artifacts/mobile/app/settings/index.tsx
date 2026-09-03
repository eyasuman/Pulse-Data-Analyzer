import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput, Alert, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";

function SettingSection({ title, icon, colors, children }: any) {
  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[sectionStyles.header, { borderBottomColor: colors.border }]}>
        <Feather name={icon} size={14} color={colors.primary} />
        <Text style={[sectionStyles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderBottomWidth: 1 },
  title: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, changeGatewayPassword } = useData();

  const [fee, setFee] = useState(String(settings.platformFee));
  const [noticePeriod, setNoticePeriod] = useState(String(settings.cancellationNoticePeriodHours));
  const [penalty, setPenalty] = useState(String(settings.cancellationPenaltyFee));
  const [cadence, setCadence] = useState(settings.reminderCadence);
  const [timeoutMinutes, setTimeoutMinutes] = useState(settings.inactivityTimeoutMinutes ?? 5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newRegEnabled, setNewRegEnabled] = useState(true);
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleSave = async () => {
    const feeNum = parseFloat(fee);
    const noticeNum = parseInt(noticePeriod);
    const penaltyNum = parseFloat(penalty);
    if (isNaN(feeNum) || feeNum < 0 || feeNum > 100) { Alert.alert("Invalid Fee", "Platform fee must be 0–100%."); return; }
    setSaving(true);
    try {
      await updateSettings({
        platformFee: feeNum,
        cancellationNoticePeriodHours: noticeNum,
        cancellationPenaltyFee: penaltyNum,
        reminderCadence: cadence,
        gatewayPassword: settings.gatewayPassword,
        inactivityTimeoutMinutes: timeoutMinutes,
      });
      Alert.alert("Saved", "Platform settings updated successfully.");
    } catch { Alert.alert("Error", "Failed to save settings."); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (currentPw !== settings.gatewayPassword) { Alert.alert("Incorrect", "Current password does not match."); return; }
    if (newPw.length < 4) { Alert.alert("Too Short", "New password must be at least 4 characters."); return; }
    if (newPw !== confirmPw) { Alert.alert("Mismatch", "New password and confirmation do not match."); return; }
    setChangingPw(true);
    try {
      await changeGatewayPassword(newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      Alert.alert("Updated", "Gateway password changed successfully.");
    } catch { Alert.alert("Error", "Failed to update password."); }
    finally { setChangingPw(false); }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </Pressable>
        <View style={styles.titleGroup}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        </View>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
          <Feather name="save" size={14} color="#fff" />
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

      {/* Platform Fee */}
      <SettingSection title="Platform Fee" icon="dollar-sign" colors={colors}>
        <FieldRow label="Platform Fee %" desc="Percentage taken from each transaction" value={fee} onChangeText={setFee} unit="%" colors={colors} />
        <FieldRow label="Cancellation Notice" desc="Hours required before cancelling" value={noticePeriod} onChangeText={setNoticePeriod} unit="hrs" colors={colors} />
        <FieldRow label="Cancellation Penalty" desc="Fee charged for late cancellations" value={penalty} onChangeText={setPenalty} unit="AED" colors={colors} />
      </SettingSection>

      {/* Reminder Cadence */}
      <SettingSection title="Reminder Cadence" icon="bell" colors={colors}>
        <View style={styles.cadenceRow}>
          {(["weekly", "daily", "same-day"] as const).map((c) => (
            <Pressable key={c} onPress={() => setCadence(c)} style={[styles.cadenceChip, { backgroundColor: cadence === c ? colors.primary + "20" : colors.card, borderColor: cadence === c ? colors.primary : colors.border, flex: 1 }]}>
              <Text style={[styles.cadenceText, { color: cadence === c ? colors.primary : colors.mutedForeground }]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </SettingSection>

      {/* Inactivity Timeout */}
      <SettingSection title="Security" icon="shield" colors={colors}>
        <FieldRow label="Inactivity Timeout" desc="Minutes before auto-lock" value={String(timeoutMinutes)} onChangeText={(v: string) => setTimeoutMinutes(parseInt(v) || 5)} unit="min" colors={colors} />
      </SettingSection>

      {/* Feature Toggles */}
      <SettingSection title="Feature Toggles" icon="toggle-left" colors={colors}>
        <ToggleRow label="Maintenance Mode" desc="Disable app for maintenance" value={maintenanceMode} onToggle={setMaintenanceMode} danger colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ToggleRow label="New Registrations" desc="Allow new provider sign-ups" value={newRegEnabled} onToggle={setNewRegEnabled} colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ToggleRow label="Reviews" desc="Show patient reviews publicly" value={reviewsEnabled} onToggle={setReviewsEnabled} colors={colors} />
      </SettingSection>

      {/* Gateway Password */}
      <SettingSection title="Gateway Password" icon="lock" colors={colors}>
        <View style={[styles.pwHint, { borderBottomColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.pwHintText, { color: colors.mutedForeground }]}>
            The gateway password protects admin access. Use a 4-digit PIN for quick PIN entry, or any string for password mode.
          </Text>
        </View>
        <View style={{ padding: 14, gap: 10 }}>
          <PwField label="Current Password" value={currentPw} onChangeText={setCurrentPw} secureTextEntry={!showPw} colors={colors} />
          <PwField label="New Password" value={newPw} onChangeText={setNewPw} secureTextEntry={!showPw} colors={colors} />
          <PwField label="Confirm New Password" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry={!showPw} colors={colors} />
        </View>
        <View style={styles.pwActions}>
          <Pressable onPress={() => setShowPw(!showPw)} style={[styles.showBtn, { borderColor: colors.border }]}>
            <Feather name={showPw ? "eye-off" : "eye"} size={14} color={colors.mutedForeground} />
            <Text style={[styles.showText, { color: colors.mutedForeground }]}>{showPw ? "Hide" : "Show"}</Text>
          </Pressable>
          <Pressable onPress={handleChangePassword} disabled={changingPw} style={[styles.changePwBtn, { backgroundColor: colors.primary, opacity: changingPw ? 0.7 : 1, flex: 1 }]}>
            <Feather name="key" size={14} color="#fff" />
            <Text style={styles.changePwText}>{changingPw ? "Updating..." : "Change Password"}</Text>
          </Pressable>
        </View>
      </SettingSection>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>System Info</Text>
        <InfoRow label="Platform Fee" value={`${settings.platformFee}%`} colors={colors} />
        <InfoRow label="Cancellation Notice" value={`${settings.cancellationNoticePeriodHours}h`} colors={colors} />
        <InfoRow label="Reminder Cadence" value={settings.reminderCadence} colors={colors} />
        <InfoRow label="Inactivity Timeout" value={`${settings.inactivityTimeoutMinutes} min`} colors={colors} />
      </View>
    </ScrollView>
  );
}

function FieldRow({ label, desc, value, onChangeText, unit, colors }: any) {
  return (
    <View style={[styles.fieldRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
      <View style={styles.fieldInfo}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.fieldDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TextInput style={[styles.input, { color: colors.foreground }]} value={value} onChangeText={onChangeText} keyboardType="numeric" />
        <Text style={[styles.inputUnit, { color: colors.mutedForeground }]}>{unit}</Text>
      </View>
    </View>
  );
}

function ToggleRow({ label, desc, value, onToggle, danger, colors }: any) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.fieldInfo}>
        <Text style={[styles.fieldLabel, { color: danger && value ? "#ef4444" : colors.foreground }]}>{label}</Text>
        <Text style={[styles.fieldDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.border, true: danger ? "#ef444488" : colors.primary + "88" }} thumbColor={value ? (danger ? "#ef4444" : colors.primary) : colors.mutedForeground} ios_backgroundColor={colors.border} />
    </View>
  );
}

function PwField({ label, value, onChangeText, secureTextEntry, colors }: any) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.pwFieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.pwInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
        value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} autoCapitalize="none"
      />
    </View>
  );
}

function InfoRow({ label, value, colors }: any) {
  return (
    <View style={[styles.infoRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  divider: { height: 1, marginHorizontal: 14 },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 12 },
  fieldInfo: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium" },
  fieldDesc: { fontSize: 11, marginTop: 2, lineHeight: 16, fontFamily: "Inter_400Regular" },
  inputBox: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, minWidth: 80 },
  input: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1, padding: 0, textAlign: "right" },
  inputUnit: { fontSize: 11, marginLeft: 4 },
  cadenceRow: { flexDirection: "row", gap: 8, padding: 14, paddingTop: 8 },
  cadenceChip: { paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  cadenceText: { fontSize: 11, fontWeight: "600" },
  pwHint: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 14, paddingBottom: 10, borderBottomWidth: 1 },
  pwHintText: { fontSize: 12, flex: 1, lineHeight: 18, fontFamily: "Inter_400Regular" },
  pwActions: { flexDirection: "row", gap: 10, padding: 14, paddingTop: 0 },
  showBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  showText: { fontSize: 12 },
  changePwBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingVertical: 10 },
  changePwText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  pwFieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  pwInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoTitle: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", padding: 14, paddingBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 12, fontWeight: "500", fontFamily: "Inter_500Medium" },
});
