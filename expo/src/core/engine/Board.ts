// 6x12 grid state, collision, falling
import { Gem } from '../models/Gem';

// 12 visible rows + 1 hidden overflow row at the top
export const BOARD_ROWS = 13;
export const BOARD_COLS = 6;
export const SPAWN_COLUMN = 3; // 4th column from left (0-indexed)

export type BoardGrid = (Gem | null)[][];

/**
 * @agent_instruction
 * Provide pure functions for board manipulation.
 * Do NOT mutate state directly if avoidable; prefer returning new grid states or
 * explicitly documenting mutations for the GameEngine loop.
 */
export class Board {
  /**
   * Creates an empty 6x13 grid.
   */
  public static createEmptyGrid(): BoardGrid {
    const grid = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    return grid;
  }

  /**
   * Checks if a given coordinate is within the walls and floor.
   */
  public static isOutOfBounds(r: number, c: number): boolean {
    return r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS;
  }
}
