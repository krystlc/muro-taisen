import { StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { Button } from "@react-navigation/elements";
import { loadTopScore } from "@/core/storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";

type Props = {
  gameStarted: boolean;
  handleStartGame: () => void;
};

const TopScore = () => {
  const [topScore, setTopScore] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const fetchTopScore = async () => {
        const score = await loadTopScore();
        setTopScore(score);
      };
      fetchTopScore();
    }, []),
  );

  return (
    <ThemedView style={styles.scoreContainer}>
      <ThemedText>Top Score</ThemedText>
      <ThemedText type="subtitle">{topScore}</ThemedText>
    </ThemedView>
  );
};

export default function GameStartOverlay(props: Props) {
  if (props.gameStarted) return;

  return (
    <ThemedView style={styles.startContainer}>
      <ThemedText type="title">Muro Taisen!</ThemedText>
      <TopScore />
      <Button onPress={props.handleStartGame}>Start Game</Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  startContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    zIndex: 100,
  },
  scoreContainer: {
    alignItems: "center",
    gap: 8,
  },
});
