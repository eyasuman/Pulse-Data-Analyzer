import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ConnectionWarningProps {
  message?: string;
  onRetry: () => Promise<void>;
  testID?: string;
  retryTestID?: string;
}

export function ConnectionWarning({
  message = "We couldn't load live data. Check your connection and try again.",
  onRetry,
  testID,
  retryTestID,
}: ConnectionWarningProps) {
  const colors = useColors();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View
      testID={testID}
      style={[styles.warning, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "50" }]}
    >
      <Feather name="wifi-off" size={18} color={colors.warning} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground }]}>Connection issue</Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      </View>
      <Pressable
        testID={retryTestID}
        accessibilityRole="button"
        accessibilityLabel="Retry connection"
        onPress={handleRetry}
        disabled={retrying}
        style={({ pressed }) => [styles.retry, { borderColor: colors.warning, opacity: pressed || retrying ? 0.65 : 1 }]}
      >
        {retrying ? (
          <ActivityIndicator size="small" color={colors.warning} />
        ) : (
          <>
            <Feather name="refresh-cw" size={14} color={colors.warning} />
            <Text style={[styles.retryText, { color: colors.warning }]}>Retry</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  warning: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  message: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  retry: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7 },
  retryText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
});