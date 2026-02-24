import { PowerVerb } from "../types";
import { createSRSPool, getConjugationId, loadSRSData, recordCorrectAnswer, recordIncorrectAnswer, saveSRSData, initializeConjugation } from "./srsService";

let verbsCache: PowerVerb[] | null = null;

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

/**
 * Load verb conjugations from the JSON file
 */
export async function loadVerbConjugations(): Promise<PowerVerb[]> {
  if (verbsCache) {
    return verbsCache;
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/conjugaciones-verbos.json`);
    if (!response.ok) {
      throw new Error(`Failed to load verb conjugations: ${response.status}`);
    }
    const data: PowerVerb[] = await response.json();
    verbsCache = data;
    return data;
  } catch (error) {
    console.error('Error loading verb conjugations:', error);
    return [];
  }
}

/**
 * Get verbs filtered by grammar mode, tense, and verb type
 * Returns a shuffled array for uniform distribution
 */
export async function getFilteredVerbs(
  grammarMode: string,
  tense: string,
  verbType: string
): Promise<PowerVerb[]> {
  const allVerbs = await loadVerbConjugations();
  
  const filtered = allVerbs.filter(v => {
    const mode = v.mode || 'indicativo';
    const matchesMode = mode === grammarMode;
    const matchesTense = v.tense === tense;
    const matchesType = verbType === 'mixed' 
      ? true 
      : verbType === 'regular' 
        ? v.regular === true 
        : v.regular === false;
    
    return matchesMode && matchesTense && matchesType;
  });
  
  // Shuffle for uniform random distribution
  return shuffleArray(filtered);
}

/**
 * Get available tenses for a grammar mode
 */
export async function getAvailableTenses(grammarMode: string): Promise<string[]> {
  const allVerbs = await loadVerbConjugations();
  const tenses = new Set<string>();
  
  allVerbs.forEach(v => {
    const mode = v.mode || 'indicativo';
    if (mode === grammarMode) {
      tenses.add(v.tense);
    }
  });
  
  // Orden personalizado de tiempos verbales
  const tenseOrder = [
    'presente',
    'pretérito perfecto',
    'indefinido',
    'imperfecto',
    'presente continuo',
    'futuro simple',
    'condicional simple',
    'pretérito pluscuamperfecto'
  ];
  
  return Array.from(tenses).sort((a, b) => {
    const indexA = tenseOrder.indexOf(a.toLowerCase());
    const indexB = tenseOrder.indexOf(b.toLowerCase());
    
    // Si ambos están en el orden personalizado, usar ese orden
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // Si solo uno está en el orden, ponerlo primero
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // Si ninguno está en el orden, usar orden alfabético
    return a.localeCompare(b);
  });
}

/**
 * Get available grammar modes from the data
 */
export async function getAvailableGrammarModes(): Promise<string[]> {
  const allVerbs = await loadVerbConjugations();
  const modes = new Set<string>();
  
  allVerbs.forEach(v => {
    modes.add(v.mode || 'indicativo');
  });
  
  return Array.from(modes).sort();
}

// ============================================================================
// SRS INTEGRATION
// ============================================================================

/**
 * Get verbs using SRS (Spaced Repetition System)
 * This replaces random selection with intelligent prioritization
 */
export async function getFilteredVerbsSRS(
  grammarMode: string,
  tense: string,
  verbType: string,
  poolSize: number = 50
): Promise<PowerVerb[]> {
  // First filter by game settings
  const filtered = await getFilteredVerbs(grammarMode, tense, verbType);
  
  if (filtered.length === 0) {
    return [];
  }
  
  // Use SRS to create intelligent pool
  const srsPool = createSRSPool(filtered, poolSize);
  
  return srsPool;
}

/**
 * Record that user answered a conjugation correctly
 * @param verb The verb that was answered
 * @param responseTimeMs Time taken to respond in milliseconds
 */
export function recordVerbCorrect(verb: PowerVerb, responseTimeMs: number): void {
  const srsData = loadSRSData();
  const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
  
  // Initialize if doesn't exist
  initializeConjugation(verb, srsData);
  
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
export function recordVerbIncorrect(verb: PowerVerb, responseTimeMs: number): void {
  const srsData = loadSRSData();
  const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
  
  // Initialize if doesn't exist
  initializeConjugation(verb, srsData);
  
  // Record the incorrect answer
  recordIncorrectAnswer(id, responseTimeMs, srsData);
  
  // Save to localStorage
  saveSRSData(srsData);
}
