import { GoogleGenAI, Type } from "@google/genai";
import { VerbChallenge } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Re-export getWordOfDay from vocabularyService for backward compatibility
export { getWordOfDay } from './vocabularyService';

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