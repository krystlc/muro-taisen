import { Move } from "../engine/AIEngine";
import { BoardGrid } from "../engine/Board";
import { Gem } from "../models/Gem";

export interface Opponent {
  id: string;
  name: string;
  getNextMove: (
    grid: BoardGrid,
    currentPiece: { gem1: Gem; gem2: Gem },
  ) => Promise<Move>;
}
