import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { GameEngine } from '../../core/engine/GameEngine';
import { BOARD_COLS, BOARD_ROWS } from '../../core/engine/Board';
import * as THREE from 'three';

// 1. Update the interface to expect the engine instance
export interface Board3DProps {
  engine: GameEngine;
}

/**
 * @agent_instruction
 * High-performance WebGL loop.
 * Do NOT use React state to drive the gem positions.
 * Instead, use `useFrame` to pull `engine.getState()` and directly mutate
 * the position/color of `InstancedMesh` or a pool of standard meshes inside the groupRef.
 */
export const Board3D: React.FC<Board3DProps> = ({ engine }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((rootState, delta) => {
    // This runs directly in the WebGL animation loop (60fps)
    const gameState = engine.getState();

    if (groupRef.current) {
      // TODO: Agent to update the children meshes of groupRef based on gameState.grid
      // e.g., mapping through the grid and setting visible=true/false and updating material colors
    }
  });

  return (
    <group ref={groupRef} position={[-BOARD_COLS / 2, -BOARD_ROWS / 2, 0]}>
      {/* TODO: Agent to instantiate a pool of Gem meshes here */}
    </group>
  );
};
