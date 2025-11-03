import { GRID_WIDTH } from "@/core/shared";
import { IBlock, BlockColor, createNormalBlock } from "./block";

export interface IFallingPiece {
  // --- Block A (Anchor) ---
  blockA: IBlock;
  rowA: number;
  colA: number;

  // --- Block B (Attached/Movable) ---
  blockB: IBlock;
  rowB: number;
  colB: number;

  isLocked: boolean; // True when both blocks have landed
}

/**
 * Creates a standard falling piece, always starting as a vertical pair.
 */
export const createFallingPiece = (
  colorA: BlockColor,
  colorB: BlockColor,
  isOrb: boolean = false,
): IFallingPiece => {
  const startCol = Math.floor(GRID_WIDTH / 2) - 1;

  // By convention, Block A is the one that lands/locks first (the anchor)
  const piece: IFallingPiece = {
    // Block A starts one row below Block B (i.e., Block B is on top)
    blockA: createNormalBlock(colorB), // Bottom Block
    rowA: 0,
    colA: startCol,

    blockB: createNormalBlock(colorA), // Top Block (The one the player can swap around)
    rowB: -1, // Start off the top of the grid
    colB: startCol,

    isLocked: false,
  };

  // We need to implement the ORB logic here, or later when assigning piece types.
  // For simplicity, let's keep it defined by the GameEngine for now.
  return piece;
};
