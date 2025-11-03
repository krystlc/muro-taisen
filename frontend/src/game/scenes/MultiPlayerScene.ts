// src/scenes/StartScene.ts
import Phaser from "phaser";
import { WebSocketClient } from "../../websocket";

export default class MultiPlayerScene extends Phaser.Scene {
  private wsClient!: WebSocketClient;

  constructor() {
    super("MultiPlayerScene");
  }

  preload() {
    // Load any assets needed for the start scene here
  }

  create() {
    // Listen for general WebSocket messages
    this.wsClient.events.on("websocket/message", (data: any) => {
      console.log("GameScene: Raw WebSocket message:", data);
      // This is where you might dispatch to sub-systems based on data.type
    });

    // Listen for specific message types
    this.wsClient.events.on("websocket/player_moved", (data: any) => {
      console.log("GameScene: Player moved:", data);
      // Update player sprite position
    });

    this.wsClient.events.on("websocket/game_state_update", (data: any) => {
      console.log("GameScene: Game state updated:", data);
      // Reconcile game state, update UI, etc.
    });

    this.wsClient.events.on("websocket/open", () => {
      console.log("GameScene: WebSocket connection established!");
      this.wsClient.send(
        JSON.stringify({ type: "player_joined", playerId: "player123" })
      );
    });

    this.wsClient.events.on(
      "websocket/close",
      (details: { code: number; reason: string }) => {
        console.log("GameScene: WebSocket connection closed.", details);
        // Show "reconnecting..." message or main menu
      }
    );

    // Example: User input in Phaser
    this.input.keyboard?.on("keydown-W", () => {
      this.wsClient.send(
        JSON.stringify({ type: "input/move_up", playerId: "player123" })
      );
    });

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
