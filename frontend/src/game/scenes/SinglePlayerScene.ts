// src/scenes/StartScene.ts
import Phaser from "phaser";
import MuroTaisen from "../muro-taisen.scene";
import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT } from "../constants";

export default class SinglePlayerScene extends Phaser.Scene {
  private player1Game?: MuroTaisen;
  private player2Game?: MuroTaisen;
  // private autoPlayer: AutoPlayer;
  private gameWidth?: number;
  private gameHeight?: number;
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

    // Calculate positions for the two game areas
    const playerGameX = 0;
    const aiGameX = this.gameWidth - this.gameAreaWidth;
    const gameY = (this.gameHeight - GRID_HEIGHT * CELL_SIZE) / 2; // Center vertically

    // Instantiate the player's game
    if (this.player1Game) {
      this.scene.start("PlayerGameScene");
    } else {
      this.player1Game = new MuroTaisen(this, {
        gridX: playerGameX,
        gridY: gameY,
        sceneKey: "PlayerGameScene", // Unique key for this instance's scene
      });
      this.scene.add(this.player1Game.sceneKey, this.player1Game, true); // Add and start the scene
      this.player1Game.events.on(
        "blocksCleared",
        this.calculateDump(this.player1Game.sceneKey)
      );
    }

    if (this.player2Game) {
      this.scene.start("AiGameScene");
    } else {
      // Instantiate the AI's game
      this.player2Game = new MuroTaisen(this, {
        gridX: aiGameX,
        gridY: gameY,
        sceneKey: "AiGameScene", // Unique key for this instance's scene
      });
      this.scene.add(this.player2Game.sceneKey, this.player2Game, true); // Add and start the scene
      this.player1Game.events.on(
        "blocksCleared",
        this.calculateDump(this.player2Game.sceneKey)
      );
    }
  }

  private calculateDump(clearingSceneKey: string) {
    return (clearedCount: number) => {
      const garbageToSend = Math.floor(clearedCount / 3); // Example scaling

      if (clearingSceneKey === this.player1Game?.sceneKey) {
        this.player2Game?.receiveGarbageBlocks(garbageToSend);
      } else if (clearingSceneKey === this.player2Game?.sceneKey) {
        this.player1Game?.receiveGarbageBlocks(garbageToSend);
      }
    };
  }

  update() {
    // Any updates for the start scene can go here
  }
}
