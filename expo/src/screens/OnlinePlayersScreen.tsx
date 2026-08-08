import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { ScreenShell, gameColors } from '../components/game-ui';
import { useGameServer } from '../hooks/useGameServer';
import { useGameStore } from '../store/useGameStore';

export default function OnlinePlayersScreen() {
  const router = useRouter();
  const player1 = useGameStore((state) => state.player1);
  const { onlineUsers, sendInvite } = useGameServer(player1.name || 'Anonymous');

  return (
    <ScreenShell
      eyebrow="MULTIPLAYER"
      onBack={() => router.back()}
      title="Online Players"
      subtitle="Select a player to challenge."
    >
      <FlatList
        data={onlineUsers.filter(u => u.id !== player1.name)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.playerCard} onPress={() => sendInvite(item.id)}>
            <Text style={styles.playerName}>{item.username}</Text>
            <Text style={styles.inviteButton}>INVITE</Text>
          </Pressable>
        )}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: 'bold',
  },
});
