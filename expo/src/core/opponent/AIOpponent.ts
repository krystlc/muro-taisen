import { AIEngine, Move } from '../engine/AIEngine';
import { BoardGrid } from '../engine/Board';
import { Gem } from '../models/Gem';
import { Opponent } from './Opponent';

export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export class AIOpponent implements Opponent {
  public id: string;
  public name: string;
  private difficulty: AIDifficulty;

  constructor(id: string, name: string, difficulty: AIDifficulty) {
    this.id = id;
    this.name = name;
    this.difficulty = difficulty;
  }

  public async getNextMove(grid: BoardGrid, currentPiece: { gem1: Gem; gem2: Gem }): Promise<Move> {
    // Simulate AI thinking time, potentially based on difficulty
    const thinkingTime = this.difficulty === 'EASY' ? 500 : this.difficulty === 'MEDIUM' ? 200 : 50;
    await new Promise((resolve) => setTimeout(resolve, thinkingTime));

    return AIEngine.calculateBestMove(grid, currentPiece);
  }
}
