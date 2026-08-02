// src/core/engine/ActivePiece.test.ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import { BoardGrid, BOARD_ROWS, BOARD_COLS, Board } from './Board';
import { GemColor, GemType } from '../models/Gem';

describe('Active Piece & Input Mechanics', () => {
  it('should move the active piece left and right based on input', () => {
    const engine = new GameEngine('test_seed');
    // Assuming piece spawns at column 3
    engine.queueInput('MOVE_LEFT');
    engine.tick(16); // Advance one frame

    expect(engine.getState().activePiece?.column).toBe(2);
  });

  it('should block movement if the piece hits the left or right wall', () => {
    const engine = new GameEngine('test_seed');

    // Force move left 5 times (should hit the wall at col 0)
    for(let i=0; i<5; i++) {
        engine.queueInput('MOVE_LEFT');
        engine.tick(16);
    }

    expect(engine.getState().activePiece?.column).toBe(0); // Blocked at wall
  });

  it('should prevent rotation if the rotation would clip through a wall or existing block', () => {
    const engine = new GameEngine('test_seed');

    // Move to the absolute right wall
    for(let i=0; i<5; i++) {
        engine.queueInput('MOVE_RIGHT');
        engine.tick(16);
    }

    // Try to rotate horizontally.
    // Depending on the implementation, the agent should either block this OR implement a "wall-kick" (shifting it left 1 space to allow rotation).
    // We'll test for a strict block here.
    const initialRot = engine.getState().activePiece?.rotation;
    engine.queueInput('ROTATE_CW');
    engine.tick(16);

    expect(engine.getState().activePiece?.rotation).toBe(initialRot); // Rotation denied
  });

  it('should lock the piece into the board grid when it hits the floor', () => {
    const engine = new GameEngine('test_seed');

    // Force a Hard Drop to instantly hit the floor
    engine.queueInput('HARD_DROP');
    engine.tick(16);

    const state = engine.getState();
    // Active piece should be null, and a new piece should be queued
    expect(state.activePiece).toBeNull(); // OR it immediately spawns a new one

    // The grid should now have gems resting at the bottom
    const bottomGems = state.grid[0].filter(gem => gem !== null);
    expect(bottomGems.length).toBeGreaterThan(0);
  });
});
