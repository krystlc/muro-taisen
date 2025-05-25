// src/scenes/StartScene.ts
import Phaser from "phaser";
import { listenToStartSinglePlayer } from "../../events";

export default class SplashScreen extends Phaser.Scene {
  constructor() {
    super("StartScene");
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
    const width = this.scale.width;
    const height = this.scale.height;

    this.add
      .text(width / 2, height / 2, "Ready!", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5);

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

    listenToStartSinglePlayer(() => this.scene.start("SinglePlayerScene"));
  }

  update() {
    // Any updates for the start scene can go here
  }
}
