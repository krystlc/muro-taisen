export interface DamageEvent {
  shatteredCount: number;         // Total normal/crash gems destroyed in this chain step
  chainLength: number;            // The current combo multiplier (1 for initial shatter, 2+ for gravity cascades)
  powerGemsDestroyed: {           // Dimensions of any Power Gems destroyed
    width: number;
    height: number;
  }[];
}

/**
 * @agent_instruction
 * Implement non-linear scaling.
 * - Base damage: ~1 garbage gem per 2 normal gems shattered.
 * - Chain scaling: Multiply total step damage by an increasing factor (e.g., chainLength * 1.5).
 * - Power Gem bonus: Massive flat bonus based on Area (width * height) of the Power Gem.
 */
export class DamageCalculator {
  /**
   * Calculates the total number of Counter Gems to send to the opponent.
   * @param event Details of the shatter event
   * @returns Integer representing the amount of garbage generated
   */
  public static calculateGarbage(event: DamageEvent): number {
    const baseDamage = Math.floor(Math.max(0, event.shatteredCount) / 2);
    const chainIndex = Math.max(0, Math.floor(event.chainLength) - 1);
    const chainMultiplier = Math.pow(2.5, chainIndex);
    const chainDamage = Math.round(baseDamage * chainMultiplier);

    const powerGemBonus = event.powerGemsDestroyed.reduce(
      (bonus, powerGem) => bonus + Math.max(0, powerGem.width * powerGem.height) * 3,
      0,
    );

    return chainDamage + powerGemBonus;
  }
}
