import { useRouter } from "expo-router";
import { StatusBar } from ".pnpm/expo-status-bar@3.0.9_react-native@0.81.5_@babel+core@7.29.7_@types+react@19.1.17_react@19.1.0__react@19.1.0/node_modules/expo-status-bar/src/StatusBar";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GameButton, ScreenShell, gameColors } from "../components/game-ui";
import { useGameStore, type DifficultyLabel } from "../store/useGameStore";

const opponents: {
  accent: string;
  description: string;
  difficulty: DifficultyLabel;
  name: string;
}[] = [
  {
    accent: "#526074",
    description: "The baseline training drone. Slow pacing.",
    difficulty: "ROOKIE",
    name: "CPU // 01",
  },
  {
    accent: "#56d8ff",
    description: "Balanced simulation of pilot Mizu. Steady pacing.",
    difficulty: "TAISEN",
    name: "MIZU CPU",
  },
  {
    accent: "#ff6ea8",
    description: "Aggressive simulation of pilot Kiba. High risk cascades.",
    difficulty: "TAISEN",
    name: "KIBA CPU",
  },
  {
    accent: "#ffd166",
    description: "Calculating simulation of pilot Rai. Calm control.",
    difficulty: "TAISEN",
    name: "RAI CPU",
  },
  {
    accent: "#c084fc",
    description: "Neural shadow unit. Swift decisions, high pressure.",
    difficulty: "MASTER",
    name: "KAGE CPU",
  },
  {
    accent: "#ef4444",
    description: "The ultimate tactical AI. Absolute perfection.",
    difficulty: "MASTER",
    name: "SHIN CPU",
  },
];

export default function SelectOpponentScreen() {
  const router = useRouter();
  const selectedOpponent = useGameStore((state) => state.player2.name);
  const setOpponent = useGameStore((state) => state.setPlayer2Character);
  const setDifficulty = useGameStore((state) => state.setDifficulty);

  const handleSelectOpponent = (opponent: (typeof opponents)[0]) => {
    setOpponent(opponent.name);
    setDifficulty(opponent.difficulty);
  };

  return (
    <ScreenShell
      eyebrow="MATCH SETUP // 03"
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push("/start");
        }
      }}
      subtitle="Select your next worthy adversary."
      title="Choose opponent"
    >
      <StatusBar style="light" />
      <View style={styles.list}>
        {opponents.map((opponent) => {
          const selected = opponent.name === selectedOpponent;

          return (
            <Pressable
              accessibilityRole="button"
              key={opponent.name}
              onPress={() => handleSelectOpponent(opponent)}
              style={[
                styles.card,
                selected && { borderColor: opponent.accent },
              ]}
            >
              <View
                style={[styles.avatar, { backgroundColor: opponent.accent }]}
              >
                <Text style={styles.avatarText}>
                  {opponent.name.slice(0, 1)}
                </Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{opponent.name}</Text>
                <Text style={styles.cardDescription}>
                  {opponent.description}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selected && { backgroundColor: opponent.accent },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.action}>
        <GameButton
          label="ENTER ARENA"
          onPress={() => router.replace("/battle")}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    alignItems: "center",
    backgroundColor: gameColors.panel,
    borderColor: "#273449",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 86,
    padding: 14,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarText: {
    color: "#07131c",
    fontSize: 28,
    fontWeight: "900",
  },
  cardCopy: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    color: gameColors.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cardDescription: {
    color: gameColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  radio: {
    backgroundColor: "#273449",
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  action: {
    marginTop: 28,
  },
});
