import { BoardGrid, BOARD_ROWS, SPAWN_COLUMN } from './Board';

export type GameStatus = 'PLAYING' | 'GAME_OVER';

/**
 * @agent_instruction
 * In this puzzle fighter, a player ONLY loses if the SPAWN_COLUMN (column 3)
 * is blocked at the top visible row (Row 11/12 depending on 0-index).
 * Overflow in other columns is permissible and does not cause a Game Over.
 */
export class GameStateValidator {
  /**
   * Evaluates the grid to determine if the game should end.
   * @param grid The current board state
   * @returns 'GAME_OVER' if the spawn column is blocked, otherwise 'PLAYING'
   */
  public static checkStatus(grid: BoardGrid): GameStatus {
    // TODO: Implement logic to check if grid[11][SPAWN_COLUMN] or grid[12][SPAWN_COLUMN] is occupied.
    return 'PLAYING';
  }
}
