import { create } from "zustand";

export type CharacterName = "MIZU" | "KIBA" | "RAI";
export type DifficultyLabel = "ROOKIE" | "TAISEN" | "MASTER";
export type PlayerRole = "PLAYER" | "CPU";

export interface Player {
  name: string;
  role: PlayerRole;
}

type GameStore = {
  player1: Player;
  player2: Player;
  difficulty: DifficultyLabel;
  setPlayer1Character: (character: CharacterName) => void;
  setPlayer2Character: (name: string) => void;
  setDifficulty: (difficulty: DifficultyLabel) => void;
  resetMatch: () => void;
};

const initialPlayer1: Player = { name: "MIZU", role: "PLAYER" };
const initialPlayer2: Player = { name: "CPU // 01", role: "CPU" };

export const useGameStore = create<GameStore>((set) => ({
  player1: initialPlayer1,
  player2: initialPlayer2,
  difficulty: "TAISEN",
  setPlayer1Character: (name) =>
    set((state) => ({
      player1: { ...state.player1, name },
    })),
  setPlayer2Character: (name) =>
    set((state) => ({
      player2: { ...state.player2, name },
    })),
  setDifficulty: (difficulty) => set({ difficulty }),
  resetMatch: () =>
    set({
      player1: initialPlayer1,
      player2: initialPlayer2,
      difficulty: "TAISEN",
    }),
}));
