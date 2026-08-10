import React from "react";
import { Image, StyleSheet, View } from "react-native";

interface FighterRendererProps {
  name: string;
  state: "neutral" | "attack" | "damage";
  flipped?: boolean;
}

export function FighterRenderer({
  name,
  state,
  flipped = false,
}: FighterRendererProps) {
  // Assuming directory structure: assets/characters/{name}/{state}.png
  // Converting name to lowercase to match typical asset naming conventions
  const getAsset = () => {
    switch (state) {
      case "attack":
        return require(`../../../assets/characters/badhombre/attack.png`);
      case "damage":
        return require(`../../../assets/characters/badhombre/damage.png`);
      case "neutral":
      default:
        return require(`../../../assets/characters/badhombre/neutral.png`);
    }
  };

  return (
    <View style={[styles.container, flipped && styles.flipped]}>
      <Image source={getAsset()} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "50%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
