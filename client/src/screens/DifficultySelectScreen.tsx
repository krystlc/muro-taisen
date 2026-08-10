import { useRouter } from "expo-router";
import { StatusBar } from ".pnpm/expo-status-bar@3.0.9_react-native@0.81.5_@babel+core@7.29.7_@types+react@19.1.17_react@19.1.0__react@19.1.0/node_modules/expo-status-bar/src/StatusBar";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GameButton, ScreenShell, gameColors } from "../components/game-ui";
import { useGameStore, type DifficultyLabel } from "../store/useGameStore";

const difficulties: { description: string; label: DifficultyLabel }[] = [
  { description: "Take your time and learn the arena.", label: "ROOKIE" },
  { description: "A fair fight with a little pressure.", label: "TAISEN" },
  { description: "No mistakes. No second chances.", label: "MASTER" },
];

export default function DifficultySelectScreen() {
  const router = useRouter();
  const selectedDifficulty = useGameStore((state) => state.difficulty);
  const setSelectedDifficulty = useGameStore((state) => state.setDifficulty);

  return (
    <ScreenShell
      eyebrow="MATCH SETUP // 02"
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push("/character-select");
        }
      }}
      subtitle="Set the pace of the battle."
      title="Choose level"
    >
      <StatusBar style="light" />
      <View style={styles.list}>
        {difficulties.map((difficulty, index) => {
          const selected = difficulty.label === selectedDifficulty;

          return (
            <Pressable
              accessibilityRole="button"
              key={difficulty.label}
              onPress={() => setSelectedDifficulty(difficulty.label)}
              style={[styles.option, selected && styles.selectedOption]}
            >
              <Text
                style={[styles.index, selected && styles.selectedText]}
              >{`0${index + 1}`}</Text>
              <View style={styles.copy}>
                <Text style={[styles.label, selected && styles.selectedText]}>
                  {difficulty.label}
                </Text>
                <Text style={styles.description}>{difficulty.description}</Text>
              </View>
              <Text style={[styles.chevron, selected && styles.selectedText]}>
                ›
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.action}>
        <GameButton
          label="ENTER ARENA"
          onPress={() => router.push("/battle")}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  option: {
    alignItems: "center",
    backgroundColor: gameColors.panel,
    borderColor: "#273449",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 82,
    paddingHorizontal: 18,
  },
  selectedOption: {
    backgroundColor: "#152d3a",
    borderColor: gameColors.cyan,
  },
  index: {
    color: "#526074",
    fontSize: 12,
    fontWeight: "800",
    width: 34,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: gameColors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  selectedText: {
    color: gameColors.cyan,
  },
  description: {
    color: gameColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  chevron: {
    color: "#526074",
    fontSize: 28,
    fontWeight: "300",
  },
  action: {
    marginTop: 28,
  },
});
