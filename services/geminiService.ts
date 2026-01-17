import { GoogleGenAI, Type } from "@google/genai";
import { VerbChallenge } from "../types";
import { vocabularioA1 } from './vocabulario_a1';
import { vocabularioA2 } from './vocabulario_a2';
import { vocabularioB1 } from './vocabulario_b1';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Get vocabulary by level, filtered to 3-6 letter words only
const getVocabulary = (level: string): string[] => {
  let vocab: string[] = [];
  switch(level.toLowerCase()) {
    case 'a1': vocab = vocabularioA1; break;
    case 'a2': vocab = vocabularioA2; break;
    case 'b1': vocab = vocabularioB1; break;
    default: vocab = vocabularioA1;
  }
  
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
export const getWordOfDay = (level: string, date: string): string => {
  const vocab = getVocabulary(level);
  if (vocab.length === 0) {
    console.warn(`No words found for level ${level}`);
    return 'GATO'; // fallback
  }
  const index = hashDateToIndex(date, vocab.length);
  return vocab[index];
};

export const generateVerbChallenge = async (difficulty: string): Promise<VerbChallenge | null> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing. Returning mock data.");
    return getMockChallenge();
  }

  const modelName = 'gemini-3-flash-preview';
  
  const prompt = `Generate a single Spanish verb conjugation challenge for a student with ${difficulty} proficiency.
  Include: 
  1. A common verb.
  2. A specific tense (Presente, Pretérito, Futuro).
  3. A subject pronoun (Yo, Tú, Él/Ella, Nosotros, Ellos/Ellas).
  4. The correct conjugation (answer).
  5. The English translation of the verb.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verb: { type: Type.STRING },
            tense: { type: Type.STRING },
            pronoun: { type: Type.STRING },
            answer: { type: Type.STRING },
            translation: { type: Type.STRING },
          },
          required: ["verb", "tense", "pronoun", "answer", "translation"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from Gemini");
    
    return JSON.parse(jsonText) as VerbChallenge;

  } catch (error) {
    console.error("Error generating challenge:", error);
    return getMockChallenge();
  }
}

// Fallback for when API key is missing or errors occur
const getMockChallenge = (): VerbChallenge => {
  const mocks: VerbChallenge[] = [
    { verb: "Comer", tense: "Presente", pronoun: "Nosotros", answer: "comemos", translation: "to eat" },
    { verb: "Hablar", tense: "Pretérito", pronoun: "Ellos", answer: "hablaron", translation: "to speak" },
    { verb: "Vivir", tense: "Futuro", pronoun: "Yo", answer: "viviré", translation: "to live" },
  ];
  return mocks[Math.floor(Math.random() * mocks.length)];
};