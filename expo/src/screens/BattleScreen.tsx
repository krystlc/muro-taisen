import { Canvas } from '@react-three/fiber/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { GameButton, ScreenShell, VersusBar, gameColors } from '../components/game-ui';
import { GameEngine } from '../core/engine/GameEngine';
import { GestureController } from '../input/GestureController';
import { useGameStore } from '../store/useGameStore';
import { Board3D } from '../rendering/components/Board3D';

export default function BattleScreen() {
  const router = useRouter();
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);
  const difficulty = useGameStore((state) => state.difficulty);
  const engineRef = useRef(new GameEngine('match_seed_123'));

  useEffect(() => {
    console.log('[BattleScreen] match ready', {
      difficulty,
      engineHasActivePiece: Boolean(engineRef.current.getState().activePiece),
      player1: player1.name,
      player2: player2.name,
    });
  }, [difficulty, player1.name, player2.name]);

  return (
    <ScreenShell
      eyebrow="ROUND 01 // FIGHT"
      onBack={() => router.back()}
      subtitle={`Good luck. ${difficulty} difficulty.`}
      title="Battle"
    >
      <StatusBar style="light" />
      <VersusBar player1Name={player1.name} player2Name={player2.name} />
      <View style={styles.arena}>
        <GestureController engine={engineRef.current}>
          <Canvas
            orthographic
            style={styles.canvas}
            camera={{ far: 1000, near: 0.1, position: [0, 0, 20], zoom: 30 }}
          >
            <color attach="background" args={[gameColors.dark]} />
            <ambientLight intensity={1.2} />
            <directionalLight position={[0, 0, 10]} intensity={1} />
            <Board3D engine={engineRef.current} />
          </Canvas>
        </GestureController>
      </View>
      <GameButton
        label="SURRENDER"
        onPress={() => router.replace('/start')}
        variant="secondary"
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
  arena: {
    backgroundColor: gameColors.dark,
    borderColor: '#273449',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    marginVertical: 18,
    minHeight: 400,
    overflow: 'hidden',
  },
});
