// src/ui/components/ScoreOverlay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ScoreOverlayProps {
  score: number;
}

export const ScoreOverlay: React.FC<ScoreOverlayProps> = ({ score }) => {
  return (
    // pointerEvents="none" ensures swipes pass through the UI to the gesture controller
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.scoreText}>SCORE</Text>
      <Text style={styles.scoreValue}>{score.toString().padStart(6, '0')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  scoreText: {
    color: '#FFD700', // Arcade gold
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace', // 16-bit retro feel
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  }
});
