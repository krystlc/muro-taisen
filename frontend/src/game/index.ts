import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT } from "./constants";
import GameOverScene from "./game-over.scene";
import SinglePlayerScene from "./scenes/SinglePlayerScene";
import StartScene from "./start.scene";

// Game export
export const initGame = (el: HTMLDivElement) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    width: GRID_WIDTH * CELL_SIZE * 3,
    height: GRID_HEIGHT * CELL_SIZE,
    parent: el,
    scene: [StartScene, SinglePlayerScene, GameOverScene],
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false,
      },
    },
    backgroundColor: "#2d2d2d",
  });
