import { StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { Button } from "@react-navigation/elements";
import { loadTopScore } from "@/core/storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Image } from "expo-image";

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
      <TopScore />
      <Image source={require("@/assets/images/icon.png")} style={styles.logo} />
      <Button variant="filled" color="red" onPress={props.handleStartGame}>
        Start Game
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  startContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  logo: {
    width: 360,
    aspectRatio: 1,
  },
  scoreContainer: {
    alignItems: "center",
  },
});
