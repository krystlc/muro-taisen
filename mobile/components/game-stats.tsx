import { StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type Props = {
  score: number;
  totalBlocksCleared: number;
  level: number;
};
export default function GameStats({ level, score, totalBlocksCleared }: Props) {
  return (
    <ThemedView style={styles.statsContainer}>
      <ThemedText>Score: {score}</ThemedText>
      <ThemedText>Blocks: {totalBlocksCleared}</ThemedText>
      <ThemedText type="defaultSemiBold">Level: {level}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: "row",
    zIndex: 10,
    gap: 24,
    padding: 4,
    justifyContent: "center",
    backgroundColor: "#000000aa",
  },
});
