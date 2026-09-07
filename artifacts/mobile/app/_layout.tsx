import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppState, AppStateStatus, Platform, View, ActivityIndicator } from "react-native";

import "@/lib/supabase";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DataProvider, useData } from "@/context/DataContext";
import GatewayScreen from "@/components/GatewayScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="provider/[id]"
        options={{ presentation: Platform.OS === "ios" ? "modal" : "card" }}
      />
      <Stack.Screen name="institutes/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="banners/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="reviews/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="patients/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="audit/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="settings/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="teleradiology/index" options={{ animation: "slide_from_right" }} />
      {/* New admin screens */}
      <Stack.Screen name="license-review/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="payment-review/index" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

function GatewayLock({ children }: { children: React.ReactNode }) {
  const { settings, isLoading } = useData();
  const [unlocked, setUnlocked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const timeoutMs = (settings.inactivityTimeoutMinutes ?? 5) * 60 * 1000;

  const lock = useCallback(() => { setUnlocked(false); }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(lock, timeoutMs);
  }, [lock, timeoutMs]);

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
    resetTimer();
  }, [resetTimer]);

  const handleTouch = useCallback(() => {
    if (unlocked) resetTimer();
  }, [unlocked, resetTimer]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev === "active" && nextState.match(/inactive|background/)) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        lock();
      }
    });
    return () => sub.remove();
  }, [lock]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!unlocked) {
    return <GatewayScreen correctPassword={settings.gatewayPassword} onUnlock={handleUnlock} />;
  }

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => { handleTouch(); return false; }}
    >
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const hiddenRef = useRef(false);

  useEffect(() => {
    const hide = async () => {
      if (hiddenRef.current) return;
      hiddenRef.current = true;
      try { await SplashScreen.hideAsync(); } catch {}
    };
    if (fontsLoaded || fontError) { hide(); }
    const timer = setTimeout(hide, 3000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DataProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <GatewayLock>
                  <RootLayoutNav />
                </GatewayLock>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </DataProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
