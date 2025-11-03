// src/core/gameGrid.ts
import { IBlock, createEmptyBlock } from "../models/block";
import { GRID_WIDTH, GRID_HEIGHT } from "./shared";

/**
 * Class representing the core game board.
 */
export class GameGrid {
  // A 2D array of Blocks. Row-major order: grid[row][col]
  private grid: IBlock[][];

  constructor(width: number = GRID_WIDTH, height: number = GRID_HEIGHT) {
    // Initialize the grid with all empty blocks
    this.grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => createEmptyBlock()),
    );
  }

  /**
   * Getter for the grid data (useful for rendering and serialization).
   */
  public get state(): IBlock[][] {
    return this.grid;
  }

  /**
   * Checks if a given coordinate is within the board boundaries.
   */
  public isWithinBounds(row: number, col: number): boolean {
    return row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH;
  }

  /**
   * Gets the block at a specific coordinate.
   */
  public getBlock(row: number, col: number): IBlock {
    if (this.isWithinBounds(row, col)) {
      return this.grid[row][col];
    }
    // Return an empty block for out-of-bounds checks
    return createEmptyBlock();
  }

  /**
   * Sets the block at a specific coordinate.
   */
  public setBlock(row: number, col: number, block: IBlock): boolean {
    if (this.isWithinBounds(row, col)) {
      this.grid[row][col] = block;
      return true;
    }
    return false;
  }

  /**
   * Clears a specific cell (sets it to an empty block).
   */
  public clearCell(row: number, col: number): void {
    if (this.isWithinBounds(row, col)) {
      this.grid[row][col] = createEmptyBlock();
    }
  }

  /**
   * Resets the entire grid to be completely empty.
   */
  public reset(): void {
    this.grid = Array.from({ length: GRID_HEIGHT }, () =>
      Array.from({ length: GRID_WIDTH }, () => createEmptyBlock()),
    );
  }
}
