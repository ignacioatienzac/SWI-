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