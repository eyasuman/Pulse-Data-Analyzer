import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, Animated, Platform, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  onUnlock: () => void;
  correctPassword: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
const PIN_LENGTH = 4;

export default function GatewayScreen({ onUnlock, correctPassword }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const isPinMode = correctPassword.length === 4 && /^\d{4}$/.test(correctPassword);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!isPinMode) return;
    if (entered.length === PIN_LENGTH) {
      if (entered === correctPassword) {
        onUnlock();
      } else {
        triggerError();
      }
    }
  }, [entered]);

  const triggerError = () => {
    setError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      setEntered("");
      setError(false);
    });
  };

  const handleKey = (key: string) => {
    if (key === "⌫") {
      setEntered((p) => p.slice(0, -1));
    } else if (key === "") {
      // no-op
    } else {
      if (isPinMode && entered.length >= PIN_LENGTH) return;
      setEntered((p) => p + key);
    }
  };

  const handlePasswordSubmit = () => {
    if (!isPinMode) {
      if (entered === correctPassword) {
        onUnlock();
      } else {
        triggerError();
      }
    }
  };

  return (
    <Animated.View style={[styles.root, { backgroundColor: colors.background, opacity: fadeIn }]}>
      <View style={[styles.inner, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.logoRing, { borderColor: colors.primary + "40" }]}>
            <View style={[styles.logoInner, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="shield" size={28} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>PULSE NETWORK</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Admin Console</Text>
        </View>

        <Text style={[styles.prompt, { color: colors.mutedForeground }]}>
          {isPinMode ? "Enter your 4-digit PIN" : "Enter gateway password"}
        </Text>

        {isPinMode ? (
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor: i < entered.length
                      ? (error ? "#ef4444" : colors.primary)
                      : "transparent",
                    borderColor: error ? "#ef4444" : i < entered.length ? colors.primary : colors.border,
                  },
                ]}
              />
            ))}
          </Animated.View>
        ) : (
          <Animated.View style={[styles.textInputWrap, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: error ? "#ef4444" : colors.border, color: colors.foreground }]}
              value={entered}
              onChangeText={setEntered}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              onSubmitEditing={handlePasswordSubmit}
              returnKeyType="done"
            />
            <Pressable
              onPress={handlePasswordSubmit}
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </Animated.View>
        )}

        {isPinMode && (
          <View style={styles.numpad}>
            {KEYS.map((key, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleKey(key)}
                disabled={key === ""}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: key === "" ? "transparent" : pressed ? colors.primary + "30" : colors.card,
                    borderColor: key === "" ? "transparent" : colors.border,
                  },
                ]}
              >
                {key === "⌫" ? (
                  <Feather name="delete" size={20} color={colors.foreground} />
                ) : (
                  <Text style={[styles.keyText, { color: key === "" ? "transparent" : colors.foreground }]}>
                    {key}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, alignItems: "center", gap: 32 },
  brand: { alignItems: "center", gap: 10 },
  logoRing: {
    width: 80, height: 80, borderRadius: 24, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  logoInner: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  appName: { fontSize: 16, fontWeight: "800", letterSpacing: 3, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, letterSpacing: 1, fontFamily: "Inter_400Regular" },
  prompt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dotsRow: { flexDirection: "row", gap: 20 },
  pinDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  textInputWrap: { flexDirection: "row", gap: 10, paddingHorizontal: 32, width: "100%" },
  textInput: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: "Inter_400Regular",
  },
  submitBtn: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  numpad: {
    flexDirection: "row", flexWrap: "wrap", gap: 14,
    justifyContent: "center", paddingHorizontal: 32, width: "100%",
  },
  key: {
    width: 80, height: 80, borderRadius: 20, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  keyText: { fontSize: 26, fontWeight: "300", fontFamily: "Inter_400Regular" },
});
