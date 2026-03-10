import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ── Supported languages ─────────────────────────────────────────────────────
export type Language = 'es' | 'en';

// ── Translation keys (flat dot-notation inferred at runtime) ─────────────────
// We use a plain Record so components just call t('section.key').
type Translations = Record<string, string>;

interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'es',
  setLang: () => {},
  t: (k) => k,
});

export const useI18n = () => useContext(I18nContext);

// ── Flatten nested object into dot-notation keys ─────────────────────────────
function flatten(obj: Record<string, any>, prefix = ''): Translations {
  const result: Translations = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flatten(obj[key], fullKey));
    } else {
      result[fullKey] = String(obj[key]);
    }
  }
  return result;
}

// ── Spanish (default) ────────────────────────────────────────────────────────
const es = flatten({
  header: {
    home: 'Inicio',
    resources: 'Recursos',
    games: 'Juegos',
    menu: 'Menú',
    soundOn: 'Sonido activado',
    soundOff: 'Sonido desactivado',
    muteSound: 'Silenciar sonido',
    enableSound: 'Activar sonido',
    cobiActive: 'Cobi activo',
    cobiHidden: 'Cobi oculto',
    showCobi: 'Mostrar a Cobi',
    hideCobi: 'Ocultar a Cobi',
    copyright: '© CobiSpanish',
  },
  hero: {
    titleLine1: '¡Aprende español',
    titleLine2: 'divirtiéndote!',
    subtitle: 'Elige uno de nuestros juegos y completa desafíos junto a Cobi, tu compañero en tu aventura para aprender español',
    cta: 'Empezar a Jugar',
    secondary: 'Ver Recursos',
  },
  meetCobi: {
    badge: 'Conoce a Cobi',
    title: '¡Hola! Soy Cobi 🐾',
    paragraph: '¡Hola! Soy Cobi, un panda rojo apasionado por los idiomas y seré tu compañero en esta aventura. Durante los juegos, te daré pistas para que nada te detenga. Si tienes dudas, haz clic en el botón de mi patita para hablar conmigo.',
    highlight: '¡Soy un experto en lengua y cultura hispana y estoy aquí para ayudarte!',
  },
  games: {
    badge: 'Nuestros Juegos',
    title: 'Aprende jugando 🎮',
    subtitle: 'Cinco juegos diseñados para que practiques vocabulario, gramática y conjugaciones de forma divertida. Desde el nivel A1 hasta el B2.',
    note: 'Todos los juegos están disponibles en los niveles A1, A2, B1 y B2. Cobi te acompaña en cada partida para darte pistas y resolver tus dudas.',
    powerVerbs: {
      title: 'El Poder de los Verbos',
      description: 'Defiende el castillo conjugando verbos. Cada respuesta correcta potencia a tu mago y derrota a los monstruos que se acercan.',
      skills: 'Conjugaciones,Reflejos,Vocabulario verbal',
    },
    wordle: {
      title: 'Adivina la Palabra',
      description: 'El clásico juego de palabras adaptado al español. Tienes 6 intentos para descubrir la palabra oculta del día.',
      skills: 'Vocabulario,Ortografía,Deducción',
    },
    letterWheel: {
      title: 'La Rueda de Letras',
      description: 'Forma todas las palabras posibles usando las letras de la rueda para completar el crucigrama del día.',
      skills: 'Vocabulario,Anagramas,Agilidad mental',
    },
    verbMaster: {
      title: 'Maestro de Verbos',
      description: 'Explota las burbujas antes de que lleguen al suelo escribiendo la conjugación correcta. La velocidad aumenta con cada nivel.',
      skills: 'Conjugaciones,Velocidad,Concentración',
    },
    phraseBuilder: {
      title: 'Constructor de Frases',
      description: 'Ordena las palabras desordenadas para formar oraciones correctas en español de forma interactiva y divertida.',
      skills: 'Gramática,Orden de palabras,Comprensión',
    },
  },
  aboutMe: {
    title: 'El creador de CobiSpanish',
    paragraph1: 'Ignacio es un profesor con <strong>más de 10 años de experiencia</strong> guiando a estudiantes de todo el mundo en su camino hacia el español. Como apasionado de la tecnología y la innovación educativa, siempre creyó que aprender un idioma debería sentirse menos como una tarea y más como un descubrimiento.',
    paragraph2: 'Por eso comenzó a crear <strong>CobiSpanish</strong>: un espacio donde sus dos pasiones se unen para ofrecerte recursos interactivos y juegos que rompen con lo tradicional. Su meta es que, con la ayuda de herramientas creativas (y de nuestro querido Cobi), logres la fluidez que buscas de una forma divertida, visual y realmente memorable.',
    statYears: 'Años enseñando',
    statStudents: 'Alumnos felices',
    statResources: 'Recursos creados',
  },
  social: {
    title: 'Sígueme en Redes',
  },
  gamesPage: {
    heading: 'Aprende Jugando',
    subtitle: 'Mejora tu español con nuestros juegos interactivos.',
    playNow: 'Jugar ahora →',
    backToGames: '← Volver a Juegos',
    underConstruction: 'En Construcción',
    comingSoon: 'Este juego estará disponible pronto.',
    powerVerbs: '¡Defiende el castillo! Responde correctamente para potenciar a tu héroe y derrotar a los monstruos.',
    wordle: 'El clásico juego de palabras. Tienes 6 intentos para descubrir la palabra oculta.',
    letterWheel: 'Forma palabras usando las letras de la rueda para completar el crucigrama del día.',
    verbMaster: '¡Explota las burbujas antes de que lleguen al suelo! Practica conjugaciones en un juego estilo Tetris.',
    phraseBuilder: 'Ordena las palabras para formar oraciones gramaticalmente correctas.',
  },
  footer: {
    copyright: '© 2024 Todos los derechos reservados.',
    contact: 'Contacto',
  },
});

// ── English ──────────────────────────────────────────────────────────────────
const en = flatten({
  header: {
    home: 'Home',
    resources: 'Resources',
    games: 'Games',
    menu: 'Menu',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    muteSound: 'Mute sound',
    enableSound: 'Enable sound',
    cobiActive: 'Cobi active',
    cobiHidden: 'Cobi hidden',
    showCobi: 'Show Cobi',
    hideCobi: 'Hide Cobi',
    copyright: '© CobiSpanish',
  },
  hero: {
    titleLine1: 'Learn Spanish',
    titleLine2: 'while having fun!',
    subtitle: 'Choose one of our games and complete challenges alongside Cobi, your companion on your Spanish-learning adventure',
    cta: 'Start Playing',
    secondary: 'View Resources',
  },
  meetCobi: {
    badge: 'Meet Cobi',
    title: 'Hi! I\'m Cobi 🐾',
    paragraph: 'Hi! I\'m Cobi, a red panda who loves languages, and I\'ll be your companion on this adventure. During the games I\'ll give you hints so nothing stops you. If you have questions, click on the paw button to talk to me.',
    highlight: 'I\'m an expert in Spanish language and culture and I\'m here to help you!',
  },
  games: {
    badge: 'Our Games',
    title: 'Learn by playing 🎮',
    subtitle: 'Five games designed for you to practice vocabulary, grammar, and conjugations in a fun way. From level A1 to B2.',
    note: 'All games are available at levels A1, A2, B1, and B2. Cobi joins you in every game to give hints and answer your questions.',
    powerVerbs: {
      title: 'The Power of Verbs',
      description: 'Defend the castle by conjugating verbs. Every correct answer powers up your wizard and defeats approaching monsters.',
      skills: 'Conjugations,Reflexes,Verb vocabulary',
    },
    wordle: {
      title: 'Guess the Word',
      description: 'The classic word game adapted for Spanish. You have 6 attempts to discover today\'s hidden word.',
      skills: 'Vocabulary,Spelling,Deduction',
    },
    letterWheel: {
      title: 'The Letter Wheel',
      description: 'Form all possible words using the letters on the wheel to complete the daily crossword.',
      skills: 'Vocabulary,Anagrams,Mental agility',
    },
    verbMaster: {
      title: 'Verb Master',
      description: 'Pop the bubbles before they reach the ground by typing the correct conjugation. Speed increases with each level.',
      skills: 'Conjugations,Speed,Focus',
    },
    phraseBuilder: {
      title: 'Phrase Builder',
      description: 'Arrange the scrambled words to form correct Spanish sentences in an interactive and fun way.',
      skills: 'Grammar,Word order,Comprehension',
    },
  },
  aboutMe: {
    title: 'The creator of CobiSpanish',
    paragraph1: 'Ignacio is a teacher with <strong>over 10 years of experience</strong> guiding students from around the world on their path to Spanish. Passionate about technology and educational innovation, he always believed that learning a language should feel less like a chore and more like a discovery.',
    paragraph2: 'That\'s why he started creating <strong>CobiSpanish</strong>: a space where his two passions come together to offer you interactive resources and games that break with tradition. His goal is that, with the help of creative tools (and our beloved Cobi), you achieve the fluency you\'re looking for in a fun, visual, and truly memorable way.',
    statYears: 'Years teaching',
    statStudents: 'Happy students',
    statResources: 'Resources created',
  },
  social: {
    title: 'Follow Me',
  },
  gamesPage: {
    heading: 'Learn by Playing',
    subtitle: 'Improve your Spanish with our interactive games.',
    playNow: 'Play now →',
    backToGames: '← Back to Games',
    underConstruction: 'Under Construction',
    comingSoon: 'This game will be available soon.',
    powerVerbs: 'Defend the castle! Answer correctly to power up your hero and defeat the monsters.',
    wordle: 'The classic word game. You have 6 attempts to discover the hidden word.',
    letterWheel: 'Form words using the letters on the wheel to complete the daily crossword.',
    verbMaster: 'Pop the bubbles before they reach the ground! Practice conjugations in a Tetris-style game.',
    phraseBuilder: 'Arrange the words to form grammatically correct sentences.',
  },
  footer: {
    copyright: '© 2024 All rights reserved.',
    contact: 'Contact',
  },
});

const dictionaries: Record<Language, Translations> = { es, en };

// ── Provider ─────────────────────────────────────────────────────────────────
export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('lang');
    return (saved === 'en' ? 'en' : 'es') as Language;
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string): string => dictionaries[lang][key] ?? dictionaries['es'][key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};
