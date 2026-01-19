import { PowerVerb } from "../types";

let verbsCache: PowerVerb[] | null = null;

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
 */
export async function getFilteredVerbs(
  grammarMode: string,
  tense: string,
  verbType: string
): Promise<PowerVerb[]> {
  const allVerbs = await loadVerbConjugations();
  
  return allVerbs.filter(v => {
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
  
  return Array.from(tenses).sort((a, b) => a.localeCompare(b));
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
