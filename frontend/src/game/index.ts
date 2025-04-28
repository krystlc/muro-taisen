// src/scene.ts (Updated index.ts content)
import Phaser from "phaser";
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE, FALL_SPEED } from "./constants";
import { Block, GemColor, BlockType } from "./block"; // Import new enums

// Helper type for the grid
type GameGrid = (Block | null)[][];
enum BlockOrientation {
  B1_TOP,
  B1_RIGHT,
  B1_BOTTOM,
  B1_LEFT,
}
// --- Interface for Active Piece --- (Can be defined here or imported if in separate file)
interface ActivePiece {
  block1: Block;
  block2: Block;
  orientation: BlockOrientation; // 0: b1 top, 1: b1 right, 2: b1 bottom, 3: b1 left
  // Store the 'pivot' grid coordinates for easier movement/rotation
  pivotGridX: number;
  pivotGridY: number;
}
// ---

class MuroTaisen extends Phaser.Scene {
  private grid: GameGrid = [];
  private activePiece: ActivePiece | null = null;
  private fallTimer: Phaser.Time.TimerEvent | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private moveDelayTimer: Phaser.Time.TimerEvent | null = null; // Prevent instant repeated moves
  private moveRepeatDelay: number = 150; // ms delay for holding key down
  private moveFirstDelay: number = 200; // ms delay before repeat starts

  constructor() {
    super("MuroTaisen");
  }

  preload() {
    this.load.setPath("assets");
    this.load.image("orb", "orb.png"); // Use a simple square block for now
    this.load.image("block", "block.png"); // Use a simple square block for now
    // You might want different assets for Gems and Crash Gems later
    // this.load.image("gem", "gem.png");
    // this.load.image("crashGem", "crash_gem.png");
  }

  create() {
    this.initializeGrid();
    this.cursors = this.input.keyboard?.createCursorKeys(); // Enable keyboard input
    this.spawnNewPiece();
    this.setupFallTimer();
    this.setupInput();

    // Optional: Draw grid lines for debugging
    this.drawGridLines();
  }

  // Initialize the grid with null values
  initializeGrid() {
    this.grid = []; // Clear existing grid if scene restarts
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.grid[y][x] = null;
      }
    }
  }

  // --- Piece Spawning ---
  spawnNewPiece() {
    const startX = Math.floor(GRID_WIDTH / 2) - 1; // Start near top-center
    const startY = 0; // Start just above the visible grid

    // Create two blocks with random colors (basic gems for now)
    const color1 = this.getRandomColor();
    const color2 = this.getRandomColor();
    // TODO: Add logic to sometimes make one a Crash Gem
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
      orientation: 0, // block1 on top
      pivotGridX: startX,
      pivotGridY: startY, // Pivot is usually the 'lower' or 'center' block
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
    const arr = [BlockType.GEM, BlockType.CRASH_GEM];
    const gemType = Phaser.Math.RND.pick(arr);
    let texture = "block";
    if (gemType === BlockType.CRASH_GEM) texture = "orb";
    return {
      gemType,
      texture,
    };
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
    if (!this.activePiece) return;

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
    // Using 'space' for rotation example (or UP arrow)
    this.input.keyboard?.on("keydown-SPACE", () => this.rotatePiece());
    // this.cursors.up.on('down', () => this.rotatePiece()); // Alternative

    // --- Soft Drop ---
    this.cursors.down.on("down", () => this.handleSoftDrop());
    this.cursors.down.on("up", () => this.resetFallSpeed()); // Optional: return to normal speed
  }

  handleMoveInput(deltaX: number, deltaY: number) {
    this.clearMoveTimer(); // Clear previous timer if any

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
            this.clearMoveTimer(); // Stop if cannot move further
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

  rotatePiece() {
    if (!this.activePiece) return;

    const currentOrientation = this.activePiece.orientation;
    const nextOrientation = (currentOrientation + 1) % 4; // Cycle through 0, 1, 2, 3

    // Check if the rotated position is valid
    if (
      this.isValidPosition(
        this.activePiece.pivotGridX,
        this.activePiece.pivotGridY,
        nextOrientation
      )
    ) {
      this.activePiece.orientation = nextOrientation;
      this.updateActivePiecePositions();
    }
    // TODO: Add wall kicks if desired (more complex)
  }

  handleSoftDrop() {
    if (!this.fallTimer) return;
    // Increase fall speed temporarily
    this.fallTimer.delay = FALL_SPEED / 10; // Make it much faster
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

  // Checks if the piece at the target pivot location and orientation is valid
  isValidPosition(
    pivotX: number,
    pivotY: number,
    orientation: number
  ): boolean {
    if (!this.activePiece) return false; // Should not happen if called correctly

    const { x1, y1, x2, y2 } = this.getPieceGridCoordinates(
      pivotX,
      pivotY,
      orientation
    );

    // Check boundaries and collision with landed blocks for both blocks
    return this.isCellValid(x1, y1) && this.isCellValid(x2, y2);
  }

  // Checks if a single cell is within bounds and not occupied
  isCellValid(x: number, y: number): boolean {
    return (
      x >= 0 &&
      x < GRID_WIDTH &&
      y >= 0 &&
      y < GRID_HEIGHT && // Only check against grid height for landed blocks
      (y < 0 || !this.grid[y] || !this.grid[y][x]) // Allow positions above grid, check grid otherwise
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

    // Important: Update the final gridX/gridY on the blocks themselves
    block1.gridX = x1;
    block1.gridY = y1;
    block2.gridX = x2;
    block2.gridY = y2;

    // Detach blocks from the active piece
    this.activePiece = null;

    // --- NEXT STEPS: Trigger Check for Matches/Clears ---
    // let blocksToCheck = [block1, block2]; // Start checking from the newly landed blocks
    // this.checkForClears(blocksToCheck);
    // If no clears, spawn next piece immediately
    // If clears happen, wait for animations/gravity, then spawn

    console.log("Piece locked. Grid state:", this.grid); // Debug log

    // For now, just spawn the next piece immediately
    this.spawnNewPiece();
    this.setupFallTimer(); // Restart the timer for the new piece
  }

  getFloorCoordinates(activePiece: ActivePiece) {
    const { block1, block2, pivotGridX, pivotGridY, orientation } = activePiece;
    const coordinates = this.getPieceGridCoordinates(
      pivotGridX,
      pivotGridY,
      orientation
    );

    if (
      orientation === BlockOrientation.B1_TOP ||
      orientation === BlockOrientation.B1_BOTTOM
    )
      return {
        ...coordinates,
        block1,
        block2,
      };

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
  // wow, check it! 10
  // index.ts:379 next... 11
  // index.ts:381 verdict! 11
  // index.ts:376 wow, check it! 10
  // index.ts:379 next... 11
  // index.ts:381 verdict! 11

  isNextGridYEmpty(gridX: number, gridY: number) {
    if (gridY >= GRID_HEIGHT) return false;

    const nextGridY = gridY + 1;
    if (!Array.isArray(this.grid[nextGridY])) return false;

    return this.grid[nextGridY][gridX] === null;
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

  // Calculates the grid coordinates of both blocks based on pivot and orientation
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
    this.scene.pause(); // Or restart, show a game over screen, etc.
    if (this.fallTimer) this.fallTimer.remove(false);
    // Display game over text or scene
    this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, "GAME OVER", {
        fontSize: "48px",
        color: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  // --- Debug Drawing ---
  drawGridLines() {
    const graphics = this.add.graphics({
      lineStyle: { width: 1, color: 0x444444 },
    });
    // Vertical lines
    for (let x = 0; x <= GRID_WIDTH; x++) {
      graphics.lineBetween(
        x * CELL_SIZE,
        0,
        x * CELL_SIZE,
        GRID_HEIGHT * CELL_SIZE
      );
    }
    // Horizontal lines
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      graphics.lineBetween(
        0,
        y * CELL_SIZE,
        GRID_WIDTH * CELL_SIZE,
        y * CELL_SIZE
      );
    }
  }

  // update(time: number, delta: number) {
  //   // Most logic is now handled by timers and input events
  // }
}

// Keep the game export the same
export const game = (el: HTMLDivElement) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    width: GRID_WIDTH * CELL_SIZE,
    height: GRID_HEIGHT * CELL_SIZE,
    parent: el,
    scene: MuroTaisen,
    physics: {
      // Enable physics if needed later for effects, but not core logic
      default: "arcade",
      arcade: {
        gravity: { y: 0, x: 0 }, // No global gravity affecting puzzle pieces
        debug: false,
      },
    },
    // Optional: Set background color
    backgroundColor: "#2d2d2d",
  });
