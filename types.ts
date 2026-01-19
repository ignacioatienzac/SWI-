export enum View {
  HOME = 'HOME',
  RESOURCES = 'RESOURCES',
  GAMES = 'GAMES'
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: 'Grammar' | 'Vocabulary' | 'Culture';
  link: string;
}

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  iconName: string;
  isAiPowered: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface VerbChallenge {
  verb: string;
  tense: string;
  pronoun: string;
  answer: string;
  translation: string;
}

export interface SecretWord {
  word: string;
  hint: string;
  translation: string;
}

// Power of Verbs Game Types
export interface PowerVerb {
  verb: string;
  tense: string;
  mode?: string; // Optional, defaults to 'indicativo'
  pronoun: string;
  answer: string | string[]; // Can be a single string or array of valid answers
  regular: boolean;
}

export type GameDifficulty = 'facil' | 'intermedio' | 'dificil';
export type GameMode = 'write' | 'choice';
export type BattleMode = 'contrarreloj' | 'jefe';
