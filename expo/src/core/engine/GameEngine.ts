// Main tick loop & input dispatch
import { BOARD_COLS, BOARD_ROWS, BoardGrid, Board, SPAWN_COLUMN } from './Board';
import { Gem, GemColor, GemType } from '../models/Gem';
import { PRNG } from './PRNG';
import { GameStateValidator, GameStatus } from './GameStateValidator';
import { InputAction } from '../../input/InputManager';
import { Merger } from './Merger';
import { ChainResolver } from './ChainResolver';
import { GameLogger } from './GameLogger';

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

  constructor(seed: string) {
    this.prng = new PRNG(seed);
    this.state = {
      grid: Board.createEmptyGrid(),
      status: 'PLAYING',
      score: 0,
      tickCount: 0,
      activePiece: this.createPiece(),
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

  public tick(deltaMs: number): void {
    // Check game-over condition at the very start of every tick
    this.state.status = GameStateValidator.checkStatus(this.state.grid);
    if (this.state.status === 'GAME_OVER') {
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
      if (action === 'MOVE_LEFT') {
        this.tryMove(-1);
      } else if (action === 'MOVE_RIGHT') {
        this.tryMove(1);
      } else if (action === 'ROTATE_CW') {
        this.tryRotate(90);
      } else if (action === 'ROTATE_CCW') {
        this.tryRotate(-90);
      } else if (action === 'SOFT_DROP') {
        if (!this.tryMoveDown()) locked = this.lockPiece();
      } else if (action === 'HARD_DROP') {
        locked = this.hardDrop();
      }

      if (locked) break;
    }
    this.pendingInputs = [];

    if (locked || !this.state.activePiece) return;

    this.gravityAccumulatorMs += Math.max(0, deltaMs);
    while (this.gravityAccumulatorMs >= this.gravityIntervalMs && this.state.activePiece) {
      this.gravityAccumulatorMs -= this.gravityIntervalMs;
      if (!this.tryMoveDown()) this.lockPiece();
    }
  }

  private createPiece(): ActivePiece {
    const colors = [GemColor.RED, GemColor.BLUE, GemColor.YELLOW, GemColor.GREEN];
    const pivotColor = colors[this.prng.nextInt(0, colors.length)];
    const partnerColor = colors[this.prng.nextInt(0, colors.length)];
    const pieceId = this.pieceSequence++;

    return {
      gems: [
        { id: `piece-${pieceId}-pivot`, color: pivotColor, type: GemType.NORMAL },
        { id: `piece-${pieceId}-partner`, color: partnerColor, type: GemType.NORMAL },
      ],
      // Spawn lower down if row 12 is reserved as the hidden overflow ceiling,
      // or set pivot to BOARD_ROWS - 3 so partner sits at BOARD_ROWS - 2 cleanly.
      row: BOARD_ROWS - 3,
      column: SPAWN_COLUMN,
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
    return this.getPieceCoordinates(piece, row, column, rotation).every(([gemRow, gemColumn]) => {
      return (
        gemRow >= 0 &&
        gemRow < BOARD_ROWS &&
        gemColumn >= 0 &&
        gemColumn < BOARD_COLS &&
        this.state.grid[gemRow][gemColumn] === null
      );
    });
  }

  private tryMove(columnDelta: number): boolean {
    const piece = this.state.activePiece;
    if (!piece || !this.canPlacePiece(piece, piece.row, piece.column + columnDelta)) return false;

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
    const nextIndex = (currentIndex + (rotationDelta > 0 ? 1 : -1) + rotations.length) % rotations.length;
    const nextRotation = rotations[nextIndex];

    if (!this.canPlacePiece(piece, piece.row, piece.column, nextRotation)) return false;

    piece.rotation = nextRotation;
    return true;
  }

  private hardDrop(): boolean {
    const piece = this.state.activePiece;
    if (!piece) return false;

    while (this.tryMoveDown()) {
      // Continue until the next row would collide with the floor or board.
    }
    return this.lockPiece();
  }


  private lockPiece(): boolean {
    const piece = this.state.activePiece;
    if (!piece || !this.canPlacePiece(piece)) return false;

    const coordinates = this.getPieceCoordinates(piece);
    coordinates.forEach(([row, column], index) => {
      this.state.grid[row][column] = piece.gems[index];
    });

    // 1. Apply column gravity so unsupported/dangling gems drop independently per column
    let moved = true;
    while (moved) {
      moved = ChainResolver.applyGravity(this.state.grid);
    }

    // 2. Detect and merge any 2x2 or larger rectangular blocks into Power Gems
    Merger.detectAndMergePowerGems(this.state.grid);

    // 3. Resolve any resulting matches, chains, and score updates
    const chainResult = ChainResolver.resolveStep(this.state.grid);
    GameLogger.logState('Resolve any resulting matches, chains, and score updates', this.state.grid, chainResult);

    // 4. Decrement counters and validate final board status
    GameEngine.decrementCounters(this.state.grid);
    this.state.status = GameStateValidator.checkStatus(this.state.grid);

    if (this.state.status === 'GAME_OVER') {
      this.state.activePiece = null;
      return true;
    }

    // 5. Pre-check spawn validity before instantiating the next piece
    const nextPiece = this.createPiece();
    if (!this.canPlacePiece(nextPiece)) {
      this.state.status = 'GAME_OVER';
      this.state.activePiece = null;
    } else {
      this.state.activePiece = nextPiece;
    }

    return true;
  }

  /**
   * Returns a snapshot of the current state for the rendering layer.
   */
  public getState(): GameState {
    return this.state;
  }
}
