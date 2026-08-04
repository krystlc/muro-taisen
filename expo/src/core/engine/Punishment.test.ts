import { describe, it, expect } from 'vitest';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from '../engine/Board';
import { GemColor, GemType } from '../models/Gem';
import { ChainResolver } from '../engine/ChainResolver';

describe('Punishment Mechanic', () => {
  const createEmptyBoard = (): BoardGrid => Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));

  it('should calculate shattered gems to determine punishment', () => {
    const grid = createEmptyBoard();

    // Create a cluster: 2 normal reds and 1 crash red
    grid[0][0] = { id: 'r1', color: GemColor.RED, type: GemType.NORMAL };
    grid[0][1] = { id: 'r2', color: GemColor.RED, type: GemType.NORMAL };
    grid[0][2] = { id: 'r3', color: GemColor.RED, type: GemType.CRASH };

    const result = ChainResolver.resolveStep(grid);

    // Result should show 3 gems shattered
    expect(result.gemsShattered).toBe(3);
  });

  it('should calculate the correct amount of garbage based on chain size', () => {
      // Assuming you have a calculator function.
      // In Puzzle Fighter, chains heavily multiply the output.
      const result1 = ChainResolver.calculateGarbage({ gemsShattered: 4, chainNumber: 1 });
      expect(result1).toBe(2); // e.g., 4 gems might send 2 garbage

      const result2 = ChainResolver.calculateGarbage({ gemsShattered: 4, chainNumber: 2 });
      expect(result2).toBe(6); // chain bonus multiplier
    });
});
