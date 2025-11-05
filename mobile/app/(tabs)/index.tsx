import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import React, { useState, useCallback } from "react";
import { useFocusEffect, Link } from "expo-router";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { loadTopScore } from "@/core/storage";
import { Button } from "@react-navigation/elements";

export default function HomeScreen() {
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
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Muro Taisen!</ThemedText>
      </ThemedView>
      <ThemedView style={styles.scoreContainer}>
        <ThemedText>Top Score</ThemedText>
        <ThemedText type="subtitle">{topScore}</ThemedText>
      </ThemedView>
      <ThemedView style={styles.playButtonContainer}>
        <Link href="/game" asChild>
          <Button>Play Now</Button>
        </Link>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreContainer: {
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  scoreLabel: {
    fontSize: 24,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
  },
  playButtonContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
