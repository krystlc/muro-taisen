import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { gameColors } from "./game-theme";

export { gameColors } from "./game-theme";
export { VersusBar } from "./game-ui/VersusBar";

type ScreenShellProps = {
  children: ReactNode;
  eyebrow?: string;
  onBack?: () => void;
  subtitle?: string;
  title: string;
};

type GameButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet";
};

export function ScreenShell({
  children,
  eyebrow,
  onBack,
  subtitle,
  title,
}: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>‹ BACK</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Text style={styles.topBarLabel}>MURO TAISEN</Text>
        </View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function GameButton({
  label,
  onPress,
  variant = "primary",
}: GameButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onStartShouldSetResponder={() => true}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primaryButton,
        variant === "secondary" && styles.secondaryButton,
        variant === "quiet" && styles.quietButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === "primary" && styles.primaryButtonLabel,
          variant !== "primary" && styles.secondaryButtonLabel,
        ]}
      >
        {label}
      </Text>
      {variant === "primary" ? <Text style={styles.buttonArrow}>→</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: gameColors.dark,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 36,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 32,
  },
  topBarLabel: {
    color: "#526074",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: gameColors.cyan,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  eyebrow: {
    color: gameColors.cyan,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 52,
  },
  title: {
    color: gameColors.text,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 12,
  },
  subtitle: {
    color: gameColors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 360,
  },
  body: {
    flex: 1,
    marginTop: 34,
  },
  button: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: gameColors.cyan,
  },
  secondaryButton: {
    backgroundColor: gameColors.panel,
    borderColor: "#273449",
    borderWidth: 1,
  },
  quietButton: {
    minHeight: 44,
    paddingHorizontal: 4,
  },
  pressedButton: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },
  primaryButtonLabel: {
    color: "#07131c",
  },
  secondaryButtonLabel: {
    color: gameColors.text,
  },
  buttonArrow: {
    color: "#07131c",
    fontSize: 24,
    fontWeight: "400",
  },
});
