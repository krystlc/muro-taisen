import Phaser from "phaser";
import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT, FALL_SPEED } from "./constants";
import { Block } from "./block";

class MuroTaisen extends Phaser.Scene {
  private grid: number[][] = []; // Representing the solid mass
  private fallingBlocks?: Phaser.GameObjects.Group;
  private nextFallingBlocks?: Phaser.GameObjects.Group;
  private fallTimer?: Phaser.Time.TimerEvent;
  private blockColors: number[] = [
    0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
  ]; // Example colors
  private solidMassGroup?: Phaser.GameObjects.Group; // To hold landed blocks visually

  constructor() {
    super("MuroTaisen");
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath("assets");

    this.load.image("block", "block.png");
  }

  create() {
    this.grid = Array.from({ length: GRID_HEIGHT }, () =>
      Array(GRID_WIDTH).fill(0)
    );
    this.fallingBlocks = this.add.group();
    this.nextFallingBlocks = this.add.group();
    this.solidMassGroup = this.add.group(); // Initialize the group for landed blocks

    this.spawnNewBlocks();
    this.spawnNextBlocksPreview(); // We'll implement this later

    this.fallTimer = this.time.addEvent({
      delay: FALL_SPEED,
      callback: this.moveFallingBlocksDown,
      callbackScope: this,
      loop: true,
    });
  }

  update(time: number, delta: number) {
    this.drawSolidMass(); // Call this function to render the solid mass
    // Handle user input and game logic here
  }

  spawnNewBlocks() {
    if (!this.fallingBlocks) return;
    // Logic to create a new pair of falling blocks (with potential orbs and different colors)
    // and add them to the 'fallingBlocks' group.
    console.log("Spawning new blocks");
    // Destroy any existing falling blocks
    this.fallingBlocks.clear(true, true);

    const startX = GRID_WIDTH / 2 - 1; // Start in the middle (horizontally)
    const startY = 0;

    // Create the first block
    const color1 = Phaser.Math.RND.pick(this.blockColors);
    const hasOrb1 = Phaser.Math.RND.frac() < 0.3; // 30% chance of having an orb
    const orbColor1 = hasOrb1 ? Phaser.Math.RND.pick(this.blockColors) : null;
    const block1 = new Block(
      this,
      (startX + 0.5) * CELL_SIZE,
      (startY + 0.5) * CELL_SIZE,
      "block",
      color1,
      hasOrb1,
      orbColor1
    );
    this.fallingBlocks.add(block1);

    // Create the second block (attached to the first)
    const color2 = Phaser.Math.RND.pick(this.blockColors);
    const hasOrb2 = Phaser.Math.RND.frac() < 0.3;
    const orbColor2 = hasOrb2 ? Phaser.Math.RND.pick(this.blockColors) : null;
    const block2 = new Block(
      this,
      (startX + 1.5) * CELL_SIZE,
      (startY + 0.5) * CELL_SIZE,
      "block",
      color2,
      hasOrb2,
      orbColor2
    );
    this.fallingBlocks.add(block2);

    // We might need to store the relative positions of these blocks for rotation later
    // For now, they are side-by-side at the top.
  }

  spawnNextBlocksPreview() {
    // Logic to display the next pair of blocks
  }

  moveFallingBlocksDown() {
    if (!this.fallingBlocks) return;
    // Logic to move the 'fallingBlocks' group down by one cell.
    let canMove = true;
    this.fallingBlocks.getChildren().forEach((child) => {
      const block = child as Block; // Type assertion
      const nextY = block.y + CELL_SIZE;
      const gridY = Math.floor(block.y / CELL_SIZE);
      if (
        gridY >= GRID_HEIGHT - 1 ||
        this.checkSolidCollision(block.x, nextY)
      ) {
        canMove = false;
      }
    });

    if (canMove) {
      Phaser.Actions.IncY(this.fallingBlocks.getChildren(), CELL_SIZE);
      return;
    }
    if (this.fallTimer) {
      this.placeFallingBlocksOnGrid();
      this.time.removeEvent(this.fallTimer); // Stop the fall timer
      this.spawnNewBlocks(); // Spawn the next block immediately
      this.fallTimer = this.time.addEvent({
        // Restart the timer for the new blocks
        delay: FALL_SPEED,
        callback: this.moveFallingBlocksDown,
        callbackScope: this,
        loop: true,
      });
    }
  }

  checkSolidCollision(x: number, y: number): boolean {
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);

    // Check if the potential next position is within the grid bounds
    if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
      return this.grid[gridY][gridX] !== 0; // Check if that grid cell is already occupied
    }
    // If it's out of bounds (e.g., below the bottom), consider it a collision
    return gridY >= GRID_HEIGHT;
  }

  placeFallingBlocksOnGrid() {
    if (!this.fallingBlocks) return;
    this.fallingBlocks.getChildren().forEach((child) => {
      const block = child as Block;
      const gridX = Math.floor(block.x / CELL_SIZE);
      const gridY = Math.floor(block.y / CELL_SIZE);
      if (
        gridY >= 0 &&
        gridY < GRID_HEIGHT &&
        gridX >= 0 &&
        gridX < GRID_WIDTH &&
        this.solidMassGroup
      ) {
        this.grid[gridY][gridX] = block.color; // Store the color in the grid

        const landedBlock = new Block(
          this,
          gridX * CELL_SIZE + CELL_SIZE / 2,
          gridY * CELL_SIZE + CELL_SIZE / 2,
          "block",
          block.color,
          block.getHasOrb(),
          block.getOrbColor()
        );
        this.solidMassGroup.add(landedBlock);

        const orbColor = block.getOrbColor();
        // Check for explosion if the landed block had an orb
        if (block.getHasOrb() && orbColor !== null) {
          this.checkForOrbExplosion(gridX, gridY, orbColor);
        }
      }
      block.destroy(true); // Destroy the falling block sprite after it has landed
    });
    this.fallingBlocks.clear(true, true); // Clear the falling blocks group
  }

  drawSolidMass() {
    // We might not need this if we are creating sprites in place
    // For now, let's keep it empty.
  }

  checkForOrbExplosion(startX: number, startY: number, orbColor: number) {
    const visited: boolean[][] = Array.from({ length: GRID_HEIGHT }, () =>
      Array(GRID_WIDTH).fill(false)
    );
    const connectedBlocks: { x: number; y: number }[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { x, y } = current;

      if (
        x < 0 ||
        x >= GRID_WIDTH ||
        y < 0 ||
        y >= GRID_HEIGHT ||
        visited[y][x] ||
        this.grid[y][x] !== orbColor
      ) {
        continue;
      }

      visited[y][x] = true;
      connectedBlocks.push({ x, y });

      // Explore adjacent cells
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x: x, y: y + 1 });
      queue.push({ x: x, y: y - 1 });
    }

    if (connectedBlocks.length >= 1) {
      // Explode even if it's just the landed block
      this.explodeBlocks(connectedBlocks);
    }
  }

  explodeBlocks(blocksToRemove: { x: number; y: number }[]) {
    console.log("ex!", blocksToRemove);
    blocksToRemove.forEach((blockToRemove) => {
      if (!this.solidMassGroup) return;

      const { x, y } = blockToRemove;
      this.grid[y][x] = 0; // Clear the grid cell

      // Find and destroy the corresponding visual block in the solidMassGroup
      this.solidMassGroup.getChildren().forEach((solidBlock) => {
        const sb = solidBlock as Block;
        const blockGridX = Math.floor(sb.x / CELL_SIZE);
        const blockGridY = Math.floor(sb.y / CELL_SIZE);
        if (blockGridX === x && blockGridY === y) {
          sb.destroy(true);
        }
      });
    });

    // Award points for the explosion
    this.updateScore(blocksToRemove.length);

    // Check for chain reactions (we'll implement this later)
    this.checkForChainReactions();
  }

  updateScore(points: number) {
    console.log(`Scored ${points} points!`);
    // Implement actual score updating UI later
  }

  checkForChainReactions() {
    // Implement logic to check for new solid connections and potential chain explosions
  }
}

export const game = (el: HTMLDivElement) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: GRID_WIDTH * CELL_SIZE,
    height: GRID_HEIGHT * CELL_SIZE,
    parent: el,
    scene: MuroTaisen,
  });
};
