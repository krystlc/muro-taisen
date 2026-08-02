import { GemType } from '../models/Gem';
import { BOARD_COLS, BOARD_ROWS, BoardGrid } from './Board';

export class Merger {
  /**
   * Scans grid for contiguous rectangular blocks of matching Normal Gems (minimum 2x2).
   */
  public static detectAndMergePowerGems(grid: BoardGrid): boolean {
    let mergedAny = false;

    for (let r = 0; r < BOARD_ROWS - 1; r++) {
      for (let c = 0; c < BOARD_COLS - 1; c++) {
        const gem = grid[r][c];
        if (!gem || gem.type !== GemType.NORMAL) continue;

        // Determine max rectangular dimensions starting at (r, c)
        const targetColor = gem.color;
        let maxW = 0;
        while (c + maxW < BOARD_COLS && grid[r][c + maxW]?.color === targetColor && grid[r][c + maxW]?.type === GemType.NORMAL) {
          maxW++;
        }

        if (maxW < 2) continue;

        let maxH = 0;
        let validRect = true;
        while (r + maxH < BOARD_ROWS && validRect) {
          for (let w = 0; w < maxW; w++) {
            const checkGem = grid[r + maxH][c + w];
            if (!checkGem || checkGem.color !== targetColor || checkGem.type !== GemType.NORMAL) {
              validRect = false;
              break;
            }
          }
          if (validRect) maxH++;
        }

        if (maxH >= 2 && maxW >= 2) {
          const powerId = `power_${r}_${c}_${Date.now()}`;
          for (let row = r; row < r + maxH; row++) {
            for (let col = c; col < c + maxW; col++) {
              grid[row][col] = {
                ...grid[row][col]!,
                powerGemId: powerId,
                powerWidth: col === c && row === r ? maxW : undefined,
                powerHeight: col === c && row === r ? maxH : undefined,
              };
            }
          }
          mergedAny = true;
        }
      }
    }
    return mergedAny;
  }
}
