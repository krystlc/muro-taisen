export class GameLogger {
  private static enabled = true;

  static logState(action: string, grid: any[][], extra?: Record<string, any>) {
    if (!this.enabled) return;

    // Count current active non-null gems and power gems
    let totalGems = 0;
    const powerGems = new Set<string>();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const g = grid[r][c];
        if (g) {
          totalGems++;
          if (g.powerGemId) powerGems.add(g.powerGemId);
        }
      }
    }

    console.group(`🎲 [GameEngine Action]: ${action}`);
    console.log(`Board Stats: ${totalGems} active gems | ${powerGems.size} unique Power Gems`);
    if (extra) console.table(extra);
    console.groupEnd();
  }

  static logExplosion(powerGemId: string, color: string, count: number) {
    if (!this.enabled) return;
    console.warn(`💥 EXPLOSION: Power Gem [${powerGemId}] (${color}) shattered ${count} connected tiles!`);
  }
}
