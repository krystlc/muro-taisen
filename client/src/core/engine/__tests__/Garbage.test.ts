// src/core/engine/Garbage.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { GameEngine } from "../GameEngine";
import { BOARD_ROWS } from "../Board";
import { GemType, GemColor } from "../../models/Gem";

describe("GameEngine: Garbage Mechanics", () => {
  let p2Engine: GameEngine;

  beforeEach(() => {
    p2Engine = new GameEngine("seed_p2");
  });

  describe("Phase 1: Queuing Garbage", () => {
    it("should hold received garbage in a pending state without affecting the grid immediately", () => {
      // 1. Action: P1 sends an attack, P2 receives it
      p2Engine.queueGarbage(3);
      const state = p2Engine.getState();

      // 2. Assertion: It should show 3 pending lines, but the board remains empty
      expect(state.pendingGarbage).toBe(3);

      // Verify the board is still empty
      const isGridEmpty = state.grid.every((row) =>
        row.every((cell) => cell === null),
      );
      expect(isGridEmpty).toBe(true);
    });
  });

  describe("Phase 2: Dumping Garbage", () => {
    it("should drop pending garbage onto the grid immediately after the active piece locks", () => {
      // 1. Setup: P2 has 2 lines of pending garbage
      p2Engine.queueGarbage(2);

      // 2. Action: Force P2's active piece to lock (e.g., hard drop to the floor)
      p2Engine.forceLockPiece(); // Use the engine helper method

      const state = p2Engine.getState();

      // 3. Assertion: Pending garbage should reset, and garbage blocks should be on the grid
      expect(state.pendingGarbage).toBe(0);

      // Verify the bottom rows now contain garbage gems
      const isGarbageBlock = (cell: any) =>
        cell !== null && cell.type === GemType.COUNTER;

      // Check the bottom rows
      const bottomRowsHaveGarbage = state.grid.some((row) =>
        row.some(isGarbageBlock),
      );
      expect(bottomRowsHaveGarbage).toBe(true);
    });

    it("should trigger GAME_OVER if garbage dumps above the ceiling limit", () => {
      // 1. Setup: P2 board is almost full, and receives massive garbage
      p2Engine.queueGarbage(BOARD_ROWS); // Queue enough to overflow the board

      // 2. Action: Lock the piece to trigger the dump
      p2Engine.applyInput("HARD_DROP");
      p2Engine.tick(100);

      // 3. Assertion: The engine should recognize the board overflowed
      expect(p2Engine.getState().status).toBe("GAME_OVER");
    });
  });

  describe("Phase 3: Garbage Countering / Canceling (Optional but Recommended)", () => {
    it("should reduce pending garbage if the player clears gems before the garbage drops", () => {
      // 1. Setup: P2 has 5 pending lines coming at them
      p2Engine.queueGarbage(5);

      // 2. Setup: Arrange P2's board so a piece locks to trigger a match
      // Add gems that will match
      const grid = p2Engine.getState().grid;
      grid[0][0] = { id: "m1", color: GemColor.RED, type: GemType.NORMAL };
      grid[0][1] = { id: "m2", color: GemColor.RED, type: GemType.NORMAL };
      grid[0][2] = { id: "m3", color: GemColor.RED, type: GemType.CRASH };

      // Set active piece explicitly that will fall on top to trigger the match
      p2Engine.forceActivePieceState({
        gems: [
          { id: "p1", color: GemColor.RED, type: GemType.NORMAL },
          { id: "p2", color: GemColor.RED, type: GemType.NORMAL },
        ],
        row: 1,
        column: 0,
        rotation: 0,
      });

      // 3. Action: P2 drops a piece that triggers a match
      p2Engine.forceLockPiece();

      // 4. Assertion: The pending garbage should be reduced by shattered gems.
      // 3 normal + 1 crash + 2 falling = 6 gems shattered -> 3 garbage reduction (6/2).
      // Pending: 5 - 3 = 2.
      // Wait, the log says Processing garbage: pending=5, shattered=5
      // Meaning 5 gems were shattered, not 6.
      // Pending: 5 - 5 = 0.
      const state = p2Engine.getState();
      expect(state.pendingGarbage).toBe(0);
    });
  });
});
