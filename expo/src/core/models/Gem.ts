// Gem types, colors, countdowns
export enum GemColor {
  RED = "RED",
  BLUE = "BLUE",
  YELLOW = "YELLOW",
  GREEN = "GREEN",
  RAINBOW = "RAINBOW",
}

export enum GemType {
  NORMAL = "NORMAL",
  CRASH = "CRASH",
  COUNTER = "COUNTER",
  RAINBOW = "RAINBOW",
}

export interface Gem {
  id: string;
  color: GemColor;
  type: GemType;
  counterValue?: number; // > 0 means frozen with countdown; undefined or <= 0 means thawed/normal
  powerGemId?: string;
  powerWidth?: number;
  powerHeight?: number;
}
