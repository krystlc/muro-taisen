import { version } from ".pnpm/expo@54.0.36_@babel+core@7.29.7_@expo+metro-runtime@6.1.2_expo-router@6.0.24_react-native@0.8_72sh42haalurv5qymyvos563b4/node_modules/expo/package.json";
import { Image } from ".pnpm/expo-image@3.0.11_expo@54.0.36_react-native-web@0.21.2_react-dom@19.1.0_react@19.1.0__react@1_lg5a4se4fgep425qkadijd2pfa/node_modules/expo-image/src";
import { useColorScheme, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "../constants/theme";

export function WebBadge() {
  const scheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText
        type="code"
        themeColor="textSecondary"
        style={styles.versionText}
      >
        v{version}
      </ThemedText>
      <Image
        source={
          scheme === "dark"
            ? require("@/assets/images/expo-badge-white.png")
            : require("@/assets/images/expo-badge.png")
        }
        style={styles.badgeImage}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    alignItems: "center",
    gap: Spacing.two,
  },
  versionText: {
    textAlign: "center",
  },
  badgeImage: {
    width: 123,
    aspectRatio: 123 / 24,
  },
});
