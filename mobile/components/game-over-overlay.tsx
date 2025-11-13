import { Button, StyleSheet } from "react-native";
import { ThemedView } from "./themed-view";
import { ThemedText } from "./themed-text";
import { useEffect, useState } from "react";

type Props = {
  isGameOver: boolean;
  handleRestart: () => void;
};

export default function GameOverOverlay(props: Props) {
  const [countdown, setCountdown] = useState(10);

  // --- Countdown & Redirect Effects ---
  useEffect(() => {
    if (props.isGameOver) {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [props.isGameOver]);

  if (!props.isGameOver) return;

  return (
    <ThemedView style={styles.gameOverContainer}>
      <ThemedText type="title" style={styles.gameOverText}>
        GAME OVER
      </ThemedText>
      <ThemedText style={styles.countdownText}>
        Restarting in {countdown}...
      </ThemedText>
      <Button title="Play Again" onPress={props.handleRestart} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  gameOverContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    gap: 20,
  },
  gameOverText: {},
  countdownText: {},
});
