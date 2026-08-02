import { Gem, GemColor, GemType } from '../models/Gem';
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from './Board';

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

      // When a gem with a powerGemId is marked for removal, queue ALL cells sharing that powerGemId:
      if (gem.powerGemId) {
        powerGemIdsShattered.add(gem.powerGemId);
        // Mark all board cells matching this powerGemId for removal
        for (let pr = 0; pr < BOARD_ROWS; pr++) {
          for (let pc = 0; pc < BOARD_COLS; pc++) {
            if (grid[pr][pc]?.powerGemId === gem.powerGemId) {
              gemsToRemove.add(`${pr},${pc}`);
            }
          }
        }
      }

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

  // Update inside ChainResolver.ts
  public static applyGravity(grid: BoardGrid): boolean {
    let moved = false;
    const processedPowerGems = new Set<string>();

    // 1. First pass: Handle multi-tile Power Gems as rigid bodies
    // Scan from bottom to top to evaluate blocks correctly
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const gem = grid[r][c];
        if (!gem || !gem.powerGemId || !gem.powerWidth || !gem.powerHeight) continue;
        if (processedPowerGems.has(gem.powerGemId)) continue;
        processedPowerGems.add(gem.powerGemId);

        const pWidth = gem.powerWidth;
        const pHeight = gem.powerHeight;
        const baseRow = r;
        const baseCol = c;

        // Check how many rows down the entire block can fall
        let dropDistance = 0;
        let canFall = true;

        while (canFall) {
          const targetRow = baseRow - (dropDistance + 1);
          if (targetRow < 0) break;

          // Check every column footprint across the entire width of the Power Gem
          for (let w = 0; w < pWidth; w++) {
            const checkCol = baseCol + w;
            // Check all rows of the power gem at this column width
            for (let h = 0; h < pHeight; h++) {
              const currentCellRow = baseRow + h;
              const destinationRow = targetRow + h;

              const cellBelow = grid[destinationRow]?.[checkCol];
              // It's blocked if the destination cell contains an alien block
              // that is NOT part of this same Power Gem's current footprint.
              const isSelf = currentCellRow >= targetRow && currentCellRow < targetRow + pHeight && checkCol >= baseCol && checkCol < baseCol + pWidth;

              if (cellBelow !== null && !isSelf) {
                canFall = false;
                break;
              }
            }
            if (!canFall) break;
          }

          if (canFall) {
            dropDistance++;
          }
        }

        // If the entire rigid body can drop, shift all cells together
        // If the entire rigid body can drop, shift all cells together
        if (dropDistance > 0) {
          // Collect all current coordinates and references explicitly typed
          const blockCells: { row: number; col: number; gem: Gem }[] = [];
          for (let h = 0; h < pHeight; h++) {
            for (let w = 0; w < pWidth; w++) {
              const currR = baseRow + h;
              const currC = baseCol + w;
              const currentGem = grid[currR][currC];
              if (currentGem && currentGem.powerGemId === gem.powerGemId) {
                blockCells.push({ row: currR, col: currC, gem: currentGem });
                grid[currR][currC] = null;
              }
            }
          }

          // Place them at their new dropped positions
          blockCells.forEach(({ row, col, gem: g }) => {
            const newRow = row - dropDistance;
            grid[newRow][col] = g;
          });

          moved = true;
        }
      }
    }

    // 2. Second pass: Handle standard single gems normal gravity fall
    for (let c = 0; c < BOARD_COLS; c++) {
      let emptyRow = 0;
      for (let r = 0; r < BOARD_ROWS; r++) {
        const gem = grid[r][c];
        if (gem !== null) {
          // Skip multi-tile power gem components handled in pass 1
          if (gem.powerGemId && gem.powerWidth && gem.powerHeight) {
            emptyRow = r + 1;
            continue;
          }
          if (!gem.powerGemId && r !== emptyRow) {
            grid[emptyRow][c] = gem;
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
