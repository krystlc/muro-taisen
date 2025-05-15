// src/scenes/StartScene.ts
import Phaser from "phaser";
import MuroTaisen from "../muro-taisen.scene";
import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT } from "../constants";

export default class SinglePlayerScene extends Phaser.Scene {
  private playerGame?: MuroTaisen;
  private aiGame?: MuroTaisen;
  // private autoPlayer: AutoPlayer;
  private gameWidth?: number;
  private gameHeight?: number;
  private middleSeparatorX?: number;
  private readonly gameAreaWidth = GRID_WIDTH * CELL_SIZE;

  constructor() {
    super("SinglePlayerScene");
  }

  preload() {
    // Load any assets needed for the start scene here
    this.load.setPath("assets");
    this.load.image("orb", "orb.png");
    this.load.image("block", "block.png");

    // Add a loading event to check the image dimensions
    this.load.on("filecomplete-image-orb", () => {
      const orbTexture = this.textures.get("orb");
      console.log(
        "Orb texture loaded, dimensions:",
        orbTexture.source[0].width,
        "x",
        orbTexture.source[0].height
      );

      // Reset the texture if it's too large
      if (orbTexture.source[0].width > 64 || orbTexture.source[0].height > 64) {
        console.warn("Orb texture is too large, resizing might be needed");
      }
    });
  }

  create() {
    this.gameWidth = this.scale.width;
    this.gameHeight = this.scale.height;
    this.middleSeparatorX = this.gameWidth / 2; // Initial guess, adjust as needed

    // Calculate positions for the two game areas
    const playerGameX = 0;
    const aiGameX = this.gameWidth - this.gameAreaWidth;
    const gameY = (this.gameHeight - GRID_HEIGHT * CELL_SIZE) / 2; // Center vertically

    // Instantiate the player's game
    this.playerGame = new MuroTaisen(this, {
      gridX: playerGameX,
      gridY: gameY,
      sceneKey: "PlayerGameScene", // Unique key for this instance's scene
    });
    this.scene.add(this.playerGame.sceneKey, this.playerGame, true); // Add and start the scene

    // Instantiate the AI's game
    this.aiGame = new MuroTaisen(this, {
      gridX: aiGameX,
      gridY: gameY,
      sceneKey: "AiGameScene", // Unique key for this instance's scene
    });
    this.scene.add(this.aiGame.sceneKey, this.aiGame, true); // Add and start the scene
  }

  update() {
    // Any updates for the start scene can go here
  }
}
