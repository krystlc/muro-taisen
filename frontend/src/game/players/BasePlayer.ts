import MuroTaisen from "../scenes/MuroTaisenScene";

type PlayerConfig = {
  name: string;
  sceneKey: string;
};

export default abstract class BasePlayer {
  readonly scene: Phaser.Scene;
  readonly game: MuroTaisen;
  readonly config: PlayerConfig;

  constructor(scene: Phaser.Scene, game: MuroTaisen, config: PlayerConfig) {
    this.scene = scene;
    this.game = game;
    this.config = config;

    this.scene.registry.set(this.config.sceneKey, this.config.name);
  }
}
