// src/game/matching.ts
import { Block, BlockType, GemColor } from "./block";
import { GRID_WIDTH, GRID_HEIGHT } from "./constants";

export interface MatchGroup {
  blocks: Block[];
  color: GemColor;
}

export class MatchingSystem {
  // Minimum number of matching blocks needed for a match
  private static readonly MIN_MATCH_COUNT = 3;

  /**
   * Find all matching groups in the grid
   */
  static findMatches(grid: (Block | null)[][]): MatchGroup[] {
    const matches: MatchGroup[] = [];
    const visited = new Set<string>();

    // Check each cell in the grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const block = grid[y][x];
        if (!block || visited.has(`${x},${y}`)) continue;

        // Find connected blocks of the same color
        const matchingBlocks = this.getConnectedSameColorBlocks(
          grid,
          x,
          y,
          block.gemColor
        );

        // If enough blocks for a match
        if (matchingBlocks.length >= this.MIN_MATCH_COUNT) {
          matches.push({
            blocks: matchingBlocks,
            color: block.gemColor,
          });

          // Mark blocks as visited
          matchingBlocks.forEach((b) => visited.add(`${b.gridX},${b.gridY}`));
        }
      }
    }

    return matches;
  }

  /**
   * Find all connected blocks of the same color using BFS
   */
  private static getConnectedSameColorBlocks(
    grid: (Block | null)[][],
    startX: number,
    startY: number,
    color: GemColor
  ): Block[] {
    const result: Block[] = [];
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]; // Left, Right, Up, Down

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const block = grid[y][x];
      if (!block || block.gemColor !== color) continue;

      result.push(block);

      // Check adjacent cells
      for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;

        if (
          newX >= 0 &&
          newX < GRID_WIDTH &&
          newY >= 0 &&
          newY < GRID_HEIGHT &&
          !visited.has(`${newX},${newY}`)
        ) {
          queue.push([newX, newY]);
        }
      }
    }

    return result;
  }

  /**
   * Process special block effects
   */
  static processCrashGems(
    matches: MatchGroup[],
    grid: (Block | null)[][]
  ): Block[] {
    const additionalBlocksToRemove: Block[] = [];

    // Find crash gems in matching groups
    matches.forEach((group) => {
      group.blocks.forEach((block) => {
        if (block.blockType === BlockType.CRASH_GEM) {
          // Collect all blocks in the same row and column
          for (let x = 0; x < GRID_WIDTH; x++) {
            const blockInRow = grid[block.gridY][x];
            if (
              blockInRow &&
              !group.blocks.includes(blockInRow) &&
              !additionalBlocksToRemove.includes(blockInRow)
            ) {
              additionalBlocksToRemove.push(blockInRow);
            }
          }

          for (let y = 0; y < GRID_HEIGHT; y++) {
            const blockInCol = grid[y][block.gridX];
            if (
              blockInCol &&
              !group.blocks.includes(blockInCol) &&
              !additionalBlocksToRemove.includes(blockInCol)
            ) {
              additionalBlocksToRemove.push(blockInCol);
            }
          }
        }
      });
    });

    return additionalBlocksToRemove;
  }
}