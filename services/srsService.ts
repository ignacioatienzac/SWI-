// Spaced Repetition System (SRS) Service for Verb Conjugation Learning
// Based on SuperMemo and Leitner system principles

import { PowerVerb } from "../types";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ConjugationProgress {
  id: string;                      // "hablar_presente_yo"
  verb: string;
  tense: string;
  pronoun: string;
  
  // Performance metrics
  timesShown: number;              // Times appeared
  timesCorrect: number;            // Correct answers
  timesIncorrect: number;          // Incorrect answers
  
  // Leitner-inspired mastery system
  masteryLevel: number;            // 0-5 (0=new, 5=mastered)
  
  // Spaced repetition
  lastSeenTimestamp: number;       // Last time seen
  nextReviewTimestamp: number;     // When should be reviewed
  
  // Advanced metrics
  averageResponseTime: number;     // Average response time (ms)
  streak: number;                  // Consecutive correct answers
  difficulty: number;              // 1-3 (1=easy, 3=hard)
  
  // First seen tracking
  firstSeenTimestamp: number;      // When first introduced
}

export interface GlobalStats {
  totalPlayed: number;
  totalCorrect: number;
  totalIncorrect: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedTimestamp: number;
}

export interface SRSData {
  version: number;
  lastUpdate: number;
  conjugations: Record<string, ConjugationProgress>;
  globalStats: GlobalStats;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'verbSRS';
const CURRENT_VERSION = 1;

// Mastery level intervals (in milliseconds)
const INTERVALS = {
  0: 0,                           // New: immediate
  1: 5 * 60 * 1000,              // Learning: 5 minutes
  2: 24 * 60 * 60 * 1000,        // Remembering: 1 day
  3: 3 * 24 * 60 * 60 * 1000,    // Familiar: 3 days
  4: 7 * 24 * 60 * 60 * 1000,    // Mastered: 7 days
  5: 14 * 24 * 60 * 60 * 1000,   // Expert: 14 days
};

// Response time thresholds (in ms)
const RESPONSE_TIME = {
  FAST: 3000,      // < 3s = fast
  NORMAL: 8000,    // 3-8s = normal
  SLOW: 8000,      // > 8s = slow
};

// Pool distribution percentages
const POOL_DISTRIBUTION = {
  URGENT: 0.40,      // 40% urgent reviews
  DIFFICULT: 0.30,   // 30% difficult ones
  REVIEW: 0.20,      // 20% due for review
  RANDOM: 0.10,      // 10% random variety
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate unique ID for a conjugation
 */
export function getConjugationId(verb: string, tense: string, pronoun: string): string {
  return `${verb}_${tense}_${pronoun}`;
}

/**
 * Load SRS data from localStorage
 */
export function loadSRSData(): SRSData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createEmptySRSData();
    }
    
    const data: SRSData = JSON.parse(stored);
    
    // Version migration if needed
    if (data.version !== CURRENT_VERSION) {
      return migrateData(data);
    }
    
    return data;
  } catch (error) {
    console.error('Error loading SRS data:', error);
    return createEmptySRSData();
  }
}

/**
 * Save SRS data to localStorage
 */
export function saveSRSData(data: SRSData): void {
  try {
    data.lastUpdate = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving SRS data:', error);
  }
}

/**
 * Create empty SRS data structure
 */
function createEmptySRSData(): SRSData {
  return {
    version: CURRENT_VERSION,
    lastUpdate: Date.now(),
    conjugations: {},
    globalStats: {
      totalPlayed: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedTimestamp: 0,
    },
  };
}

/**
 * Initialize progress for a conjugation if not exists
 */
export function initializeConjugation(verb: PowerVerb, srsData: SRSData): ConjugationProgress {
  const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
  
  if (!srsData.conjugations[id]) {
    const now = Date.now();
    srsData.conjugations[id] = {
      id,
      verb: verb.verb,
      tense: verb.tense,
      pronoun: verb.pronoun,
      timesShown: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      masteryLevel: 0,
      lastSeenTimestamp: 0,
      nextReviewTimestamp: now, // Available immediately
      averageResponseTime: 0,
      streak: 0,
      difficulty: 1,
      firstSeenTimestamp: now,
    };
  }
  
  return srsData.conjugations[id];
}

/**
 * Calculate next review interval based on mastery level and performance
 */
function calculateNextInterval(
  masteryLevel: number,
  streak: number,
  difficulty: number,
  responseTime: number
): number {
  // Base interval for this mastery level
  let interval = INTERVALS[masteryLevel as keyof typeof INTERVALS] || INTERVALS[5];
  
  // Streak bonus: up to 2x for high streaks
  const streakBonus = Math.min(1 + (streak * 0.1), 2.0);
  
  // Difficulty penalty: reduce interval for difficult conjugations
  const difficultyPenalty = 2 / difficulty;
  
  // Response time factor
  let responseTimeFactor = 1.0;
  if (responseTime < RESPONSE_TIME.FAST) {
    responseTimeFactor = 1.3; // Increase interval for fast responses
  } else if (responseTime > RESPONSE_TIME.SLOW) {
    responseTimeFactor = 0.8; // Decrease interval for slow responses
  }
  
  // Calculate final interval
  interval = interval * streakBonus * difficultyPenalty * responseTimeFactor;
  
  // Apply exponential growth for higher mastery levels
  if (masteryLevel >= 2) {
    interval = interval * Math.pow(1.3, masteryLevel - 1);
  }
  
  return Math.floor(interval);
}

/**
 * Update progress after a correct answer
 */
export function recordCorrectAnswer(
  conjugationId: string,
  responseTime: number,
  srsData: SRSData
): void {
  const progress = srsData.conjugations[conjugationId];
  if (!progress) return;
  
  const now = Date.now();
  
  // Update counts
  progress.timesShown++;
  progress.timesCorrect++;
  progress.streak++;
  progress.lastSeenTimestamp = now;
  
  // Update average response time
  const totalTime = progress.averageResponseTime * (progress.timesShown - 1);
  progress.averageResponseTime = (totalTime + responseTime) / progress.timesShown;
  
  // Level up if conditions met
  const shouldLevelUp = progress.masteryLevel < 5;
  
  // Fast response streak bonus: jump 2 levels
  if (shouldLevelUp && progress.streak >= 3 && responseTime < RESPONSE_TIME.FAST) {
    progress.masteryLevel = Math.min(progress.masteryLevel + 2, 5);
  } else if (shouldLevelUp) {
    progress.masteryLevel++;
  }
  
  // Reduce difficulty if doing well
  if (progress.streak >= 3 && progress.difficulty > 1) {
    progress.difficulty = Math.max(1, progress.difficulty - 1);
  }
  
  // Calculate next review time
  const interval = calculateNextInterval(
    progress.masteryLevel,
    progress.streak,
    progress.difficulty,
    responseTime
  );
  progress.nextReviewTimestamp = now + interval;
  
  // Update global stats
  srsData.globalStats.totalPlayed++;
  srsData.globalStats.totalCorrect++;
  srsData.globalStats.currentStreak++;
  srsData.globalStats.longestStreak = Math.max(
    srsData.globalStats.longestStreak,
    srsData.globalStats.currentStreak
  );
  srsData.globalStats.lastPlayedTimestamp = now;
}

/**
 * Update progress after an incorrect answer
 */
export function recordIncorrectAnswer(
  conjugationId: string,
  responseTime: number,
  srsData: SRSData
): void {
  const progress = srsData.conjugations[conjugationId];
  if (!progress) return;
  
  const now = Date.now();
  
  // Update counts
  progress.timesShown++;
  progress.timesIncorrect++;
  progress.streak = 0; // Reset streak
  progress.lastSeenTimestamp = now;
  
  // Update average response time
  const totalTime = progress.averageResponseTime * (progress.timesShown - 1);
  progress.averageResponseTime = (totalTime + responseTime) / progress.timesShown;
  
  // Demote mastery level
  progress.masteryLevel = Math.max(0, progress.masteryLevel - 1);
  
  // Increase difficulty
  progress.difficulty = Math.min(3, progress.difficulty + 1);
  
  // Schedule for immediate review (5 minutes)
  progress.nextReviewTimestamp = now + INTERVALS[1];
  
  // Update global stats
  srsData.globalStats.totalPlayed++;
  srsData.globalStats.totalIncorrect++;
  srsData.globalStats.currentStreak = 0;
  srsData.globalStats.lastPlayedTimestamp = now;
}

/**
 * Get conjugations that are due for review (urgent)
 */
export function getUrgentConjugations(
  allConjugations: PowerVerb[],
  srsData: SRSData
): PowerVerb[] {
  const now = Date.now();
  const urgent: PowerVerb[] = [];
  
  for (const verb of allConjugations) {
    const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
    const progress = srsData.conjugations[id];
    
    // New conjugations (never seen)
    if (!progress) {
      urgent.push(verb);
      continue;
    }
    
    // Due for review
    if (progress.nextReviewTimestamp <= now) {
      urgent.push(verb);
      continue;
    }
    
    // Broken streak (was good, now needs reinforcement)
    if (progress.streak === 0 && progress.timesCorrect >= 3) {
      urgent.push(verb);
    }
  }
  
  return urgent;
}

/**
 * Get conjugations that are difficult (need more practice)
 */
export function getDifficultConjugations(
  allConjugations: PowerVerb[],
  srsData: SRSData
): PowerVerb[] {
  const difficult: PowerVerb[] = [];
  
  for (const verb of allConjugations) {
    const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
    const progress = srsData.conjugations[id];
    
    if (!progress) continue;
    
    // Still learning (levels 0-2)
    if (progress.masteryLevel <= 2) {
      difficult.push(verb);
      continue;
    }
    
    // Marked as difficult
    if (progress.difficulty === 3) {
      difficult.push(verb);
      continue;
    }
    
    // More errors than successes
    if (progress.timesIncorrect > progress.timesCorrect) {
      difficult.push(verb);
    }
  }
  
  return difficult;
}

/**
 * Get conjugations due for review (within review window)
 */
export function getReviewConjugations(
  allConjugations: PowerVerb[],
  srsData: SRSData
): PowerVerb[] {
  const now = Date.now();
  const review: PowerVerb[] = [];
  
  for (const verb of allConjugations) {
    const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
    const progress = srsData.conjugations[id];
    
    if (!progress) continue;
    
    // Familiar but not mastered (levels 3-4)
    if (progress.masteryLevel >= 3 && progress.masteryLevel <= 4) {
      // Within review window (±25% of ideal interval)
      const timeUntilReview = progress.nextReviewTimestamp - now;
      const interval = progress.nextReviewTimestamp - progress.lastSeenTimestamp;
      const window = interval * 0.25;
      
      if (Math.abs(timeUntilReview) <= window) {
        review.push(verb);
      }
    }
  }
  
  return review;
}

/**
 * Normalize pronouns for equivalence checking
 * él/ella and usted share the same conjugation form
 * ellos/ellas and ustedes share the same conjugation form
 */
export function normalizePronoun(pronoun: string): string {
  const lower = pronoun.toLowerCase();
  
  // Third person singular: él, ella, usted, él/ella → all mapped to 'él/ella'
  if (lower === 'él' || lower === 'ella' || lower === 'usted' || lower === 'él/ella') {
    return 'él/ella';
  }
  
  // Third person plural: ellos, ellas, ustedes, ellos/ellas → all mapped to 'ellos/ellas'
  if (lower === 'ellos' || lower === 'ellas' || lower === 'ustedes' || lower === 'ellos/ellas') {
    return 'ellos/ellas';
  }
  
  // All other pronouns remain unchanged
  return lower;
}

/**
 * Organize initial pool for maximum variety
 * Ensures same verb or pronoun doesn't appear in next 2 positions
 * This only applies to new conjugations (not yet learned)
 */
function organizeInitialPool(pool: PowerVerb[], srsData: SRSData): PowerVerb[] {
  // Separate new conjugations from learned ones
  const newConjugations: PowerVerb[] = [];
  const learnedConjugations: PowerVerb[] = [];
  
  for (const verb of pool) {
    const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
    const progress = srsData.conjugations[id];
    
    // Consider "new" if never shown before (timesShown = 0)
    if (!progress || progress.timesShown === 0) {
      newConjugations.push(verb);
    } else {
      learnedConjugations.push(verb);
    }
  }
  
  // If no new conjugations or very few, just shuffle normally
  if (newConjugations.length <= 3) {
    return shuffleArray(pool);
  }
  
  // Organize new conjugations with variety constraint
  const organized: PowerVerb[] = [];
  const remaining = [...newConjugations];
  
  // Start with a random conjugation
  const firstIndex = Math.floor(Math.random() * remaining.length);
  organized.push(remaining[firstIndex]);
  remaining.splice(firstIndex, 1);
  
  // Greedy algorithm: pick next conjugation that maximizes variety
  while (remaining.length > 0) {
    let bestIndex = -1;
    let bestScore = -1;
    
    // Try each remaining conjugation
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let score = 0;
      
      // Check last 2 positions for conflicts
      const checkPositions = Math.min(2, organized.length);
      
      for (let j = 1; j <= checkPositions; j++) {
        const previous = organized[organized.length - j];
        
        // Penalize same verb
        if (candidate.verb !== previous.verb) {
          score += 10;
        }
        
        // Penalize same pronoun (considering equivalences)
        if (normalizePronoun(candidate.pronoun) !== normalizePronoun(previous.pronoun)) {
          score += 10;
        }
        
        // Bonus for variety in older positions (less important)
        score += (3 - j); // Position 1 back = +2, position 2 back = +1
      }
      
      // Add some randomness to avoid being too predictable
      score += Math.random() * 3;
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    
    // Add the best candidate
    if (bestIndex >= 0) {
      organized.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    } else {
      // Fallback: just add the next one (shouldn't happen)
      organized.push(remaining[0]);
      remaining.splice(0, 1);
    }
  }
  
  // Mix organized new conjugations with shuffled learned ones
  // Interleave them for natural progression
  const result: PowerVerb[] = [];
  const shuffledLearned = shuffleArray(learnedConjugations);
  
  let newIndex = 0;
  let learnedIndex = 0;
  
  // If mostly new, slightly favor new conjugations
  // If mostly learned, favor learned conjugations
  const newRatio = newConjugations.length / pool.length;
  
  while (newIndex < organized.length || learnedIndex < shuffledLearned.length) {
    // Decide whether to add new or learned based on ratio and availability
    const shouldAddNew = newIndex < organized.length && (
      learnedIndex >= shuffledLearned.length ||
      (Math.random() < newRatio && newIndex < organized.length)
    );
    
    if (shouldAddNew) {
      result.push(organized[newIndex]);
      newIndex++;
    } else if (learnedIndex < shuffledLearned.length) {
      result.push(shuffledLearned[learnedIndex]);
      learnedIndex++;
    }
  }
  
  return result;
}

/**
 * Create a balanced pool of conjugations based on SRS priorities
 */
export function createSRSPool(
  allConjugations: PowerVerb[],
  poolSize: number = 50
): PowerVerb[] {
  const srsData = loadSRSData();
  
  // Initialize all conjugations in SRS if not exists
  for (const verb of allConjugations) {
    initializeConjugation(verb, srsData);
  }
  
  // Save initialization
  saveSRSData(srsData);
  
  // Get different priority pools
  const urgent = getUrgentConjugations(allConjugations, srsData);
  const difficult = getDifficultConjugations(allConjugations, srsData);
  const review = getReviewConjugations(allConjugations, srsData);
  
  // Calculate how many from each pool
  const urgentCount = Math.floor(poolSize * POOL_DISTRIBUTION.URGENT);
  const difficultCount = Math.floor(poolSize * POOL_DISTRIBUTION.DIFFICULT);
  const reviewCount = Math.floor(poolSize * POOL_DISTRIBUTION.REVIEW);
  const randomCount = poolSize - urgentCount - difficultCount - reviewCount;
  
  // Build the pool
  const pool: PowerVerb[] = [];
  const used = new Set<string>();
  
  // Helper to add unique conjugations
  const addUnique = (source: PowerVerb[], count: number) => {
    const shuffled = shuffleArray(source);
    let added = 0;
    for (const verb of shuffled) {
      if (added >= count) break;
      const id = getConjugationId(verb.verb, verb.tense, verb.pronoun);
      if (!used.has(id)) {
        pool.push(verb);
        used.add(id);
        added++;
      }
    }
  };
  
  // Add from each priority pool
  addUnique(urgent, urgentCount);
  addUnique(difficult, difficultCount);
  addUnique(review, reviewCount);
  addUnique(allConjugations, randomCount);
  
  // If we don't have enough, fill with any available
  if (pool.length < poolSize) {
    const remaining = allConjugations.filter(v => {
      const id = getConjugationId(v.verb, v.tense, v.pronoun);
      return !used.has(id);
    });
    addUnique(remaining, poolSize - pool.length);
  }
  
  // Organize the pool for maximum variety in initial learning
  // This ensures new conjugations don't repeat same verb/pronoun too soon
  return organizeInitialPool(pool, srsData);
}

/**
 * Fisher-Yates shuffle
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
 * Get statistics for display
 */
export function getProgressStats(srsData?: SRSData): {
  new: number;
  learning: number;
  familiar: number;
  mastered: number;
  total: number;
  accuracy: number;
  urgentReviews: number;
} {
  const data = srsData || loadSRSData();
  const conjugations = Object.values(data.conjugations);
  
  const byLevel = {
    new: conjugations.filter(c => c.masteryLevel === 0).length,
    learning: conjugations.filter(c => c.masteryLevel >= 1 && c.masteryLevel <= 2).length,
    familiar: conjugations.filter(c => c.masteryLevel >= 3 && c.masteryLevel <= 4).length,
    mastered: conjugations.filter(c => c.masteryLevel === 5).length,
  };
  
  const now = Date.now();
  const urgentReviews = conjugations.filter(c => c.nextReviewTimestamp <= now).length;
  
  const accuracy = data.globalStats.totalPlayed > 0
    ? Math.round((data.globalStats.totalCorrect / data.globalStats.totalPlayed) * 100)
    : 0;
  
  return {
    ...byLevel,
    total: conjugations.length,
    accuracy,
    urgentReviews,
  };
}

/**
 * Reset all SRS data (for testing or user request)
 */
export function resetSRSData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Migrate data from old versions (placeholder for future use)
 */
function migrateData(_oldData: unknown): SRSData {
  // For now, just return empty data
  // In the future, implement actual migration logic
  console.log('Migrating SRS data from old version');
  return createEmptySRSData();
}
