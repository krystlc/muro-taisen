// src/block.ts
import Phaser from "phaser";
import { CELL_SIZE } from "./constants";

export class Block extends Phaser.GameObjects.Sprite {
  public color: number; // Phaser color value
  public hasOrb: boolean;
  public orbColor: number | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    color: number,
    hasOrb: boolean = false,
    orbColor: number | null = null
  ) {
    super(scene, x, y, texture);
    this.color = color;
    this.hasOrb = hasOrb;
    this.orbColor = orbColor;
    this.setTint(color); // Apply color to the sprite
    this.setScale(CELL_SIZE / this.width); // Scale down the sprite
    scene.add.existing(this);
  }

  // You can add methods for block-specific behavior here later
}
