// src/models/block.ts

/**
 * Defines the color palette for the game blocks.
 * Using specific hex codes for rendering later.
 */
export enum BlockColor {
  EMPTY = "transparent", // Represents an empty cell
  RED = "#E53935",
  BLUE = "#1E88E5",
  GREEN = "#4CAF50",
  YELLOW = "#FFB300",
}

/**
 * Defines the type of block, influencing its behavior.
 */
export enum BlockType {
  EMPTY = "EMPTY",
  NORMAL = "NORMAL", // A standard colored block
  ORB = "ORB", // The exploding orb that triggers chains
}

/**
 * Interface for a single cell on the game grid.
 * This is the minimum required state for serialization to the backend.
 */
export interface IBlock {
  color: BlockColor;
  type: BlockType;
  isLinked: boolean;
  isLocked: boolean; // True if placed on the grid, false if it's a falling piece
}

/**
 * Factory function to easily create an empty block.
 */
export const createEmptyBlock = (): IBlock => ({
  color: BlockColor.EMPTY,
  type: BlockType.EMPTY,
  isLocked: true,
  isLinked: false,
});

/**
 * Factory function to create a normal colored block.
 */
export const createNormalBlock = (color: BlockColor): IBlock => ({
  color,
  type: BlockType.NORMAL,
  isLocked: false,
  isLinked: false,
});

/**
 * Factory function to create an exploding orb.
 */
export const createOrbBlock = (color: BlockColor): IBlock => ({
  color,
  type: BlockType.ORB,
  isLocked: false,
  isLinked: false,
});
