import { describe, it, expect, beforeEach } from "vitest/dist";
import { GameEngine } from "../GameEngine";
import { BOARD_COLS, BOARD_ROWS } from "../Board";
import { GemColor, GemType } from "../../models/Gem";

describe("Independent Column Gravity & Piece Separation", () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine("gravity_test_seed");
  });

  it("separates paired gems and allows independent falling if columns have uneven heights", () => {
    const state = engine.getState();
    const grid = state.grid;

    // Clear board first to ensure deterministic test setup
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        grid[r][c] = null;
      }
    }

    // Build a taller stack on column 3 (blocks row 0 and row 1)
    grid[0][3] = {
      id: "support-3-0",
      color: GemColor.RED,
      type: GemType.NORMAL,
    };
    grid[1][3] = {
      id: "support-3-1",
      color: GemColor.RED,
      type: GemType.NORMAL,
    };

    // Set active piece explicitly: horizontal rotation across column 2 and 3 at row 2
    state.activePiece = {
      gems: [
        { id: "piece-gem-2", color: GemColor.BLUE, type: GemType.NORMAL },
        { id: "piece-gem-3", color: GemColor.BLUE, type: GemType.NORMAL },
      ],
      row: 2,
      column: 2,
      rotation: 90, // Gem 1 at (2,2), Gem 2 at (2,3)
    };

    // Hard drop the piece. Gem at (2,3) hits the stack at row 2 (above support at row 1).
    // Gem at (2,2) has empty space underneath all the way to row 0 and must fall independently.
    engine.queueInput("HARD_DROP");
    engine.tick(0);

    const updatedState = engine.getState();

    // The right gem on col 3 should lock where it hit the stack
    expect(updatedState.grid[2][3]).not.toBeNull();

    // The left gem on col 2 must separate and fall independently all the way to the floor (row 0)
    expect(updatedState.grid[0][2]).not.toBeNull();
    expect(updatedState.grid[1][2]).toBeNull();
    expect(updatedState.grid[2][2]).toBeNull();
  });
});
