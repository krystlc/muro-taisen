// Main tick loop & input dispatch
import { BoardGrid, Board } from './Board';
import { GemType } from '../models/Gem';
import { PRNG } from './PRNG';
import { GameStateValidator, GameStatus } from './GameStateValidator';
import { InputAction } from '../../input/InputManager';

export interface GameState {
  grid: BoardGrid;
  status: GameStatus;
  score: number;
  tickCount: number;
  // TODO: Add active falling piece state
}

/**
 * @agent_instruction
 * This is a Headless Engine. It must have zero dependencies on React, ThreeJS, or the DOM.
 * All mutations to the grid should happen within the `tick()` method based on pending inputs
 * or gravity intervals.
 */
export class GameEngine {
  private state: GameState;
  private prng: PRNG;
  private pendingInputs: InputAction[] = [];

  constructor(seed: string) {
    this.prng = new PRNG(seed);
    this.state = {
      grid: Board.createEmptyGrid(),
      status: 'PLAYING',
      score: 0,
      tickCount: 0,
    };
  }

  /**
   * Receives input commands from the UI/Network and queues them for the next tick.
   */
  public queueInput(action: InputAction) {
    this.pendingInputs.push(action);
  }

  /**
   * Decrements all Counter Gems on the board by 1. Transforms them to NORMAL if they reach 0.
   * To be called when a falling piece locks into place.
   */
  public static decrementCounters(grid: BoardGrid): void {
    for (const row of grid) {
      for (const gem of row) {
        if (gem?.type !== GemType.COUNTER) continue;

        const nextCounterValue = (gem.counterValue ?? 1) - 1;

        if (nextCounterValue <= 0) {
          gem.type = GemType.NORMAL;
          delete gem.counterValue;
        } else {
          gem.counterValue = nextCounterValue;
        }
      }
    }
  }

  /**
   * The main game loop. Advances physics, processes input, resolves chains, and checks win states.
   * @param deltaMs The time elapsed since the last tick (used for gravity timing)
   */
  public tick(deltaMs: number): void {
    if (this.state.status === 'GAME_OVER') return;

    this.state.tickCount++;

    // 1. Process pendingInputs (Move/Rotate active piece)
    // 2. Apply gravity to active piece based on deltaMs
    // 3. If piece locks:
    //    a. Check for Game Over (GameStateValidator)
    //    b. Trigger ChainResolver.resolveStep()
    //    c. Decrement garbage counters (decrementCounters)
    //    d. Spawn new piece via PRNG

    this.pendingInputs = []; // Clear queue after processing
  }

  /**
   * Returns a snapshot of the current state for the rendering layer.
   */
  public getState(): GameState {
    return this.state;
  }
}
