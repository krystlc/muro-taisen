import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { GameButton, ScreenShell, gameColors } from '../components/game-ui';

export default function StartScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      eyebrow="THREE.JS // MOBILE ARENA"
      subtitle="Stack fast. Read the field. Outlast your opponent."
      title="Muro Taisen"
    >
      <StatusBar style="light" />
      <View style={styles.arenaMark}>
        <View style={[styles.block, styles.blockCyan]} />
        <View style={[styles.block, styles.blockPink]} />
        <View style={[styles.block, styles.blockBlue]} />
        <View style={[styles.block, styles.blockYellow]} />
      </View>
      <View style={styles.actions}>
        <GameButton label="START MATCH" onPress={() => router.push('/character-select')} />
        <GameButton
          label="HOW TO PLAY"
          onPress={() => router.push('/difficulty-select')}
          variant="secondary"
        />
      </View>
      <Text style={styles.footer}>BUILD 0.1.0  •  LOCAL PROTOTYPE</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  arenaMark: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginVertical: 22,
  },
  block: {
    borderRadius: 5,
    height: 42,
    transform: [{ rotate: '45deg' }],
    width: 42,
  },
  blockCyan: {
    backgroundColor: gameColors.cyan,
  },
  blockPink: {
    backgroundColor: gameColors.pink,
    marginLeft: -12,
    marginTop: 42,
  },
  blockBlue: {
    backgroundColor: '#7785ff',
    marginLeft: -12,
    marginTop: -12,
  },
  blockYellow: {
    backgroundColor: '#ffd166',
    marginLeft: -12,
    marginTop: 42,
  },
  actions: {
    gap: 14,
    marginTop: 36,
  },
  footer: {
    color: '#526074',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 34,
    textAlign: 'center',
  },
});
