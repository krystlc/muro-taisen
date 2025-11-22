import { StyleSheet } from "react-native";
import { ThemedView } from "./themed-view";
import { ThemedText } from "./themed-text";
import { useEffect, useState } from "react";
import { Button } from "@react-navigation/elements";

type Props = {
  isGameOver: boolean;
  didWin: boolean;
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
        {props.didWin ? "YOU WIN!" : "GAME OVER"}
      </ThemedText>
      <ThemedText style={styles.countdownText}>
        Restarting in {countdown}...
      </ThemedText>
      <Button onPress={props.handleRestart}>Play Again</Button>
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
    zIndex: 100,
  },
  gameOverText: {},
  countdownText: {},
});
