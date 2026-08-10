import { useRouter } from "expo-router";
import { Text, StyleSheet, FlatList, Pressable } from "react-native";
import { ScreenShell, gameColors } from "../components/game-ui";

export default function OnlinePlayersScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      eyebrow="MULTIPLAYER"
      onBack={() => router.back()}
      title="Online Players"
      subtitle="Select a player to challenge."
    >
      <FlatList
        data={[]}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable style={styles.playerCard}>
            <Text style={styles.playerName}>{item}</Text>
            <Text style={styles.inviteButton}>INVITE</Text>
          </Pressable>
        )}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: gameColors.panel,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    color: gameColors.text,
    fontSize: 16,
  },
  inviteButton: {
    color: gameColors.cyan,
    fontWeight: "bold",
  },
});
