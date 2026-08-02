// Seeded random number generator
/**
 * @agent_instruction
 * ABSOLUTELY DO NOT USE Math.random() ANYWHERE IN THE GAME CORE.
 * You must use this Seeded Pseudo-Random Number Generator.
 * This ensures that if Player A and Player B start with seed '12345',
 * they get the exact same sequence of falling gems.
 */
export class PRNG {
  private seed: number;

  constructor(seedString: string) {
    const hashedSeed = this.hashString(seedString) % 2147483647;
    this.seed = hashedSeed > 0 ? hashedSeed : 1;
  }

  // Simple string hasher to generate initial integer seed
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generates a deterministic float between 0 and 1.
   * Implement a standard LCG (Linear Congruential Generator) or PCG algorithm here.
   */
  public nextFloat(): number {
    // Park–Miller LCG. The multiplication stays within JavaScript's safe integer range.
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Returns an integer between min (inclusive) and max (exclusive).
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }
}
