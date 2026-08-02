// Shatter evaluation, gravity falls, drop chains
import { Gem, GemColor, GemType } from '../models/Gem';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Merger';

export class ChainResolver {
  public static resolveStep(grid: BoardGrid): { gemsShattered: number; powerGemIdsShattered: Set<string> } {
    let gemsShattered = 0;
    const powerGemIdsShattered = new Set<string>();
    const gemsToRemove = new Set<string>(); // Store coordinates as "row,col"
    const countersToThaw = new Set<string>();

    // 1. Find all active Crash Gems
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const gem = grid[r][c];
        if (gem?.type === GemType.CRASH) {
          this.floodFillShatter(
            grid,
            r,
            c,
            gem.color,
            gemsToRemove,
            countersToThaw,
            powerGemIdsShattered,
          );
        }
      }
    }

    // 2. Remove marked gems
    gemsToRemove.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      grid[r][c] = null;
      gemsShattered++;
    });

    // Thaw after shatter traversal so newly normal gems cannot join this same chain.
    countersToThaw.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      const gem = grid[r][c];
      if (gem?.type === GemType.COUNTER) {
        gem.type = GemType.NORMAL;
        delete gem.counterValue;
      }
    });

    return { gemsShattered, powerGemIdsShattered };
  }

  private static floodFillShatter(
    grid: BoardGrid,
    startR: number,
    startC: number,
    targetColor: GemColor,
    gemsToRemove: Set<string>,
    countersToThaw: Set<string>,
    powerGemIdsShattered: Set<string>
  ) {
    const queue: [number, number][] = [[startR, startC]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const key = `${r},${c}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const gem = grid[r][c];
      if (!gem || gem.color !== targetColor) continue;

      // If it's a matching color (Normal or Crash), mark for removal
      gemsToRemove.add(key);
      if (gem.powerGemId) powerGemIdsShattered.add(gem.powerGemId);

      // Check adjacent cells (Up, Down, Left, Right)
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dr, dc] of directions) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
            const nextGem = grid[nr][nc];
            if (nextGem?.type === GemType.COUNTER) {
              countersToThaw.add(`${nr},${nc}`);
            } else if (
              nextGem &&
              nextGem.color === targetColor &&
              nextGem.type === GemType.NORMAL
            ) {
              queue.push([nr, nc]);
            }
        }
      }
    }
  }

  public static resolveRainbowGem(grid: BoardGrid, row: number, col: number): void {
    const rainbowGem = grid[row]?.[col];
    if (!rainbowGem || rainbowGem.type !== GemType.RAINBOW) return;

    const gemBelow = row > 0 ? grid[row - 1]?.[col] : null;
    if (gemBelow?.type === GemType.NORMAL) {
      const targetColor = gemBelow.color;

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c]?.color === targetColor) {
            grid[r][c] = null;
          }
        }
      }
    }

    // A rainbow gem always shatters after resolving its landing effect.
    grid[row][col] = null;
  }

  public static applyGravity(grid: BoardGrid): boolean {
    let moved = false;
    for (let c = 0; c < BOARD_COLS; c++) {
      let emptyRow = 0;
      for (let r = 0; r < BOARD_ROWS; r++) {
        if (grid[r][c] !== null) {
          if (r !== emptyRow) {
            grid[emptyRow][c] = grid[r][c];
            grid[r][c] = null;
            moved = true;
          }
          emptyRow++;
        }
      }
    }
    return moved;
  }
}
