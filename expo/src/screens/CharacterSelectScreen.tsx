import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameButton, ScreenShell, gameColors } from '../components/game-ui';

const characters = [
  { accent: '#56d8ff', description: 'Balanced and ready for anything.', name: 'MIZU' },
  { accent: '#ff6ea8', description: 'Aggressive plays. Bigger risks.', name: 'KIBA' },
  { accent: '#ffd166', description: 'Slow burn. Total control.', name: 'RAI' },
];

export default function CharacterSelectScreen() {
  const router = useRouter();
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0].name);

  return (
    <ScreenShell
      eyebrow="MATCH SETUP // 01"
      onBack={() => router.back()}
      subtitle="Choose your fighter for the first round."
      title="Select pilot"
    >
      <StatusBar style="light" />
      <View style={styles.list}>
        {characters.map((character) => {
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
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{character.name}</Text>
                <Text style={styles.cardDescription}>{character.description}</Text>
              </View>
              <View style={[styles.radio, selected && { backgroundColor: character.accent }]} />
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
    gap: 12,
  },
  card: {
    alignItems: 'center',
    backgroundColor: gameColors.panel,
    borderColor: '#273449',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 86,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: {
    color: '#07131c',
    fontSize: 28,
    fontWeight: '900',
  },
  cardCopy: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    color: gameColors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardDescription: {
    color: gameColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  radio: {
    backgroundColor: '#273449',
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  action: {
    marginTop: 28,
  },
});
