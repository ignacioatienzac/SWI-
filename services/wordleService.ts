// Cache for loaded dictionaries and hints
const dictionaryCache: { [key: string]: string[] } = {};
const hintsCache: { [key: string]: { [word: string]: string[] } } = {};

// Load dictionary for a specific word length
export const loadDictionary = async (wordLength: 3 | 4 | 5 | 6): Promise<string[]> => {
  const cacheKey = `dict_${wordLength}`;
  
  if (dictionaryCache[cacheKey]) {
    return dictionaryCache[cacheKey];
  }

  try {
    const response = await fetch(`./data/${wordLength.toString().padStart(2, '0')}.json`);
    if (!response.ok) throw new Error(`Failed to load dictionary for ${wordLength} letters`);
    
    const data = await response.json();
    const words = Array.isArray(data) ? data : data.palabras || data.words || [];
    
    // Normalize to uppercase
    const normalized = words.map((w: string) => w.toUpperCase());
    dictionaryCache[cacheKey] = normalized;
    
    return normalized;
  } catch (error) {
    console.error(`Error loading dictionary for ${wordLength} letters:`, error);
    return [];
  }
};

// Load hints for a specific difficulty level
export const loadHints = async (difficulty: string): Promise<{ [word: string]: string[] }> => {
  const cacheKey = `hints_${difficulty}`;
  
  if (hintsCache[cacheKey]) {
    return hintsCache[cacheKey];
  }

  try {
    const response = await fetch(`./data/pistas-${difficulty}.json`);
    if (!response.ok) {
      console.warn(`No hints file found for difficulty ${difficulty}`);
      return {};
    }
    
    const data = await response.json();
    const hintArray = Array.isArray(data) ? data : [];
    
    // Convert array of objects to word→pistas mapping
    const normalized: { [word: string]: string[] } = {};
    for (const entry of hintArray) {
      if (entry.palabra) {
        const palabra = entry.palabra.toUpperCase();
        const pistas = [];
        if (entry.pista1) pistas.push(entry.pista1);
        if (entry.pista2) pistas.push(entry.pista2);
        if (entry.pista3) pistas.push(entry.pista3);
        normalized[palabra] = pistas;
      }
    }
    
    hintsCache[cacheKey] = normalized;
    return normalized;
  } catch (error) {
    console.error(`Error loading hints for difficulty ${difficulty}:`, error);
    return {};
  }
};

// Validate if a word exists in the dictionary
export const isValidWord = async (word: string, wordLength: 3 | 4 | 5 | 6): Promise<boolean> => {
  const dictionary = await loadDictionary(wordLength);
  return dictionary.includes(word.toUpperCase());
};

// Get hints progressively based on attempt number
export const getHintsForAttempt = async (word: string, attemptNumber: number, difficulty: string): Promise<string[]> => {
  const hints = await loadHints(difficulty);
  const wordHints = hints[word.toUpperCase()] || [];
  
  // Reveal hints progressively based on failed attempts:
  // After 3+ failed attempts (attempting 4th): 1 hint
  // After 4+ failed attempts (attempting 5th): 2 hints
  // After 5+ failed attempts (attempting 6th): 3 hints
  
  if (attemptNumber < 3) {
    return [];
  } else if (attemptNumber === 3) {
    return wordHints.slice(0, 1);
  } else if (attemptNumber === 4) {
    return wordHints.slice(0, 2);
  } else {
    return wordHints.slice(0, 3);
  }
};
