// src/core/engine/Engine.test.ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { GemType } from '../../models/Gem';

describe('Engine - Garbage Queueing and Dropping', () => {

  it('should accept incoming garbage into a pending queue without immediately dropping it', () => {
    const engine = new GameEngine('foo');
    engine.queueGarbage(5);

    const state = engine.getState();
    // The queue should update
    expect(state.incomingGarbage).toBe(5);
    // But the grid should still be entirely empty because a piece is active/falling
    const isGridEmpty = state.grid.every(row => row.every(cell => cell === null));
    expect(isGridEmpty).toBe(true);
  });

  it('should drop queued COUNTER gems when the active piece locks down', () => {
    const engine = new GameEngine('foo');
    engine.queueGarbage(3);

    // Simulate the engine ticking to the point where the current piece locks down
    engine.forceLockPiece();
    engine.processGarbageQueue(); // Or let tick() handle this internally

    const state = engine.getState();

    // The queue should be cleared
    expect(state.incomingGarbage).toBe(0);

    // The board should now contain exactly 3 COUNTER gems
    let counterGemsFound = 0;
    state.grid.forEach(row => {
      row.forEach(cell => {
        if (cell && cell.type === GemType.COUNTER) {
          counterGemsFound++;
        }
      });
    });

    expect(counterGemsFound).toBe(3);
  });
});
