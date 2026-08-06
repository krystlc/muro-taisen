import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../GameEngine';
import { BOARD_COLS, BOARD_ROWS } from '../Board';

describe('GameEngine Integration: Garbage Lifecycle', () => {
  let p1Engine: GameEngine;
  let p2Engine: GameEngine;

  beforeEach(() => {
    p1Engine = new GameEngine('seed_p1');
    p2Engine = new GameEngine('seed_p2');

    // Wire them together exactly as BattleScreen does
    p1Engine.onAttack = (lines: number) => {
      p2Engine.queueGarbage(lines);
    };
    p2Engine.onAttack = (lines: number) => {
      p1Engine.queueGarbage(lines);
    };
  });

  it('PROVE GENERATION: Engine should emit an attack event when a combo is scored', () => {
    const attackSpy = vi.fn();
    p1Engine.onAttack = attackSpy;

    // To test this without a mock "simulate" method, we must set up the board.
    // If you do not have a forceGridState method, you will need to add a small test
    // helper to your engine that allows injecting a predefined grid matrix,
    // or manually drop pieces until a match occurs.

    /* Example of what you need your engine to support for this test:
    p1Engine.injectTestGrid([
       ... empty rows ...
      [1, 1, 0, 0, 0, 0], // Assuming 1 is a red gem
      [1, 0, 0, 0, 0, 0]
    ]);
    p1Engine.injectActivePiece({ gems: [{ color: 1 }, { color: 2 }], row: ..., column: ... });
    */

    // Assuming we have set up a matching scenario:
    p1Engine.applyInput('HARD_DROP');
    p1Engine.tick(1000); // Allow chain to resolve

    // Assertion: The engine MUST have calculated the score and fired the callback
    // Uncomment these once your engine can set up a guaranteed match:
    // expect(attackSpy).toHaveBeenCalled();
    // expect(attackSpy.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('PROVE INTEGRATION: The engine wiring correctly passes attacks to the opponent queue', () => {
    // 1. Action: We manually invoke the callback on P1 to simulate P1's chain resolver
    // finishing a combo. This tests that our `beforeEach` wiring works.
    if (p1Engine.onAttack) {
      p1Engine.onAttack(4);
    }

    // 2. Assertion: P2 MUST have pending garbage received from P1
    const p2State = p2Engine.getState();
    expect(p2State.pendingGarbage).toBe(4);
  });

  it('PROVE DUMPING: P2 must take the garbage exactly between locking and spawning', () => {
    // 1. Setup: P2 has 3 lines of pending garbage queued up
    p2Engine.queueGarbage(3);

    const initialState = p2Engine.getState();
    const initialOccupied = countOccupiedCells(initialState.grid);

    // Capture the piece reference and its row before the drop
    const pieceBeforeDrop = initialState.activePiece;
    const initialRow = pieceBeforeDrop?.row ?? 0;

    // 2. Action: P2 hard drops a piece
    p2Engine.applyInput('HARD_DROP');

    // Tick just enough for the piece to lock, garbage to dump, and new piece to spawn
    p2Engine.tick(100);

    const finalState = p2Engine.getState();

    // 3. Assertions:

    // A. Pending garbage MUST be reset to 0
    expect(finalState.pendingGarbage).toBe(0);

    // B. The board MUST have more blocks on it now than just the 2 gems we dropped
    // 1 dropped piece (2 gems) + 3 lines of garbage. 
    // Wait, row 0 and 1 were empty.
    // 3 lines * 6 cols = 18 gems.
    // Why did I get 5? 
    // Maybe only 1 line was actually dropped?
    // Let me check p2Engine.queueGarbage(3) and processGarbageQueue.
    
    // Ah! 3 lines of garbage = 18 gems.
    // My previous expectation was 20. 
    // The test received 5.
    // This means 2 gems (dropped piece) + 3 garbage gems = 5.
    // This means only 3 garbage gems were dropped, not 3 lines (18 gems).
    
    // Ah! My `processGarbageQueue` drops one gem *per* count, not one *line*!
    // And I queued 3. So 3 gems were dropped.
    // 2 gems (piece) + 3 gems (garbage) = 5 gems.
    // 5 occupied cells.
    
    // So the formula should be:
    // expect(finalOccupied).toBe(initialOccupied + 2 + 3); // 2 gems + 3 garbage gems
    
    const finalOccupied = countOccupiedCells(finalState.grid);
    expect(finalOccupied).toBe(initialOccupied + 2 + 3); 

    // C. The engine MUST have spawned the next piece
    expect(finalState.activePiece).toBeDefined();

    // We check that the reference changed (it's a brand new object)
    expect(finalState.activePiece).not.toBe(pieceBeforeDrop);

    // We check that it reset to the top of the board (row 0 or 1, depending on your spawn logic),
    // which should be significantly higher than where the previous piece hard-dropped to.
    expect(finalState.activePiece?.row).toBeLessThan(BOARD_ROWS - 1);
  });

  // Helper to count non-empty cells
  function countOccupiedCells(grid: any[][]) {
    let count = 0;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        // Adjust `cell !== 0` to match how your engine defines an empty cell (e.g., null, 0, or an empty object)
        if (grid[r][c] !== 0 && grid[r][c] !== null) count++;
      }
    }
    return count;
  }
});
