import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

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