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
  private readonly clearBonus = 100;
  private grid: GameGrid;
  public currentPiece: IFallingPiece | null;
  public nextPiece: IFallingPiece | null;
  public isGameOver: boolean = false;
  public didWin: boolean = false;
  public justLeveledUp: boolean = false;

  // Visuals
  public linkedRects: {
    r: number;
    c: number;
    w: number;
    h: number;
    color: BlockColor;
  }[] = [];

  // Scoring
  public score: number = 0;
  public totalBlocksCleared: number = 0;
  public currentChain: number = 0;
  public level: number = 1;

  private readonly GAME_OVER_LEVEL = 10;

  constructor() {
    this.grid = new GameGrid();
    this.currentPiece = null;
    this.nextPiece = this.generatePiece();
  }

  public resetChain(): void {
    this.currentChain = 0;
  }

  public clearLevelUpFlag(): void {
    this.justLeveledUp = false;
  }

  private generatePiece(): IFallingPiece {
    const availableColors = Object.values(BlockColor).filter(
      (color) => color !== BlockColor.EMPTY,
    );
    const colorA =
      availableColors[Math.floor(Math.random() * availableColors.length)];
    const colorB =
      availableColors[Math.floor(Math.random() * availableColors.length)];

    const piece = createFallingPiece(colorA, colorB);

    // The chance of a block being an orb increases with the level.
    const orbChance = 0.3 + this.level * 0.03;

    if (Math.random() < orbChance) {
      piece.blockA.type = BlockType.ORB;
    } else {
      piece.blockA.type = BlockType.NORMAL;
    }

    if (Math.random() < orbChance) {
      piece.blockB.type = BlockType.ORB;
    } else {
      piece.blockB.type = BlockType.NORMAL;
    }
    return piece;
  }

  public resetGame(): void {
    this.grid.reset();
    this.score = 0;
    this.totalBlocksCleared = 0;
    this.currentChain = 0;
    this.isGameOver = false;
    this.didWin = false;
    this.justLeveledUp = false;
    this.currentPiece = null;
    this.nextPiece = this.generatePiece();
    this.level = 1;
    this.updateLinkedBlocks(); // Ensure the grid visuals are reset
  }

  private isGridEmpty(): boolean {
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        if (this.grid.getBlock(r, c).type !== BlockType.EMPTY) {
          return false;
        }
      }
    }
    return true;
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

    this.currentPiece = this.nextPiece;
    this.nextPiece = this.generatePiece();

    if (
      this.checkSingleBlockCollision(
        this.currentPiece!.rowA,
        this.currentPiece!.colA,
        this.currentPiece!.blockA,
      ) ||
      this.checkSingleBlockCollision(
        this.currentPiece!.rowB,
        this.currentPiece!.colB,
        this.currentPiece!.blockB,
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
    let totalBlocksRemovedInReaction = 0;

    let didSomethingHappen = true;
    while (didSomethingHappen) {
      didSomethingHappen = false;
      const blocksRemovedThisPass = this.checkAndExplodeOrbs();

      if (blocksRemovedThisPass > 0) {
        this.currentChain++; // Increment the ongoing chain
        totalBlocksRemovedInReaction += blocksRemovedThisPass;

        // --- Scoring ---
        // The multiplier is 2^(chain-1). So 1x, 2x, 4x, 8x...
        const chainMultiplier = Math.pow(2, this.currentChain - 1);
        const points = blocksRemovedThisPass * 10 * chainMultiplier;
        this.score += points;

        didSomethingHappen = true;
      }

      const blocksMovedByGravity = this.applyGravity();

      if (blocksMovedByGravity > 0) {
        didSomethingHappen = true;
      }
    }

    if (totalBlocksRemovedInReaction > 0) {
      // If we cleared any blocks, check for a full clear bonus!
      if (this.isGridEmpty()) {
        this.score += this.clearBonus;
        console.log(`Full Clear Bonus: +${this.clearBonus}!`);
      }

      this.totalBlocksCleared += totalBlocksRemovedInReaction;
      this.updateLevel();
      console.log(
        `Chain: ${this.currentChain} | Blocks: ${totalBlocksRemovedInReaction} | Score: ${this.score}`,
      );
    }
    return totalBlocksRemovedInReaction;
  }

  private getTotalBlocksRequiredForLevel(level: number): number {
    if (level <= 1) {
      return 0;
    }
    const base = 10;
    const factor = 1.5;
    // Sum of a geometric series: base * (factor^(n-1) - 1) / (factor - 1)
    return Math.floor(
      (base / (factor - 1)) * (Math.pow(factor, level - 1) - 1),
    );
  }

  private updateLevel(): void {
    let leveledUp = false;
    // Loop to handle multiple level-ups in one go
    while (
      this.totalBlocksCleared >=
      this.getTotalBlocksRequiredForLevel(this.level + 1)
    ) {
      this.level++;
      leveledUp = true;
    }

    if (leveledUp) {
      this.justLeveledUp = true;
      this.grid.reset(); // Clear the board on level up!
      console.log(`Level up to ${this.level}! Board cleared.`);
    }

    if (this.level >= this.GAME_OVER_LEVEL) {
      this.isGameOver = true;
      this.didWin = true;
    }
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

          // Only trigger an explosion if the orb is connected to at least one other block of the same color.
          if (connectedBlocks.size > 1) {
            connectedBlocks.forEach((coord) => blocksToClear.add(coord));
          }
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

    // 1. Calculate the potential next relative position for Block B
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

    // 2. Test for wall kicks. Test order: No kick, kick left, kick right.
    const testOffsets = [
      { r: 0, c: 0 }, // Test 0: Standard rotation
      { r: 0, c: -1 }, // Test 1: Kick left
      { r: 0, c: 1 }, // Test 2: Kick right
    ];

    for (const offset of testOffsets) {
      const newColA = colA + offset.c;
      const newRowA = rowA + offset.r;
      const newColB = newColA + nextDCol;
      const newRowB = newRowA + nextDRow;

      // Check if BOTH new positions are valid
      const collisionA = this.checkSingleBlockCollision(
        newRowA,
        newColA,
        this.currentPiece.blockA,
        newRowB, // Ignore B's new position
        newColB,
      );
      const collisionB = this.checkSingleBlockCollision(
        newRowB,
        newColB,
        this.currentPiece.blockB,
        newRowA, // Ignore A's new position
        newColA,
      );

      if (!collisionA && !collisionB) {
        // Valid rotation found! Apply it.
        this.currentPiece.rowA = newRowA;
        this.currentPiece.colA = newColA;
        this.currentPiece.rowB = newRowB;
        this.currentPiece.colB = newColB;
        return true; // Rotation successful
      }
    }

    // All tests failed, rotation is not possible.
    return false;
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

  public hardDrop(): void {
    if (!this.currentPiece) {
      return;
    }

    let dropDistance = 0;
    while (true) {
      const nextRowA = this.currentPiece.rowA + dropDistance + 1;
      const nextRowB = this.currentPiece.rowB + dropDistance + 1;

      const collisionA = this.checkSingleBlockCollision(
        nextRowA,
        this.currentPiece.colA,
        this.currentPiece.blockA,
      );
      const collisionB = this.checkSingleBlockCollision(
        nextRowB,
        this.currentPiece.colB,
        this.currentPiece.blockB,
      );

      if (!collisionA && !collisionB) {
        dropDistance++;
      } else {
        break;
      }
    }

    if (dropDistance > 0) {
      this.currentPiece.rowA += dropDistance;
      this.currentPiece.rowB += dropDistance;
    }

    this.lockBlock(
      this.currentPiece.rowA,
      this.currentPiece.colA,
      this.currentPiece.blockA,
    );
    this.lockBlock(
      this.currentPiece.rowB,
      this.currentPiece.colB,
      this.currentPiece.blockB,
    );
    this.currentPiece = null;
    this.executeChainReaction();
    this.updateLinkedBlocks();
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
      this.updateLinkedBlocks();
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
    this.updateLinkedBlocks();
  }

  private lockBlock(row: number, col: number, block: IBlock): void {
    if (row < 0 || row >= GRID_HEIGHT) return;
    const finalBlock: IBlock = {
      ...block,
      isLocked: true,
      isLinked: false, // Default to not linked
    };
    this.grid.setBlock(row, col, finalBlock);
  }

  private updateLinkedBlocks(): void {
    // 1. Reset state
    this.linkedRects = [];
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const block = this.grid.getBlock(r, c);
        if (block.type !== BlockType.EMPTY) {
          block.isLinked = false;
        }
      }
    }

    const visited = new Set<string>();

    // 2. Find maximal rectangles
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const key = `${r},${c}`;
        if (visited.has(key)) continue;

        const startBlock = this.grid.getBlock(r, c);
        if (startBlock.type === BlockType.EMPTY) continue;

        const color = startBlock.color;

        // Find maximal width from this starting point
        let w = 1;
        while (
          c + w < GRID_WIDTH &&
          this.grid.getBlock(r, c + w).color === color &&
          !visited.has(`${r},${c + w}`)
        ) {
          w++;
        }

        // Find maximal height for this width
        let h = 1;
        let isFullRectangle = true;
        while (r + h < GRID_HEIGHT) {
          for (let i = 0; i < w; i++) {
            if (
              this.grid.getBlock(r + h, c + i).color !== color ||
              visited.has(`${r + h},${c + i}`)
            ) {
              isFullRectangle = false;
              break;
            }
          }
          if (isFullRectangle) {
            h++;
          } else {
            break;
          }
        }

        // 3. If it's a valid rectangle, store it and mark blocks
        if (w >= 2 && h >= 2) {
          this.linkedRects.push({ r, c, w, h, color });
          for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
              const blockKey = `${r + j},${c + i}`;
              visited.add(blockKey);
              this.grid.getBlock(r + j, c + i).isLinked = true;
            }
          }
        }
      }
    }
  }
}
