import { Gem, GemColor, GemType } from '../models/Gem';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Merger';

export interface Move {
  column: number;
  rotation: number; // 0 = default, 1 = 90deg, 2 = 180deg, 3 = 270deg
  score: number;
}

export class AIEngine {
  public static calculateBestMove(grid: BoardGrid, currentPiece: { gem1: Gem, gem2: Gem }): Move {
    let bestMove: Move = { column: 0, rotation: 0, score: -Infinity };

    // Brute force all possible moves (6 columns * 4 rotations = 24 combinations)
    for (let c = 0; c < BOARD_COLS; c++) {
      for (let r = 0; r < 4; r++) {
        const score = this.evaluateMove(grid, currentPiece, c, r);
        if (score > bestMove.score) {
          bestMove = { column: c, rotation: r, score };
        }
      }
    }

    return bestMove;
  }
  private static evaluateMove(grid: BoardGrid, piece: { gem1: Gem, gem2: Gem }, col: number, rot: number): number {
    let score = 0;

    const simulatedDrop = this.simulateDrop(grid, col, rot);
    if (!simulatedDrop.isValid) return -Infinity;

    const { row1, col1, row2, col2 } = simulatedDrop;

    // 2. Penalty for Height (Danger Zone)
    // REDUCED the multiplier from 10 to 5 so it doesn't overpower strategic stacking
    // at the lower/middle sections of the board.
    const maxHeight = Math.max(row1, row2);
    score -= Math.pow(maxHeight, 2) * 5;

    // 3. Reward for grouping identical colors (Building Power Gems)
    score += this.calculateAdjacencyScore(grid, piece.gem1, row1, col1);
    score += this.calculateAdjacencyScore(grid, piece.gem2, row2, col2);

    // 4. Reward for shattering (Immediate gratification)
    if (piece.gem1.type === GemType.CRASH && this.isAdjacentToMatchingColor(grid, piece.gem1.color, row1, col1)) {
      score += 1000;
    }
    // Check gem2 as well, just in case the piece is rotated and gem2 is the crash gem
    if (piece.gem2.type === GemType.CRASH && this.isAdjacentToMatchingColor(grid, piece.gem2.color, row2, col2)) {
      score += 1000;
    }

    return score;
  }

  private static calculateAdjacencyScore(grid: BoardGrid, gem: Gem, r: number, c: number): number {
    let bonus = 0;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // Up, Down, Right, Left

    for (const [dr, dc] of directions) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
        const neighbor = grid[nr][nc];
        if (neighbor && neighbor.color === gem.color) {
          // NEW RULE: Heavy reward for placing directly ON TOP of the same color.
          // This overcomes the height penalty and forces the AI to build tall columns.
          if (dr === -1 && dc === 0) {
            bonus += 150;
          } else {
            bonus += 50;  // Standard reward for side-by-side touching
          }
        }
      }
    }
    return bonus;
  }

  // Stubs for internal logic
  // Helper to find the lowest available row in a given column
  private static getDropRow(grid: BoardGrid, col: number): number {
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (grid[r][col] === null) {
        return r;
      }
    }
    return BOARD_ROWS; // Column is full
  }

  private static simulateDrop(grid: BoardGrid, col: number, rot: number): { isValid: boolean, row1: number, col1: number, row2: number, col2: number } {
    let row1 = 0, col1 = col, row2 = 0, col2 = col;

    switch (rot) {
      case 0: // Vertical: gem2 on top of gem1
        col2 = col;
        row1 = this.getDropRow(grid, col1);
        row2 = row1 + 1;
        break;
      case 1: // Horizontal: gem2 to the right of gem1
        col2 = col + 1;
        if (col2 >= BOARD_COLS) return { isValid: false, row1: 0, col1: 0, row2: 0, col2: 0 }; // Wall collision
        row1 = this.getDropRow(grid, col1);
        row2 = this.getDropRow(grid, col2);
        break;
      case 2: // Vertical: gem2 below gem1
        col2 = col;
        row2 = this.getDropRow(grid, col2);
        row1 = row2 + 1;
        break;
      case 3: // Horizontal: gem2 to the left of gem1
        col2 = col - 1;
        if (col2 < 0) return { isValid: false, row1: 0, col1: 0, row2: 0, col2: 0 }; // Wall collision
        row1 = this.getDropRow(grid, col1);
        row2 = this.getDropRow(grid, col2);
        break;
    }

    // If either gem lands above the valid board area, the move is invalid (causes a game over)
    if (row1 >= BOARD_ROWS || row2 >= BOARD_ROWS) {
      return { isValid: false, row1, col1, row2, col2 };
    }

    return { isValid: true, row1, col1, row2, col2 };
  }

  private static isAdjacentToMatchingColor(grid: BoardGrid, color: GemColor, r: number, c: number): boolean {
    // Quick safeguard so we don't pass dummy gems into our adjacency calculator
    return this.calculateAdjacencyScore(grid, { id: 'stub', color, type: GemType.NORMAL }, r, c) > 0;
  }
}
