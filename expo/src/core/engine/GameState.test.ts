// src/core/engine/GameState.test.ts
import { describe, it, expect } from 'vitest';
import { GameStateValidator } from './GameStateValidator';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Merger';
import { GemColor, GemType } from '../models/Gem';

function createEmptyGrid(): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

describe('Game State & Overflow Validation', () => {
  const SPAWN_COLUMN = 3; // 4th column from the left (0-indexed)

  it('should trigger GAME_OVER if the spawn column reaches the top boundary', () => {
    const grid = createEmptyGrid();

    // Fill the spawn column up to the top visible row (Row 11)
    grid[11][SPAWN_COLUMN] = { id: 'death', color: GemColor.RED, type: GemType.NORMAL };

    const status = GameStateValidator.checkStatus(grid);
    expect(status).toBe('GAME_OVER');
  });

  it('should remain PLAYING if non-spawn columns overflow past the top row', () => {
    const grid = createEmptyGrid();

    // Fill a side column past the visible boundary (Row 12 / Hidden Row)
    // Most puzzle fighters allow side columns to overflow into hidden rows without dying
    grid[11][0] = { id: 'overflow1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[12] = Array(BOARD_COLS).fill(null); // Create hidden 13th row
    grid[12][0] = { id: 'overflow2', color: GemColor.BLUE, type: GemType.NORMAL };

    const status = GameStateValidator.checkStatus(grid);
    expect(status).toBe('PLAYING');
  });
});
