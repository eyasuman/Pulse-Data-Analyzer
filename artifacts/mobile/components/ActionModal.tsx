import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export interface ActionModalOption {
  label: string;
  destructive?: boolean;
  onPress: () => void | Promise<void>;
}

interface ActionModalProps {
  visible: boolean;
  title: string;
  message?: string;
  options: ActionModalOption[];
  onClose: () => void;
  cancelLabel?: string;
}

export function ActionModal({
  visible,
  title,
  message,
  options,
  onClose,
  cancelLabel = "Cancel",
}: ActionModalProps) {
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const runOption = async (option: ActionModalOption) => {
    if (busyLabel) return;
    setBusyLabel(option.label);
    try {
      await option.onPress();
    } finally {
      setBusyLabel(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View testID="action-modal" style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.options}>
            {options.map((option) => {
              const isBusy = busyLabel === option.label;
              return (
                <Pressable
                  key={option.label}
                  testID={`action-modal-option-${option.label.toLowerCase().replace(/\s+/g, "-")}`}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ disabled: !!busyLabel }}
                  disabled={!!busyLabel}
                  onPress={() => void runOption(option)}
                  style={({ pressed }) => [
                    styles.option,
                    option.destructive ? styles.destructiveOption : styles.primaryOption,
                    { opacity: pressed || (busyLabel && !isBusy) ? 0.7 : 1 },
                  ]}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.optionText}>{option.label}</Text>
                  )}
                </Pressable>
              );
            })}
            <Pressable
              testID="action-modal-cancel"
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              disabled={!!busyLabel}
              onPress={onClose}
              style={({ pressed }) => [styles.cancel, { opacity: pressed || !!busyLabel ? 0.7 : 1 }]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface NoticeModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  destructive?: boolean;
}

export function NoticeModal({ visible, title, message, onClose, destructive }: NoticeModalProps) {
  return (
    <ActionModal
      visible={visible}
      title={title}
      message={message}
      options={[{ label: "OK", destructive, onPress: onClose }]}
      onClose={onClose}
      cancelLabel="Close"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 20,
    backgroundColor: "#172033",
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { color: "#f8fafc", fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  message: { color: "#cbd5e1", fontSize: 13, lineHeight: 20, marginTop: 8 },
  options: { gap: 8, marginTop: 18 },
  option: {
    minHeight: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  primaryOption: { backgroundColor: "#6366f1", borderColor: "#818cf8" },
  destructiveOption: { backgroundColor: "#b91c1c", borderColor: "#ef4444" },
  optionText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cancel: {
    minHeight: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#475569",
    backgroundColor: "#1e293b",
  },
  cancelText: { color: "#cbd5e1", fontSize: 13, fontWeight: "600" },
});