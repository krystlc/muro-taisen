import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { GameEngine, type GameState } from '../../core/engine/GameEngine';
import { BOARD_COLS, BOARD_ROWS } from '../../core/engine/Board';

export interface Board3DProps {
  engine: GameEngine;
}

/**
 * @agent_instruction
 * 1. Implement the game loop in `useFrame`. Call `engine.tick(delta * 1000)` to drive the headless physics.
 * 2. Use local React state to snapshot the grid every frame for this MVP to get visuals on screen.
 *    (We will optimize this to InstancedMesh later).
 * 3. Draw a dark background plane for the board area.
 * 4. Map the `gameState.grid` to 3D meshes. A gem at `grid[r][c]` goes to local position `[c + 0.5, r + 0.5, 0]`.
 */
export const Board3D: React.FC<Board3DProps> = ({ engine }) => {
  // Snapshot state for rendering
  const [gameState, setGameState] = useState(() => engine.getState());
  const frameCount = useRef(0);

  useEffect(() => {
    const initialState = engine.getState();
    console.log('[Board3D] mounted', {
      hasActivePiece: Boolean(initialState.activePiece),
      tickCount: initialState.tickCount,
      status: initialState.status,
    });

    return () => console.log('[Board3D] unmounted');
  }, [engine]);

  useFrame((_, delta) => {
    frameCount.current += 1;
    const deltaMs = delta * 1000;

    // Advance the physics engine (delta is in seconds, tick expects ms).
    engine.tick(deltaMs);

    // Pull a new snapshot reference so React re-renders even though the engine mutates in place.
    const nextState = engine.getState();
    setGameState({
      ...nextState,
      grid: nextState.grid.map((row) => [...row]),
    });

    if (frameCount.current === 1 || frameCount.current % 60 === 0) {
      console.log('[Board3D] heartbeat', {
        activePiece: nextState.activePiece
          ? {
            column: nextState.activePiece.column,
            rotation: nextState.activePiece.rotation,
            row: nextState.activePiece.row,
          }
          : null,
        deltaMs: Math.round(deltaMs),
        frame: frameCount.current,
        lockedGemCount: countLockedGems(nextState.grid),
        status: nextState.status,
        tickCount: nextState.tickCount,
      });
    }
  });

  // Calculate center offsets so the board is centered in the camera
  const xOffset = -BOARD_COLS / 2;
  const yOffset = -BOARD_ROWS / 2;

  return (
    <group position={[xOffset, yOffset, 0]}>
      {/* Board Background/Bounds */}
      <mesh position={[BOARD_COLS / 2, BOARD_ROWS / 2, -0.5]}>
        <planeGeometry args={[BOARD_COLS, BOARD_ROWS]} />
        <meshBasicMaterial color="#0c1220" />
      </mesh>

      {/* 6x13 playfield grid */}
      {Array.from({ length: BOARD_COLS + 1 }, (_, column) => (
        <mesh key={`grid-column-${column}`} position={[column, BOARD_ROWS / 2, -0.4]}>
          <planeGeometry args={[0.025, BOARD_ROWS]} />
          <meshBasicMaterial color="#273449" transparent opacity={0.8} />
        </mesh>
      ))}
      {Array.from({ length: BOARD_ROWS + 1 }, (_, row) => (
        <mesh key={`grid-row-${row}`} position={[BOARD_COLS / 2, row, -0.4]}>
          <planeGeometry args={[BOARD_COLS, 0.025]} />
          <meshBasicMaterial color="#273449" transparent opacity={0.8} />
        </mesh>
      ))}

      {/* Render Locked Gems */}
      {gameState.grid.map((row, rIndex) =>
        row.map((gem, cIndex) => {
          if (!gem) return null;

          // Determine color based on gem type/color (Agent can expand this)
          const gemColor = getGemColor(gem.color);

          return (
            <mesh key={`gem-${rIndex}-${cIndex}`} position={[cIndex + 0.5, rIndex + 0.5, 0]}>
              <boxGeometry args={[0.9, 0.9, 0.9]} />
              <meshBasicMaterial color={gemColor} />
            </mesh>
          );
        })
      )}

      {/* Render Active Falling Piece */}
      {gameState.activePiece?.gems.map((gem, index) => {
        const [rowOffset, columnOffset] = getActivePieceOffset(
          gameState.activePiece!.rotation,
          index,
        );
        const x = gameState.activePiece!.column + columnOffset + 0.5;
        const y = gameState.activePiece!.row + rowOffset + 0.5;

        return (
          <mesh key={`active-${gem.id}`} position={[x, y, 0]}>
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <meshBasicMaterial color={getGemColor(gem.color)} />
          </mesh>
        );
      })}
    </group>
  );
};

function getActivePieceOffset(rotation: 0 | 90 | 180 | 270, index: number): [number, number] {
  if (index === 0) return [0, 0];

  switch (rotation) {
    case 90:
      return [0, 1];
    case 180:
      return [-1, 0];
    case 270:
      return [0, -1];
    case 0:
    default:
      return [1, 0];
  }
}

function countLockedGems(grid: GameState['grid']): number {
  return grid.reduce(
    (total, row) => total + row.filter((gem) => gem !== null).length,
    0,
  );
}

// Helper for MVP colors
function getGemColor(colorStr: string) {
  const colors: Record<string, string> = {
    RED: '#ff3366',
    BLUE: '#00e5ff',
    GREEN: '#00ff66',
    YELLOW: '#ffcc00',
  };
  return colors[colorStr] || '#ffffff';
}
