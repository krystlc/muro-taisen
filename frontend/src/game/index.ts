// src/game/index.ts
import Phaser from "phaser";
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE, FALL_SPEED } from "./constants";
import { Block, GemColor, BlockType } from "./block";
import { MatchingSystem } from "./matching";
import { EffectsManager } from "./effects";

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

class MuroTaisen extends Phaser.Scene {
  private grid: GameGrid = [];
  private activePiece: ActivePiece | null = null;
  private fallTimer: Phaser.Time.TimerEvent | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private moveDelayTimer: Phaser.Time.TimerEvent | null = null; // Prevent instant repeated moves
  private moveRepeatDelay: number = 150; // ms delay for holding key down
  private moveFirstDelay: number = 200; // ms delay before repeat starts
  private matchAnimationPlaying: boolean = false; // Flag to track if match animations are playing
  private score: number = 0;
  private comboCount: number = 0;
  private effectsManager!: EffectsManager;

  constructor() {
    super("MuroTaisen");
  }

  preload() {
    this.load.setPath("assets");
    this.load.image("orb", "orb.png");
    this.load.image("block", "block.png");

    // Add a loading event to check the image dimensions
    this.load.on("filecomplete-image-orb", () => {
      const orbTexture = this.textures.get("orb");
      console.log(
        "Orb texture loaded, dimensions:",
        orbTexture.source[0].width,
        "x",
        orbTexture.source[0].height
      );

      // Reset the texture if it's too large
      if (orbTexture.source[0].width > 64 || orbTexture.source[0].height > 64) {
        console.warn("Orb texture is too large, resizing might be needed");
      }
    });
  }

  create() {
    this.initializeGrid();
    this.cursors = this.input.keyboard?.createCursorKeys();

    // Initialize effects manager
    this.effectsManager = new EffectsManager(this);

    // Setup score text
    this.add
      .text(10, 10, "Score: 0", {
        color: "#ffffff",
        fontSize: "18px",
      })
      .setDepth(10)
      .setName("scoreText");

    // Add combo text (initially hidden)
    this.add
      .text(this.cameras.main.centerX, 80, "", {
        fontSize: "24px",
        color: "#ffff00",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setName("comboText");

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

    const startX = Math.floor(GRID_WIDTH / 2) - 1;
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
    // // --- NEXT STEPS: Trigger Check for Matches/Clears ---
    // let blocksToCheck = [block1, block2]; // Start checking from the newly landed blocks
    // this.processClears(blocksToCheck);
    // // If clears happen, wait for animations/gravity, then spawn

    // // For now, just spawn the next piece immediately
    // this.spawnNewPiece();
    // this.setupFallTimer(); // Restart the timer for the new piece
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
    this.effectsManager.createScorePopup(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      points
    );

    // Show combo effect for 2+ combos
    if (this.comboCount > 1) {
      this.effectsManager.createComboEffect(
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
      const pixelX = block.gridX * CELL_SIZE + CELL_SIZE / 2;
      const pixelY = block.gridY * CELL_SIZE + CELL_SIZE / 2;

      // Create a small localized effect
      if (block.blockType === BlockType.CRASH_GEM) {
        this.effectsManager.createCrashGemEffect(
          pixelX,
          pixelY,
          block.gemColor
        );
      } else {
        this.effectsManager.createMatchClearEffect(
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
   * Finds all connected blocks of the same color starting from a specific block,
   * typically initiated by a Crash Gem. Uses Breadth-First Search (BFS).
   *
   * @param startBlock The block to start the search from (usually a Crash Gem).
   * @param targetColor The color to match.
   * @param visited A Set to keep track of visited blocks during a single clearing phase,
   * passed between calls if multiple Crash Gems trigger clears simultaneously.
   * @returns A Set of all connected blocks (including startBlock) matching targetColor.
   */
  private findConnectedBlocks(
    startBlock: Block,
    targetColor: GemColor,
    visited: Set<Block> // Keep track across searches within the same "clear cycle"
  ): Set<Block> {
    const blocksFound = new Set<Block>();
    const queue: Block[] = [];
    let firstCycle = true;

    // Don't start search if the start block itself was already visited
    // (e.g., part of a group found by another simultaneous crash gem)
    if (visited.has(startBlock)) {
      return blocksFound; // Empty set, already processed
    }

    // Start the search
    queue.push(startBlock);
    visited.add(startBlock);

    // Explore neighbors (Up, Down, Left, Right)
    const neighborsCoords = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 }, // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 }, // Right
    ];

    while (queue.length > 0) {
      const currentBlock = queue.shift()!; // Get the next block to process

      if (!firstCycle) blocksFound.add(currentBlock); // Add it to the result set

      for (const { dx, dy } of neighborsCoords) {
        const nextX = currentBlock.gridX + dx;
        const nextY = currentBlock.gridY + dy;

        // Check if neighbor is within grid bounds
        if (this.isWithinGridBounds(nextX, nextY)) {
          const neighborBlock = this.grid[nextY][nextX];
          console.log({
            dx,
            dy,
            neighborBlock,
            color: neighborBlock ? GemColor[neighborBlock?.gemColor] : null,
          });

          // Check if neighbor exists, matches color, is a Gem/CrashGem, hasn't been visited yet
          if (
            neighborBlock &&
            !visited.has(neighborBlock) &&
            neighborBlock.gemColor === targetColor
          ) {
            visited.add(neighborBlock); // Mark as visited for this entire clear cycle
            queue.push(neighborBlock); // Add to queue for processing
          }
        }
      }

      if (
        firstCycle &&
        currentBlock.blockType === BlockType.GEM &&
        queue.every((b) => b.blockType === BlockType.GEM)
      ) {
        queue.length = 0;
      }

      if (firstCycle && queue.length) {
        blocksFound.add(currentBlock);
      }

      firstCycle = false;
      // If currentBlock is not the target color or type, we simply don't add it or search its neighbors
      // for this specific color group, but it remains marked as 'visited' for this cycle
      // if it was added to the queue by a valid neighbor previously.
    }

    return blocksFound;
  }

  /**
   * Checks for and processes block clears triggered by newly landed blocks.
   * @param landedBlocks The specific blocks that just finished falling/locking.
   */
  private processClears(landedBlocks: Block[]) {
    console.log(
      "Checking clears for landed blocks:",
      landedBlocks.map(
        (b) =>
          `${BlockType[b.blockType]}(${GemColor[b.gemColor]})@(${b.gridX},${
            b.gridY
          })`
      )
    );

    const allBlocksToClear = new Set<Block>();
    const visitedDuringCycle = new Set<Block>(); // Tracks all visited blocks in this clear cycle

    // 2. For each triggering Crash Gem, find its connected group
    for (const originBlock of landedBlocks) {
      // Skip if this gem was already cleared by another simultaneous gem's search
      if (allBlocksToClear.has(originBlock)) continue;

      const targetColor = originBlock.gemColor;
      console.log(
        `Searching from Crash Gem @(${originBlock.gridX},${originBlock.gridY}) for color ${GemColor[targetColor]}`
      );

      // Perform the search. Pass the visited set so searches don't overlap wastefully.
      const group = this.findConnectedBlocks(
        originBlock,
        targetColor,
        visitedDuringCycle
      );

      // Add the found group to the main set of blocks to clear
      group.forEach((block) => allBlocksToClear.add(block));
    }

    // 3. Check if any blocks were actually marked for clearing
    if (allBlocksToClear.size === 0) {
      console.log("Crash gems landed but found no matching blocks to clear.");
      // Crash gem landed but didn't connect to anything of its color.
      return; // Nothing to clear
    }

    console.log(`Found ${allBlocksToClear.size} blocks to clear.`);

    // --- TODO: Add scoring logic based on size/chains here ---

    // 4. Clear the blocks
    this.clearBlocksFromGrid(allBlocksToClear);

    // --- NEXT STEPS after clearing ---
    // 5. Trigger Gravity (Needs implementation)
    // this.applyGravity(); // This function would handle falling blocks and return if anything moved

    // 6. Check for Chain Reactions (Needs implementation)
    // After gravity, if blocks fell, call processClears() again?
    // This needs careful state management to avoid infinite loops and ensure
    // spawning only happens after everything settles.

    // For now, assume no gravity/chains and proceed to spawn
    console.log("Clearing finished. Proceeding to spawn.");
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

    // Create a semi-transparent background for the game over message
    this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width * 0.8,
        this.cameras.main.height * 0.5,
        0x000000,
        0.7
      )
      .setOrigin(0.5);

    // Display game over text with proper positioning
    this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 50,
        "GAME OVER",
        {
          fontSize: "32px",
          color: "#ff0000",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    // Add final score display with proper positioning
    this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        `Score: ${this.score}`,
        {
          fontSize: "24px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5);

    // Add restart button with proper positioning
    const restartButton = this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 50,
        120,
        40,
        0x660066
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restartButton.on("pointerdown", () => {
      this.score = 0;
      this.comboCount = 0;
      this.scene.restart();
    });
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
}

// Game export
export const game = (el: HTMLDivElement) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    width: GRID_WIDTH * CELL_SIZE,
    height: GRID_HEIGHT * CELL_SIZE,
    parent: el,
    scene: MuroTaisen,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false,
      },
    },
    backgroundColor: "#2d2d2d",
  });
