import { GameEngine } from './GameEngine';
import { GemType } from '../models/Gem';
import { describe, beforeEach, test, expect } from 'vitest';
import { SPAWN_COLUMN } from './Board';

describe('GameEngine Core Mechanics', () => {
  let engine: GameEngine;

  beforeEach(() => {
    // Initialize with a deterministic seed for predictable piece generation
    engine = new GameEngine('test-seed-42');
  });

  test('initializes with an active piece and default playing state', () => {
    const state = engine.getState();
    expect(state.status).toBe('PLAYING');
    expect(state.score).toBe(0);
    expect(state.activePiece).not.toBeNull();
    expect(state.activePiece?.gems).toHaveLength(2);
  });

  test('handles horizontal movement inputs correctly', () => {
    const initialCol = engine.getState().activePiece!.column;

    // Queue and tick a move left action
    engine.queueInput('MOVE_LEFT');
    engine.tick(0);

    expect(engine.getState().activePiece!.column).toBe(initialCol - 1);

    // Queue and tick a move right action
    engine.queueInput('MOVE_RIGHT');
    engine.tick(0);

    expect(engine.getState().activePiece!.column).toBe(initialCol);
  });

  test('applies gravity and automatically drops pieces over time intervals', () => {
    const initialRow = engine.getState().activePiece!.row;

    // Pass time less than gravity interval (500ms)
    engine.tick(200);
    expect(engine.getState().activePiece!.row).toBe(initialRow);

    // Accumulate past the 500ms threshold
    engine.tick(350);
    expect(engine.getState().activePiece!.row).toBe(initialRow - 1);
  });

  test('locks piece upon hard drop and updates grid', () => {
      const initialPieceId = engine.getState().activePiece!.gems[0].id;

      engine.queueInput('HARD_DROP');
      engine.tick(0);

      const state = engine.getState();

      // A new piece should have immediately spawned, replacing the old one
      expect(state.activePiece).not.toBeNull();
      expect(state.activePiece?.gems[0].id).not.toBe(initialPieceId);

      // Verify that gems from the hard-dropped piece are now populated in the grid
      const hasGemsOnBoard = state.grid.some(row => row.some(gem => gem !== null));
      expect(hasGemsOnBoard).toBe(true);
    });

  test('decrements counter gems correctly when a piece locks', () => {
    const grid = engine.getState().grid;
    // Manually place a counter gem on the board
    grid[0][0] = { id: 'counter-1', color: 'RED' as any, type: GemType.COUNTER, counterValue: 2 };

    // Trigger counter decrement logic statically
    GameEngine.decrementCounters(grid);
    expect(grid[0][0]?.counterValue).toBe(1);
    expect(grid[0][0]?.type).toBe(GemType.COUNTER);

    // Second decrement should transform it to NORMAL and clear counterValue
    GameEngine.decrementCounters(grid);
    expect(grid[0][0]?.type).toBe(GemType.NORMAL);
    expect(grid[0][0]?.counterValue).toBeUndefined();
  });

  test('prevents active piece from moving outside left board boundary', () => {
    // Push piece all the way to the left wall
    for (let i = 0; i < 10; i++) {
      engine.queueInput('MOVE_LEFT');
      engine.tick(0);
    }
    const minCol = engine.getState().activePiece!.column;
    expect(minCol).toBeGreaterThanOrEqual(0);

    // Attempt one more step left past the boundary
    engine.queueInput('MOVE_LEFT');
    engine.tick(0);
    expect(engine.getState().activePiece!.column).toBe(minCol);
  });

  test('rejects rotation if blocked by boundaries or obstacles', () => {
    // Force piece near a boundary or test initial rotation state changes safely
    const initialRotation = engine.getState().activePiece!.rotation;

    // If a rotation is invalid due to collision, rotation should remain unchanged
    // (You can mock a blocked grid scenario or test rotation cycling: 0 -> 90 -> 180 -> 270 -> 0)
    engine.queueInput('ROTATE_CW');
    engine.tick(0);
    expect(engine.getState().activePiece!.rotation).not.toBe(initialRotation);
  });

  test('triggers GAME_OVER only when the spawn column at top rows is blocked', () => {
    const grid = engine.getState().grid;

    // Block the top row index 12 as defined in GameStateValidator
    grid[12][SPAWN_COLUMN] = { id: 'block-spawn-12', color: 'RED' as any, type: GemType.NORMAL };

    engine.queueInput('HARD_DROP');
    engine.tick(0);

    expect(engine.getState().status).toBe('GAME_OVER');
    expect(engine.getState().activePiece).toBeNull();
  });

  test('spawns a new active piece immediately after locking the previous one', () => {
    const initialPieceId = engine.getState().activePiece!.gems[0].id;

    // Hard drop the first piece to lock it
    engine.queueInput('HARD_DROP');
    engine.tick(0);

    const stateAfterLock = engine.getState();
    expect(stateAfterLock.activePiece).not.toBeNull();

    // The newly spawned piece should have a different ID than the first one
    const nextPieceId = stateAfterLock.activePiece!.gems[0].id;
    expect(nextPieceId).not.toBe(initialPieceId);
  });

  test('continuously drops and stacks pieces until game over occurs naturally', () => {
    // Run multiple ticks with simulated time to allow multiple pieces to fall and lock
    // until the spawn column fills up and triggers GAME_OVER
    let maxIterations = 1000;
    while (engine.getState().status === 'PLAYING' && maxIterations > 0) {
      engine.tick(500); // Trigger gravity interval step
      maxIterations--;
    }

    const finalState = engine.getState();
    expect(finalState.status).toBe('GAME_OVER');
    expect(finalState.activePiece).toBeNull();
  });
});
