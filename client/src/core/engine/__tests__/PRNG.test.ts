// src/core/engine/PRNG.test.ts
import { describe, it, expect } from "vitest";
import { PRNG } from "../PRNG";

describe("Pseudo-Random Number Generator (PRNG)", () => {
  it("should generate the exact same sequence of numbers given the same seed", () => {
    const prng1 = new PRNG("muro_taisen_match_1");
    const prng2 = new PRNG("muro_taisen_match_1");

    const sequence1 = Array.from({ length: 50 }, () => prng1.nextInt(0, 4));
    const sequence2 = Array.from({ length: 50 }, () => prng2.nextInt(0, 4));

    expect(sequence1).toEqual(sequence2);
  });

  it("should generate a different sequence of numbers given a different seed", () => {
    const prng1 = new PRNG("seed_A");
    const prng2 = new PRNG("seed_B");

    const sequence1 = Array.from({ length: 50 }, () => prng1.nextInt(0, 4));
    const sequence2 = Array.from({ length: 50 }, () => prng2.nextInt(0, 4));

    expect(sequence1).not.toEqual(sequence2);
  });
});
