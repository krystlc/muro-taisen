import { describe, it, expect, beforeEach } from "vitest/dist";
import { GameEngine } from "../GameEngine";
import { BOARD_COLS, BOARD_ROWS } from "../Board";
import { ChainResolver } from "../ChainResolver";
import { Merger } from "../Merger";
import { GemColor, GemType } from "../../models/Gem";

describe("Advanced Puzzle Mechanics: Power Gems, Monolithic Gravity, & Counters", () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine("advanced_test_seed");
  });

  it("triggers a Power Gem explosion chain when a matching Crash Gem hits it", () => {
    const grid = engine.getState().grid;
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++) grid[r][c] = null;

    // Create a 2x2 Blue Power Gem at bottom-left (rows 0-1, cols 0-1)
    const powerId = "power_0_0_test";
    grid[0][0] = {
      id: "p00",
      color: GemColor.BLUE,
      type: GemType.NORMAL,
      powerGemId: powerId,
      powerWidth: 2,
      powerHeight: 2,
    };
    grid[0][1] = {
      id: "p01",
      color: GemColor.BLUE,
      type: GemType.NORMAL,
      powerGemId: powerId,
    };
    grid[1][0] = {
      id: "p10",
      color: GemColor.BLUE,
      type: GemType.NORMAL,
      powerGemId: powerId,
    };
    grid[1][1] = {
      id: "p11",
      color: GemColor.BLUE,
      type: GemType.NORMAL,
      powerGemId: powerId,
    };

    // Drop a Blue Crash Gem directly adjacent or matching to trigger the Power Gem explosion
    grid[2][0] = { id: "crash1", color: GemColor.BLUE, type: GemType.CRASH };

    // Resolve step
    const result = ChainResolver.resolveStep(grid);

    // Power gem and its components should shatter/explode completely
    expect(result.powerGemIdsShattered.has(powerId)).toBe(true);
    expect(grid[0][0]).toBeNull();
    expect(grid[1][1]).toBeNull();
  });

  it("forces monolithic Power Gems to require a fully unobstructed column floor span to fall", () => {
    const grid = engine.getState().grid;
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++) grid[r][c] = null;

    // Build a 2x2 Red Power Gem floating at rows 2-3, columns 0-1
    const powerId = "power_2_0_test";
    grid[2][0] = {
      id: "p20",
      color: GemColor.RED,
      type: GemType.NORMAL,
      powerGemId: powerId,
      powerWidth: 2,
      powerHeight: 2,
    };
    grid[2][1] = {
      id: "p21",
      color: GemColor.RED,
      type: GemType.NORMAL,
      powerGemId: powerId,
    };
    grid[3][0] = {
      id: "p30",
      color: GemColor.RED,
      type: GemType.NORMAL,
      powerGemId: powerId,
    };
    grid[3][1] = {
      id: "p31",
      color: GemColor.RED,
      type: GemType.NORMAL,
      powerGemId: powerId,
    };

    // Place an obstacle underneath column 1 at row 0, leaving column 0 completely empty underneath
    grid[0][1] = {
      id: "obstacle",
      color: GemColor.GREEN,
      type: GemType.NORMAL,
    };

    // Run gravity resolution
    let moved = true;
    while (moved) {
      moved = ChainResolver.applyGravity(grid);
    }

    // Because column 1 is blocked at row 0, the entire 2x2 monolithic block CANNOT fall,
    // even though column 0 has empty space all the way to the floor.
    expect(grid[2][0]).not.toBeNull();
    expect(grid[2][1]).not.toBeNull();
  });

  it("decrements Counter Gems and tracks counter values correctly over turns", () => {
    const grid = engine.getState().grid;
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++) grid[r][c] = null;

    // Place a Counter Gem with value 2
    grid[0][0] = {
      id: "counter1",
      color: GemColor.RED,
      type: GemType.COUNTER,
      counterValue: 2,
    };

    // Simulate lock/turn processing which calls decrementCounters
    GameEngine.decrementCounters(grid);
    expect(grid[0][0]?.counterValue).toBe(1);
    expect(grid[0][0]?.type).toBe(GemType.COUNTER);

    // Second decrement should thaw it to NORMAL
    GameEngine.decrementCounters(grid);
    expect(grid[0][0]?.type).toBe(GemType.NORMAL);
    expect(grid[0][0]?.counterValue).toBeUndefined();
  });

  it("detects and merges a 2x2 group of same-color gems into a Power Gem", () => {
    const grid = engine.getState().grid;
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++) grid[r][c] = null;

    // Place a 2x2 square of Red gems at rows 0-1, columns 0-1
    grid[0][0] = { id: "m00", color: GemColor.RED, type: GemType.NORMAL };
    grid[0][1] = { id: "m01", color: GemColor.RED, type: GemType.NORMAL };
    grid[1][0] = { id: "m10", color: GemColor.RED, type: GemType.NORMAL };
    grid[1][1] = { id: "m11", color: GemColor.RED, type: GemType.NORMAL };

    // Run merger detection
    Merger.detectAndMergePowerGems(grid);

    // Verify they are merged into a Power Gem with width 2 and height 2 sharing a powerGemId
    const firstGem = grid[0][0];

    expect(firstGem?.powerGemId).toBeDefined();
    expect(firstGem?.powerWidth).toBe(2);
    expect(firstGem?.powerHeight).toBe(2);

    // Verify all cells in the 2x2 block point to the same powerGemId
    expect(grid[0][1]?.powerGemId).toBe(firstGem?.powerGemId);
    expect(grid[1][0]?.powerGemId).toBe(firstGem?.powerGemId);
    expect(grid[1][1]?.powerGemId).toBe(firstGem?.powerGemId);
  });
});
