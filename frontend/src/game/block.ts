// src/game/block.ts
import Phaser from "phaser";
import { CELL_SIZE } from "./constants";

// Define possible gem colors (using hex for clarity)
export enum GemColor {
  RED = 0xff0000,
  GREEN = 0x00ff00,
  YELLOW = 0xffff00,
  CYAN = 0x00ffff,
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
  private highlight: Phaser.GameObjects.Graphics | null = null; // Add this property declaration
  private readonly pixelXOffset = 0;

  constructor(
    scene: Phaser.Scene,
    gridX: number,
    gridY: number,
    texture: string,
    gemColor: GemColor,
    blockType: BlockType = BlockType.GEM
  ) {
    // Calculate pixel coordinates from grid coordinates
    const pixelX =
      gridX * CELL_SIZE + CELL_SIZE / 2 + scene.children.parent.gridOffset;
    const pixelY = gridY * CELL_SIZE + CELL_SIZE / 2;

    super(scene, pixelX, pixelY, texture);
    this.pixelXOffset = scene.children.parent.gridOffsetX;

    this.gridX = gridX;
    this.gridY = gridY;
    this.gemColor = gemColor;
    this.blockType = blockType;

    // Different setup based on block type
    if (blockType === BlockType.GEM) {
      // Regular block
      // this.setTexture("block");
      this.setDisplaySize(CELL_SIZE - 2, CELL_SIZE - 2); // Slightly smaller to show grid
    } else {
      // Crash gem (orb)
      // this.setTexture("orb"); // Use same texture for consistency
      this.setDisplaySize(CELL_SIZE - 4, CELL_SIZE - 4); // Slightly smaller
      // Create a circular shape instead
      this.createCrashGemVisual();
    }

    // Apply color tint
    this.setTint(gemColor);

    scene.add.existing(this);
  }

  // Create a circular visual for crash gems
  private createCrashGemVisual() {
    // Create a circle highlight
    this.highlight = this.scene.add.graphics();
    this.updateHighlight();

    // Make the block itself more transparent
    // this.setAlpha(0.2);
  }

  // Update the highlight position
  private updateHighlight() {
    if (!this.highlight) return;

    this.highlight.clear();

    // Draw a white circle border
    this.highlight.lineStyle(2, 0xffffff, 1);
    this.highlight.strokeCircle(this.x, this.y, CELL_SIZE / 2 - 3);

    // Draw a filled circle with the block's color
    this.highlight.fillStyle(this.gemColor, 0.25);
    this.highlight.fillCircle(this.x, this.y, CELL_SIZE / 2 - 4);
  }

  // Helper to update position based on grid coordinates
  updatePosition() {
    this.x = this.pixelXOffset + this.gridX * CELL_SIZE + CELL_SIZE / 2;
    this.y = this.gridY * CELL_SIZE + CELL_SIZE / 2;

    // Update highlight if it exists
    if (this.highlight) {
      this.updateHighlight();
    }
  }

  // Method to flash before destruction
  flash() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      yoyo: true,
      repeat: 3,
      duration: 100,
    });

    return this;
  }

  // Clean up resources when destroyed
  destroy() {
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
  }

  explode() {
    // TODO: maybe add some animation?
    this.destroy();
  }
}
