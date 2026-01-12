import { GoogleGenAI, Type } from "@google/genai";
import { VerbChallenge, SecretWord } from "../types";
import { a1Words } from './a1_words';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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
};

export const generateSecretWord = async (level: string, date?: string): Promise<SecretWord | null> => {
  // Use predefined list for A1 to improve speed and quality
  if (level === 'A1') {
      const dateStr = date || new Date().toLocaleDateString('es-ES');
      // Simple hash function for the date string to get a deterministic index for daily words
      let hash = 0;
      for (let i = 0; i < dateStr.length; i++) {
          hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
      }
      const index = Math.abs(hash) % a1Words.length;
      const wordData = a1Words[index];
      
      // Map local data to SecretWord interface
      // Using pista1 as translation since it provides the context/category in English
      return {
          word: wordData.palabra.toUpperCase(),
          hint: wordData.pista2,
          translation: wordData.pista1 
      };
  }

  if (!process.env.API_KEY) {
    return { word: "MUNDO", hint: "El planeta donde vivimos", translation: "World" };
  }

  const modelName = 'gemini-3-flash-preview';
  // Include date in prompt to simulate daily challenge
  const dateContext = date ? ` for the date ${date}` : '';
  
  const prompt = `Generate a random 5-letter Spanish word suitable for a student at CEFR level ${level}${dateContext}.
  Do not use accents/tildes in the 'word' field (normalize it).
  Return JSON:
  - word: The 5 letter word (uppercase).
  - hint: A simple definition or synonym in Spanish.
  - translation: English translation.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            hint: { type: Type.STRING },
            translation: { type: Type.STRING },
          },
          required: ["word", "hint", "translation"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned");
    return JSON.parse(jsonText) as SecretWord;
  } catch (error) {
    console.error(error);
    return { word: "LIBRO", hint: "Hojas de papel encuadernadas", translation: "Book" };
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