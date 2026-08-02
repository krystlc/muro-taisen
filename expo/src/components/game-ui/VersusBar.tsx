import { StyleSheet, Text, View } from 'react-native';

import { gameColors } from '../game-theme';

interface VersusBarProps {
  player1Name: string;
  player2Name: string;
}

export function VersusBar({ player1Name, player2Name }: VersusBarProps) {
  return (
    <View style={styles.statusRow}>
      <View>
        <Text style={styles.statusLabel}>PLAYER</Text>
        <Text style={styles.statusValue}>{player1Name}</Text>
      </View>
      <Text style={styles.vs}>VS</Text>
      <View style={styles.opponent}>
        <Text style={styles.statusLabel}>OPPONENT</Text>
        <Text style={styles.statusValue}>{player2Name}</Text>
      </View>
    </View>
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
});
