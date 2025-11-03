import { IBlock, BlockColor, BlockType } from "../models/block";
import { GRID_HEIGHT, GRID_WIDTH } from "./shared";

// Define the neighboring cells (up, down, left, right)
const NEIGHBORS = [
  [-1, 0], // Up
  [1, 0], // Down
  [0, -1], // Left
  [0, 1], // Right
];

/**
 * Performs a search to find all contiguous blocks of the same color.
 * This is the core logic for matching blocks and for the orb explosion range.
 * @returns A Set of string coordinates ("row,col") of all connected blocks.
 */
export function findContiguousBlocks(
  grid: IBlock[][],
  startRow: number,
  startCol: number,
  targetColor: BlockColor,
  minMatchCount: number = 4, // Default Tetris match size (adjust as needed for your game)
): Set<string> {
  if (targetColor === BlockColor.EMPTY) return new Set();

  const visited = new Set<string>();
  const contiguousSet = new Set<string>();
  const stack: [number, number][] = [[startRow, startCol]];

  while (stack.length > 0) {
    const [row, col] = stack.pop()!;
    const key = `${row},${col}`;

    if (visited.has(key)) continue;
    visited.add(key);

    // Check if the coordinates are within bounds and the color matches
    if (
      row >= 0 &&
      row < GRID_HEIGHT &&
      col >= 0 &&
      col < GRID_WIDTH &&
      grid[row][col].color === targetColor &&
      grid[row][col].type !== BlockType.EMPTY
    ) {
      contiguousSet.add(key);

      // Explore neighbors
      for (const [dRow, dCol] of NEIGHBORS) {
        const nextRow = row + dRow;
        const nextCol = col + dCol;
        stack.push([nextRow, nextCol]);
      }
    }
  }

  // The logic for matching (e.g., must be 4 or more) would be checked AFTER
  // the chain reaction is triggered by the ORB (next step).
  // For the ORB check, we just need ALL connected blocks.
  return contiguousSet;
}

// ... (Rest of the GameGrid class)
