import { Move } from '../engine/AIEngine';
import { BoardGrid } from '../engine/Board';
import { Gem } from '../models/Gem';
import { Opponent } from './Opponent';

export class RemoteOpponent implements Opponent {
  public id: string;
  public name: string;
  private socket: any; // Placeholder for WebSocket connection

  constructor(id: string, name: string, socket: any) {
    this.id = id;
    this.name = name;
    this.socket = socket;
  }

  public async getNextMove(grid: BoardGrid, currentPiece: { gem1: Gem; gem2: Gem }): Promise<Move> {
    // In a real implementation, this would wait for the remote player's move
    // via the socket and resolve when the move is received.
    throw new Error('Remote opponent logic not yet implemented');
  }
}
