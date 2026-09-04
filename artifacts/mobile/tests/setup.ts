const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: "doctor-1" }),
}));

jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#0b1220",
    foreground: "#f8fafc",
    card: "#172033",
    muted: "#1e293b",
    mutedForeground: "#94a3b8",
    border: "#334155",
    primary: "#6366f1",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Feather: ({ name }: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, name);
  },
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: "medium" },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  launchImageLibraryAsync: jest.fn(),
}));