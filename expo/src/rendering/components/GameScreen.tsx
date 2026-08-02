// Context for Agent: This is the main bridge. It holds the React Native UI layout, the Three.js Canvas, and the instance of the GameEngine.
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { Board3D } from './Board3D';
import { GameEngine } from '@/core/engine/GameEngine';
import { GestureController } from '@/input/GestureController';
import { ScoreOverlay } from './ScoreOverlay';

/**
 * @agent_instruction
 * 1. Initialize the GameEngine ref here so it persists across renders.
 * 2. Set up a requestAnimationFrame loop that calls `engine.tick(delta)` and
 *    updates a local React state with `engine.getState()` to drive the 3D Board.
 * 3. Use an OrthographicCamera to maintain the 16-bit retro 2D grid perspective.
 */
export default function GameScreen() {
  const engineRef = useRef(new GameEngine('muro_seed_1'));
  const [gameState, setGameState] = useState(engineRef.current.getState());

  // TODO: Agent to implement game loop sync here

  return (
    <View style={styles.container}>
      <GestureController engine={engineRef.current}>
        <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 10] }}>
          {/* Lighting & Environment */}
          <ambientLight intensity={0.8} />

          {/* The visual representation of the grid */}
          <Board3D engine={engineRef.current} />
        </Canvas>
      </GestureController>

      {/* 2D Overlay for Score & UI */}
      <ScoreOverlay score={gameState.score} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' }
});
