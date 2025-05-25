// frontend/src/game/index.ts
import { GRID_WIDTH, CELL_SIZE, GRID_HEIGHT } from "./constants";
import GameOverScene from "./scenes/GameOverScene";
import MultiPlayerScene from "./scenes/MultiPlayerScene";
import SinglePlayerScene from "./scenes/SinglePlayerScene";
import SplashScreen from "./scenes/SplashScreen";

const width = GRID_WIDTH * CELL_SIZE * 3;
const height = GRID_HEIGHT * CELL_SIZE;

export const initGame = (el: HTMLDivElement) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: el,
    backgroundColor: "#1c398e",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    width,
    height,
    scene: [SplashScreen, SinglePlayerScene, MultiPlayerScene, GameOverScene],
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
  });
