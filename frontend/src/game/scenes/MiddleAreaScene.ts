// src/scenes/MiddleAreaScene.ts
import Phaser from "phaser";
import { CELL_SIZE, GRID_HEIGHT, GRID_WIDTH } from "../constants";

export default class MiddleAreaScene extends Phaser.Scene {
  constructor() {
    super("MiddleAreaScene");
  }

  preload() {
    // Load character sprites here
  }

  create() {
    const middleX = this.scale.width / 2;
    const middleY = this.scale.height / 2;

    this.add
      .text(
        middleX,
        middleY - 32,
        this.registry.get("player1Name") || "Player 1",
        {
          fontSize: 24,
          color: "#fff",
        }
      )
      .setOrigin(0.5);

    this.add.text(middleX, middleY, "VS", { fontSize: 16 }).setOrigin(0.5);

    this.add
      .text(
        middleX,
        middleY + 32,
        this.registry.get("player2Name") || "Opponent",
        {
          fontSize: 24,
          color: "#fff",
        }
      )
      .setOrigin(0.5);

    this.add
      .sprite(middleX - 100, GRID_HEIGHT * CELL_SIZE - 64, "character1")
      .setScale(2);
    this.add
      .sprite(middleX + 100, GRID_HEIGHT * CELL_SIZE - 64, "character2")
      .setScale(2);

    // ... any animation setup

    this.scene.bringToTop(); // Ensure it's above other scenes if needed
  }

  update(time: number, delta: number) {
    // Handle any animations or dynamic updates here
  }
}
