import { describe, it, expect } from 'vitest';
import { ChainResolver } from './ChainResolver';
import { GemColor, GemType } from '../models/Gem';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Board';

function createEmptyGrid(): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

describe('Chain Resolver Engine', () => {
  it('should shatter adjacent normal gems of the same color when a Crash Gem detonates', () => {
    const grid = createEmptyGrid();

    // Setup: Blue Normal gem at bottom left, Blue Crash gem lands on top of it
    grid[0][0] = { id: '1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.BLUE, type: GemType.CRASH };

    const result = ChainResolver.resolveStep(grid);

    expect(result.gemsShattered).toBe(2);
    expect(grid[0][0]).toBeNull();
    expect(grid[1][0]).toBeNull();
  });

  it('should shatter an entire Power Gem if any part of it is touched by a matching Crash Gem', () => {
    const grid = createEmptyGrid();

    // Setup: 2x2 Red Power Gem with a Red Crash Gem adjacent to it
    const powerId = 'red_power_1';
    grid[0][0] = { id: '1', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };
    grid[0][1] = { id: '2', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };
    grid[1][0] = { id: '3', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };
    grid[1][1] = { id: '4', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };

    grid[0][2] = { id: '5', color: GemColor.RED, type: GemType.CRASH }; // Touches [0][1]

    const result = ChainResolver.resolveStep(grid);

    expect(result.gemsShattered).toBe(5); // 4 from Power Gem + 1 Crash Gem
    expect(grid[0][0]).toBeNull();
  });

  it('should apply gravity to unsupported gems after a shatter', () => {
    const grid = createEmptyGrid();

    // Setup: Blue Crash destroys Blue Normal, leaving a floating Yellow gem
    grid[0][0] = { id: '1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.BLUE, type: GemType.CRASH };
    grid[2][0] = { id: '3', color: GemColor.YELLOW, type: GemType.NORMAL }; // Floating

    ChainResolver.resolveStep(grid);
    ChainResolver.applyGravity(grid);

    expect(grid[0][0]?.color).toBe(GemColor.YELLOW); // Yellow gem fell to the bottom
    expect(grid[2][0]).toBeNull();
  });
});
