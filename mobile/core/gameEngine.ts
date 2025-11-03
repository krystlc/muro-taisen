import { GameGrid } from "./gameGrid";
import { IBlock, BlockColor, BlockType } from "../models/block";
import { findContiguousBlocks } from "./physics";
import { GRID_WIDTH, GRID_HEIGHT } from "./shared";
import { createFallingPiece, IFallingPiece } from "@/models/shape";

// Define the relative positions of B from A (Up, Right, Down, Left)
const RELATIVE_POSITIONS = [
  [-1, 0], // Top
  [0, 1], // Right
  [1, 0], // Bottom
  [0, -1], // Left
];

/**
 * The GameEngine manages the grid, falling pieces, and core physics logic.
 */
export class GameEngine {
  private grid: GameGrid;
  public currentPiece: IFallingPiece | null;
  public isGameOver: boolean = false;

  constructor() {
    this.grid = new GameGrid();
    this.currentPiece = null;
  }

  private checkSingleBlockCollision(
    row: number,
    col: number,
    block: IBlock,
    ignoreRow: number = -1,
    ignoreCol: number = -1,
  ): boolean {
    if (col < 0 || col >= GRID_WIDTH || row >= GRID_HEIGHT) {
      return true;
    }

    if (row >= 0) {
      const gridBlock = this.grid.getBlock(row, col);
      if (
        gridBlock.type !== BlockType.EMPTY &&
        (row !== ignoreRow || col !== ignoreCol)
      ) {
        return true;
      }
    }
    return false;
  }

  public spawnPiece(): void {
    if (this.isGameOver) return;

    const availableColors = Object.values(BlockColor).filter(
      (color) => color !== BlockColor.EMPTY,
    );
    const colorA =
      availableColors[Math.floor(Math.random() * availableColors.length)];
    const colorB =
      availableColors[Math.floor(Math.random() * availableColors.length)];

    const piece = createFallingPiece(colorA, colorB);

    if (Math.random() < 0.3) {
      // 30% chance for an orb
      piece.blockB.type = BlockType.ORB;
    } else {
      piece.blockB.type = BlockType.NORMAL;
    }
    piece.blockA.type = BlockType.NORMAL;

    this.currentPiece = piece;

    if (
      this.checkSingleBlockCollision(
        this.currentPiece.rowA,
        this.currentPiece.colA,
        this.currentPiece.blockA,
      ) ||
      this.checkSingleBlockCollision(
        this.currentPiece.rowB,
        this.currentPiece.colB,
        this.currentPiece.blockB,
      )
    ) {
      console.log("GAME OVER!");
      this.currentPiece = null;
      this.isGameOver = true;
    }
  }

  public get gameState(): IBlock[][] {
    return this.grid.state;
  }

  public applyGravity(): number {
    let blocksMoved = 0;
    for (let col = 0; col < GRID_WIDTH; col++) {
      let writeRow = GRID_HEIGHT - 1;
      for (let readRow = GRID_HEIGHT - 1; readRow >= 0; readRow--) {
        const block = this.grid.getBlock(readRow, col);
        if (block.type !== BlockType.EMPTY) {
          if (readRow !== writeRow) {
            this.grid.setBlock(writeRow, col, block);
            blocksMoved++;
          }
          writeRow--;
        }
      }
      for (let r = 0; r <= writeRow; r++) {
        this.grid.clearCell(r, col);
      }
    }
    return blocksMoved;
  }

  public executeChainReaction(): number {
    let totalBlocksRemoved = 0;
    let chainCount = 0;
    let didSomethingHappen = true;

    while (didSomethingHappen) {
      didSomethingHappen = false;
      const blocksRemovedThisPass = this.checkAndExplodeOrbs();

      if (blocksRemovedThisPass > 0) {
        totalBlocksRemoved += blocksRemovedThisPass;
        chainCount++;
        didSomethingHappen = true;
      }

      const blocksMovedByGravity = this.applyGravity();

      if (blocksMovedByGravity > 0) {
        didSomethingHappen = true;
      }
    }

    if (chainCount > 0) {
      console.log(
        `Chain Reaction Complete! Total chains: ${chainCount}, Total blocks removed: ${totalBlocksRemoved}`,
      );
    }

    return totalBlocksRemoved;
  }

  private checkAndExplodeOrbs(): number {
    const blocksToClear = new Set<string>();
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        const block = this.grid.getBlock(row, col);

        if (block.type === BlockType.ORB) {
          const targetColor = block.color;
          const connectedBlocks = findContiguousBlocks(
            this.grid.state,
            row,
            col,
            targetColor,
          );
          connectedBlocks.forEach((coord) => blocksToClear.add(coord));
        }
      }
    }

    blocksToClear.forEach((coord) => {
      const [row, col] = coord.split(",").map(Number);
      this.grid.clearCell(row, col);
    });

    return blocksToClear.size;
  }

  public tryRotate(): boolean {
    if (!this.currentPiece || !this.currentPiece.blockB) return false;

    const { rowA, colA, rowB, colB } = this.currentPiece;

    if (
      typeof rowA !== "number" ||
      typeof colA !== "number" ||
      typeof rowB !== "number" ||
      typeof colB !== "number"
    ) {
      console.error("Rotation failed: Invalid piece coordinates.");
      return false;
    }

    const dRow = rowB - rowA;
    const dCol = colB - colA;

    let currentPosIndex = RELATIVE_POSITIONS.findIndex(
      ([r, c]) => r === dRow && c === dCol,
    );
    if (currentPosIndex === -1) {
      currentPosIndex = 0;
    }

    const nextPosIndex = (currentPosIndex + 1) % 4;
    const [nextDRow, nextDCol] = RELATIVE_POSITIONS[nextPosIndex];

    const newRowB = rowA + nextDRow;
    const newColB = colA + nextDCol;

    const collision = this.checkSingleBlockCollision(
      newRowB,
      newColB,
      this.currentPiece.blockB,
      rowA,
      colA,
    );

    if (collision) {
      return false;
    }

    this.currentPiece.rowB = newRowB;
    this.currentPiece.colB = newColB;
    return true;
  }

  public tryMove(direction: "left" | "right"): boolean {
    if (!this.currentPiece) {
      return false;
    }

    const delta = direction === "left" ? -1 : 1;

    const newColA = this.currentPiece.colA + delta;
    const collisionA = this.checkSingleBlockCollision(
      this.currentPiece.rowA,
      newColA,
      this.currentPiece.blockA,
    );

    const newColB = this.currentPiece.colB + delta;
    const collisionB = this.checkSingleBlockCollision(
      this.currentPiece.rowB,
      newColB,
      this.currentPiece.blockB,
    );

    if (collisionA || collisionB) {
      return false;
    }

    this.currentPiece.colA = newColA;
    this.currentPiece.colB = newColB;
    return true;
  }

  public get isPieceLocked(): boolean {
    return this.currentPiece === null;
  }

  public gravityTick(): void {
    if (!this.currentPiece) {
      return;
    }

    const piece = this.currentPiece;

    const canMoveA = !this.checkSingleBlockCollision(
      piece.rowA + 1,
      piece.colA,
      piece.blockA,
      piece.rowB,
      piece.colB,
    );

    const canMoveB = !this.checkSingleBlockCollision(
      piece.rowB + 1,
      piece.colB,
      piece.blockB,
      piece.rowA,
      piece.colA,
    );

    if (canMoveA && canMoveB) {
      piece.rowA++;
      piece.rowB++;
    } else if (!canMoveA && canMoveB) {
      this.lockBlock(piece.rowA, piece.colA, piece.blockA);
      this.cascadingFall(piece.rowB, piece.colB, piece.blockB);
      this.currentPiece = null;
    } else if (canMoveA && !canMoveB) {
      this.lockBlock(piece.rowB, piece.colB, piece.blockB);
      this.cascadingFall(piece.rowA, piece.colA, piece.blockA);
      this.currentPiece = null;
    } else {
      this.lockBlock(piece.rowA, piece.colA, piece.blockA);
      this.lockBlock(piece.rowB, piece.colB, piece.blockB);
      this.currentPiece = null;
      this.executeChainReaction();
    }
  }

  private cascadingFall(
    startRow: number,
    startCol: number,
    block: IBlock,
  ): void {
    let finalRow = startRow;
    while (
      finalRow + 1 < GRID_HEIGHT &&
      !this.checkSingleBlockCollision(finalRow + 1, startCol, block)
    ) {
      finalRow++;
    }
    this.lockBlock(finalRow, startCol, block);
    this.executeChainReaction();
  }

  private lockBlock(row: number, col: number, block: IBlock): void {
    if (row < 0 || row >= GRID_HEIGHT) return;
    const finalBlock: IBlock = {
      ...block,
      isLocked: true,
    };
    this.grid.setBlock(row, col, finalBlock);
  }
}
