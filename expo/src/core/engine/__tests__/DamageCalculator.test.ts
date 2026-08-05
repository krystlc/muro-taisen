// src/core/engine/DamageCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { DamageCalculator } from '../DamageCalculator';

describe('Damage & Combo Calculator', () => {
  it('should generate minimal garbage for a standard 2-gem shatter', () => {
    // gemsShattered: 2 (1 Crash, 1 Normal), chainMultiplier: 1
    const garbageSent = DamageCalculator.calculateGarbage({
      shatteredCount: 2,
      chainLength: 1,
      powerGemsDestroyed: []
    });

    expect(garbageSent).toBe(1); // Standard base damage
  });

  it('should scale damage exponentially based on the chain reaction length', () => {
    const chain1 = DamageCalculator.calculateGarbage({ shatteredCount: 4, chainLength: 1, powerGemsDestroyed: [] });
    const chain2 = DamageCalculator.calculateGarbage({ shatteredCount: 4, chainLength: 2, powerGemsDestroyed: [] });
    const chain3 = DamageCalculator.calculateGarbage({ shatteredCount: 4, chainLength: 3, powerGemsDestroyed: [] });

    expect(chain2).toBeGreaterThan(chain1 * 2);
    expect(chain3).toBeGreaterThan(chain2 * 2);
  });

  it('should add massive garbage bonuses based on Power Gem dimensions', () => {
    const standardGarbage = DamageCalculator.calculateGarbage({
      shatteredCount: 5,
      chainLength: 1,
      powerGemsDestroyed: []
    });

    const powerGarbage = DamageCalculator.calculateGarbage({
      shatteredCount: 5,
      chainLength: 1,
      powerGemsDestroyed: [{ width: 2, height: 2 }] // 2x2 Power Gem
    });

    // Destroying a Power Gem yields far more garbage than standard individual gems
    expect(powerGarbage).toBeGreaterThan(standardGarbage + 5);
  });
});
