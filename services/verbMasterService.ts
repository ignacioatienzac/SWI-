// Service for Verb Master Game - Bubble popping verb conjugation game

import { createSRSPool, getConjugationId, loadSRSData, recordCorrectAnswer, recordIncorrectAnswer, saveSRSData, initializeConjugation } from "./srsService";

export type VerbLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type VerbType = 'regular' | 'irregular' | 'all';
export type VerbMode = 'indicativo' | 'subjuntivo' | 'imperativo';
export type GameMode = 'conjugate'; // Only conjugate mode

export interface VerbData {
  verb: string;
  tense: string;
  pronoun: string;
  answer: string;
  regular: boolean;
  mode?: string; // Optional: 'subjuntivo', 'imperativo'. If not present, it's indicativo
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

/**
 * Fisher-Yates shuffle algorithm for uniform random distribution
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

// Filter verbs by level, type, tense, and mode
// Returns a shuffled array for uniform distribution
export async function getFilteredVerbs(
  level: VerbLevel,
  verbType: VerbType,
  tense: string = 'presente',
  verbMode: VerbMode = 'indicativo'
): Promise<VerbData[]> {
  const allVerbs = await loadVerbData();
  
  // Get verbs for this level
  const levelVerbs = VERB_LEVELS[level];
  
  // Filter by level, tense, type, and mode
  const filtered = allVerbs.filter(v => {
    const matchesLevel = levelVerbs.includes(v.verb);
    const matchesTense = v.tense === tense;
    const matchesType = 
      verbType === 'all' ? true :
      verbType === 'regular' ? v.regular :
      !v.regular;
    
    // Filter by mode: indicativo has no 'mode' field, subjuntivo/imperativo have 'mode' field
    let matchesMode = false;
    if (verbMode === 'indicativo') {
      matchesMode = !v.mode; // Indicativo verbs don't have 'mode' field
    } else {
      matchesMode = v.mode === verbMode;
    }
    
    return matchesLevel && matchesTense && matchesType && matchesMode;
  });
  
  // Shuffle for uniform random distribution
  return shuffleArray(filtered);
}

// Generate a random bubble challenge
export function generateChallenge(
  verbs: VerbData[],
  mode: GameMode
): BubbleChallenge | null {
  if (verbs.length === 0) return null;
  
  const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
  const id = `${Date.now()}_${Math.random()}`;
  
  // Show infinitive + pronoun, player writes conjugation
  return {
    id,
    verb: randomVerb.verb,
    pronoun: randomVerb.pronoun,
    conjugated: randomVerb.answer,
    mode,
    displayText: `${randomVerb.verb}, ${randomVerb.pronoun}`,
    correctAnswer: randomVerb.answer
  };
}

// Strip accents/tildes for accent-insensitive comparison
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Validate player's answer
export function validateAnswer(challenge: BubbleChallenge, userInput: string, accentSensitive: boolean = true): boolean {
  const normalized = userInput.trim().toLowerCase();
  const correct = challenge.correctAnswer.toLowerCase();
  
  if (accentSensitive) {
    return normalized === correct;
  }
  return stripAccents(normalized) === stripAccents(correct);
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
  const baseRate = 2000; // 2 seconds - allows multiple bubbles
  const rateDecrease = level * 100;
  const minRate = 800; // 0.8 seconds minimum for higher levels
  
  return Math.max(baseRate - rateDecrease, minRate);
}

// ============================================================================
// SRS INTEGRATION
// ============================================================================

/**
 * Get verbs using SRS (Spaced Repetition System)
 * This replaces random selection with intelligent prioritization
 */
export async function getFilteredVerbsSRS(
  level: VerbLevel,
  verbType: VerbType,
  tense: string = 'presente',
  verbMode: VerbMode = 'indicativo',
  poolSize: number = 50
): Promise<VerbData[]> {
  // First filter by game settings
  const filtered = await getFilteredVerbs(level, verbType, tense, verbMode);
  
  if (filtered.length === 0) {
    return [];
  }
  
  // Use SRS to create intelligent pool, then map back to VerbData
  const srsPool = createSRSPool(filtered, poolSize);
  
  return srsPool.map(v => ({
    verb: v.verb,
    tense: v.tense,
    pronoun: v.pronoun,
    answer: Array.isArray(v.answer) ? v.answer[0] : v.answer,
    regular: v.regular,
    mode: v.mode
  }));
}

/**
 * Record that user answered a conjugation correctly
 * @param verb The verb that was answered
 * @param responseTimeMs Time taken to respond in milliseconds
 */
export function recordVerbCorrect(verb: VerbData, responseTimeMs: number): void {
  const srsData = loadSRSData();
  const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
  
  // Initialize if doesn't exist (convert VerbData to PowerVerb format)
  const powerVerb = {
    verb: verb.verb,
    tense: verb.tense,
    pronoun: verb.pronoun,
    answer: verb.answer,
    regular: verb.regular,
    mode: verb.mode
  };
  initializeConjugation(powerVerb, srsData);
  
  // Record the correct answer
  recordCorrectAnswer(id, responseTimeMs, srsData);
  
  // Save to localStorage
  saveSRSData(srsData);
}

/**
 * Record that user answered a conjugation incorrectly
 * @param verb The verb that was answered
 * @param responseTimeMs Time taken to respond in milliseconds
 */
export function recordVerbIncorrect(verb: VerbData, responseTimeMs: number): void {
  const srsData = loadSRSData();
  const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
  
  // Initialize if doesn't exist (convert VerbData to PowerVerb format)
  const powerVerb = {
    verb: verb.verb,
    tense: verb.tense,
    pronoun: verb.pronoun,
    answer: verb.answer,
    regular: verb.regular,
    mode: verb.mode
  };
  initializeConjugation(powerVerb, srsData);
  
  // Record the incorrect answer
  recordIncorrectAnswer(id, responseTimeMs, srsData);
  
  // Save to localStorage
  saveSRSData(srsData);
}
