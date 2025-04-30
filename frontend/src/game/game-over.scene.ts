// src/scenes/GameOverScene.ts
import Phaser from "phaser";

export default class GameOverScene extends Phaser.Scene {
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private countdown: number = 9;
  private continueText?: Phaser.GameObjects.Text;

  constructor() {
    super("GameOverScene");
  }

  preload() {
    // Load any assets needed for the game over scene here
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add
      .text(width / 2, height / 2 - 50, "Game Over", {
        fontFamily: "Arial",
        fontSize: "48px",
        color: "#f00",
        align: "center",
      })
      .setOrigin(0.5);

    this.continueText = this.add
      .text(width / 2, height / 2 + 20, `Continue? (${this.countdown})`, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setInteractive();

    this.continueText.on("pointerdown", () => {
      this.restartGame();
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      this.restartGame();
    });

    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateCountdown,
      callbackScope: this,
      loop: true,
    });
  }

  updateCountdown() {
    this.countdown--;
    this.continueText?.setText(`Continue? (${this.countdown})`);
    if (this.countdown <= 0) {
      this.countdownTimer?.remove(false);
      this.returnToStartScene();
    }
  }

  restartGame() {
    this.scene.start("MuroTaisen");
  }

  returnToStartScene() {
    this.scene.start("StartScene");
  }

  update() {
    // Any updates for the game over scene can go here
  }
}
