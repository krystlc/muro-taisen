// src/game/index.ts
import Phaser from "phaser";
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE, FALL_SPEED } from "./constants";
import { Block, GemColor, BlockType } from "./block";
import { MatchingSystem } from "./matching";
import { EffectsManager } from "./effects";

interface MuroTaisenConfig {
  gridX: number;
  gridY: number;
  sceneKey: string;
}

// Helper type for the grid
type GameGrid = (Block | null)[][];

enum BlockOrientation {
  B1_TOP,
  B1_RIGHT,
  B1_BOTTOM,
  B1_LEFT,
}

// Interface for Active Piece
interface ActivePiece {
  block1: Block;
  block2: Block;
  orientation: BlockOrientation; // 0: b1 top, 1: b1 right, 2: b1 bottom, 3: b1 left
  // Store the 'pivot' grid coordinates for easier movement/rotation
  pivotGridX: number;
  pivotGridY: number;
}

export default class MuroTaisen extends Phaser.Scene {
  private grid: GameGrid = [];
  private activePiece: ActivePiece | null = null;
  private fallTimer: Phaser.Time.TimerEvent | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private moveDelayTimer: Phaser.Time.TimerEvent | null = null; // Prevent instant repeated moves
  private moveRepeatDelay: number = 150; // ms delay for holding key down
  private moveFirstDelay: number = 200; // ms delay before repeat starts
  private matchAnimationPlaying: boolean = false; // Flag to track if match animations are playing
  private score = 0;
  private comboCount = 0;
  private effectsManager?: EffectsManager;
  readonly sceneKey: string;
  private readonly gridOffsetX: number;
  private readonly gridOffsetY: number;

  constructor(_scene: Phaser.Scene, config: MuroTaisenConfig) {
    super(config.sceneKey);
    this.sceneKey = config.sceneKey;
    this.gridOffsetX = config.gridX;
    this.gridOffsetY = config.gridY;
  }

  preload() {}

  create() {
    this.initializeGrid();
    this.cursors = this.input.keyboard?.createCursorKeys();

    // Initialize effects manager
    this.effectsManager = new EffectsManager(this);

    // Setup score text
    this.add
      .text(10 + this.gridOffsetX, 10, "Score: 0", {
        color: "#ffffff",
        fontSize: "18px",
      })
      .setDepth(10)
      .setName("scoreText");

    this.spawnNewPiece();
    this.setupFallTimer();
    this.setupInput();

    // Draw grid lines for visibility
    this.drawGridLines();
  }

  // Initialize the grid with null values
  initializeGrid() {
    this.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.grid[y][x] = null;
      }
    }
  }

  // --- Piece Spawning ---
  spawnNewPiece() {
    // Reset combo count when a new piece is spawned
    this.comboCount = 0;

    const startX = Phaser.Math.RND.between(0, GRID_WIDTH - 1);
    const startY = 0;

    const color1 = this.getRandomColor();
    const color2 = this.getRandomColor();
    const gem1 = this.getRandomGem();
    const gem2 = this.getRandomGem();

    const block1 = new Block(
      this,
      startX,
      startY - 1,
      gem1.texture,
      color1,
      gem1.gemType
    );
    const block2 = new Block(
      this,
      startX,
      startY,
      gem2.texture,
      color2,
      gem2.gemType
    );

    this.activePiece = {
      block1: block1,
      block2: block2,
      orientation: BlockOrientation.B1_TOP, // block1 on top
      pivotGridX: startX,
      pivotGridY: startY,
    };

    // Check for game over immediately
    if (
      !this.isValidPosition(
        this.activePiece.pivotGridX,
        this.activePiece.pivotGridY + 1,
        this.activePiece.orientation
      )
    ) {
      this.gameOver();
    }
  }

  getRandomGem(): { gemType: BlockType; texture: string } {
    // 20% chance for a crash gem
    const isSpecial = Phaser.Math.RND.frac() < 0.2;
    const gemType = isSpecial ? BlockType.CRASH_GEM : BlockType.GEM;

    // Always use the block texture (more reliable sizing)
    // but differentiate with a different tint or scale for special blocks
    const texture = isSpecial ? "orb" : "block";

    return { gemType, texture };
  }

  getRandomColor(): GemColor {
    const colors = Object.values(GemColor).filter(
      (v) => typeof v === "number"
    ) as number[];
    const randomIndex = Phaser.Math.Between(0, colors.length - 1);
    return colors[randomIndex] as GemColor;
  }

  // --- Falling Mechanism ---
  setupFallTimer() {
    if (this.fallTimer) {
      this.fallTimer.remove(false);
    }
    this.fallTimer = this.time.addEvent({
      delay: FALL_SPEED,
      callback: this.movePieceDown,
      callbackScope: this,
      loop: true,
    });
  }

  movePieceDown() {
    if (!this.activePiece || this.matchAnimationPlaying) return;

    if (this.canMovePiece(0, 1)) {
      this.activePiece.pivotGridY++;
      this.updateActivePiecePositions();
    } else {
      // Cannot move down, lock the piece in place
      this.lockPiece();
    }
  }

  // --- Input Handling ---
  setupInput() {
    if (!this.cursors) return;

    // --- Horizontal Movement ---
    this.cursors.left.on("down", () => this.handleMoveInput(-1, 0));
    this.cursors.right.on("down", () => this.handleMoveInput(1, 0));

    // Stop repeating when key is released
    this.cursors.left.on("up", () => this.clearMoveTimer());
    this.cursors.right.on("up", () => this.clearMoveTimer());

    // --- Rotation ---
    this.input.keyboard?.on("keydown-SPACE", () => this.rotatePiece());
    this.input.keyboard?.on("keydown-Z", () =>
      this.rotatePieceCounterClockwise()
    );
    this.cursors.up.on("down", () => this.rotatePiece()); // Alternative

    // --- Soft Drop ---
    this.cursors.down.on("down", () => this.handleSoftDrop());
    this.cursors.down.on("up", () => this.resetFallSpeed());
  }

  handleMoveInput(deltaX: number, deltaY: number) {
    if (this.matchAnimationPlaying) return;

    this.clearMoveTimer();

    // Try initial move
    if (this.canMovePiece(deltaX, deltaY)) {
      this.movePiece(deltaX, deltaY);
    }

    // Set timer for repeated movement if key is held
    this.moveDelayTimer = this.time.delayedCall(this.moveFirstDelay, () => {
      this.moveDelayTimer = this.time.addEvent({
        delay: this.moveRepeatDelay,
        callback: () => {
          if (this.canMovePiece(deltaX, deltaY)) {
            this.movePiece(deltaX, deltaY);
          } else {
            this.clearMoveTimer();
          }
        },
        callbackScope: this,
        loop: true,
      });
    });
  }

  clearMoveTimer() {
    if (this.moveDelayTimer) {
      this.moveDelayTimer.remove(false);
      this.moveDelayTimer = null;
    }
  }

  movePiece(deltaX: number, deltaY: number) {
    if (!this.activePiece) return;
    this.activePiece.pivotGridX += deltaX;
    this.activePiece.pivotGridY += deltaY;
    this.updateActivePiecePositions();
  }

  // --- Enhanced Rotation System ---
  rotatePiece() {
    if (!this.activePiece || this.matchAnimationPlaying) return;

    const currentOrientation = this.activePiece.orientation;
    const nextOrientation = (currentOrientation + 1) % 4; // Clockwise

    this.tryRotation(nextOrientation);
  }

  rotatePieceCounterClockwise() {
    if (!this.activePiece || this.matchAnimationPlaying) return;

    const currentOrientation = this.activePiece.orientation;
    const nextOrientation = (currentOrientation + 3) % 4; // Counter-clockwise (4-1=3)

    this.tryRotation(nextOrientation);
  }

  tryRotation(targetOrientation: BlockOrientation) {
    if (!this.activePiece) return;

    const { pivotGridX, pivotGridY } = this.activePiece;

    // Try normal rotation
    if (this.isValidPosition(pivotGridX, pivotGridY, targetOrientation)) {
      this.activePiece.orientation = targetOrientation;
      this.updateActivePiecePositions();
      return;
    }

    // Wall kicks - try adjusting position to make rotation valid
    const wallKickOffsets = [
      { x: -1, y: 0 }, // Try left
      { x: 1, y: 0 }, // Try right
      { x: 0, y: -1 }, // Try up (rarely needed but can help)
      { x: -1, y: -1 }, // Try up-left
      { x: 1, y: -1 }, // Try up-right
    ];

    for (const offset of wallKickOffsets) {
      const newX = pivotGridX + offset.x;
      const newY = pivotGridY + offset.y;

      if (this.isValidPosition(newX, newY, targetOrientation)) {
        // We found a valid position with wall kick
        this.activePiece.pivotGridX = newX;
        this.activePiece.pivotGridY = newY;
        this.activePiece.orientation = targetOrientation;
        this.updateActivePiecePositions();
        return;
      }
    }

    // If we got here, rotation is not possible
  }

  handleSoftDrop() {
    if (!this.fallTimer || this.matchAnimationPlaying) return;
    // Increase fall speed temporarily
    this.fallTimer.delay = FALL_SPEED / 10;
    // Immediately trigger a move down if possible
    this.movePieceDown();
  }

  resetFallSpeed() {
    if (!this.fallTimer) return;
    this.fallTimer.delay = FALL_SPEED;
  }

  // --- Collision Detection ---
  canMovePiece(deltaX: number, deltaY: number): boolean {
    if (!this.activePiece) return false;
    const nextPivotX = this.activePiece.pivotGridX + deltaX;
    const nextPivotY = this.activePiece.pivotGridY + deltaY;
    return this.isValidPosition(
      nextPivotX,
      nextPivotY,
      this.activePiece.orientation
    );
  }

  isValidPosition(
    pivotX: number,
    pivotY: number,
    orientation: number
  ): boolean {
    if (!this.activePiece) return false;

    const { x1, y1, x2, y2 } = this.getPieceGridCoordinates(
      pivotX,
      pivotY,
      orientation
    );

    return this.isCellValid(x1, y1) && this.isCellValid(x2, y2);
  }

  isCellValid(x: number, y: number): boolean {
    return (
      x >= 0 &&
      x < GRID_WIDTH &&
      y >= 0 &&
      y < GRID_HEIGHT &&
      (y < 0 || !this.grid[y] || !this.grid[y][x])
    );
  }

  // --- Piece Locking ---
  lockPiece() {
    if (!this.activePiece) return;

    // Pause the main fall timer while locking/clearing
    this.fallTimer?.remove(false);
    this.fallTimer = null;

    const { x1, y1, x2, y2, block1, block2 } = this.getFloorCoordinates(
      this.activePiece
    );

    // Add blocks to the grid if they are within bounds
    if (y1 >= 0 && y1 < GRID_HEIGHT) this.grid[y1][x1] = block1;
    if (y2 >= 0 && y2 < GRID_HEIGHT) this.grid[y2][x2] = block2;

    // Update the final gridX/gridY on the blocks themselves
    block1.gridX = x1;
    block1.gridY = y1;
    block2.gridX = x2;
    block2.gridY = y2;

    // Detach blocks from active piece
    this.activePiece = null;

    // Trigger match checking
    this.checkForMatches();
  }

  getFloorCoordinates(activePiece: ActivePiece) {
    const { block1, block2, pivotGridX, pivotGridY, orientation } = activePiece;
    const coordinates = this.getPieceGridCoordinates(
      pivotGridX,
      pivotGridY,
      orientation
    );

    // For vertical orientations, blocks fall together
    if (
      orientation === BlockOrientation.B1_TOP ||
      orientation === BlockOrientation.B1_BOTTOM
    )
      return {
        ...coordinates,
        block1,
        block2,
      };

    // For horizontal orientations, blocks can fall independently
    const y1 = this.getNextLowestGridY(coordinates.x1, coordinates.y1);
    if (y1 !== coordinates.y1) {
      block1.gridY = y1;
      block1.updatePosition();
    }

    const y2 = this.getNextLowestGridY(coordinates.x2, coordinates.y2);
    if (y2 !== coordinates.y2) {
      block2.gridY = y2;
      block2.updatePosition();
    }

    return {
      ...coordinates,
      y1,
      y2,
      block1,
      block2,
    };
  }

  getNextLowestGridY(gridX: number, gridY: number) {
    let floor = gridY;
    while (this.isNextGridYEmpty(gridX, floor)) {
      floor++;
    }
    return floor;
  }

  isNextGridYEmpty(gridX: number, gridY: number) {
    if (gridY >= GRID_HEIGHT - 1) return false;

    const nextGridY = gridY + 1;
    if (!Array.isArray(this.grid[nextGridY])) return false;

    return this.grid[nextGridY][gridX] === null;
  }

  // --- Match Checking System ---
  checkForMatches() {
    // Find all matches in the grid
    const matches = MatchingSystem.findMatches(this.grid);

    if (matches.length > 0) {
      this.matchAnimationPlaying = true;

      // Process any special gems effects
      const additionalBlocks = MatchingSystem.processCrashGems(
        matches,
        this.grid
      );

      // Collect all blocks to remove
      const allBlocksToRemove: Block[] = [...additionalBlocks];
      matches.forEach((match) => allBlocksToRemove.push(...match.blocks));

      // Update score based on matches
      this.updateScore(matches.length, allBlocksToRemove.length);

      // Animate and remove matched blocks
      this.animateAndRemoveBlocks(allBlocksToRemove, () => {
        // After animation, apply gravity to blocks above
        this.applyGravity(() => {
          // Check for cascading matches
          this.events.emit("blocksCleared", allBlocksToRemove.length);
          this.checkForMatches();
        });
      });
    } else {
      // No matches, spawn next piece
      this.matchAnimationPlaying = false;
      this.spawnNewPiece();
      this.setupFallTimer();
    }
  }

  receiveGarbageBlocks(amount = 0) {
    for (let i = 0; i < amount; i++) {
      const randomX = Phaser.Math.RND.integerInRange(0, GRID_WIDTH - 1);
      const garbageColor = this.getRandomColor();

      // Find the lowest empty cell at the top of the grid in the random column
      let y = 0;
      while (y < GRID_HEIGHT && this.grid[y][randomX] === null) {
        y++;
      }
      y--; // Go back to the last empty cell

      if (y < 0) {
        this.gameOver(); // Grid full at the top, game over
        break;
      }

      // Optionally, we could create solid block sprites immediately to represent the garbage
      console.log("this happened...");
      const garbageBlock = new Block(this, randomX, y, "block", garbageColor);
      this.grid[y][randomX] = garbageBlock;
    }
  }

  updateScore(matchCount: number, blockCount: number) {
    // Base points per block
    const basePoints = 10;

    // Increase combo count for cascades
    this.comboCount++;

    // Bonus for combos (more points for consecutive matches)
    const comboBonus = this.comboCount > 1 ? this.comboCount * 30 : 0;

    // Bonus for multiple matches
    const matchBonus = matchCount > 1 ? matchCount * 50 : 0;

    // Calculate total score for this clear
    const points = basePoints * blockCount + matchBonus + comboBonus;

    this.score += points;

    // Update score display
    const scoreText = this.children.getByName(
      "scoreText"
    ) as Phaser.GameObjects.Text;
    if (scoreText) {
      scoreText.setText(`Score: ${this.score}`);
    }

    // Show floating score text
    this.effectsManager?.createScorePopup(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      points
    );

    // Show combo effect for 2+ combos
    if (this.comboCount > 1) {
      this.effectsManager?.createComboEffect(
        this.cameras.main.centerX,
        this.cameras.main.height / 4,
        this.comboCount
      );
    }
  }

  animateAndRemoveBlocks(blocks: Block[], onComplete: () => void) {
    const blockCount = blocks.length;
    if (blockCount === 0) {
      onComplete();
      return;
    }

    let completedCount = 0;

    // Animate each block and remove from grid
    blocks.forEach((block) => {
      // Remove from grid data
      if (
        block.gridY >= 0 &&
        block.gridY < GRID_HEIGHT &&
        block.gridX >= 0 &&
        block.gridX < GRID_WIDTH
      ) {
        this.grid[block.gridY][block.gridX] = null;
      }

      // Flash the block
      block.flash();

      // Calculate block position
      const pixelX =
        ((this.gridOffsetX + block.gridX) * CELL_SIZE + CELL_SIZE) / 2;
      const pixelY = block.gridY * CELL_SIZE + CELL_SIZE / 2;

      // Create a small localized effect
      if (block.blockType === BlockType.CRASH_GEM) {
        this.effectsManager?.createCrashGemEffect(
          pixelX,
          pixelY,
          block.gemColor
        );
      } else {
        this.effectsManager?.createMatchClearEffect(
          pixelX,
          pixelY,
          block.gemColor
        );
      }

      // Simple shrink animation to remove the block
      this.tweens.add({
        targets: block,
        scaleX: 0,
        scaleY: 0,
        angle: 180, // Add a little rotation
        duration: 200,
        onComplete: () => {
          block.destroy();
          completedCount++;

          // When all blocks are processed, run the callback
          if (completedCount === blockCount) {
            onComplete();
          }
        },
      });
    });
  }

  applyGravity(onComplete: () => void) {
    let blocksInMotion = 0;
    let blocksMoved = false;

    // For each column, start from the bottom and move blocks down
    for (let x = 0; x < GRID_WIDTH; x++) {
      for (let y = GRID_HEIGHT - 2; y >= 0; y--) {
        const block = this.grid[y][x];
        if (!block) continue;

        // Find the lowest empty space below this block
        let lowestEmptyY = y;
        for (let checkY = y + 1; checkY < GRID_HEIGHT; checkY++) {
          if (!this.grid[checkY][x]) {
            lowestEmptyY = checkY;
          } else {
            break; // Stop at the first non-empty cell
          }
        }

        if (lowestEmptyY > y) {
          blocksMoved = true;
          blocksInMotion++;

          // Update grid reference
          this.grid[y][x] = null;
          this.grid[lowestEmptyY][x] = block;

          // Update block's grid coordinates
          block.gridY = lowestEmptyY;

          // Animate the block falling
          this.tweens.add({
            targets: block,
            y: lowestEmptyY * CELL_SIZE + CELL_SIZE / 2,
            duration: 150 * (lowestEmptyY - y), // Longer fall = longer animation
            ease: "Bounce.Out",
            onComplete: () => {
              blocksInMotion--;

              // When all blocks have settled, run the callback
              if (blocksInMotion === 0) {
                onComplete();
              }
            },
          });
        }
      }
    }

    // If no blocks moved, complete immediately
    if (!blocksMoved) {
      onComplete();
    }
  }

  isWithinGridBounds(x: number, y: number) {
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
  }

  /**
   * Removes blocks from the grid and destroys their sprites.
   * @param blocksToClear The set of blocks to remove.
   */
  clearBlocksFromGrid(blocksToClear: Set<Block>) {
    blocksToClear.forEach((block) => {
      if (this.isWithinGridBounds(block.gridX, block.gridY)) {
        // Check if the block at the grid position is indeed the one we intend to clear
        // (Handles cases where the grid might have changed unexpectedly)
        if (this.grid[block.gridY][block.gridX] === block) {
          this.grid[block.gridY][block.gridX] = null; // Remove from grid data
        } else {
          console.warn(
            `Block mismatch during clear at (${block.gridX}, ${block.gridY})`
          );
        }
      }
      block.explode(); // Remove sprite from scene
    });
    // --- TODO: Play clearing sound effect ---
  }

  // --- Helper Functions ---
  updateActivePiecePositions() {
    if (!this.activePiece) return;
    const { block1, block2, pivotGridX, pivotGridY, orientation } =
      this.activePiece;

    const { x1, y1, x2, y2 } = this.getPieceGridCoordinates(
      pivotGridX,
      pivotGridY,
      orientation
    );

    block1.gridX = x1;
    block1.gridY = y1;
    block1.updatePosition();

    block2.gridX = x2;
    block2.gridY = y2;
    block2.updatePosition();
  }

  getPieceGridCoordinates(
    pivotX: number,
    pivotY: number,
    orientation: BlockOrientation
  ): { x1: number; y1: number; x2: number; y2: number } {
    let x1 = pivotX,
      y1 = pivotY,
      x2 = pivotX,
      y2 = pivotY;

    switch (orientation) {
      case BlockOrientation.B1_TOP: // Block 1 Above Pivot (Block 2)
        y1 = pivotY - 1;
        y2 = pivotY;
        x1 = pivotX;
        x2 = pivotX;
        break;
      case BlockOrientation.B1_RIGHT: // Block 1 Right of Pivot (Block 2)
        x1 = pivotX + 1;
        y1 = pivotY;
        x2 = pivotX;
        y2 = pivotY;
        break;
      case BlockOrientation.B1_BOTTOM: // Block 1 Below Pivot (Block 2)
        y1 = pivotY + 1;
        y2 = pivotY;
        x1 = pivotX;
        x2 = pivotX;
        break;
      case BlockOrientation.B1_LEFT: // Block 1 Left of Pivot (Block 2)
        x1 = pivotX - 1;
        y1 = pivotY;
        x2 = pivotX;
        y2 = pivotY;
        break;
    }
    return { x1, y1, x2, y2 };
  }

  // --- Game State ---
  gameOver() {
    console.error("GAME OVER");
    this.scene.pause();
    if (this.fallTimer) this.fallTimer.remove(false);

    const highScore = localStorage.getItem("highScore");
    const currentHighScore = highScore ? parseInt(highScore, 10) : 0;

    if (this.score > currentHighScore) {
      localStorage.setItem("highScore", String(this.score));
      console.log(`New High Score: ${this.score}`);
    }

    this.scene.start("GameOverScene");
  }

  drawGridLines() {
    const graphics = this.add.graphics({
      lineStyle: { width: 1, color: 0x444444 },
    });
    // Vertical lines
    for (let x = 0; x <= GRID_WIDTH; x++) {
      graphics.lineBetween(
        x * CELL_SIZE + this.gridOffsetX,
        0,
        x * CELL_SIZE + this.gridOffsetX,
        GRID_HEIGHT * CELL_SIZE
      );
    }
    // Horizontal lines
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      graphics.lineBetween(
        0 + this.gridOffsetX,
        y * CELL_SIZE,
        GRID_WIDTH * CELL_SIZE + this.gridOffsetX,
        y * CELL_SIZE
      );
    }
  }
}
