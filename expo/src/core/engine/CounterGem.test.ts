// src/core/engine/CounterGem.test.ts
import { describe, it, expect } from 'vitest';
import { GemColor, GemType } from '../models/Gem';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Merger';
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

  it('should transform a Counter Gem into a Normal Gem when its counterValue reaches 0', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { id: 'c1', color: GemColor.GREEN, type: GemType.COUNTER, counterValue: 1 };

    GameEngine.decrementCounters(grid);

    expect(grid[0][0]?.type).toBe(GemType.NORMAL);
    expect(grid[0][0]?.counterValue).toBeUndefined();
    expect(grid[0][0]?.color).toBe(GemColor.GREEN); // Retains its underlying color
  });

  it('should immediately thaw a Counter Gem if an adjacent shatter occurs, regardless of its timer', () => {
    const grid = createEmptyGrid();

    // Setup: Blue normal & Crash pair, adjacent to a Yellow Counter Gem (value 5)
    grid[0][0] = { id: '1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.BLUE, type: GemType.CRASH };
    grid[0][1] = { id: 'c1', color: GemColor.YELLOW, type: GemType.COUNTER, counterValue: 5 };

    // The agent's ChainResolver should mark the adjacent Counter Gem for thawing, NOT removal.
    ChainResolver.resolveStep(grid);

    // Blue gems should be destroyed
    expect(grid[0][0]).toBeNull();
    expect(grid[1][0]).toBeNull();

    // Yellow counter should be thawed to NORMAL, but NOT destroyed in this chain step
    expect(grid[0][1]?.type).toBe(GemType.NORMAL);
    expect(grid[0][1]?.color).toBe(GemColor.YELLOW);
    expect(grid[0][1]?.counterValue).toBeUndefined();
  });

  it('should not recursively shatter a newly thawed Counter Gem in the same chain step', () => {
    const grid = createEmptyGrid();

    // Setup: Red Crash detonates Red Normal. Adjacent is a Red Counter Gem.
    grid[0][0] = { id: '1', color: GemColor.RED, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.RED, type: GemType.CRASH };
    grid[0][1] = { id: 'c1', color: GemColor.RED, type: GemType.COUNTER, counterValue: 3 };

    ChainResolver.resolveStep(grid);

    // It thaws into a Red Normal gem, but survives this specific tick.
    // It would require a NEW adjacent Red Crash gem to destroy it on the next turn.
    expect(grid[0][1]?.type).toBe(GemType.NORMAL);
    expect(grid[0][1]).not.toBeNull();
  });
});
