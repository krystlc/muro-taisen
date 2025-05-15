// src/scenes/StartScene.ts
import Phaser from "phaser";

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    // Load any assets needed for the start scene here
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // "Start Here!" text
    const startText = this.add
      .text(width / 2, height / 2, "Start Here!", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setInteractive();

    startText.on("pointerdown", () => {
      this.scene.start("SinglePlayerScene");
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      this.scene.start("SinglePlayerScene");
    });

    // High score display (we'll need to save and load this later)
    const highScore = localStorage.getItem("highScore");
    if (highScore) {
      this.add
        .text(width / 2, height / 2 + 50, `High Score: ${highScore}`, {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#eee",
          align: "center",
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(width / 2, height / 2 + 50, "No High Score Yet", {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#eee",
          align: "center",
        })
        .setOrigin(0.5);
    }
  }

  update() {
    // Any updates for the start scene can go here
  }
}
