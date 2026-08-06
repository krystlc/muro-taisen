import { BoardGrid } from './Board';

export type GameStatus = 'PLAYING' | 'GAME_OVER';

export class GameStateValidator {
  public static checkStatus(grid: BoardGrid): GameStatus {
    if (!grid || grid.length === 0) return 'PLAYING';

    // The top row is the last array in the grid stack
    const topRow = grid[grid.length - 1];

    // If any cell in the top row is occupied, it's a top-out (Game Over)
    const isTopRowBlocked = topRow.some(cell => cell !== null);

    if (isTopRowBlocked) {
      return 'GAME_OVER';
    }

    return 'PLAYING';
  }
}
