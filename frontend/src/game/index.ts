// frontend/src/game/index.ts
import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT } from "./constants";
import GameOverScene      from "./game-over.scene";
import MuroTaisen         from "./muro-taisen.scene";
import StartScene         from "./start.scene";

export const initGame = (el: HTMLDivElement) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: el,
    backgroundColor: "#2d2d2d",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width:  GRID_WIDTH * CELL_SIZE,
      height: GRID_HEIGHT * CELL_SIZE,
    },
    scene: [StartScene, MuroTaisen, GameOverScene],
    physics: {
      default: "arcade",
      arcade: { gravity: { x:0,y:0 }, debug: false },
    },
  });
