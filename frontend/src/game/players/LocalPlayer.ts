import MuroTaisen from "../scenes/MuroTaisenScene";
import BasePlayer from "./BasePlayer";

export default class LocalPlayer extends BasePlayer {
  constructor(scene: Phaser.Scene, game: MuroTaisen) {
    super(scene, game, { name: "Enzo", sceneKey: "player1" });

    this.setupInput();
  }

  // --- Input Handling ---
  setupInput() {
    if (!this.game.cursors) return;

    // --- Horizontal Movement ---
    this.game.cursors.left.on("down", () => this.game.handleMoveInput(-1, 0));
    this.game.cursors.right.on("down", () => this.game.handleMoveInput(1, 0));

    // Stop repeating when key is released
    this.game.cursors.left.on("up", () => this.game.clearMoveTimer());
    this.game.cursors.right.on("up", () => this.game.clearMoveTimer());

    // --- Rotation ---
    this.game.input.keyboard?.on("keydown-SPACE", () =>
      this.game.rotatePiece()
    );
    this.game.input.keyboard?.on("keydown-Z", () =>
      this.game.rotatePieceCounterClockwise()
    );
    this.game.cursors.up.on("down", () => this.game.rotatePiece()); // Alternative

    // --- Soft Drop ---
    this.game.cursors.down.on("down", () => this.game.handleSoftDrop());
    this.game.cursors.down.on("up", () => this.game.resetFallSpeed());
  }
}
