// src/core/engine/CounterGem.test.ts
import { describe, it, expect } from 'vitest';
import { GemColor, GemType } from '../models/Gem';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Board';
import { ChainResolver } from './ChainResolver';
import { GameEngine } from './GameEngine';

function createEmptyGrid(): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

describe('Counter Gem (Garbage) Mechanics', () => {
  it('should decrement the counterValue of all Counter Gems by 1 at the end of a turn cycle', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { id: 'c1', color: GemColor.RED, type: GemType.COUNTER, counterValue: 5 };
    grid[1][0] = { id: 'c2', color: GemColor.BLUE, type: GemType.COUNTER, counterValue: 2 };

    GameEngine.decrementCounters(grid);

    expect(grid[0][0]?.counterValue).toBe(4);
    expect(grid[1][0]?.counterValue).toBe(1);
  });

  it('should transform a Counter Gem into a Normal Gem when its counterValue decrements down to 0', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { id: 'c1', color: GemColor.GREEN, type: GemType.COUNTER, counterValue: 1 };

    GameEngine.decrementCounters(grid);

    expect(grid[0][0]?.type).toBe(GemType.NORMAL);
    expect(grid[0][0]?.counterValue).toBeUndefined();
    expect(grid[0][0]?.color).toBe(GemColor.GREEN);
  });

  it('should immediately thaw an adjacent Counter Gem during a crash explosion regardless of its counter value', () => {
    const grid = createEmptyGrid();

    // Setup: Blue normal & Crash pair, adjacent to a Yellow Counter Gem with a high timer (5)
    grid[0][0] = { id: '1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.BLUE, type: GemType.CRASH };
    grid[0][1] = { id: 'c1', color: GemColor.YELLOW, type: GemType.COUNTER, counterValue: 5 };

    ChainResolver.resolveStep(grid);

    // Blue gems should be destroyed
    expect(grid[0][0]).toBeNull();
    expect(grid[1][0]).toBeNull();

    // Yellow counter should instantly thaw to NORMAL due to the adjacent explosion
    expect(grid[0][1]?.type).toBe(GemType.NORMAL);
    expect(grid[0][1]?.color).toBe(GemColor.YELLOW);
    expect(grid[0][1]?.counterValue).toBeUndefined();
  });

  it('should allow a newly thawed counter gem to survive the current explosion tick without self-destructing', () => {
    const grid = createEmptyGrid();

    // Setup: Red Crash detonates Red Normal. Adjacent is a Red Counter Gem.
    grid[0][0] = { id: '1', color: GemColor.RED, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.RED, type: GemType.CRASH };
    grid[0][1] = { id: 'c1', color: GemColor.RED, type: GemType.COUNTER, counterValue: 3 };

    ChainResolver.resolveStep(grid);

    // It thaws into a Red Normal gem on this tick, but is not part of the initial cluster explosion payload
    expect(grid[0][1]?.type).toBe(GemType.NORMAL);
    expect(grid[0][1]).not.toBeNull();
  });
});
