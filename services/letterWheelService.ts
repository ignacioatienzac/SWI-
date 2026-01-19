interface VocabWord {
  palabra: string;
  pistas: string;
}

type Difficulty = 'a1' | 'a2' | 'b1' | 'b2';

const vocabularyCache: Record<Difficulty, VocabWord[] | null> = {
  a1: null,
  a2: null,
  b1: null,
  b2: null
};

export async function loadLetterWheelVocabulary(difficulty: Difficulty): Promise<VocabWord[]> {
  if (vocabularyCache[difficulty]) {
    return vocabularyCache[difficulty]!;
  }

  try {
    const url = `/data/vocabularios/vocabulario-rueda-${difficulty}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load vocabulary: ${response.status}`);
    }
    const words: VocabWord[] = await response.json();
    console.log('[LetterWheel] Loaded', words.length, 'words for', difficulty);
    vocabularyCache[difficulty] = words;
    return words;
  } catch (error) {
    console.error(`[LetterWheel] Error loading vocabulary for ${difficulty}:`, error);
    return [];
  }
}

export function getRandomWordForDate(words: VocabWord[], dateStr: string, minLength: number = 7, maxLength: number = 10): VocabWord | null {
  // Filter words by length
  const suitableWords = words.filter(w => {
    const len = w.palabra.length;
    return len >= minLength && len <= maxLength;
  });

  if (suitableWords.length === 0) {
    return null;
  }

  // Create deterministic random based on date
  const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Try multiple candidates to find one with good letters
  // Words with common vowels (a, e, o) and consonants (s, r, n, l, t) are better
  const goodLetters = new Set(['a', 'e', 'i', 'o', 'u', 's', 'r', 'n', 'l', 't', 'c', 'd', 'm', 'p']);
  
  // Score words by how many good letters they have
  const scoredWords = suitableWords.map(word => {
    const normalized = normalizeWord(word.palabra).toLowerCase();
    let score = 0;
    const uniqueLetters = new Set(normalized);
    uniqueLetters.forEach(letter => {
      if (goodLetters.has(letter)) score += 2;
    });
    // Bonus for having multiple vowels
    const vowels = normalized.split('').filter(l => 'aeiou'.includes(l)).length;
    score += vowels;
    return { word, score };
  });
  
  // Sort by score and pick from top candidates
  scoredWords.sort((a, b) => b.score - a.score);
  const topCandidates = scoredWords.slice(0, Math.min(50, scoredWords.length));
  
  const index = seed % topCandidates.length;
  console.log('[getRandomWordForDate] Selected word:', topCandidates[index].word.palabra, 'score:', topCandidates[index].score);
  return topCandidates[index].word;
}

export function getRelatedWords(allWords: VocabWord[], baseWord: string, count: number = 5): VocabWord[] {
  const normalizedBase = normalizeWord(baseWord).toLowerCase();
  
  // Create letter frequency map for base word
  const baseLetterCount = new Map<string, number>();
  for (const letter of normalizedBase) {
    baseLetterCount.set(letter, (baseLetterCount.get(letter) || 0) + 1);
  }
  
  // Find words that can be formed using ONLY the letters from base word
  const candidates = allWords.filter(w => {
    const normalized = normalizeWord(w.palabra).toLowerCase();
    
    // Skip the base word itself
    if (normalized === normalizedBase) return false;
    
    // Skip very long words
    if (normalized.length > normalizedBase.length) return false;
    
    // Skip very short words
    if (normalized.length < 3) return false;
    
    // Check if this word can be formed with available letters
    const wordLetterCount = new Map<string, number>();
    for (const letter of normalized) {
      wordLetterCount.set(letter, (wordLetterCount.get(letter) || 0) + 1);
    }
    
    // Verify each letter in the word doesn't exceed available count
    for (const [letter, count] of wordLetterCount) {
      const available = baseLetterCount.get(letter) || 0;
      if (count > available) {
        return false;
      }
    }
    
    return true;
  });

  // Sort by word length (longer words are more interesting)
  candidates.sort((a, b) => {
    const lenA = normalizeWord(a.palabra).length;
    const lenB = normalizeWord(b.palabra).length;
    return lenB - lenA;
  });

  // Take top N words
  return candidates.slice(0, count);
}

export function normalizeWord(word: string): string {
  // Preserve ñ by temporarily replacing it
  let normalized = word.replace(/ñ/gi, '§§§');
  
  // Remove accents
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Restore ñ
  normalized = normalized.replace(/§§§/g, 'ñ');
  
  // Convert to uppercase
  return normalized.toUpperCase();
}
