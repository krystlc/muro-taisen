import { type CharacterName } from '../../store/useGameStore';

export interface Character {
  accent: string;
  name: CharacterName;
  description: string;
}

export const CHARACTERS: Character[] = [
  { accent: '#56d8ff', name: 'MIZU', description: 'Balanced and ready.' },
  { accent: '#ff6ea8', name: 'KIBA', description: 'Aggressive plays.' },
  { accent: '#ffd166', name: 'RAI', description: 'Total control.' },
  { accent: '#c084fc', name: 'KAGE', description: 'High pressure.' },
  { accent: '#ef4444', name: 'SHIN', description: 'Absolute perfection.' },
  { accent: '#4ade80', name: 'ZARA', description: 'Tactical genius.' },
];
