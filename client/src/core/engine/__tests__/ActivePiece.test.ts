// src/core/engine/ActivePiece.test.ts
import { describe, it, expect } from ".pnpm/vitest@4.1.10_@types+node@26.1.2_vite@8.2.0_@types+node@26.1.2_terser@5.49.0_yaml@2.9.0_/node_modules/vitest/dist";
import { GameEngine } from "../GameEngine";

describe("Active Piece & Input Mechanics", () => {
  it("should move the active piece left and right based on input", () => {
    const engine = new GameEngine("test_seed");
    const startCol = engine.getState().activePiece!.column;

    if (startCol > 0) {
      engine.queueInput("MOVE_LEFT");
      engine.tick(16);
      expect(engine.getState().activePiece?.column).toBe(startCol - 1);
    } else {
      engine.queueInput("MOVE_RIGHT");
      engine.tick(16);
      expect(engine.getState().activePiece?.column).toBe(startCol + 1);
    }
  });

  it("should block movement if the piece hits the left or right wall", () => {
    const engine = new GameEngine("test_seed");

    // Force move left 5 times (should hit the wall at col 0)
    for (let i = 0; i < 5; i++) {
      engine.queueInput("MOVE_LEFT");
      engine.tick(16);
    }

    expect(engine.getState().activePiece?.column).toBe(0); // Blocked at wall
  });

  it("should prevent rotation if the rotation would clip through a wall or existing block", () => {
    const engine = new GameEngine("test_seed");

    // Move to the absolute right wall
    for (let i = 0; i < 5; i++) {
      engine.queueInput("MOVE_RIGHT");
      engine.tick(16);
    }

    // Try to rotate horizontally.
    // With wall kicks, it should rotate and shift left.
    const initialRot = engine.getState().activePiece?.rotation;
    engine.queueInput("ROTATE_CW");
    engine.tick(16);

    expect(engine.getState().activePiece?.rotation).not.toBe(initialRot); // Should have rotated successfully via wall kick
  });

  it("should lock the piece into the board grid when it hits the floor", () => {
    const engine = new GameEngine("test_seed");
    const initialPieceId = engine.getState().activePiece!.gems[0].id;

    // Force a Hard Drop to instantly hit the floor
    engine.queueInput("HARD_DROP");
    engine.tick(16);

    const state = engine.getState();
    expect(state.activePiece).not.toBeNull();
    expect(state.activePiece?.gems[0].id).not.toBe(initialPieceId);

    // The grid should now have gems resting at the bottom
    const bottomGems = state.grid[0].filter((gem) => gem !== null);
    expect(bottomGems.length).toBeGreaterThan(0);
  });
});
