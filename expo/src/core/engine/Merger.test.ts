import { describe, it, expect } from 'vitest';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Board';
import { GemColor, GemType } from '../models/Gem';
import { Merger } from './Merger';

function createEmptyGrid(): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

describe('Power Gem Merger Engine', () => {
  it('should merge a 2x2 block of identical normal gems into a Power Gem', () => {
    const grid = createEmptyGrid();

    // Place a 2x2 RED block at bottom left (0,0) to (1,1)
    grid[0][0] = { id: '1', color: GemColor.RED, type: GemType.NORMAL };
    grid[0][1] = { id: '2', color: GemColor.RED, type: GemType.NORMAL };
    grid[1][0] = { id: '3', color: GemColor.RED, type: GemType.NORMAL };
    grid[1][1] = { id: '4', color: GemColor.RED, type: GemType.NORMAL };

    const merged = Merger.detectAndMergePowerGems(grid);

    expect(merged).toBe(true);
    expect(grid[0][0]?.powerGemId).toBeDefined();
    expect(grid[0][0]?.powerWidth).toBe(2);
    expect(grid[0][0]?.powerHeight).toBe(2);
    expect(grid[1][1]?.powerGemId).toBe(grid[0][0]?.powerGemId);
  });

  it('should not merge non-rectangular configurations', () => {
    const grid = createEmptyGrid();
    // L-Shape of RED gems
    grid[0][0] = { id: '1', color: GemColor.RED, type: GemType.NORMAL };
    grid[0][1] = { id: '2', color: GemColor.RED, type: GemType.NORMAL };
    grid[1][0] = { id: '3', color: GemColor.RED, type: GemType.NORMAL };

    const merged = Merger.detectAndMergePowerGems(grid);

    expect(merged).toBe(false);
    expect(grid[0][0]?.powerGemId).toBeUndefined();
  });
});
