import { StyleSheet } from "react-native";
import { ThemedView } from "./themed-view";
import { ThemedText } from "./themed-text";
import { useEffect } from "react";

type Props = {
  isLevelingUp: boolean;
  level: number;
  onAnimationComplete: () => void;
};

export default function LevelUpOverlay({ isLevelingUp, level, onAnimationComplete }: Props) {
  useEffect(() => {
    if (isLevelingUp) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 2000); // 2 second delay
      return () => clearTimeout(timer);
    }
  }, [isLevelingUp, onAnimationComplete]);

  if (!isLevelingUp) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Level {level}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 100,
  },
});
