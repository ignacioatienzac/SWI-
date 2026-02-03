import { GoogleGenAI, Type } from "@google/genai";
import { VerbChallenge } from "../types";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

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

/**
 * Función para conversar con el Panda, asistente de español con IA
 * 🔒 VERSIÓN SEGURA: Usa Firebase Functions para proteger la API Key
 * 
 * @param mensajeUsuario - El mensaje o pregunta del estudiante
 * @param contextoJuego - El rol actual del panda (ej: 'Constructor', 'Mago', 'Guía')
 * @param datosFrase - Los datos de la frase/ejercicio actual del JSON
 * @param tipoCobi - El tipo de personalidad: 'juego' (Constructor) o 'lobby' (Página de Juegos)
 * @returns Promise con el texto de la respuesta del Panda
 */
export const hablarConPanda = async (
  mensajeUsuario: string,
  contextoJuego: string = 'Guía General',
  datosFrase: any = null,
  tipoCobi: 'juego' | 'lobby' = 'juego'
): Promise<string> => {
  
  try {
    // Llamar a la Cloud Function segura
    const hablarConPandaSeguro = httpsCallable(functions, 'hablarConPandaSeguro');
    
    // Enviar datos al servidor
    const resultado = await hablarConPandaSeguro({
      mensajeUsuario,
      contextoJuego,
      datosFrase,
      tipoCobi
    });

    // Extraer respuesta
    const data = resultado.data as { success: boolean; respuesta: string };
    
    if (data.success && data.respuesta) {
      return data.respuesta;
    } else {
      throw new Error("Respuesta inválida del servidor");
    }

  } catch (error: any) {
    console.error("Error al hablar con el Panda:", error);
    
    // Mostrar mensaje de error amigable
    if (error.code === 'functions/unauthenticated') {
      return "🐾 Necesito que te autentiques primero para poder ayudarte 🐾";
    } else if (error.message) {
      return error.message;
    } else {
      return "🐾 ¡Ups! Parece que me quedé sin bambú... Intenta preguntarme de nuevo en un momento 🐾";
    }
  }
};