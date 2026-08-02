// 3D representation of the 6x12 grid
// src/rendering/components/Board3D.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GameEngine } from '../../core/engine/GameEngine';

interface Board3DProps {
  engine: GameEngine;
}

export const Board3D: React.FC<Board3DProps> = ({ engine }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // Advance tick loop deterministically based on delta time
    engine.tick(delta * 1000);

    // Imperatively update 3D gem positions without React state re-renders
    if (groupRef.current) {
      const state = engine.getState();
      // Synchronize instanced meshes or child meshes with state.grid...
    }
  });

  return (
    <group ref={groupRef} position={[-1.5, -3, 0]}>
      {/* 3D Board Frame Boundaries */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(6, 12, 0.5)]} />
        <lineBasicMaterial color="cyan" />
      </lineSegments>
    </group>
  );
};
