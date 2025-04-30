// frontend/src/game/index.ts
import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT } from "./constants";
import GameOverScene from "./game-over.scene";
import SinglePlayerScene from "./scenes/SinglePlayerScene";
import StartScene from "./start.scene";

export const initGame = (el: HTMLDivElement) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    width: GRID_WIDTH * CELL_SIZE * 3,
    height: GRID_HEIGHT * CELL_SIZE,
    parent: el,
    scene: [StartScene, SinglePlayerScene, GameOverScene],
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
  });
