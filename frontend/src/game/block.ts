// src/block.ts
import Phaser from "phaser";
import { CELL_SIZE } from "./constants";

export class Block extends Phaser.GameObjects.Sprite {
  public color: number; // Phaser color value

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
    this.setTint(color); // Apply color to the sprite
    this.setScale(CELL_SIZE / this.width); // Scale down the sprite

    scene.add.existing(this);

    this.setData("hasOrb", hasOrb);
    this.setData("orbColor", orbColor);
  }

  getHasOrb(): boolean {
    return this.getData("hasOrb");
  }

  getOrbColor(): number | null {
    return this.getData("orbColor");
  }
}
