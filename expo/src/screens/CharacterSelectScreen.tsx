import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameButton, ScreenShell, gameColors } from '../components/game-ui';
import { useGameStore } from '../store/useGameStore';
import { CHARACTERS } from '../core/models/Characters';

export default function CharacterSelectScreen() {
  const router = useRouter();
  const selectedCharacter = useGameStore((state) => state.player1.name);
  const setSelectedCharacter = useGameStore((state) => state.setPlayer1Character);

  return (
    <ScreenShell
      eyebrow="MATCH SETUP // 01"
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push('/start');
        }
      }}
      subtitle="Choose your fighter for the first round."
      title="Select character"
    >
      <View style={styles.list}>
        {CHARACTERS.map((character) => {
          const selected = character.name === selectedCharacter;

          return (
            <Pressable
              accessibilityRole="button"
              key={character.name}
              onPress={() => setSelectedCharacter(character.name)}
              style={[styles.card, selected && { borderColor: character.accent }]}
            >
              <View style={[styles.avatar, { backgroundColor: character.accent }]}>
                <Text style={styles.avatarText}>{character.name.slice(0, 1)}</Text>
              </View>
              <Text style={styles.cardTitle}>{character.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.action}>
        <GameButton label="CHOOSE DIFFICULTY" onPress={() => router.push('/difficulty-select')} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    alignItems: 'center',
    backgroundColor: gameColors.panel,
    borderColor: '#273449',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    width: '47%', // Slightly less than 50% to accommodate gap
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    marginBottom: 8,
    width: 56,
  },
  avatarText: {
    color: '#07131c',
    fontSize: 28,
    fontWeight: '900',
  },
  cardTitle: {
    color: gameColors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  action: {
    marginTop: 28,
  },
});
