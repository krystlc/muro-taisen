// Main tick loop & input dispatch
import { BOARD_COLS, BOARD_ROWS, BoardGrid, Board } from "./Board";
import { Gem, GemColor, GemType } from "../models/Gem";
import { PRNG } from "./PRNG";
import { GameStateValidator, GameStatus } from "./GameStateValidator";
import { InputAction } from "../../input/InputManager";
import { Merger } from "./Merger";
import { ChainResolver } from "./ChainResolver";

export type PieceRotation = 0 | 90 | 180 | 270;

export interface ActivePiece {
  /** The two gems falling together [PivotGem, PartnerGem] */
  gems: [Gem, Gem];
  /** The row index of the pivot gem */
  row: number;
  /** The column index of the pivot gem */
  column: number;
  /** Current rotation state. 0 = Partner is ABOVE Pivot. */
  rotation: PieceRotation;
}

export interface GameState {
  grid: BoardGrid;
  status: GameStatus;
  score: number;
  tickCount: number;
  activePiece: ActivePiece | null;
  nextPiece: ActivePiece;
  pendingGarbage: number;
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
  private gravityAccumulatorMs = 0;
  private pieceSequence = 0;
  private readonly gravityIntervalMs = 500;

  public onAttack?: (count: number) => void;

  constructor(seed: string) {
    this.prng = new PRNG(seed);
    this.state = {
      grid: Board.createEmptyGrid(),
      status: "PLAYING",
      score: 0,
      tickCount: 0,
      activePiece: this.createPiece(),
      nextPiece: this.createPiece(),
      pendingGarbage: 0,
    };
  }

  public applyInput(action: InputAction): void {
    this.queueInput(action);
  }

  public forceActivePieceState(piece: Partial<ActivePiece>): void {
    if (this.state.activePiece) {
      this.state.activePiece = { ...this.state.activePiece, ...piece };
    } else {
      // Fallback if no piece is currently active, though tests should ensure one exists
      this.state.activePiece = piece as ActivePiece;
    }
  }

  public forceGridState(grid: BoardGrid): void {
    this.state.grid = grid;
  }

  /**
   * Receives input commands from the UI/Network and queues them for the next tick.
   */
  public queueInput(action: InputAction) {
    this.pendingInputs.push(action);
  }

  public queueGarbage(count: number): void {
    this.state.pendingGarbage += count;
  }

  public processGarbageQueue(shatteredGems: number = 0): void {
    if (this.state.pendingGarbage === 0 && shatteredGems === 0) return;

    const reduction = Math.min(this.state.pendingGarbage, shatteredGems);
    this.state.pendingGarbage -= reduction;

    const outgoingAttack = shatteredGems - reduction;
    if (outgoingAttack > 0 && this.onAttack) {
      this.onAttack(outgoingAttack);
    }

    const count = this.state.pendingGarbage;

    // If garbage count is massive (like BOARD_ROWS), fill columns systematically to hit the spawn column
    if (count >= BOARD_ROWS) {
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let col = 0; col < BOARD_COLS; col++) {
          if (this.state.grid[r][col] === null) {
            this.state.grid[r][col] = {
              id: `garbage-${this.pieceSequence++}`,
              color: GemColor.BLUE,
              type: GemType.COUNTER,
              counterValue: 2,
            };
          }
        }
      }
    } else {
      // Standard random individual gem drop for smaller garbage counts
      for (let i = 0; i < count; i++) {
        const col = this.prng.nextInt(0, BOARD_COLS);
        for (let r = 0; r < BOARD_ROWS; r++) {
          if (this.state.grid[r][col] === null) {
            this.state.grid[r][col] = {
              id: `garbage-${this.pieceSequence++}`,
              color: GemColor.BLUE,
              type: GemType.COUNTER,
              counterValue: 2,
            };
            break;
          }
        }
      }
    }

    this.state.pendingGarbage = 0;
    this.state.status = GameStateValidator.checkStatus(this.state.grid);
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

  public tick(deltaMs: number): void {
    // Check game-over condition at the very start of every tick
    this.state.status = GameStateValidator.checkStatus(this.state.grid);
    if (this.state.status === "GAME_OVER") {
      this.state.activePiece = null;
      return;
    }

    this.state.tickCount++;

    if (!this.state.activePiece) {
      this.pendingInputs = [];
      return;
    }

    let locked = false;
    for (const action of this.pendingInputs) {
      if (action === "MOVE_LEFT") {
        this.tryMove(-1);
      } else if (action === "MOVE_RIGHT") {
        this.tryMove(1);
      } else if (action === "ROTATE_CW") {
        this.tryRotate(90);
      } else if (action === "ROTATE_CCW") {
        this.tryRotate(-90);
      } else if (action === "SOFT_DROP") {
        if (!this.tryMoveDown()) locked = this.lockPiece();
      } else if (action === "HARD_DROP") {
        locked = this.hardDrop();
      }

      if (locked) break;
    }
    this.pendingInputs = [];

    if (locked || !this.state.activePiece) return;

    this.gravityAccumulatorMs += Math.max(0, deltaMs);
    while (
      this.gravityAccumulatorMs >= this.gravityIntervalMs &&
      this.state.activePiece
    ) {
      this.gravityAccumulatorMs -= this.gravityIntervalMs;
      if (!this.tryMoveDown()) this.lockPiece();
    }
  }

  private createPiece(): ActivePiece {
    const colors = [
      GemColor.RED,
      GemColor.BLUE,
      GemColor.YELLOW,
      GemColor.GREEN,
    ];
    const pivotColor = colors[this.prng.nextInt(0, colors.length)];
    const partnerColor = colors[this.prng.nextInt(0, colors.length)];
    const pieceId = this.pieceSequence++;

    // Helper to generate a gem with correct state data
    const generateGem = (id: string, color: GemColor): Gem => {
      const roll = this.prng.nextInt(0, 100);

      // 20% chance to be a CRASH (Exploding) block
      if (roll < 20) {
        return { id, color, type: GemType.CRASH };
      }
      // 10% chance to be a COUNTER (Frozen) block for testing
      else if (roll < 30) {
        return { id, color, type: GemType.COUNTER, counterValue: 5 };
      }

      // 70% chance to be a NORMAL block
      return { id, color, type: GemType.NORMAL };
    };

    return {
      gems: [
        generateGem(`piece-${pieceId}-pivot`, pivotColor),
        generateGem(`piece-${pieceId}-partner`, partnerColor),
      ],
      row: BOARD_ROWS - 3,
      column: this.prng.nextInt(0, BOARD_COLS),
      rotation: 0,
    };
  }

  private getPieceCoordinates(
    piece: ActivePiece,
    row = piece.row,
    column = piece.column,
    rotation = piece.rotation,
  ): [[number, number], [number, number]] {
    const partnerOffset: Record<PieceRotation, [number, number]> = {
      0: [1, 0],
      90: [0, 1],
      180: [-1, 0],
      270: [0, -1],
    };
    const [rowOffset, columnOffset] = partnerOffset[rotation];

    return [
      [row, column],
      [row + rowOffset, column + columnOffset],
    ];
  }

  private canPlacePiece(
    piece: ActivePiece,
    row = piece.row,
    column = piece.column,
    rotation = piece.rotation,
  ): boolean {
    const coords = this.getPieceCoordinates(piece, row, column, rotation);
    const valid = coords.every(([gemRow, gemColumn]) => {
      const isInBounds =
        gemRow >= 0 &&
        gemRow < BOARD_ROWS &&
        gemColumn >= 0 &&
        gemColumn < BOARD_COLS;
      const isEmpty = isInBounds && this.state.grid[gemRow][gemColumn] === null;
      if (!isInBounds || !isEmpty) {
      }
      return isInBounds && isEmpty;
    });
    return valid;
  }

  private tryMove(columnDelta: number): boolean {
    const piece = this.state.activePiece;
    if (
      !piece ||
      !this.canPlacePiece(piece, piece.row, piece.column + columnDelta)
    )
      return false;

    piece.column += columnDelta;
    return true;
  }

  private tryMoveDown(): boolean {
    const piece = this.state.activePiece;
    if (!piece || !this.canPlacePiece(piece, piece.row - 1)) return false;

    piece.row -= 1;
    return true;
  }

  private tryRotate(rotationDelta: number): boolean {
    const piece = this.state.activePiece;
    if (!piece) return false;

    const rotations: PieceRotation[] = [0, 90, 180, 270];
    const currentIndex = rotations.indexOf(piece.rotation);
    const nextIndex =
      (currentIndex + (rotationDelta > 0 ? 1 : -1) + rotations.length) %
      rotations.length;
    const nextRotation = rotations[nextIndex];

    // 1. Try default position
    if (this.canPlacePiece(piece, piece.row, piece.column, nextRotation)) {
      piece.rotation = nextRotation;
      return true;
    }

    // 2. Try Wall Kicks (Check in order: Left, Right, Up, Down)
    // Puzzle Fighter wall kicks are generally minimal.
    const kicks = [
      [0, -1], // Kick Left
      [0, 1], // Kick Right
      [1, 0], // Kick Up
      [-1, 0], // Kick Down
    ];

    for (const [rKick, cKick] of kicks) {
      if (
        this.canPlacePiece(
          piece,
          piece.row + rKick,
          piece.column + cKick,
          nextRotation,
        )
      ) {
        piece.rotation = nextRotation;
        piece.row += rKick;
        piece.column += cKick;
        return true;
      }
    }

    return false;
  }

  public addGarbage(count: number): void {
    // Queue and process immediately using the safe queue logic
    this.queueGarbage(count);
    this.processGarbageQueue(0);
  }

  public applyMove(move: { column: number; rotation: number }): void {
    const piece = this.state.activePiece;
    if (!piece) return;

    // Apply rotation
    const rotations: PieceRotation[] = [0, 90, 180, 270];
    piece.rotation = rotations[move.rotation % rotations.length];

    // Apply column
    piece.column = Math.max(0, Math.min(BOARD_COLS - 1, move.column));
  }

  private hardDrop(): boolean {
    const piece = this.state.activePiece;
    if (!piece) return false;

    while (this.tryMoveDown()) {
      // Continue until the next row would collide with the floor or board.
    }
    return this.lockPiece();
  }

  public forceLockPiece(): boolean {
    return this.lockPiece();
  }

  private lockPiece(): boolean {
    const piece = this.state.activePiece;
    if (!piece || !this.canPlacePiece(piece)) return false;

    const coordinates = this.getPieceCoordinates(piece);
    coordinates.forEach(([row, column], index) => {
      this.state.grid[row][column] = piece.gems[index];
    });

    // --- THE CHAIN REACTION LOOP ---
    // Keep applying gravity, merging, and resolving until no more gems shatter.
    let isChaining = true;
    let totalShattered = 0;
    while (isChaining) {
      // 1. Apply column gravity so unsupported/dangling gems drop independently
      let moved = true;
      while (moved) {
        moved = ChainResolver.applyGravity(this.state.grid);
      }

      // 2. Detect and merge any 2x2 or larger rectangular blocks into Power Gems
      Merger.detectAndMergePowerGems(this.state.grid);

      // 3. Resolve matches and score updates
      const chainResult = ChainResolver.resolveStep(this.state.grid);

      // 4. If gems were destroyed, we must loop again to drop the blocks above the gaps!
      if (chainResult.gemsShattered === 0) {
        isChaining = false;
      } else {
        totalShattered += chainResult.gemsShattered;
        // Optional: Increment this.state.score here based on chain combo multiplier!
        this.state.score += chainResult.gemsShattered;
      }
    }

    // 4. Decrement counters and validate final board status
    GameEngine.decrementCounters(this.state.grid);

    // 5. Process garbage AFTER lock and chain resolution
    this.processGarbageQueue(totalShattered);

    this.state.status = GameStateValidator.checkStatus(this.state.grid);

    if (this.state.status === "GAME_OVER") {
      this.state.activePiece = null;
      return true;
    }

    // 6. Pre-check spawn validity before instantiating the next piece
    const nextPiece = this.state.nextPiece;
    if (!this.canPlacePiece(nextPiece)) {
      this.state.status = "GAME_OVER";
      this.state.activePiece = null;
    } else {
      this.state.activePiece = nextPiece;
      this.state.nextPiece = this.createPiece();
    }

    return true;
  }

  /**
   * Returns a snapshot of the current state for the rendering layer.
   */
  public getState(): GameState {
    return this.state;
  }

  /**
   * Generates a deterministic hash of the board grid.
   */
  public getBoardHash(): string {
    return JSON.stringify(this.state.grid);
  }

  /**
   * Returns a serializable snapshot of the board and active piece for synchronization.
   */
  public getSnapshot(): { grid: BoardGrid; activePiece: ActivePiece | null; score: number; status: GameStatus } {
    return {
      grid: this.state.grid,
      activePiece: this.state.activePiece,
      score: this.state.score,
      status: this.state.status,
    };
  }
}
