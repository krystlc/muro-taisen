import { describe, it, expect } from 'vitest';
import { ChainResolver } from './ChainResolver';
import { Gem, GemColor, GemType } from '../models/Gem';
import { BoardGrid, BOARD_ROWS, BOARD_COLS, Board } from './Board';

function createEmptyGrid(): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

describe('Chain Resolver Engine', () => {
  it('should shatter adjacent normal gems of the same color when a Crash Gem detonates', () => {
    const grid = createEmptyGrid();

    // Setup: Blue Normal gem at bottom left, Blue Crash gem lands on top of it
    grid[0][0] = { id: '1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.BLUE, type: GemType.CRASH };

    const result = ChainResolver.resolveStep(grid);

    expect(result.gemsShattered).toBe(2);
    expect(grid[0][0]).toBeNull();
    expect(grid[1][0]).toBeNull();
  });

  it('should shatter an entire Power Gem if any part of it is touched by a matching Crash Gem', () => {
    const grid = createEmptyGrid();

    // Setup: 2x2 Red Power Gem with a Red Crash Gem adjacent to it
    const powerId = 'red_power_1';
    grid[0][0] = { id: '1', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };
    grid[0][1] = { id: '2', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };
    grid[1][0] = { id: '3', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };
    grid[1][1] = { id: '4', color: GemColor.RED, type: GemType.NORMAL, powerGemId: powerId };

    grid[0][2] = { id: '5', color: GemColor.RED, type: GemType.CRASH }; // Touches [0][1]

    const result = ChainResolver.resolveStep(grid);

    expect(result.gemsShattered).toBe(5); // 4 from Power Gem + 1 Crash Gem
    expect(grid[0][0]).toBeNull();
  });

  it('should apply gravity to unsupported gems after a shatter', () => {
    const grid = createEmptyGrid();

    // Setup: Blue Crash destroys Blue Normal, leaving a floating Yellow gem
    grid[0][0] = { id: '1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][0] = { id: '2', color: GemColor.BLUE, type: GemType.CRASH };
    grid[2][0] = { id: '3', color: GemColor.YELLOW, type: GemType.NORMAL }; // Floating

    ChainResolver.resolveStep(grid);
    ChainResolver.applyGravity(grid);

    expect(grid[0][0]?.color).toBe(GemColor.YELLOW); // Yellow gem fell to the bottom
    expect(grid[2][0]).toBeNull();
  });
});

describe('ChainResolver & Gravity Engine', () => {
  it('should drop unsupported floating gems down when floor is cleared', () => {
    const grid = Board.createEmptyGrid();

    // Place a gem on row 0 and another floating on row 2 with empty space at row 1
    grid[0][0] = { id: 'gem-floor', color: GemColor.RED, type: GemType.NORMAL };
    grid[2][0] = { id: 'gem-float', color: GemColor.BLUE, type: GemType.NORMAL };

    // Clear the floor gem
    grid[0][0] = null;

    // Apply gravity
    const moved = ChainResolver.applyGravity(grid);

    expect(moved).toBe(true);
    expect((grid[0][0] as unknown as Gem)?.id).toBe('gem-float');
    expect(grid[2][0]).toBeNull();
  });

  it('should trigger side-connected matching blocks during chain resolution', () => {
    const grid = Board.createEmptyGrid();

    // Place a Crash gem next to a normal matching gem horizontally
    grid[0][0] = { id: 'crash-1', color: GemColor.RED, type: GemType.CRASH };
    grid[0][1] = { id: 'normal-1', color: GemColor.RED, type: GemType.NORMAL };

    const result = ChainResolver.resolveStep(grid);

    expect(result.gemsShattered).toBe(2);
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
  });
});

describe('Gravity Suspension Bug Reproduction', () => {
  it('should not leave floating single blocks suspended when space below them is completely empty', () => {
      const grid = Board.createEmptyGrid();

      // Set up a floating stack of blocks with nothing beneath them all the way to row 0
      grid[5][2] = { id: 'float-top', color: GemColor.RED, type: GemType.NORMAL };
      grid[4][2] = { id: 'float-mid', color: GemColor.GREEN, type: GemType.NORMAL };

      // Apply gravity
      const moved = ChainResolver.applyGravity(grid);

      // Verify float-mid hit the floor, and float-top stacked above it
      expect(moved).toBe(true);
      expect((grid[0][2] as any)?.id).toBe('float-mid');
      expect((grid[1][2] as any)?.id).toBe('float-top');
      expect(grid[4][2]).toBeNull();
      expect(grid[5][2]).toBeNull();
    });

  it('should drop a suspended block completely to the floor after the blocks supporting it are destroyed', () => {
      const grid = Board.createEmptyGrid();

      // Recreate the partial board state from image_b8b245.jpg
      // Assuming 0 is the bottom row

      // Col 0: Stack of 3 (Green, Cyan, Cyan)
      grid[0][0] = { id: 'c0-0', color: GemColor.GREEN, type: GemType.NORMAL };
      grid[1][0] = { id: 'c0-1', color: GemColor.BLUE, type: GemType.NORMAL };
      grid[2][0] = { id: 'c0-2', color: GemColor.BLUE, type: GemType.NORMAL };

      // Col 1: Stack of 1 (Red)
      grid[0][1] = { id: 'c1-0', color: GemColor.RED, type: GemType.NORMAL };

      // Col 2: Stack of 2 (Red, Red)
      grid[0][2] = { id: 'c2-0', color: GemColor.RED, type: GemType.NORMAL };
      grid[1][2] = { id: 'c2-1', color: GemColor.RED, type: GemType.NORMAL };

      // Col 3: The gap and suspended yellow block
      // Simulate the 3 blocks that were just shattered as null
      grid[0][3] = null;
      grid[1][3] = null;
      grid[2][3] = null;
      grid[3][3] = { id: 'sus-yellow', color: GemColor.YELLOW, type: GemType.NORMAL };

      // Col 4: Stack of 1 (Cyan)
      grid[0][4] = { id: 'c4-0', color: GemColor.BLUE, type: GemType.NORMAL };

      // Col 5: Stack of 1 (Green)
      grid[0][5] = { id: 'c5-0', color: GemColor.GREEN, type: GemType.NORMAL };

      // Apply gravity to resolve the gap
      const moved = ChainResolver.applyGravity(grid);

      // Assertions
      expect(moved).toBe(true);

      // The yellow block should have plummeted from row 3 completely down to the floor at row 0
      expect((grid[0][3] as any)?.id).toBe('sus-yellow');

      // The spaces above it should now be completely empty
      expect(grid[1][3]).toBeNull();
      expect(grid[2][3]).toBeNull();
      expect(grid[3][3]).toBeNull();

      // Ensure adjacent columns were NOT disturbed by the gravity update
      expect((grid[2][0] as any)?.color).toBe(GemColor.BLUE);
      expect((grid[1][2] as any)?.color).toBe(GemColor.RED);
    });
});

describe('Crash Block Color Target Bug Reproduction', () => {
  it('should only destroy connected blocks of the SAME color when a CRASH block detonates', () => {
    const grid = Board.createEmptyGrid();

    // 1. Setup the trigger: A BLUE CRASH block touching a BLUE NORMAL block
    grid[0][0] = { id: 'crash-blue', color: GemColor.BLUE, type: GemType.CRASH };
    grid[1][0] = { id: 'norm-blue', color: GemColor.BLUE, type: GemType.NORMAL };

    // 2. Setup the victims: Different colored blocks adjacent to the blast zone
    grid[0][1] = { id: 'norm-red', color: GemColor.RED, type: GemType.NORMAL };
    grid[1][1] = { id: 'norm-green', color: GemColor.GREEN, type: GemType.NORMAL };
    grid[2][0] = { id: 'norm-yellow', color: GemColor.YELLOW, type: GemType.NORMAL };

    // Fire the resolution step
    const result = ChainResolver.resolveStep(grid);

    // 3. Verify the explosion actually happened
    expect(result.gemsShattered).toBeGreaterThanOrEqual(2);
    expect(grid[0][0]).toBeNull(); // Blue crash should be destroyed
    expect(grid[1][0]).toBeNull(); // Blue normal should be destroyed

    // 4. Assert the bug is NOT present (These will FAIL if the blast radius is indiscriminate)
    expect(grid[0][1]?.color).toBe(GemColor.RED);
    expect(grid[0][1]?.id).toBe('norm-red');

    expect(grid[1][1]?.color).toBe(GemColor.GREEN);
    expect(grid[1][1]?.id).toBe('norm-green');

    expect(grid[2][0]?.color).toBe(GemColor.YELLOW);
    expect(grid[2][0]?.id).toBe('norm-yellow');
  });
});

describe('Frozen & Normal Gem Detonation Bug', () => {
  it('should NOT detonate normal or frozen gems when a piece without a CRASH gem lands', () => {
    const grid = Board.createEmptyGrid();

    // Existing blue normal blocks on the floor
    grid[0][0] = { id: 'floor-1', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[0][1] = { id: 'floor-2', color: GemColor.BLUE, type: GemType.NORMAL };

    // New pair lands next to them: 1 Normal Blue + 1 Frozen Blue
    grid[0][2] = { id: 'landed-normal', color: GemColor.BLUE, type: GemType.NORMAL };
    grid[1][2] = { id: 'landed-frozen', color: GemColor.BLUE, type: GemType.COUNTER, counterValue: 3 };

    // Run resolution step
    const result = ChainResolver.resolveStep(grid);

    // 1. No gems should have been shattered because no CRASH block was involved
    expect(result.gemsShattered).toBe(0);

    // 2. All 4 gems must remain intact on the grid
    expect(grid[0][0]?.id).toBe('floor-1');
    expect(grid[0][1]?.id).toBe('floor-2');
    expect(grid[0][2]?.id).toBe('landed-normal');
    expect(grid[1][2]?.id).toBe('landed-frozen');
    expect(grid[1][2]?.type).toBe(GemType.COUNTER);
  });
});

describe('Puzzle Fighter Advanced Rules & Chains', () => {
  it('should NOT detonate a lone Crash Gem if it touches no same-color gems', () => {
    const grid = Board.createEmptyGrid();

    // Place an isolated Red Crash Gem on the floor
    grid[0][0] = { id: 'crash-red', color: GemColor.RED, type: GemType.CRASH };
    // Place a Blue normal gem next to it (different color)
    grid[0][1] = { id: 'normal-blue', color: GemColor.BLUE, type: GemType.NORMAL };

    const result = ChainResolver.resolveStep(grid);

    // Should not shatter anything
    expect(result.gemsShattered).toBe(0);
    expect(grid[0][0]?.type).toBe(GemType.CRASH); // Still there!
  });

  it('should process sequential chain reactions when an explosion clears a path', () => {
    const grid = Board.createEmptyGrid();

    // Setup a chain sequence:
    // Bottom: Red normal group with a Red Crash gem ready to blow
    grid[0][0] = { id: 'r1', color: GemColor.RED, type: GemType.NORMAL };
    grid[0][1] = { id: 'r-crash', color: GemColor.RED, type: GemType.CRASH };

    // Above it, a blocking layer of green gems
    grid[1][0] = { id: 'g1', color: GemColor.GREEN, type: GemType.NORMAL };
    grid[1][1] = { id: 'g2', color: GemColor.GREEN, type: GemType.NORMAL };

    // Above the green layer, another Red Crash gem and Red Normal gem that will drop into place after green clears
    grid[2][0] = { id: 'r2', color: GemColor.RED, type: GemType.NORMAL };
    grid[2][1] = { id: 'r-crash-2', color: GemColor.RED, type: GemType.CRASH };

    // Trigger initial resolution (The bottom red crash should blow up r1 and r-crash)
    // Then gravity drops the top red gems down to connect with the newly exposed space, triggering Chain 2.
    let totalShattered = 0;
    let chainCount = 0;
    let gridState = grid;

    while (true) {
      const stepResult = ChainResolver.resolveStep(gridState);
      if (stepResult.gemsShattered === 0) break;
      totalShattered += stepResult.gemsShattered;
      chainCount++;
      // Apply gravity for the loop
      ChainResolver.applyGravity(gridState);
    }

    expect(chainCount).toBeGreaterThanOrEqual(2);
    expect(totalShattered).toBe(6); // All 6 gems should eventually explode
  });
});
