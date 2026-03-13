import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ── Supported languages ─────────────────────────────────────────────────────
export type Language = 'es' | 'en';

// ── Translation keys (flat dot-notation inferred at runtime) ─────────────────
// We use a plain Record so components just call t('section.key').

interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  tArray: (key: string) => string[];
}

const I18nContext = createContext<I18nContextType>({
  lang: 'es',
  setLang: () => {},
  t: (k) => k,
  tArray: () => [],
});

export const useI18n = () => useContext(I18nContext);

// ── Flatten nested object into dot-notation keys ─────────────────────────────
type TranslationStore = { strings: Record<string, string>; arrays: Record<string, string[]> };

function flatten(obj: Record<string, any>, prefix = ''): TranslationStore {
  const strings: Record<string, string> = {};
  const arrays: Record<string, string[]> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(obj[key])) {
      arrays[fullKey] = obj[key].map(String);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      const child = flatten(obj[key], fullKey);
      Object.assign(strings, child.strings);
      Object.assign(arrays, child.arrays);
    } else {
      strings[fullKey] = String(obj[key]);
    }
  }
  return { strings, arrays };
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
    heading: 'Elige uno de nuestros juegos',
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
  // ── Cobi message arrays ──────────────────────────────────────────────────
  cobi: {
    home: {
      welcome: [
        '¡Bienvenido, compawñero! 🐾 ¿Estás preparado para practicar?',
        '¡Hola! 🎉 Aquí encontrarás todo lo que necesitas para aprender español. 🐾',
        '¡Qué alegría verte! 📚 ¿Listo para mejorar tu español? 🐾',
        '¡Bienvenido a tu espacio de aprendizaje! 🌟 ¡Vamos a aprender juntos! 🐾',
        '¡Hola, estudiante! 🥋 El español te espera. ¿Empezamos? 🐾',
        '¡Encantado de verte! ✨ Explora los juegos y recursos disponibles. 🐾',
      ],
      chatWelcome: '¡Hola! Soy Cobi, tu compañero de aprendizaje.',
      chatWelcomeSub: 'Pregúntame lo que quieras sobre español. ✨',
      chatError: '¡Ups! Tuve un problema. 🐾 Inténtalo de nuevo.',
      chatLoading: 'Cobi está pensando... 🐾',
      chatPlaceholder: 'Escribe tu pregunta...',
    },
    lobby: {
      messages: [
        '¡Datito curioso! 🐾 El español es el idioma más rápido del mundo: ¡7,82 sílabas por segundo! 💨',
        '¡Datito curioso! ✨ La letra \'Ñ\' nació porque unos monjes querían gastar menos pergamino. ¡Ingenioso! 📜',
        '¡Datito curioso! 🍃 Somos los únicos que usamos los signos de apertura (¡ ¿). ¡Sorpresa! 🎉',
        '¡Datito curioso! 🧀 ¡El primer texto en español fue una lista de la compra de quesos hace 1000 años! 📝',
        '🔍 Si buscas vocabulario nuevo, Adivina la Palabra es una gran opción 🐾',
        '🏗️ ¿Practicamos el orden de las palabras en el Constructor de Frases? ✨',
        '🥋 ¡Explota burbujas y entrena verbos en Maestro de Verbos! 🫧',
        '🪄 Refuerza tus verbos y defiende el castillo en El Poder de los Verbos. ✨',
        '¿No sabes por dónde empezar? 🐾 ¡Habla conmigo y te ayudo!',
      ],
      fallback: '¿Qué juego pruebo hoy?',
      chatWelcome: '¡Hola! Soy Cobi, tu anfitrión.',
      chatWelcomeSub: '¿Qué juego quieres explorar hoy?',
      chatError: '🐾 ¡Ups! Algo salió mal. Inténtalo de nuevo.',
      chatLoading: 'Pensando...',
      chatPlaceholder: 'Escribe tu mensaje...',
    },
    powerVerbs: {
      game: [
        '¡Prepara tu varita! ✨',
        '¡Que empiece la magia! 🔮',
        '¡Abre el grimorio! 📖',
        '¡Hora de conjurar! ⚡',
      ],
      menu: [
        '¡Bienvenido, mago! ¿Listo para conjugar? ✨',
        'Mi libro de hechizos está preparado. ¡Vamos! 📖',
        '¿Qué varita usamos hoy? 🪄',
        '¡Vamos a defender el castillo! 🏰',
      ],
      hit: [
        '¡Pretéritum Totalus! ⚡',
        '¡Futurum Primus! ✨',
        '¡Imperativus Maxima! 💥',
        '¡Conjugatio Explosiva! 🔥',
        '¡Verbum Rayo! ⚡',
        '¡Participium Perfectum! 🌟',
        '¡Avada Kedavra, monstruo! 🔥',
      ],
      miss: [
        '¡Irregularis Chaos! 🌀',
        '¡Conjugatio Incompleta! 💨',
        '¡Tildus Absentia! 📉',
        '¡Syntaxis Confusum! 🌫️',
        '¡Verbum Fallidus! 🧨',
        '¡Modus Incorrektus! 🌫️',
        '¡Subjuntivum Dubia... 🌫️',
        '¡Infinitivus Errorus! 💨',
        '¡Gerundium Lento... 🐢',
      ],
      pause: [
        'Recargando maná... 🧘‍♂️',
        'Revisando hechizos 🪄',
        'Meditando el próximo ataque. 🎋',
      ],
      victory: [
        '¡Conjugatum Victorium! 🏆',
        '¡Lo logramos, mago supremo! 🌟',
        '¡Así se hace, leyenda de la magia! 👑',
      ],
      defeat: [
        'Se nos acabó la magia... ¿volvemos a intentarlo? 🪄',
        '¡Necesitamos más MP! 🧪',
        'Quizás necesitamos estudiar más hechizos 📚',
      ],
    },
    verbMaster: {
      menu: [
        '🐾 ¡Bienvenido al Maestro de Verbos! Elige sabiamente tu desafío. 🐾',
        '🎯 Regular o irregular... ¡Tú decides cómo conjugar! 🐾',
        '📚 Cada burbuja es una oportunidad de aprendizaje. ¿Listo? 🐾',
        '🥋 La práctica hace al maestro. ¡Configura tu entrenamiento! 🐾',
        '✨ Las burbujas caen, pero tu conocimiento permanece. ¡Adelante! 🐾',
        '🌟 Empieza con lo que sabes y conquista nuevos niveles. 🐾',
        '🎓 El camino hacia la maestría comienza con una elección. 🐾',
      ],
      game: [
        '🫧 ¡Explota las burbujas con precisión! Cada conjugación cuenta. 🐾',
        '⚡ ¡Rápido pero certero! Las burbujas no esperan. 🐾',
        '🎯 ¡Excelente racha! Mantén el ritmo, aprendiz. 🐾',
        '📖 Respira, piensa y conjuga. ¡No dejes que caigan! 🐾',
        '🌊 Las burbujas fluyen como el tiempo verbal. ¡Domínalas! 🐾',
        '💫 Cada burbuja reventada es un paso hacia la maestría. 🐾',
      ],
      victory: [
        '🏆 ¡Increíble! Has reventado todas las burbujas con maestría. 🐾✨',
        '⭐ ¡Nivel superado! Tu dominio verbal es excepcional. 🐾',
        '🎉 ¡Magnífico, aprendiz! Las burbujas no tienen nada que hacer contigo. 🐾🌟',
      ],
      hit: [
        '🎊 ¡Nivel superado! Tu técnica mejora con cada burbuja. 🐾',
        '⭐ ¡Excelente! Avanzas hacia la maestría verbal. 🐾',
        '🥋 ¡Bien hecho, aprendiz! El siguiente nivel te espera. 🐾',
      ],
      miss: [
        '💪 Las burbujas ganaron esta vez, pero aprenderás de esto. 🐾',
        '🔄 Incluso los maestros dejan caer burbujas. ¡Inténtalo de nuevo! 🐾',
        '🎈 Cada burbuja que cae enseña una lección. ¡No te rindas! 🐾',
      ],
      pause: [
        'Inhala... exhala... 🎋 El descanso es parte del entrenamiento, pequeño saltamontes.',
        'Un buen guerrero sabe cuándo parar para recuperar su energía. 🥋',
        'Meditando... 🧘‍♂️ Estoy preparando mi mente para la próxima ola de verbos.',
      ],
    },
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
    heading: 'Choose one of our games',
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
  // ── Cobi message arrays ──────────────────────────────────────────────────
  cobi: {
    home: {
      welcome: [
        'Welcome, com-paw-nion! 🐾 Ready to practice?',
        'Hi there! 🎉 Everything you need to learn Spanish is right here. 🐾',
        'So good to see you! 📚 Ready to level up your Spanish? 🐾',
        'Welcome to your learning space! 🌟 Let\'s learn together! 🐾',
        'Hello, student! 🥋 Spanish is waiting for you. Shall we begin? 🐾',
        'Great to see you! ✨ Explore the games and resources available. 🐾',
      ],
      chatWelcome: 'Hi! I\'m Cobi, your learning com-paw-nion.',
      chatWelcomeSub: 'Ask me anything about Spanish. ✨',
      chatError: 'Oops! I hit a snag. 🐾 Give it another go.',
      chatLoading: 'Cobi is thinking... 🐾',
      chatPlaceholder: 'Type your question...',
    },
    lobby: {
      messages: [
        'Fun fact! 🐾 Spanish is the fastest language in the world: 7.82 syllables per second! 💨',
        'Fun fact! ✨ The letter \'Ñ\' was born because some monks wanted to save parchment. Clever! 📜',
        'Fun fact! 🍃 We\'re the only ones who use opening marks (¡ ¿). Surprise! 🎉',
        'Fun fact! 🧀 The first Spanish text was a cheese shopping list from 1000 years ago! 📝',
        '🔍 Looking for new vocab? Guess the Word is a great choice 🐾',
        '🏗️ Let\'s practice word order in the Phrase Builder! ✨',
        '🥋 Pop bubbles and train your verbs in Verb Master! 🫧',
        '🪄 Power up your verbs and defend the castle in The Power of Verbs. ✨',
        'Don\'t know where to start? 🐾 Talk to me and I\'ll help you out!',
      ],
      fallback: 'Which game shall I try today?',
      chatWelcome: 'Hi! I\'m Cobi, your host.',
      chatWelcomeSub: 'What game would you like to explore today?',
      chatError: '🐾 Oops! Something went wrong. Try again.',
      chatLoading: 'Thinking...',
      chatPlaceholder: 'Type your message...',
    },
    powerVerbs: {
      game: [
        'Ready your wand! ✨',
        'Let the magic begin! 🔮',
        'Open the grimoire! 📖',
        'Time to cast spells! ⚡',
      ],
      menu: [
        'Welcome, wizard! Ready to conjugate? ✨',
        'My spellbook is ready. Let\'s go! 📖',
        'Which wand shall we use today? 🪄',
        'Let\'s defend the castle! 🏰',
      ],
      hit: [
        'Preteritum Totalus! ⚡',
        'Futurum Primus! ✨',
        'Imperativus Maxima! 💥',
        'Conjugatio Explosiva! 🔥',
        'Verbum Lightning! ⚡',
        'Participium Perfectum! 🌟',
        'Avada Kedavra, monster! 🔥',
      ],
      miss: [
        'Irregularis Chaos! 🌀',
        'Conjugatio Incompleta! 💨',
        'Tildus Absentia! 📉',
        'Syntaxis Confusum! 🌫️',
        'Verbum Fallidus! 🧨',
        'Modus Incorrektus! 🌫️',
        'Subjuntivum Dubia... 🌫️',
        'Infinitivus Errorus! 💨',
        'Gerundium Lento... 🐢',
      ],
      pause: [
        'Recharging mana... 🧘‍♂️',
        'Reviewing spells 🪄',
        'Planning the next attack. 🎋',
      ],
      victory: [
        'Conjugatum Victorium! 🏆',
        'We did it, supreme wizard! 🌟',
        'That\'s how it\'s done, legend of magic! 👑',
      ],
      defeat: [
        'We ran out of magic... shall we try again? 🪄',
        'We need more MP! 🧪',
        'Maybe we need to study more spells 📚',
      ],
    },
    verbMaster: {
      menu: [
        '🐾 Welcome to Verb Master! Choose your challenge wisely. 🐾',
        '🎯 Regular or irregular... You decide how to conjugate! 🐾',
        '📚 Every bubble is a learning opportunity. Ready? 🐾',
        '🥋 Practice makes the master. Set up your training! 🐾',
        '✨ Bubbles fall, but your knowledge stays. Go for it! 🐾',
        '🌟 Start with what you know and conquer new levels. 🐾',
        '🎓 The path to mastery begins with a choice. 🐾',
      ],
      game: [
        '🫧 Pop the bubbles with precision! Every conjugation counts. 🐾',
        '⚡ Fast but accurate! Bubbles won\'t wait. 🐾',
        '🎯 Excellent streak! Keep the pace, apprentice. 🐾',
        '📖 Breathe, think, and conjugate. Don\'t let them fall! 🐾',
        '🌊 Bubbles flow like verb tenses. Master them! 🐾',
        '💫 Every popped bubble is a step toward mastery. 🐾',
      ],
      victory: [
        '🏆 Incredible! You popped all bubbles with mastery. 🐾✨',
        '⭐ Level cleared! Your verb mastery is exceptional. 🐾',
        '🎉 Magnificent, apprentice! Bubbles don\'t stand a chance against you. 🐾🌟',
      ],
      hit: [
        '🎊 Level cleared! Your technique improves with every bubble. 🐾',
        '⭐ Excellent! You\'re advancing toward verb mastery. 🐾',
        '🥋 Well done, apprentice! The next level awaits. 🐾',
      ],
      miss: [
        '💪 The bubbles won this time, but you\'ll learn from this. 🐾',
        '🔄 Even masters let bubbles fall. Try again! 🐾',
        '🎈 Every fallen bubble teaches a lesson. Don\'t give up! 🐾',
      ],
      pause: [
        'Breathe in... breathe out... 🎋 Rest is part of training, young grasshopper.',
        'A good warrior knows when to stop to recover. 🥋',
        'Meditating... 🧘‍♂️ I\'m preparing my mind for the next wave of verbs.',
      ],
    },
  },
});

const dictionaries: Record<Language, TranslationStore> = { es, en };

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

  const t = (key: string): string => dictionaries[lang].strings[key] ?? dictionaries['es'].strings[key] ?? key;
  const tArray = (key: string): string[] => dictionaries[lang].arrays[key] ?? dictionaries['es'].arrays[key] ?? [];

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tArray }}>
      {children}
    </I18nContext.Provider>
  );
};
