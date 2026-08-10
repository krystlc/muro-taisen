import { describe, it, expect } from "vitest";
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
