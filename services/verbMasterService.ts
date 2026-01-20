// Service for Verb Master Game - Bubble popping verb conjugation game

export type VerbLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type VerbType = 'regular' | 'irregular' | 'all';
export type GameMode = 'conjugate' | 'identify'; // Mode 1: conjugate, Mode 2: identify

export interface VerbData {
  verb: string;
  tense: string;
  pronoun: string;
  answer: string;
  regular: boolean;
}

export interface BubbleChallenge {
  id: string;
  verb: string;
  pronoun: string;
  conjugated: string;
  mode: GameMode;
  displayText: string; // What shows in the bubble
  correctAnswer: string; // What the player should type
}

// Verb lists by level (A1 verbs are most common/basic)
const VERB_LEVELS: Record<VerbLevel, string[]> = {
  A1: ['ser', 'estar', 'tener', 'hacer', 'ir', 'hablar', 'comer', 'vivir', 'llamar', 'trabajar', 'estudiar', 'mirar', 'escuchar', 'beber', 'escribir', 'leer', 'abrir', 'cerrar', 'necesitar', 'querer'],
  A2: ['poder', 'poner', 'saber', 'salir', 'venir', 'decir', 'dar', 'ver', 'pensar', 'encontrar', 'sentir', 'dormir', 'pedir', 'seguir', 'preferir', 'conocer', 'traer', 'oír', 'caer', 'construir'],
  B1: ['haber', 'deber', 'parecer', 'llegar', 'pasar', 'quedar', 'creer', 'hablar', 'llevar', 'dejar', 'seguir', 'empezar', 'acabar', 'suponer', 'conseguir', 'resultar', 'tratar', 'existir', 'producir', 'cambiar'],
  B2: ['mantener', 'realizar', 'considerar', 'permitir', 'demostrar', 'desarrollar', 'establecer', 'señalar', 'reconocer', 'alcanzar', 'aprovechar', 'defender', 'superar', 'iniciar', 'destacar', 'promover', 'asumir', 'plantear', 'advertir', 'proponer']
};

let verbsCache: VerbData[] | null = null;

// Load verb conjugations from JSON
export async function loadVerbData(): Promise<VerbData[]> {
  if (verbsCache) return verbsCache;
  
  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${baseUrl}data/conjugaciones-verbos.json`);
    if (!response.ok) throw new Error('Failed to load verbs');
    
    const data: VerbData[] = await response.json();
    verbsCache = data;
    return data;
  } catch (error) {
    console.error('Error loading verb data:', error);
    return [];
  }
}

// Filter verbs by level, type, and tense
export async function getFilteredVerbs(
  level: VerbLevel,
  verbType: VerbType,
  tense: string = 'presente'
): Promise<VerbData[]> {
  const allVerbs = await loadVerbData();
  
  // Get verbs for this level
  const levelVerbs = VERB_LEVELS[level];
  
  // Filter by level, tense, and type
  return allVerbs.filter(v => {
    const matchesLevel = levelVerbs.includes(v.verb);
    const matchesTense = v.tense === tense;
    const matchesType = 
      verbType === 'all' ? true :
      verbType === 'regular' ? v.regular :
      !v.regular;
    
    return matchesLevel && matchesTense && matchesType;
  });
}

// Generate a random bubble challenge
export function generateChallenge(
  verbs: VerbData[],
  mode: GameMode
): BubbleChallenge | null {
  if (verbs.length === 0) return null;
  
  const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
  const id = `${Date.now()}_${Math.random()}`;
  
  if (mode === 'conjugate') {
    // Mode 1: Show infinitive + pronoun, player writes conjugation
    return {
      id,
      verb: randomVerb.verb,
      pronoun: randomVerb.pronoun,
      conjugated: randomVerb.answer,
      mode,
      displayText: `${randomVerb.verb}, ${randomVerb.pronoun}`,
      correctAnswer: randomVerb.answer
    };
  } else {
    // Mode 2: Show conjugation, player writes infinitive + pronoun
    return {
      id,
      verb: randomVerb.verb,
      pronoun: randomVerb.pronoun,
      conjugated: randomVerb.answer,
      mode,
      displayText: randomVerb.answer,
      correctAnswer: `${randomVerb.verb}, ${randomVerb.pronoun}`
    };
  }
}

// Validate player's answer
export function validateAnswer(challenge: BubbleChallenge, userInput: string): boolean {
  const normalized = userInput.trim().toLowerCase();
  const correct = challenge.correctAnswer.toLowerCase();
  
  return normalized === correct;
}

// Calculate score based on game level and streak
export function calculateScore(level: number, streak: number): number {
  const baseScore = 10;
  const levelMultiplier = 1 + (level * 0.2);
  const streakBonus = Math.min(streak * 5, 50); // Max 50 bonus
  
  return Math.floor(baseScore * levelMultiplier + streakBonus);
}

// Calculate fall speed based on game level
export function getFallSpeed(level: number): number {
  const baseSpeed = 0.3; // pixels per frame
  const speedIncrease = level * 0.05;
  const maxSpeed = 1.5;
  
  return Math.min(baseSpeed + speedIncrease, maxSpeed);
}

// Calculate spawn rate based on game level (milliseconds between spawns)
export function getSpawnRate(level: number): number {
  const baseRate = 3000; // 3 seconds
  const rateDecrease = level * 150;
  const minRate = 1000; // 1 second minimum
  
  return Math.max(baseRate - rateDecrease, minRate);
}
