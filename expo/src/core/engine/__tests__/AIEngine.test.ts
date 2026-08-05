import { describe, it, expect } from 'vitest';
import { AIEngine } from '../AIEngine';
import { GemColor, GemType } from '../../models/Gem';
import { Board } from '../Board';

describe('AI Heuristic Engine', () => {
  it('should heavily penalize dropping pieces in columns close to the ceiling', () => {
    const grid = Board.createEmptyGrid();

    // Fill column 0 almost to the top
    for(let r = 0; r < 10; r++) {
        grid[r][0] = { id: `block_${r}`, color: GemColor.RED, type: GemType.NORMAL };
    }

    const currentPiece = {
      gem1: { id: 'p1', color: GemColor.BLUE, type: GemType.NORMAL },
      gem2: { id: 'p2', color: GemColor.YELLOW, type: GemType.NORMAL }
    };

    const bestMove = AIEngine.calculateBestMove(grid, currentPiece);

    // The AI should absolutely avoid column 0
    expect(bestMove.column).not.toBe(0);
  });

  it('should prioritize placing a Crash Gem adjacent to a massive block of the same color', () => {
    const grid = Board.createEmptyGrid();

    // Build a nice blue structure in column 2
    grid[0][2] = { id: 'b1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][2] = { id: 'b2', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[2][2] = { id: 'b3', color: GemColor.BLUE, type: GemType.NORMAL };

    const currentPiece = {
      gem1: { id: 'p1', color: GemColor.BLUE, type: GemType.CRASH },
      gem2: { id: 'p2', color: GemColor.RED, type: GemType.NORMAL } // Garbage red
    };

    const bestMove = AIEngine.calculateBestMove(grid, currentPiece);

    // It should place it in col 2, and rotate so the Crash gem is on the bottom or adjacent
    expect(bestMove.column).toBe(2);
  });
});
