// src/ai/AutoPlayer.ts
import { GRID_HEIGHT, GRID_WIDTH } from "../constants";
import MuroTaisen from "../muro-taisen.scene";

interface AutoPlayerConfig {
  difficulty: "easy" | "medium" | "hard";
  // Add other configuration options as needed (e.g., character type, pattern behavior)
}

export default class AutoPlayer {
  private game: MuroTaisen;
  private config: AutoPlayerConfig;
  private moveTimer: Phaser.Time.TimerEvent | null = null;
  private moveInterval: number;
  private scene: Phaser.Scene; // Store the scene reference

  constructor(scene: Phaser.Scene, game: MuroTaisen, config: AutoPlayerConfig) {
    this.game = game;
    this.config = config;
    this.moveInterval = this.getMoveInterval();
    this.scene = scene; // Get the scene from the MuroTaisen instance
  }

  start() {
    if (!this.moveTimer) {
      this.moveTimer = this.scene.time.addEvent({
        delay: this.moveInterval,
        callback: this.makeStrategicMove, // Changed to a more specific function
        callbackScope: this,
        loop: true,
      });
    }
  }

  stop() {
    if (this.moveTimer) {
      this.moveTimer.remove(false);
      this.moveTimer = null;
    }
  }

  private getMoveInterval(): number {
    switch (this.config.difficulty) {
      case "easy":
        return 1000; // Move every 1 second
      case "medium":
        return 500; // Move every 0.5 seconds
      case "hard":
        return 250; // Move every 0.25 seconds
      default:
        return 750; // Default to medium-ish
    }
  }
  private currentTargetX: number = -1; // Store the current target

  private makeStrategicMove() {
    if (!this.game || !this.game.activePiece) {
      this.currentTargetX = -1; // Reset target if no active piece
      return;
    }

    const { pivotGridX } = this.game.activePiece;
    const bestNewTargetX = this.findBestHorizontalPosition();

    // Hysteresis: Only change target if a significantly better one is found
    if (
      bestNewTargetX !== -1 &&
      (this.currentTargetX === -1 || bestNewTargetX !== this.currentTargetX)
    ) {
      this.currentTargetX = bestNewTargetX;
    }

    if (this.currentTargetX !== -1) {
      if (pivotGridX < this.currentTargetX) {
        this.game.handleMoveInput(1, 0);
      } else if (pivotGridX > this.currentTargetX) {
        this.game.handleMoveInput(-1, 0);
      } else {
        if (Phaser.Math.RND.frac() < 0.3) {
          this.game.rotatePiece();
        }
      }
    } else {
      if (Phaser.Math.RND.frac() < 0.5) {
        this.game.rotatePiece();
      }
    }

    if (this.currentTargetX === pivotGridX && Phaser.Math.RND.frac() < 0.2) {
      this.game.handleSoftDrop();
      this.scene.time.delayedCall(200, this.game.resetFallSpeed, [], this.game);
    }
  }

  private findBestHorizontalPosition(): number {
    let bestX = -1;
    let maxEmptyBelow = -1;

    for (let x = 0; x < GRID_WIDTH; x++) {
      const simulatedPiece = {
        ...this.game.activePiece!,
        pivotGridX: x,
      };

      let emptyBelow = 0;
      const pieceCoordinates = this.game.getPieceGridCoordinates(
        x,
        simulatedPiece.pivotGridY,
        simulatedPiece.orientation
      );

      [pieceCoordinates.x1, pieceCoordinates.x2].forEach((pieceX) => {
        for (
          let y = Math.max(pieceCoordinates.y1, pieceCoordinates.y2) + 1;
          y < GRID_HEIGHT;
          y++
        ) {
          if (this.game.grid[y] && this.game.grid[y][pieceX] === null) {
            emptyBelow++;
          } else {
            break;
          }
        }
      });

      // Simple hysteresis: only update bestX if we find a significantly better one
      if (emptyBelow > maxEmptyBelow) {
        maxEmptyBelow = emptyBelow;
        bestX = x;
      }
    }

    return bestX;
  }

  // Future methods for more intelligent AI:
  // - analyzeGrid()
  // - findBestMove()
  // - emitPattern()
}
