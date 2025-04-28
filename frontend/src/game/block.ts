// src/block.ts
import Phaser from "phaser";
import { CELL_SIZE } from "./constants";

// Define possible gem colors (using hex for clarity)
export enum GemColor {
  RED = 0xff0000,
  GREEN = 0x00ff00,
  BLUE = 0x0000ff,
  YELLOW = 0xffff00,
  // Add more colors if needed
}

// Define block types
export enum BlockType {
  GEM, // Normal colored gem
  CRASH_GEM, // Special gem to break others
  // COUNTER_GEM, // Timed garbage blocks (implement later)
  // DIAMOND, // Clears all of one color (implement later)
}

export class Block extends Phaser.GameObjects.Sprite {
  public gridX: number;
  public gridY: number;
  public gemColor: GemColor;
  public blockType: BlockType;
  public isFallingSeparately: boolean = false; // Flag for separated blocks
  // isPartOfActivePiece: boolean = false; // Might be useful later

  constructor(
    scene: Phaser.Scene,
    gridX: number,
    gridY: number,
    texture: string,
    gemColor: GemColor,
    blockType: BlockType = BlockType.GEM
  ) {
    // Calculate pixel coordinates from grid coordinates
    const pixelX = gridX * CELL_SIZE + CELL_SIZE / 2;
    const pixelY = gridY * CELL_SIZE + CELL_SIZE / 2;

    super(scene, pixelX, pixelY, texture);

    this.gridX = gridX;
    this.gridY = gridY;
    this.gemColor = gemColor;
    this.blockType = blockType;

    this.setTint(gemColor); // Apply color tint
    this.setDisplaySize(CELL_SIZE, CELL_SIZE); // Ensure correct size

    scene.add.existing(this);
  }

  // Helper to update position based on grid coordinates
  updatePosition() {
    this.x = this.gridX * CELL_SIZE + CELL_SIZE / 2;
    this.y = this.gridY * CELL_SIZE + CELL_SIZE / 2;
  }
}
