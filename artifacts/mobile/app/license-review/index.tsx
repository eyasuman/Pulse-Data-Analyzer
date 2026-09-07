import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
  Linking, ActivityIndicator, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useData, Doctor } from "@/context/DataContext";
import { ActionModal, NoticeModal } from "@/components/ActionModal";

export default function LicenseReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doctors, verifyDoctorLicense, getDoctorLicenseUrl } = useData();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<{ doctor: Doctor; approved: boolean } | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  // Doctors with a licenseFile uploaded but not yet Active
  const pending = useMemo(
    () => doctors.filter((d) => d.licenseFile && d.status === "Pending"),
    [doctors]
  );

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleViewLicense = async (doctor: Doctor) => {
    setViewingId(doctor.id);
    try {
      const { signedUrl, fileName } = await getDoctorLicenseUrl(doctor.id);
      await openLicenseUrl(signedUrl);
    } catch (err: any) {
      setNotice({ title: "Error", message: err?.message ?? "Could not fetch license URL." });
    } finally {
      setViewingId(null);
    }
  };

  const openLicenseUrl = async (signedUrl: string) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const canOpen = await Linking.canOpenURL(signedUrl);
      if (!canOpen) throw new Error("This file cannot be opened on this device.");
      await Linking.openURL(signedUrl);
    } catch (err: any) {
      setNotice({ title: "Cannot Open", message: err?.message ?? `Copy this URL to view:\n${signedUrl}` });
    }
  };

  const handleVerify = (doctor: Doctor, approved: boolean) => {
    if (loadingId) return;
    setVerifyTarget({ doctor, approved });
  };

  const performVerify = async () => {
    if (!verifyTarget || loadingId) return;
    const { doctor, approved } = verifyTarget;
    setLoadingId(doctor.id);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await verifyDoctorLicense(doctor.id, approved);
      setNotice({
        title: approved ? "Approved" : "Rejected",
        message: `${doctor.name} has been ${approved ? "activated as a provider" : "declined"}.`,
      });
    } catch (err: any) {
      setNotice({ title: "Action Failed", message: err?.message ?? "Could not update the license. Please try again." });
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
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN · DOCTORS</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>License Review</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
            <Feather name="clock" size={11} color="#f59e0b" />
            <Text style={[styles.countText, { color: "#f59e0b" }]}>{pending.length}</Text>
          </View>
        </View>

        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: "#818cf815", borderColor: "#818cf830" }]}>
          <Feather name="shield" size={14} color="#818cf8" />
          <Text style={[styles.infoText, { color: "#818cf8" }]}>
            License files are stored in a private bucket. View links expire in 10 minutes and are never public.
          </Text>
        </View>
      </View>

      <FlatList
        data={pending}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <LicenseCard
            doctor={item}
            colors={colors}
            isLoading={loadingId === item.id}
            isViewing={viewingId === item.id}
            onView={() => handleViewLicense(item)}
            getLicenseUrl={getDoctorLicenseUrl}
            onOpenUrl={openLicenseUrl}
            onApprove={() => handleVerify(item, true)}
            onReject={() => handleVerify(item, false)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: "#10b98115", borderColor: "#10b98130" }]}>
              <Feather name="check-circle" size={32} color="#10b981" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All Clear</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No doctors are pending license verification.
            </Text>
          </View>
        }
      />
      <ActionModal
        visible={!!verifyTarget}
        title={verifyTarget?.approved ? "Approve License" : "Reject License"}
        message={verifyTarget ? `${verifyTarget.approved ? "Approve" : "Reject"} ${verifyTarget.doctor.name}'s license?\n\n${verifyTarget.approved ? "Their provider account will be activated." : "Their account will be set to Declined."}` : undefined}
        options={verifyTarget ? [{
          label: verifyTarget.approved ? "Approve" : "Reject",
          destructive: !verifyTarget.approved,
          onPress: performVerify,
        }] : []}
        onClose={() => setVerifyTarget(null)}
      />
      <NoticeModal
        visible={!!notice}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </View>
  );
}

function LicenseCard({
  doctor, colors, isLoading, isViewing, onView, getLicenseUrl, onOpenUrl, onApprove, onReject,
}: {
  doctor: Doctor;
  colors: any;
  isLoading: boolean;
  isViewing: boolean;
  onView: () => void;
  getLicenseUrl: (id: string) => Promise<{ signedUrl: string; fileName: string }>;
  onOpenUrl: (url: string) => Promise<void>;
  onApprove: () => void;
  onReject: () => void;
}) {
  const initials = doctor.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const lf = doctor.licenseFile;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState(lf?.name ?? "license");
  const [previewLoading, setPreviewLoading] = useState(!!lf);
  const [previewFailed, setPreviewFailed] = useState(false);
  const fetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lf) return;
    const fetchKey = `${doctor.id}:${lf.path}:${lf.name}`;
    if (fetchKeyRef.current === fetchKey) return;
    fetchKeyRef.current = fetchKey;
    let active = true;
    setPreviewLoading(true);
    setPreviewFailed(false);
    getLicenseUrl(doctor.id)
      .then(({ signedUrl, fileName }) => {
        if (!active) return;
        setPreviewUrl(signedUrl);
        setPreviewFileName(fileName || lf.name || "license");
      })
      .catch(() => {
        if (active) setPreviewFailed(true);
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [doctor.id, lf?.path, lf?.name]);

  const fileType = (lf?.type ?? "").toLowerCase();
  const fileName = previewFileName || lf?.name || "license";
  const isPdf = fileType === "application/pdf" || /\.pdf$/i.test(fileName);
  const isImage = fileType.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(fileName);
  const supportsInlinePreview = !!previewUrl && !previewFailed && (isImage || (isPdf && Platform.OS === "web"));
  const fileSize = formatFileSize(lf?.size);

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={cardStyles.header}>
        <View style={[cardStyles.avatar, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
          <Text style={[cardStyles.initials, { color: "#f59e0b" }]}>{initials}</Text>
        </View>
        <View style={cardStyles.headerInfo}>
          <Text style={[cardStyles.name, { color: colors.foreground }]}>{doctor.name}</Text>
          <Text style={[cardStyles.specialty, { color: colors.mutedForeground }]}>
            {doctor.specialty}{doctor.city ? ` · ${doctor.city}` : ""}
          </Text>
          <View style={[cardStyles.pendingBadge, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
            <Feather name="clock" size={9} color="#f59e0b" />
            <Text style={[cardStyles.pendingText, { color: "#f59e0b" }]}>PENDING VERIFICATION</Text>
          </View>
        </View>
      </View>

      {/* License file header and inline private preview */}
      {lf && (
        <View style={cardStyles.previewSection}>
          <View style={[cardStyles.fileHeader, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name={isPdf ? "file-text" : isImage ? "image" : "file"} size={14} color={colors.mutedForeground} />
            <View style={cardStyles.fileMeta}>
              <Text numberOfLines={2} style={[cardStyles.fileName, { color: colors.foreground }]}>{fileName}</Text>
              <Text style={[cardStyles.fileType, { color: colors.mutedForeground }]}>
                {lf.type || "Unknown file"}{fileSize ? ` · ${fileSize}` : ""} · Private bucket
              </Text>
            </View>
            {previewUrl && (
              <Pressable
                onPress={() => onOpenUrl(previewUrl)}
                style={({ pressed }) => [
                  cardStyles.openLink,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="external-link" size={11} color="#818cf8" />
                <Text style={[cardStyles.viewText, { color: "#818cf8" }]}>Open in new tab</Text>
              </Pressable>
            )}
          </View>

          {previewLoading ? (
            <View style={[cardStyles.previewFallback, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color="#818cf8" />
              <Text style={[cardStyles.fallbackText, { color: colors.mutedForeground }]}>Preparing private preview…</Text>
            </View>
          ) : supportsInlinePreview && isImage ? (
            <View style={[cardStyles.previewFrame, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Image
                source={{ uri: previewUrl! }}
                resizeMode="contain"
                accessibilityLabel={`Preview of ${fileName}`}
                style={cardStyles.imagePreview}
                onError={() => setPreviewFailed(true)}
              />
            </View>
          ) : supportsInlinePreview && isPdf && Platform.OS === "web" ? (
            <View style={[cardStyles.previewFrame, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              {React.createElement("iframe", {
                src: previewUrl,
                title: `Preview of ${fileName}`,
                style: { width: "100%", height: 400, border: 0, borderRadius: 10 },
              })}
            </View>
          ) : (
            <View style={[cardStyles.fileRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="file-text" size={14} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[cardStyles.fallbackText, { color: colors.mutedForeground }]}>
                  {previewFailed ? "Inline preview unavailable." : "Preview is not supported for this file type."}
                </Text>
              </View>
              <Pressable
                onPress={onView}
                disabled={isViewing}
                style={({ pressed }) => [
                  cardStyles.viewBtn,
                  { backgroundColor: "#818cf815", borderColor: "#818cf830", opacity: pressed || isViewing ? 0.7 : 1 },
                ]}
              >
                {isViewing ? (
                  <ActivityIndicator size={12} color="#818cf8" />
                ) : (
                  <>
                    <Feather name="external-link" size={11} color="#818cf8" />
                    <Text style={[cardStyles.viewText, { color: "#818cf8" }]}>View</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Contact row */}
      <View style={cardStyles.detailRow}>
        <View style={cardStyles.detailItem}>
          <Feather name="mail" size={11} color={colors.mutedForeground} />
          <Text style={[cardStyles.detailText, { color: colors.mutedForeground }]}>{doctor.email}</Text>
        </View>
        <View style={cardStyles.detailItem}>
          <Feather name="file-text" size={11} color={colors.mutedForeground} />
          <Text style={[cardStyles.detailText, { color: colors.mutedForeground }]}>{doctor.licenseNo}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={[cardStyles.actions, { borderTopColor: colors.border }]}>
        <Pressable
            testID={`license-reject-${doctor.id}`}
            accessibilityLabel="Reject license"
          onPress={onReject}
          disabled={isLoading}
          style={({ pressed }) => [
            cardStyles.actionBtn,
            { backgroundColor: "#ef444415", borderColor: "#ef444430", opacity: pressed || isLoading ? 0.7 : 1 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size={14} color="#ef4444" />
          ) : (
            <>
              <Feather name="x-circle" size={14} color="#ef4444" />
              <Text style={[cardStyles.actionText, { color: "#ef4444" }]}>Reject</Text>
            </>
          )}
        </Pressable>
        <Pressable
          testID={`license-approve-${doctor.id}`}
          accessibilityLabel="Approve license"
          onPress={onApprove}
          disabled={isLoading}
          style={({ pressed }) => [
            cardStyles.actionBtn,
            { backgroundColor: "#10b98115", borderColor: "#10b98130", opacity: pressed || isLoading ? 0.7 : 1 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size={14} color="#10b981" />
          ) : (
            <>
              <Feather name="check-circle" size={14} color="#10b981" />
              <Text style={[cardStyles.actionText, { color: "#10b981" }]}>Approve</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerInfo: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  specialty: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: "flex-start", marginTop: 2 },
  pendingText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
  previewSection: { gap: 8 },
  fileHeader: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 10 },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 12, fontWeight: "500", fontFamily: "Inter_500Medium" },
  fileType: { fontSize: 10, marginTop: 1, fontFamily: "Inter_400Regular" },
  openLink: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingLeft: 4 },
  previewFrame: { width: "100%", minHeight: 180, borderRadius: 10, borderWidth: 1, overflow: "hidden", padding: 8 },
  imagePreview: { width: "100%", height: 300, borderRadius: 8 },
  previewFallback: { minHeight: 100, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  fallbackText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 10 },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  viewText: { fontSize: 11, fontWeight: "600" },
  detailRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  detailText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10, borderTopWidth: 1, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  countBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  countText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },
});
