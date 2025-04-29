// src/game/effects.ts
import Phaser from "phaser";
import { GemColor } from "./block";
import { CELL_SIZE } from "./constants";

export class EffectsManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a match clear effect at the specified location
   */
  createMatchClearEffect(x: number, y: number, color: GemColor) {
    // Create a small flash effect instead of particles
    const flash = this.scene.add.circle(x, y, CELL_SIZE / 2 - 2, color, 0.8);

    // Animate and remove
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.2,
      duration: 300,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * Create a crash gem explosion effect
   */
  createCrashGemEffect(x: number, y: number, color: GemColor) {
    // Create a small circular effect that doesn't fill the screen
    const circle = this.scene.add.circle(x, y, CELL_SIZE / 2, color, 0.6);

    // Expand slightly then fade out
    this.scene.tweens.add({
      targets: circle,
      radius: CELL_SIZE,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        circle.destroy();
      },
    });

    // Add a few small particles rather than screen-filling ones
    const directions = [0, 90, 180, 270]; // Right, Down, Left, Up

    directions.forEach((dir) => {
      // Create small line in each direction
      const line = this.scene.add
        .rectangle(x, y, CELL_SIZE, 4, color)
        .setAlpha(0.7)
        .setOrigin(0.5, 0.5)
        .setAngle(dir);

      // Animate the line stretching out
      this.scene.tweens.add({
        targets: line,
        scaleX: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          line.destroy();
        },
      });
    });
  }

  /**
   * Create floating score text
   */
  createScorePopup(x: number, y: number, score: number) {
    const text = this.scene.add
      .text(x, y, `+${score}`, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Animate the text floating up
    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        text.destroy();
      },
    });
  }

  /**
   * Create a combo text effect
   */
  createComboEffect(x: number, y: number, comboCount: number) {
    if (comboCount < 2) return; // Only show for 2+ combos

    const text = this.scene.add
      .text(x, y, `${comboCount}x COMBO`, {
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Simple animation
    this.scene.tweens.add({
      targets: text,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      ease: "Sine.easeOut",
    });

    // Fade out and remove
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      delay: 800,
      duration: 300,
      onComplete: () => {
        text.destroy();
      },
    });
  }
}
