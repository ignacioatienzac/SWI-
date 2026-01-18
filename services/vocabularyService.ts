// Cache for loaded vocabularies
const vocabularyCache: { [key: string]: string[] } = {};

// Load vocabulary for a specific level from JSON
export const loadVocabulary = async (level: string): Promise<string[]> => {
  const cacheKey = `vocab_${level.toLowerCase()}`;
  
  if (vocabularyCache[cacheKey]) {
    return vocabularyCache[cacheKey];
  }

  try {
    const response = await fetch(`/data/vocabularios/vocabulario-${level.toLowerCase()}.json`);
    if (!response.ok) throw new Error(`Failed to load vocabulary for level ${level}`);
    
    const data = await response.json();
    const words = Array.isArray(data) ? data : data.words || [];
    
    // Normalize to uppercase
    const normalized = words.map((w: string) => w.toUpperCase());
    vocabularyCache[cacheKey] = normalized;
    
    return normalized;
  } catch (error) {
    console.error(`Error loading vocabulary for level ${level}:`, error);
    return [];
  }
};

// Get vocabulary with caching and filtering to 3-6 letter words
export const getVocabulary = async (level: string): Promise<string[]> => {
  const vocab = await loadVocabulary(level);
  // Filter to only words with 3-6 letters
  return vocab.filter(word => word.length >= 3 && word.length <= 6);
};

// Simple hash function for deterministic daily word selection
const hashDateToIndex = (dateStr: string, vocabLength: number): number => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % vocabLength;
};

// Get word of the day for a given level and date
export const getWordOfDay = async (level: string, date: string): Promise<string> => {
  const vocab = await getVocabulary(level);
  if (vocab.length === 0) {
    console.warn(`No words found for level ${level}`);
    return 'GATO'; // fallback
  }
  const index = hashDateToIndex(date, vocab.length);
  return vocab[index];
};
