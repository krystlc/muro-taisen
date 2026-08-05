// src/core/engine/WallKick.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { BOARD_COLS, BOARD_ROWS } from '../Board';

describe('Active Piece: Rotation Wall Kicking', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine('test_seed');
    // For these tests to work perfectly, you might need a helper method
    // in your engine or test setup to manually set the active piece's position,
    // rather than simulating 10 'MOVE_RIGHT' inputs.
  });

  it('should kick left when rotating clockwise against the right wall', () => {
    // 1. Setup: Move piece to the absolute right edge, oriented vertically (0 degrees)
    // Pivot gem is at (row 5, col 5), Partner gem is above it at (row 4, col 5)
    engine.forceActivePieceState({
      row: 5,
      column: BOARD_COLS - 1, // Rightmost column
      rotation: 0
    });

    // 2. Action: Rotate right (clockwise)
    // Normal rotation to 90 degrees puts partner at (row 5, col 6) -> Out of bounds!
    engine.applyInput('ROTATE_CW');
    const state = engine.getState();

    // 3. Assertion: Piece should have rotated AND shifted left by 1 column
    expect(state.activePiece?.rotation).toBe(0);
    expect(state.activePiece?.column).toBe(BOARD_COLS - 1); // Kicked left
    expect(state.activePiece?.row).toBe(5); // Row remains unchanged
  });

  it('should kick right when rotating counter-clockwise against the left wall', () => {
    // 1. Setup: Move piece to the absolute left edge, oriented vertically
    engine.forceActivePieceState({
      row: 5,
      column: 0, // Leftmost column
      rotation: 0
    });

    // 2. Action: Rotate left (counter-clockwise)
    // Normal rotation to 270 degrees puts partner at (row 5, col -1) -> Out of bounds!
    engine.applyInput('ROTATE_CCW');
    const state = engine.getState();

    // 3. Assertion: Piece should have rotated AND shifted right by 1 column
    expect(state.activePiece?.rotation).toBe(0);
    expect(state.activePiece?.column).toBe(0); // Kicked right
  });

  it('should kick up when rotating horizontally against the floor', () => {
    // 1. Setup: Piece is horizontal, at the bottom of the board
    engine.forceActivePieceState({
      row: 0, // Bottom row (if 0 is bottom)
      column: 3,
      rotation: 90 // Horizontal
    });

    // 2. Action: Rotate right
    // Normal rotation to 180 degrees puts partner at (row 12, col 3) -> Below floor!
    engine.applyInput('ROTATE_CW');
    const state = engine.getState();

    // 3. Assertion: Piece should have rotated AND shifted up by 1 row
    expect(state.activePiece?.rotation).toBe(90);
    expect(state.activePiece?.row).toBe(0); // Kicked up (row index increases upwards)
  });

  it('should attempt the full fallback sequence and fail if all kicks are blocked', () => {
    // 1. Setup: Piece is in a 1-width deep "well" of locked gems
    // You will need a method to manually place locked gems for setup
    engine.forceGridState([
       // ... fill board so that row 10, col 0 is empty, but surrounded by gems
    ]);
    engine.forceActivePieceState({
      row: 10,
      column: 0,
      rotation: 0
    });

    // 2. Action: Rotate right
    // - Tries default (blocked by wall)
    // - Tries Up (blocked by locked gem)
    // - Tries Left (blocked by wall)
    // - Tries Down (blocked by floor/gem)
    // - Tries Right (blocked by locked gem)
    engine.applyInput('ROTATE_CW');
    const state = engine.getState();

    // 3. Assertion: The rotation should be entirely canceled
    expect(state.activePiece?.rotation).toBe(0); // Did not rotate
    expect(state.activePiece?.column).toBe(0);   // Did not move
  });
});
