// src/core/engine/__tests__/GameState.test.ts
import { describe, it, expect } from "vitest/dist";
import { GameStateValidator } from "../GameStateValidator";
import { GemColor, GemType } from "../../models/Gem";
import { Board } from "../Board";

describe("Game State & Overflow Validation", () => {
  it("should trigger GAME_OVER if the top row of the grid is blocked", () => {
    const grid = Board.createEmptyGrid();
    const topRowIndex = grid.length - 1;

    // Fill the absolute top row of the grid
    grid[topRowIndex].fill({
      id: "death",
      color: GemColor.RED,
      type: GemType.NORMAL,
    });

    const status = GameStateValidator.checkStatus(grid);
    expect(status).toBe("GAME_OVER");
  });

  it("should remain PLAYING if the top row is clear", () => {
    const grid = Board.createEmptyGrid();

    // Only fill a bottom/middle cell, leaving the top clear
    grid[0][0] = { id: "block", color: GemColor.BLUE, type: GemType.NORMAL };

    const status = GameStateValidator.checkStatus(grid);
    expect(status).toBe("PLAYING");
  });
});
