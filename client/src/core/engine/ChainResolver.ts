// src/core/engine/ChainResolver.ts
import { Gem, GemType } from "../models/Gem";
import { BoardGrid, BOARD_ROWS, BOARD_COLS } from "./Board";

export class ChainResolver {
  public static resolveStep(grid: BoardGrid): {
    gemsShattered: number;
    powerGemIdsShattered: Set<string>;
  } {
    let gemsShattered = 0;
    const powerGemIdsShattered = new Set<string>();
    const gemsToRemove = new Set<string>();
    const countersToThaw = new Set<string>();

    const visitedGlobal = new Set<string>();

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const startKey = `${r},${c}`;
        if (visitedGlobal.has(startKey)) continue;

        const startGem = grid[r][c];
        if (!startGem || startGem.type === GemType.COUNTER) continue;

        const cluster: { r: number; c: number; gem: Gem }[] = [];
        const queue: { r: number; c: number }[] = [{ r, c }];
        const visitedCluster = new Set<string>();
        visitedCluster.add(startKey);

        let hasCrashGem = false;
        let hasNormalGem = false;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          const currGem = grid[curr.r][curr.c]!;
          cluster.push({ r: curr.r, c: curr.c, gem: currGem });

          if (currGem.type === GemType.CRASH) hasCrashGem = true;
          if (currGem.type === GemType.NORMAL) hasNormalGem = true;
          if (currGem.powerGemId) powerGemIdsShattered.add(currGem.powerGemId);

          const directions = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (const [dr, dc] of directions) {
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
              const neighborKey = `${nr},${nc}`;
              const neighborGem = grid[nr][nc];

              if (neighborGem?.type === GemType.COUNTER) {
                continue;
              } else if (
                neighborGem &&
                neighborGem.color === currGem.color &&
                !visitedCluster.has(neighborKey)
              ) {
                visitedCluster.add(neighborKey);
                queue.push({ r: nr, c: nc });
              }
            }
          }
        }

        visitedCluster.forEach((k) => visitedGlobal.add(k));

        if (hasCrashGem && cluster.length > 1) {
          cluster.forEach((item) => gemsToRemove.add(`${item.r},${item.c}`));

          // ONLY thaw adjacent counters. Do NOT destroy different colored normal gems.
          cluster.forEach((curr) => {
            const directions = [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ];
            for (const [dr, dc] of directions) {
              const nr = curr.r + dr;
              const nc = curr.c + dc;
              if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
                const neighborKey = `${nr},${nc}`;
                const neighborGem = grid[nr][nc];

                if (neighborGem?.type === GemType.COUNTER) {
                  countersToThaw.add(neighborKey);
                }
              }
            }
          });
        }
      }
    }

    let expansionOccurred = true;
    while (expansionOccurred) {
      expansionOccurred = false;
      const currentGemList = Array.from(gemsToRemove);

      for (const coord of currentGemList) {
        const [r, c] = coord.split(",").map(Number);
        const gem = grid[r][c];

        if (gem?.powerGemId && !powerGemIdsShattered.has(gem.powerGemId)) {
          powerGemIdsShattered.add(gem.powerGemId);
          for (let pr = 0; pr < BOARD_ROWS; pr++) {
            for (let pc = 0; pc < BOARD_COLS; pc++) {
              if (grid[pr][pc]?.powerGemId === gem.powerGemId) {
                const targetKey = `${pr},${pc}`;
                if (!gemsToRemove.has(targetKey)) {
                  gemsToRemove.add(targetKey);
                  expansionOccurred = true;
                }
              }
            }
          }
        }
      }
    }

    gemsToRemove.forEach((coord) => {
      const [r, c] = coord.split(",").map(Number);
      if (grid[r][c] !== null) {
        grid[r][c] = null;
        gemsShattered++;
      }
    });

    countersToThaw.forEach((coord) => {
      const [r, c] = coord.split(",").map(Number);
      const gem = grid[r][c];
      if (gem?.type === GemType.COUNTER) {
        gem.type = GemType.NORMAL;
        delete gem.counterValue;
      }
    });

    return { gemsShattered, powerGemIdsShattered };
  }

  public static resolveRainbowGem(
    grid: BoardGrid,
    row: number,
    col: number,
  ): void {
    const rainbowGem = grid[row]?.[col];
    if (!rainbowGem || rainbowGem.type !== GemType.RAINBOW) return;

    const gemBelow = row > 0 ? grid[row - 1]?.[col] : null;
    if (gemBelow) {
      const targetColor = gemBelow.color;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c]?.color === targetColor) {
            grid[r][c] = null;
          }
        }
      }
    }
    grid[row][col] = null;
  }

  public static applyGravity(grid: BoardGrid): boolean {
    let anyMoved = false;
    let movedThisPass = true;

    while (movedThisPass) {
      movedThisPass = false;
      const processedPowerGems = new Set<string>();

      for (let r = 1; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const gem = grid[r][c];
          if (!gem) continue;

          if (gem.powerGemId) {
            if (processedPowerGems.has(gem.powerGemId)) continue;
            processedPowerGems.add(gem.powerGemId);

            let canFall = true;
            for (let pr = 0; pr < BOARD_ROWS; pr++) {
              for (let pc = 0; pc < BOARD_COLS; pc++) {
                if (grid[pr][pc]?.powerGemId === gem.powerGemId) {
                  const belowRow = pr - 1;
                  if (belowRow < 0) {
                    canFall = false;
                    break;
                  }
                  const cellBelow = grid[belowRow][pc];
                  if (
                    cellBelow !== null &&
                    cellBelow.powerGemId !== gem.powerGemId
                  ) {
                    canFall = false;
                    break;
                  }
                }
              }
              if (!canFall) break;
            }

            if (canFall) {
              const pieces = [];
              for (let pr = 0; pr < BOARD_ROWS; pr++) {
                for (let pc = 0; pc < BOARD_COLS; pc++) {
                  if (grid[pr][pc]?.powerGemId === gem.powerGemId) {
                    pieces.push({ r: pr, c: pc, g: grid[pr][pc] });
                    grid[pr][pc] = null;
                  }
                }
              }
              pieces.forEach((p) => {
                grid[p.r - 1][p.c] = p.g;
              });
              movedThisPass = true;
              anyMoved = true;
            }
          } else {
            if (grid[r - 1][c] === null) {
              grid[r - 1][c] = gem;
              grid[r][c] = null;
              movedThisPass = true;
              anyMoved = true;
            }
          }
        }
      }
    }

    return anyMoved;
  }

  public static calculateGarbage(params: {
    gemsShattered: number;
    chainNumber: number;
  }): number {
    const { gemsShattered, chainNumber } = params;
    if (gemsShattered <= 0) return 0;

    // Base garbage calculation (e.g., roughly 1 garbage per 2-3 gems, or a direct scaling)
    // Applying a chain bonus multiplier (chainNumber 1 = 1x, chainNumber 2 = 3x, etc.)
    const baseGarbage = Math.floor(gemsShattered / 2);
    const chainMultiplier = Math.max(1, chainNumber * 2 - 1);

    return baseGarbage * chainMultiplier;
  }
}
