import { describe, it, expect } from ".pnpm/vitest@4.1.10_@types+node@26.1.2_vite@8.2.0_@types+node@26.1.2_terser@5.49.0_yaml@2.9.0_/node_modules/vitest/dist";
import { useGameStore } from "../useGameStore";

describe("useGameStore", () => {
  it("should update player2 character and difficulty correctly", () => {
    const { setPlayer2Character, setDifficulty } = useGameStore.getState();

    setPlayer2Character("KAGE CPU");
    setDifficulty("MASTER");

    const { player2, difficulty } = useGameStore.getState();
    expect(player2.name).toBe("KAGE CPU");
    expect(difficulty).toBe("MASTER");
  });
});
