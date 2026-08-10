// Attack patterns, portrait paths, monologues
// src/core/plugins/CharacterRegistry.ts
import { GemColor } from "../models/Gem";

export interface CharacterConfig {
  id: string;
  name: string;
  avatarUrl: string;
  model3DPath: string;
  // 6-column attack pattern array sent to opponent as counter gems
  attackPattern: GemColor[][];
  monologues: {
    intro: string;
    win: string;
    loss: string;
  };
}

export const RyuCharacter: CharacterConfig = {
  id: "ryu",
  name: "Ryu",
  avatarUrl: "assets/portraits/ryu.png",
  model3DPath: "assets/models/ryu.glb",
  // Classic Ryu Pattern: Solid columns of same colors
  attackPattern: [
    [GemColor.RED, GemColor.RED, GemColor.RED, GemColor.RED],
    [GemColor.BLUE, GemColor.BLUE, GemColor.BLUE, GemColor.BLUE],
    [GemColor.YELLOW, GemColor.YELLOW, GemColor.YELLOW, GemColor.YELLOW],
    [GemColor.GREEN, GemColor.GREEN, GemColor.GREEN, GemColor.GREEN],
    [GemColor.RED, GemColor.RED, GemColor.RED, GemColor.RED],
    [GemColor.BLUE, GemColor.BLUE, GemColor.BLUE, GemColor.BLUE],
  ],
  monologues: {
    intro: "The true path of a warrior requires focus!",
    win: "You must defeat my Dragon Punch to stand a chance!",
    loss: "My training... was not enough.",
  },
};

export class CharacterRegistry {
  private static characters: Map<string, CharacterConfig> = new Map([
    [RyuCharacter.id, RyuCharacter],
  ]);

  public static registerCharacter(config: CharacterConfig) {
    this.characters.set(config.id, config);
  }

  public static getCharacter(id: string): CharacterConfig {
    const char = this.characters.get(id);
    if (!char) throw new Error(`Character ${id} not found in registry.`);
    return char;
  }
}
