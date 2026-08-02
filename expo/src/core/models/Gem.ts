// Gem types, colors, countdowns
export enum GemColor {
  RED = 'RED',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  RAINBOW = 'RAINBOW',
}

export enum GemType {
  NORMAL = 'NORMAL',
  CRASH = 'CRASH',
  COUNTER = 'COUNTER',
  RAINBOW = 'RAINBOW',
}

export interface Gem {
  id: string;
  color: GemColor;
  type: GemType;
  counterValue?: number; // For COUNTER type (e.g. 5 to 0)
  powerGemId?: string;   // Group ID if part of a merged Power Gem
  powerWidth?: number;   // Width if anchor of Power Gem
  powerHeight?: number;  // Height if anchor of Power Gem
}
