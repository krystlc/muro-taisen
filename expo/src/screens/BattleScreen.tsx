import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { GameButton, ScreenShell, gameColors } from '../components/game-ui';

const grid = Array.from({ length: 25 });

export default function BattleScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      eyebrow="ROUND 01 // READY"
      onBack={() => router.back()}
      subtitle="The Three.js arena will take over this space next."
      title="Battle"
    >
      <StatusBar style="light" />
      <View style={styles.statusRow}>
        <View>
          <Text style={styles.statusLabel}>PLAYER</Text>
          <Text style={styles.statusValue}>MIZU</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.opponent}>
          <Text style={styles.statusLabel}>OPPONENT</Text>
          <Text style={styles.statusValue}>CPU // 01</Text>
        </View>
      </View>
      <View style={styles.arena}>
        <View style={styles.grid}>
          {grid.map((_, index) => (
            <View key={index} style={[styles.cell, index === 12 && styles.activeCell]} />
          ))}
        </View>
        <Text style={styles.arenaLabel}>THREE.JS ARENA LOADING POINT</Text>
      </View>
      <GameButton label="RETURN TO TITLE" onPress={() => router.replace('/start')} variant="secondary" />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    alignItems: 'center',
    backgroundColor: gameColors.panel,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statusLabel: {
    color: gameColors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statusValue: {
    color: gameColors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  opponent: {
    alignItems: 'flex-end',
  },
  vs: {
    color: gameColors.pink,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  arena: {
    alignItems: 'center',
    backgroundColor: '#0c1220',
    borderColor: '#273449',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginVertical: 18,
    minHeight: 280,
    padding: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    maxWidth: 220,
  },
  cell: {
    backgroundColor: '#172337',
    borderRadius: 3,
    height: 36,
    width: 36,
  },
  activeCell: {
    backgroundColor: gameColors.cyan,
    shadowColor: gameColors.cyan,
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  arenaLabel: {
    color: '#526074',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 26,
    textAlign: 'center',
  },
});
