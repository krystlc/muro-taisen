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
      <ThemedText>Score</ThemedText>
      <ThemedText type="defaultSemiBold">{score}</ThemedText>
      <ThemedText>Blocks</ThemedText>
      <ThemedText type="defaultSemiBold">{totalBlocksCleared}</ThemedText>
      <ThemedText>Level</ThemedText>
      <ThemedText type="defaultSemiBold">{level}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    zIndex: 10,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000aa",
  },
});
