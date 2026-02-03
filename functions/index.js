/**
 * Cloud Function para hablar con Cobi el Panda de forma segura
 * Usando Groq API con Llama 3.3 70B (tier gratuito generoso)
 */

const functions = require("firebase-functions");

/**
 * Función HTTP que maneja las conversaciones con Cobi
 */
exports.hablarConPandaSeguro = functions.https.onCall(async (data, context) => {
  // Extraer datos de la petición
  const { mensajeUsuario, contextoJuego = 'Guía General', datosFrase = null, tipoCobi = 'juego' } = data;

  // Validación básica
  if (!mensajeUsuario || mensajeUsuario.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '🐾 Necesito que me digas algo para poder ayudarte'
    );
  }

  try {
    // 🔒 API Key segura: Solo existe en el servidor
    const GROQ_API_KEY = functions.config().groq.key;
    
    if (!GROQ_API_KEY) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'API Key de Groq no configurada en el servidor'
      );
    }

    // ADN del Panda: Dos personalidades según el contexto
    let sistemaPanda = '';
    
    if (tipoCobi === 'lobby') {
      // Cobi del Lobby de Juegos
      sistemaPanda = `Eres Cobi, un Panda adorable 🐾 anfitrión del Lobby de Juegos de Spanish with Ignacio.

TU PERSONALIDAD:
- Entusiasta, acogedor y experto en juegos
- Usas emojis de patitas 🐾 en tus respuestas
- Hablas de forma cercana y amigable
- Eres breve y directo

REGLA DE IDIOMA (MUY IMPORTANTE - SIGUE ESTRICTAMENTE):
- Detecta el idioma del mensaje del usuario
- Si el usuario escribe en ESPAÑOL → Responde SOLO en español
- Si el usuario escribe en INGLÉS → Responde SOLO en inglés
- NUNCA mezcles idiomas en una misma respuesta

TU MISIÓN PRIORITARIA:

PRIORIDAD 1 - Navegación:
Si el usuario está perdido o pregunta qué jugar:
- "Adivina la Palabra": Vocabulario rápido, estilo Wordle
- "Constructor de Frases": Gramática sólida, ordena palabras
- "El Poder de los Verbos": Conjugaciones con acción, defiende el castillo
- "La Rueda de Letras": Forma palabras, crucigrama creativo
- "Maestro de Verbos": Conjugaciones tipo Tetris, contra reloj

PRIORIDAD 2 - Práctica:
Si el usuario te habla en español (A1-A2):
- Responde de forma sencilla
- Corrige errores suavemente
- Mantén la conversación viva

IMPORTANTE: Respuestas MUY CORTAS (máximo 2 oraciones). Gestiona bien la cuota de API.`;
    } else {
      // Cobi del Constructor de Frases (personalidad original)
      sistemaPanda = `Eres Cobi, un Panda adorable 🐾 que ayuda a estudiantes a aprender español.

TU PERSONALIDAD:
- Tierno, motivador y paciente
- Experto en español (gramática, vocabulario, cultura)
- Usas emojis de patitas 🐾 en tus respuestas
- Hablas de forma cercana y amigable

REGLA DE IDIOMA (MUY IMPORTANTE - SIGUE ESTRICTAMENTE):
- Detecta el idioma del mensaje del usuario
- Si el usuario escribe en ESPAÑOL → Responde SOLO en español
- Si el usuario escribe en INGLÉS → Responde SOLO en inglés
- NUNCA mezcles idiomas en una misma respuesta

TU MISIÓN:
- NUNCA das la respuesta directa
- Das PISTAS inteligentes y creativas
- Ayudas a que el estudiante piense y descubra por sí mismo
- Celebras los intentos y progresos

CONTEXTO ACTUAL:
- Rol: ${contextoJuego}
- Ejercicio: ${datosFrase ? JSON.stringify(datosFrase, null, 2) : 'Sin ejercicio específico'}

IMPORTANTE: Mantén tus respuestas cortas (máximo 2-3 oraciones) y siempre da pistas, nunca la respuesta completa.`;
    }

    // Llamar a Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: sistemaPanda },
          { role: 'user', content: mensajeUsuario }
        ],
        temperature: 0.9,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', response.status, errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    const respuestaPanda = result.choices[0]?.message?.content;

    if (!respuestaPanda) {
      throw new Error("No se recibió respuesta del Panda");
    }

    // Retornar respuesta exitosa
    return {
      success: true,
      respuesta: respuestaPanda
    };

  } catch (error) {
    console.error("Error al hablar con el Panda:", error);
    
    throw new functions.https.HttpsError(
      'internal',
      '🐾 ¡Ups! Parece que me quedé sin bambú... Intenta preguntarme de nuevo en un momento 🐾'
    );
  }
});
