import { Opponent } from './Opponent';

export class OpponentManager {
  private opponents: Opponent[] = [];

  public addOpponent(opponent: Opponent) {
    this.opponents.push(opponent);
  }

  public getOpponents(): Opponent[] {
    return this.opponents;
  }

  public removeOpponent(id: string) {
    this.opponents = this.opponents.filter((o) => o.id !== id);
  }
}
