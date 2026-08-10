// src/core/engine/RainbowGem.test.ts
import { describe, it, expect } from "vitest/dist";
import { GemColor, GemType } from "../../models/Gem";
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from "../Board";
import { ChainResolver } from "../ChainResolver";

function createEmptyGrid(): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

describe("Rainbow / Diamond Gem Engine", () => {
  it("should destroy all gems of the target color when it lands on a Normal Gem", () => {
    const grid = createEmptyGrid();

    // Setup: Rainbow gem lands on a Blue Normal Gem
    grid[5][2] = {
      id: "rainbow",
      color: GemColor.RAINBOW,
      type: GemType.RAINBOW,
    };
    grid[4][2] = { id: "target", color: GemColor.BLUE, type: GemType.NORMAL }; // Directly below

    // Scatter other gems
    grid[0][0] = { id: "b1", color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][5] = { id: "b2", color: GemColor.BLUE, type: GemType.CRASH };
    grid[3][3] = { id: "r1", color: GemColor.RED, type: GemType.NORMAL };

    ChainResolver.resolveRainbowGem(grid, 5, 2);

    // All blue gems (and the rainbow gem) should be gone
    expect(grid[5][2]).toBeNull();
    expect(grid[4][2]).toBeNull();
    expect(grid[0][0]).toBeNull();
    expect(grid[1][5]).toBeNull();

    // Red gem survives
    expect(grid[3][3]?.color).toBe(GemColor.RED);
  });

  it("should destroy all gems of the target color, including Counter Gems of that color", () => {
    const grid = createEmptyGrid();
    grid[2][2] = {
      id: "rainbow",
      color: GemColor.RAINBOW,
      type: GemType.RAINBOW,
    };
    grid[1][2] = { id: "target", color: GemColor.YELLOW, type: GemType.NORMAL };
    grid[0][0] = {
      id: "c1",
      color: GemColor.YELLOW,
      type: GemType.COUNTER,
      counterValue: 5,
    };

    ChainResolver.resolveRainbowGem(grid, 2, 2);

    expect(grid[0][0]).toBeNull(); // Yellow counter gem is destroyed
  });

  it("should shatter itself and do nothing else if it lands on the floor (row 0)", () => {
    const grid = createEmptyGrid();
    grid[0][3] = {
      id: "rainbow",
      color: GemColor.RAINBOW,
      type: GemType.RAINBOW,
    };
    grid[0][1] = { id: "r1", color: GemColor.RED, type: GemType.NORMAL };

    ChainResolver.resolveRainbowGem(grid, 0, 3);

    expect(grid[0][3]).toBeNull(); // Rainbow gem disappears
    expect(grid[0][1]).not.toBeNull(); // Red gem survives
  });
});
