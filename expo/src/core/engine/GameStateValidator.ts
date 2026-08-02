import { BoardGrid, SPAWN_COLUMN, BOARD_ROWS } from './Board';

export type GameStatus = 'PLAYING' | 'GAME_OVER';

export class GameStateValidator {
  public static checkStatus(grid: BoardGrid): GameStatus {
    const topRowIndex = BOARD_ROWS - 1;

    // If the top row of the spawn column (or adjacent spawn coordinates) is blocked, trigger GAME_OVER
    if (grid[topRowIndex][SPAWN_COLUMN] !== null || (topRowIndex - 1 >= 0 && grid[topRowIndex - 1][SPAWN_COLUMN] !== null)) {
      return 'GAME_OVER';
    }

    return 'PLAYING';
  }
}
