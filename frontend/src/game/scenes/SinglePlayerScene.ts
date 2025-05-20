// src/scenes/StartScene.ts
import Phaser from "phaser";
import MuroTaisen from "../muro-taisen.scene";
import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT } from "../constants";
import AutoPlayer from "../players/AutoPlayer";
import LocalPlayer from "../players/LocalPlayer";

export default class SinglePlayerScene extends Phaser.Scene {
  private player1Game: MuroTaisen | null = null;
  private player2Game: MuroTaisen | null = null;
  // @ts-ignore
  private localPlayer: LocalPlayer | null = null;
  private autoPlayer: AutoPlayer | null = null;
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
    if (this.player1Game && this.player2Game) {
      this.scene.remove(this.player1Game.sceneKey);
      this.scene.remove(this.player2Game.sceneKey);
      this.player1Game = null;
      this.player2Game = null;
    }

    this.gameWidth = this.scale.width;
    this.gameHeight = this.scale.height;

    // Calculate positions for the two game areas
    const playerGameX = 0;
    const aiGameX = this.gameWidth - this.gameAreaWidth;
    const gameY = (this.gameHeight - GRID_HEIGHT * CELL_SIZE) / 2; // Center vertically

    // Instantiate the player's game
    this.player1Game = new MuroTaisen(this, {
      gridX: playerGameX,
      gridY: gameY,
      sceneKey: "PlayerGameScene", // Unique key for this instance's scene
    });

    // Instantiate the AI's game
    this.player2Game = new MuroTaisen(this, {
      gridX: aiGameX,
      gridY: gameY,
      sceneKey: "AiGameScene", // Unique key for this instance's scene
    });

    this.scene.add(this.player1Game.sceneKey, this.player1Game, true); // Add and start the scene
    this.scene.add(this.player2Game.sceneKey, this.player2Game, true); // Add and start the scene

    this.player1Game.events.on(
      "attack",
      this.player2Game.handleAttack,
      this.player2Game
    );
    this.player2Game.events.on(
      "attack",
      this.player1Game.handleAttack,
      this.player1Game
    );

    this.player1Game.events.on("game-over", this.handleGameOver.bind(this));
    this.player2Game.events.on("game-over", this.handleWin.bind(this));

    this.localPlayer = new LocalPlayer(this, this.player1Game, {
      name: "Enzo",
    });
    this.autoPlayer = new AutoPlayer(this, this.player2Game, {
      difficulty: "easy",
    });
    this.autoPlayer.start();
  }

  handleGameOver() {
    console.error("GAME OVER");
    this.pauseGames();
    this.scene.start("GameOverScene");
  }

  pauseGames() {
    [this.player1Game, this.player2Game]
      .filter((game) => !!game)
      .forEach((game) => {
        game.scene.pause();
        game.cameras.main.alpha = 0.25;
      });
  }

  handleWin() {
    console.log("YOU WIN!");
    this.pauseGames();

    const highScore = localStorage.getItem("highScore");
    const currentHighScore = highScore ? parseInt(highScore, 10) : 0;

    const score = this.player1Game?.getScore() ?? 0;
    if (score > currentHighScore) {
      localStorage.setItem("highScore", String(score));
      console.log(`New High Score: ${score}`);
    }

    this.scene.start("StartScene");
  }

  update() {
    // Any updates for the start scene can go here
  }
}
