// Touch gestures, virtual buttons, DAS/ARR timing
// src/input/InputManager.ts
export type InputAction = 'MOVE_LEFT' | 'MOVE_RIGHT' | 'ROTATE_CW' | 'ROTATE_CCW' | 'SOFT_DROP' | 'HARD_DROP';

export class InputManager {
  private keyStates: Map<InputAction, { active: boolean; startTime: number; lastRepeat: number }> = new Map();

  private readonly DAS_DELAY_MS = 140;
  private readonly ARR_INTERVAL_MS = 30;

  public triggerPress(action: InputAction, now: number): InputAction | null {
    this.keyStates.set(action, { active: true, startTime: now, lastRepeat: now });
    return action; // Initial single tap response
  }

  public triggerRelease(action: InputAction): void {
    this.keyStates.delete(action);
  }

  public update(now: number): InputAction[] {
    const executedActions: InputAction[] = [];

    this.keyStates.forEach((state, action) => {
      if (action === 'MOVE_LEFT' || action === 'MOVE_RIGHT' || action === 'SOFT_DROP') {
        const duration = now - state.startTime;
        if (duration >= this.DAS_DELAY_MS) {
          if (now - state.lastRepeat >= this.ARR_INTERVAL_MS) {
            executedActions.push(action);
            state.lastRepeat = now;
          }
        }
      }
    });

    return executedActions;
  }
}
