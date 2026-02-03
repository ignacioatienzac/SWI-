import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, RotateCcw, Lightbulb, Check, X, Clock, Hammer, Send } from 'lucide-react';
import { hablarConPanda } from '../services/geminiService';

// Mensajes aleatorios para el bocadillo de Cobi en el menú
const mensajesMenuCobi = [
  "🏗️ ¡Listo para construir frases perfectas! 🐾",
  "✨ Las palabras son como ladrillos, ¡colócalas bien! 🐾",
  "🎯 ¿Práctica, contrarreloj o vidas? ¡Tú eliges! 🐾",
  "🧱 Cada frase correcta suma puntos. ¡Vamos! 🐾",
  "💪 ¡El orden de las palabras es importante! 🐾",
  "📚 Empieza fácil y aumenta la dificultad. 🐾",
  "🎨 ¡Construyamos juntos oraciones increíbles! 🐾"
];

const seleccionarMensajeMenuRandom = (): string => {
  const indice = Math.floor(Math.random() * mensajesMenuCobi.length);
  return mensajesMenuCobi[indice];
};

interface PhraseBuilderGameProps {
  onBack: () => void;
}

type Level = 'A1' | 'A2' | 'B1' | 'B2';
type Difficulty = 'easy' | 'hard';
type GameMode = 'practice' | 'timed' | 'lives';
type GameState = 'MENU' | 'PLAYING' | 'CORRECT' | 'GAMEOVER' | 'VICTORY';

interface Phrase {
  id: number;
  frase_objetivo: string;
  trampas: string[];
  variaciones_validas: string[];
  simplificadas: string[];
  pistas: {
    tema: string;
    descripcion_en: string;
    traduccion_en: string;
  };
}

const PhraseBuilderGame: React.FC<PhraseBuilderGameProps> = ({ onBack }) => {
  // Configuration
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [showColorHints, setShowColorHints] = useState(false);
  const [wordColors, setWordColors] = useState<string[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Cobi Avatar states
  const [cobiImage, setCobiImage] = useState('/data/images/Avatar-construction.webp');
  const [cobiMessage, setCobiMessage] = useState('');
  const [cobiMenuMessage, setCobiMenuMessage] = useState(''); // Mensaje del menú
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'cobi', text: string}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [showButtonPulse, setShowButtonPulse] = useState(false);
  const cobiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiPromptTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cobi avatar image URLs - centralized for easy scalability
  const COBI_AVATARS = {
    construction: {
      base: '/data/images/Avatar-construction.webp',
      success: '/data/images/Avatar-construction-correcto.webp',
      error: '/data/images/Avatar-construction-fallo.webp'
    },
    // Future avatars can be added here:
    // detective: { base: '...', success: '...', error: '...' },
    // sensei: { base: '...', success: '...', error: '...' }
  };
  
  // Preload utility function
  const preloadCobiAvatars = (avatarUrls: string[]) => {
    avatarUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  };
  
  // Preload all Cobi avatars on mount
  useEffect(() => {
    const allAvatarUrls = Object.values(COBI_AVATARS).flatMap(avatar => 
      Object.values(avatar)
    );
    preloadCobiAvatars(allAvatarUrls);
  }, []);
  
  // Seleccionar mensaje aleatorio para el menú
  useEffect(() => {
    setCobiMenuMessage(seleccionarMensajeMenuRandom());
  }, []);
  
  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  };

  const playClick = () => playTone(600, 0.08, 'sine');
  const playSuccess = () => {
    playTone(523, 0.12, 'triangle');
    setTimeout(() => playTone(659, 0.12, 'triangle'), 100);
    setTimeout(() => playTone(784, 0.2, 'sine'), 200);
  };
  const playError = () => {
    playTone(200, 0.15, 'sawtooth');
    setTimeout(() => playTone(150, 0.15, 'square'), 80);
  };
  const playPlace = () => playTone(440, 0.06, 'triangle');

  // Cobi messages by type
  const cobiMessages = {
    start: [
      "¡Patitas a la obra! 🐾",
      "¡Los materiales están listos! 👷‍♂️",
      "¡Hola, constructor! ¿Empezamos? 🏗️"
    ],
    success: [
      "¡Ha encajado a la perfección! ¡Eres un crack! ✨",
      "Esta frase es tan fuerte como una roca. 🐾",
      "¡Impresionante! Tienes madera de gran arquitecto del español."
    ],
    error: [
      "¡Mmmmpf! Creo que esa pieza no iba ahí... 👷‍♂️",
      "¡Cuidado! Si ponemos las palabras así, la estructura se cae. 🐾",
      "¡Ups! Se me ha resbalado el casco del susto. ¡Inténtalo otra vez! ✨"
    ],
    aiPrompt: [
      "¿Te has quedado sin cemento? ¡Pregúntame y te doy una pista! 🐾",
      "Si el plano está muy difícil, ¡haz clic en mi chat y lo resolvemos juntos! ✨",
      "¡No te atasques! Yo tengo los planos secretos... ¡pídeme ayuda! 👷‍♂️"
    ]
  };

  const getRandomMessage = (type: 'start' | 'success' | 'error' | 'aiPrompt') => {
    const messages = cobiMessages[type];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Cobi Avatar reaction
  const changeCobiState = (state: 'base' | 'success' | 'error' | 'start') => {
    // Clear any existing timers
    if (cobiTimerRef.current) {
      clearTimeout(cobiTimerRef.current);
    }
    if (aiPromptTimerRef.current) {
      clearTimeout(aiPromptTimerRef.current);
    }

    // Change image and message based on state (synchronized in same state update)
    if (state === 'success') {
      // Synchronize image and message update
      const message = getRandomMessage('success');
      setCobiImage(COBI_AVATARS.construction.success);
      setCobiMessage(message);
    } else if (state === 'error') {
      // Synchronize image and message update
      const message = getRandomMessage('error');
      setCobiImage(COBI_AVATARS.construction.error);
      setCobiMessage(message);
    } else if (state === 'start') {
      const message = getRandomMessage('start');
      setCobiImage(COBI_AVATARS.construction.base);
      setCobiMessage(message);
      // Set timer for AI prompt after 15 seconds of inactivity
      aiPromptTimerRef.current = setTimeout(() => {
        setCobiMessage(getRandomMessage('aiPrompt'));
      }, 15000);
      return;
    } else {
      const message = getRandomMessage('start');
      setCobiImage(COBI_AVATARS.construction.base);
      setCobiMessage(message);
      return;
    }

    // Return to start state after 3 seconds
    cobiTimerRef.current = setTimeout(() => {
      const message = getRandomMessage('start');
      setCobiImage(COBI_AVATARS.construction.base);
      setCobiMessage(message);
      // Restart AI prompt timer
      aiPromptTimerRef.current = setTimeout(() => {
        setCobiMessage(getRandomMessage('aiPrompt'));
      }, 15000);
    }, 3000);
  };

  // Send message to Cobi
  const sendMessageToCobi = async () => {
    if (!chatInput.trim() || isLoadingResponse) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to history
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoadingResponse(true);

    try {
      // Prepare context
      const currentPhrase = phrases[currentPhraseIndex];
      const contextoJuego = {
        juego: 'Constructor de Frases',
        nivel: selectedLevel,
        dificultad: selectedDifficulty,
        modo: selectedMode,
        frase_objetivo: currentPhrase.frase_objetivo,
        palabras_disponibles: availableWords,
        palabras_seleccionadas: selectedWords,
        intentos_fallidos: selectedMode === 'lives' ? (3 - lives) : 0,
        racha: streak,
        pistas: currentPhrase.pistas
      };

      // Call Cobi AI
      const response = await hablarConPanda(
        userMessage,
        'Constructor de Frases - Maestro Arquitecto',
        contextoJuego
      );

      // Add Cobi response to history
      setChatHistory(prev => [...prev, { role: 'cobi', text: response }]);
    } catch (error) {
      console.error('Error al comunicarse con Cobi:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'cobi', text: '¡Ups! Parece que se me cayó el casco y perdí la conexión. ¿Puedes intentarlo otra vez? 🐾' }
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Load phrases
  useEffect(() => {
    const loadPhrases = async () => {
      if (!selectedLevel) return; // No cargar si no hay nivel seleccionado
      
      try {
        const response = await fetch(`/data/frases-${selectedLevel.toLowerCase()}.json`);
        if (response.ok) {
          const data = await response.json();
          // Shuffle phrases for random order
          setPhrases(shuffleArray(data));
        }
      } catch (error) {
        console.error('Error loading phrases:', error);
      }
    };
    loadPhrases();
  }, [selectedLevel]);

  // Timer for timed mode
  useEffect(() => {
    if (gameState === 'PLAYING' && selectedMode === 'timed' && timeLeft > 0 && !isPaused) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('GAMEOVER');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, selectedMode, timeLeft, isPaused]);
  // Auto-pause when tab loses focus (timed mode only)
  useEffect(() => {
    if (gameState === 'PLAYING' && selectedMode === 'timed') {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setIsPaused(true);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [gameState, selectedMode]);

  // Cleanup Cobi timers on unmount
  useEffect(() => {
    return () => {
      if (cobiTimerRef.current) {
        clearTimeout(cobiTimerRef.current);
      }
      if (aiPromptTimerRef.current) {
        clearTimeout(aiPromptTimerRef.current);
      }
    };
  }, []);

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Start game
  const startGame = () => {
    if (phrases.length === 0) return;
    
    setScore(0);
    setStreak(0);
    setLives(3);
    setTimeLeft(60);
    setCurrentPhraseIndex(0);
    setShowHint(false);
    loadPhrase(0);
    setGameState('PLAYING');
  };

  // Load a phrase
  const loadPhrase = (index: number) => {
    if (index >= phrases.length) {
      setGameState('VICTORY');
      return;
    }
    
    const phrase = phrases[index];
    // Split phrase into words, separating final punctuation (except periods which are removed)
    // First, split by spaces and punctuation
    const rawWords = phrase.frase_objetivo.match(/[\w\u00C0-\u024F]+|[.,!?¡¿]/g) || [];
    
    const processedWords: string[] = [];
    
    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i];
      
      // Skip periods (.) entirely
      if (word === '.') continue;
      
      // Keep opening punctuation (¿, ¡) as separate words
      if (word === '¿' || word === '¡') {
        processedWords.push(word);
      }
      // Keep closing punctuation (?, !) as separate words
      else if (word === '?' || word === '!') {
        processedWords.push(word);
      }
      // Keep commas as separate blocks
      else if (word === ',') {
        processedWords.push(word);
      }
      // Regular words
      else {
        processedWords.push(word);
      }
    }
    
    let allWords = [...processedWords];
    
    // In hard mode, add trap words
    if (selectedDifficulty === 'hard' && phrase.trampas) {
      allWords = [...allWords, ...phrase.trampas];
    }
    
    setAvailableWords(shuffleArray(allWords));
    setSelectedWords([]);
    setShowHint(false);
    setFeedback(null);
    setShowColorHints(false);
    setWordColors([]);
    changeCobiState('start'); // Reset Cobi to start state for new phrase
  };

  // Select a word from available
  const selectWord = (word: string, index: number) => {
    playPlace();
    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);
    setSelectedWords([...selectedWords, word]);
  };

  // Deselect a word (return to available)
  const deselectWord = (word: string, index: number) => {
    playClick();
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, word]);
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Reorder array
    const newWords = [...selectedWords];
    const draggedWord = newWords[draggedIndex];
    
    // Remove from old position
    newWords.splice(draggedIndex, 1);
    
    // Insert at new position
    newWords.splice(index, 0, draggedWord);
    
    setSelectedWords(newWords);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Join words properly without spaces around punctuation
  const joinWords = (words: string[]): string => {
    let result = '';
    const punctuation = [',', '.', '!', '?', '¡', '¿', ';', ':'];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // If it's punctuation or starts with punctuation that should attach, don't add space before
      if (punctuation.includes(word) || word.startsWith(',') || word.startsWith('.') || 
          word.startsWith('!') || word.startsWith('?') || word.startsWith(';') || word.startsWith(':')) {
        result += word;
      }
      // If previous word ends with opening punctuation, don't add space
      else if (i > 0 && (words[i-1] === '¿' || words[i-1] === '¡')) {
        result += word;
      }
      // Otherwise add space before word (unless it's the first word)
      else {
        result += (i === 0 ? '' : ' ') + word;
      }
    }
    
    return result;
  };

  // Calculate color hints for selected words
  const calculateColorHints = () => {
    const currentPhrase = phrases[currentPhraseIndex];
    const normalize = (str: string) => str.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
    
    // Get the correct answer (including commas as separate blocks, excluding periods)
    const correctWords = currentPhrase.frase_objetivo.match(/[\w\u00C0-\u024F]+|[,!?¡¿]/g)?.filter(w => w !== '.') || [];
    const normalizedCorrectWords = correctWords.map(w => normalize(w));
    
    const colors: string[] = [];
    
    if (selectedDifficulty === 'easy') {
      // Easy mode: green if correct position, red if not
      for (let i = 0; i < selectedWords.length; i++) {
        if (normalize(selectedWords[i]) === normalizedCorrectWords[i]) {
          colors.push('green');
        } else {
          colors.push('red');
        }
      }
    } else {
      // Hard mode: green if correct position, orange if in phrase but wrong position, red if not in phrase
      for (let i = 0; i < selectedWords.length; i++) {
        const normalizedWord = normalize(selectedWords[i]);
        
        if (normalizedWord === normalizedCorrectWords[i]) {
          colors.push('green');
        } else if (normalizedCorrectWords.includes(normalizedWord)) {
          colors.push('blue');
        } else {
          colors.push('red');
        }
      }
    }
    
    setWordColors(colors);
    setShowColorHints(true);
  };

  // Check answer
  const checkAnswer = () => {
    const currentPhrase = phrases[currentPhraseIndex];
    const userAnswer = joinWords(selectedWords);
    
    // Normalize for comparison - remove periods, commas, normalize whitespace and case
    const normalize = (str: string) => str.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
    
    let isCorrect = false;
    
    if (selectedDifficulty === 'easy') {
      // In easy mode, must use ALL available words (no simplificadas allowed)
      if (selectedWords.length === availableWords.length + selectedWords.length) {
        // Check against target phrase and valid variations only
        isCorrect = 
          normalize(userAnswer) === normalize(currentPhrase.frase_objetivo) ||
          currentPhrase.variaciones_validas?.some(v => normalize(userAnswer) === normalize(v));
      }
    } else {
      // In hard mode, check against target phrase, valid variations, and simplified versions
      isCorrect = 
        normalize(userAnswer) === normalize(currentPhrase.frase_objetivo) ||
        currentPhrase.variaciones_validas?.some(v => normalize(userAnswer) === normalize(v)) ||
        currentPhrase.simplificadas?.some(s => normalize(userAnswer) === normalize(s));
    }
    
    if (isCorrect) {
      playSuccess();
      changeCobiState('success'); // Cobi reacciona con alegría
      const points = selectedDifficulty === 'hard' ? 20 : 10;
      const streakBonus = Math.min(streak * 2, 20);
      setScore(prev => prev + points + streakBonus);
      setStreak(prev => prev + 1);
      setFeedback({ type: 'success', message: `¡Correcto! +${points + streakBonus} puntos` });
      setShowColorHints(false);
      setWordColors([]);
      
      // Add 10 seconds in timed mode
      if (selectedMode === 'timed') {
        setTimeLeft(prev => prev + 10);
      }
      
      setTimeout(() => {
        setCurrentPhraseIndex(prev => prev + 1);
        loadPhrase(currentPhraseIndex + 1);
      }, 1500);
    } else {
      playError();
      changeCobiState('error'); // Cobi reacciona con ánimo
      setStreak(0);
      setFeedback({ type: 'error', message: 'Inténtalo de nuevo' });
      setShowColorHints(false);
      setWordColors([]);
      
      // Activate chat button pulse animation
      setShowButtonPulse(true);
      setTimeout(() => setShowButtonPulse(false), 3000);
      
      if (selectedMode === 'lives') {
        setLives(prev => {
          if (prev <= 1) {
            setTimeout(() => setGameState('GAMEOVER'), 500);
            return 0;
          }
          return prev - 1;
        });
      }
    }
  };

  // Reset current phrase
  const resetPhrase = () => {
    playClick();
    setShowColorHints(false);
    setWordColors([]);
    setFeedback(null);
    loadPhrase(currentPhraseIndex);
  };

  // --- MENU STATE ---
  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 text-gray-500 hover:text-deep-blue font-medium flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={20} />
            Volver a Juegos
          </button>

          <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-amber-200">
            {/* Header with construction theme */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg mb-4">
                <Hammer size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-black text-amber-700 mb-2">
                🏗️ Constructor de Frases
              </h1>
              <p className="text-gray-600">
                ¡Construye oraciones ordenando las palabras correctamente!
              </p>
            </div>

            {/* Level Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📚 Nivel de Español
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['A1', 'A2', 'B1', 'B2'] as Level[]).map(level => {
                  const isDisabled = level !== 'A1';
                  return (
                    <button
                      key={level}
                      onClick={() => !isDisabled && setSelectedLevel(level)}
                      disabled={isDisabled}
                      className={`py-3 rounded-xl border-2 font-bold transition-all ${
                        selectedLevel === level
                          ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      {level}
                      {isDisabled && <span className="text-xs block">Próximamente</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ⚙️ Dificultad
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedDifficulty('easy')}
                  className={`py-4 rounded-xl border-2 font-bold transition-all relative ${
                    selectedDifficulty === 'easy'
                      ? 'border-green-500 bg-green-500 text-white shadow-md'
                      : selectedDifficulty === null
                      ? 'border-gray-300 text-gray-700 hover:border-green-300 hover:bg-green-50'
                      : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <button
                    onMouseEnter={() => setShowTooltip('easy')}
                    onMouseLeave={() => setShowTooltip(null)}
                    onClick={(e) => { e.stopPropagation(); setShowTooltip(showTooltip === 'easy' ? null : 'easy'); }}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 text-xs flex items-center justify-center transition-colors"
                  >
                    ?
                  </button>
                  {showTooltip === 'easy' && (
                    <div className="absolute -top-12 left-0 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg z-10 whitespace-nowrap">
                      Solo palabras necesarias
                    </div>
                  )}
                  <span className="text-lg">😊 Fácil</span>
                </button>
                <button
                  onClick={() => setSelectedDifficulty('hard')}
                  className={`py-4 rounded-xl border-2 font-bold transition-all relative ${
                    selectedDifficulty === 'hard'
                      ? 'border-red-500 bg-red-500 text-white shadow-md'
                      : selectedDifficulty === null
                      ? 'border-gray-300 text-gray-700 hover:border-red-300 hover:bg-red-50'
                      : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <button
                    onMouseEnter={() => setShowTooltip('hard')}
                    onMouseLeave={() => setShowTooltip(null)}
                    onClick={(e) => { e.stopPropagation(); setShowTooltip(showTooltip === 'hard' ? null : 'hard'); }}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 text-xs flex items-center justify-center transition-colors"
                  >
                    ?
                  </button>
                  {showTooltip === 'hard' && (
                    <div className="absolute -top-12 left-0 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg z-10 whitespace-nowrap">
                      Incluye palabras trampa
                    </div>
                  )}
                  <span className="text-lg">😈 Difícil</span>
                </button>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🎮 Modo de Juego
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedMode('practice')}
                  className={`py-4 rounded-xl border-2 font-bold transition-all ${
                    selectedMode === 'practice'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : selectedMode === null
                      ? 'border-gray-300 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-2xl mb-1 block">📖</span>
                  <span>Práctica</span>
                </button>
                <button
                  onClick={() => setSelectedMode('timed')}
                  className={`py-4 rounded-xl border-2 font-bold transition-all ${
                    selectedMode === 'timed'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : selectedMode === null
                      ? 'border-gray-300 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-2xl mb-1 block">⏱️</span>
                  <span>Contrarreloj</span>
                </button>
                <button
                  onClick={() => setSelectedMode('lives')}
                  className={`py-4 rounded-xl border-2 font-bold transition-all ${
                    selectedMode === 'lives'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : selectedMode === null
                      ? 'border-gray-300 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-2xl mb-1 block">❤️</span>
                  <span>Vidas</span>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              disabled={phrases.length === 0 || !selectedLevel || !selectedDifficulty || !selectedMode}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xl rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <Play size={24} />
              {!selectedLevel || !selectedDifficulty || !selectedMode ? 'Elige todas las opciones' : '¡Empezar a Construir!'}
            </button>
          </div>
        </div>
        
        {/* Cobi Constructor en el menú (solo desktop) */}
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje aleatorio */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiMenuMessage || "🏗️ ¡Construyamos frases juntos! 🐾"}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
            </div>
            
            {/* Imagen de Cobi Constructor pensando */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="/data/images/cobi-constructor-pensando.webp"
                alt="Cobi Constructor pensando" 
                className="w-56 h-auto object-contain"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME OVER STATE ---
  if (gameState === 'GAMEOVER') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏚️</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">
            {selectedMode === 'timed' ? '¡Tiempo agotado!' : '¡Sin vidas!'}
          </h2>
          <p className="text-gray-600 mb-6">La construcción se ha detenido</p>
          
          <div className="bg-amber-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-700 font-medium">Puntuación final</p>
            <p className="text-4xl font-black text-amber-600">{score}</p>
            <p className="text-sm text-gray-500 mt-2">
              Frases completadas: {currentPhraseIndex}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setGameState('MENU')}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Menú
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VICTORY STATE ---
  if (gameState === 'VICTORY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-yellow-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-black text-amber-700 mb-2">
            ¡Construcción Completa!
          </h2>
          <p className="text-gray-600 mb-6">Has completado todas las frases</p>
          
          <div className="bg-amber-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-700 font-medium">Puntuación final</p>
            <p className="text-4xl font-black text-amber-600">{score}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setGameState('MENU')}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Menú
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
            >
              Jugar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING STATE ---
  const currentPhrase = phrases[currentPhraseIndex];
  
  // Show pause overlay for timed mode
  if (isPaused && selectedMode === 'timed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-12 shadow-2xl border-4 border-amber-200 text-center max-w-md">
          <div className="text-6xl mb-4">⏸️</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">Juego Pausado</h2>
          <p className="text-gray-600 mb-6">Tómate un descanso</p>
          <button
            onClick={() => setIsPaused(false)}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            ▶️ Continuar
          </button>
          <button
            onClick={() => setGameState('MENU')}
            className="w-full mt-3 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all"
          >
            Volver al Menú
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 relative overflow-hidden">
      {/* Construction background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Bricks pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-amber-200/30 to-transparent"></div>
        {/* Scaffolding lines */}
        <div className="absolute top-20 left-10 w-2 h-40 bg-amber-300/20 rounded-full"></div>
        <div className="absolute top-40 left-8 w-8 h-2 bg-amber-300/20 rounded-full"></div>
        <div className="absolute top-20 right-10 w-2 h-40 bg-amber-300/20 rounded-full"></div>
        <div className="absolute top-40 right-8 w-8 h-2 bg-amber-300/20 rounded-full"></div>
        {/* Decorative emojis */}
        <div className="absolute top-10 right-20 text-4xl opacity-20 transform rotate-12">🔨</div>
        <div className="absolute bottom-20 left-20 text-4xl opacity-20 transform -rotate-12">🔧</div>
        <div className="absolute top-1/2 right-10 text-4xl opacity-20">🧱</div>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 bg-white/90 backdrop-blur rounded-2xl p-4 shadow-md border-2 border-amber-200">
          <button
            onClick={() => setGameState('MENU')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xs text-gray-500 font-medium">PUNTOS</p>
              <p className="text-2xl font-black text-amber-600">{score}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">RACHA</p>
              <p className="text-2xl font-black text-orange-500">🔥 {streak}</p>
            </div>
            {selectedMode === 'timed' && (
              <div>
                <p className="text-xs text-gray-500 font-medium">TIEMPO</p>
                <p className={`text-2xl font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                  <Clock className="inline w-5 h-5 mr-1" />
                  {timeLeft}s
                </p>
              </div>
            )}
            {selectedMode === 'timed' && (
              <div>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`p-2 rounded-full transition-colors ${
                    isPaused ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  }`}
                  title={isPaused ? 'Reanudar' : 'Pausar'}
                >
                  {isPaused ? '▶️' : '⏸️'}
                </button>
              </div>
            )}
            {selectedMode === 'lives' && (
              <div>
                <p className="text-xs text-gray-500 font-medium">VIDAS</p>
                <p className="text-2xl font-black text-red-500">
                  {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
                </p>
              </div>
            )}
            <div>
              <button
                onClick={() => setShowHint(!showHint)}
                className={`p-2 rounded-full transition-colors ${
                  showHint ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-400'
                }`}
                title="Mostrar pista"
              >
                <Lightbulb size={24} />
              </button>
            </div>
            <div>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className={`p-2 rounded-full transition-colors ${
                  showInstructions ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-400'
                }`}
                title="Ver instrucciones"
              >
                <span className="text-xl font-bold">?</span>
              </button>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">FRASE</p>
            <p className="text-lg font-bold text-gray-700">{currentPhraseIndex + 1}/{phrases.length}</p>
          </div>
        </div>

        {/* Hint display */}
        {showHint && currentPhrase && (
          <div className="bg-blue-100 rounded-xl p-4 mb-4 border-2 border-blue-300 shadow-md">
            <p className="text-blue-800 text-center font-medium italic">
              "{currentPhrase.pistas.traduccion_en}"
            </p>
          </div>
        )}

        {/* Instructions display */}
        {showInstructions && (
          <div className="bg-purple-100 rounded-xl p-4 mb-4 border-2 border-purple-300 shadow-md">
            <h3 className="text-purple-800 font-bold mb-2 text-center">🎯 Instrucciones</h3>
            {selectedDifficulty === 'easy' ? (
              <div className="text-purple-800 text-sm space-y-2">
                <p>• <strong>Objetivo:</strong> Construye la frase usando TODAS las piezas disponibles</p>
                <p>• <strong>Ayuda visual:</strong> Si te equivocas, pulsa "Ver posiciones" para ver:</p>
                <p className="ml-4">🟢 <strong>Verde:</strong> La pieza está en la posición correcta</p>
                <p className="ml-4">🔴 <strong>Rojo:</strong> La pieza NO está en la posición correcta</p>
              </div>
            ) : (
              <div className="text-purple-800 text-sm space-y-2">
                <p>• <strong>Objetivo:</strong> Construye frases válidas usando las piezas correctas</p>
                <p>• <strong>Palabras trampa:</strong> Algunas piezas NO forman parte de la frase</p>
                <p>• <strong>Ayuda visual:</strong> Si te equivocas, pulsa "Ver posiciones" para ver:</p>
                <p className="ml-4">🟢 <strong>Verde:</strong> La pieza está en la posición correcta</p>
                <p className="ml-4">🔵 <strong>Azul:</strong> La pieza es correcta pero está mal ubicada</p>
                <p className="ml-4">🔴 <strong>Rojo:</strong> La pieza NO forma parte de la frase</p>
              </div>
            )}
          </div>
        )}

        {/* Word count indicator for hard mode */}
        {selectedDifficulty === 'hard' && currentPhrase && (
          <div className="bg-amber-100 rounded-xl p-3 mb-4 border-2 border-amber-300">
            <p className="text-sm text-amber-800 text-center font-bold">
              🎯 Usa {currentPhrase.frase_objetivo.match(/[\w\u00C0-\u024F]+|[!?¡¿]/g)?.length || 0} piezas
            </p>
          </div>
        )}
        {/* Construction Zone - Selected Words */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg mb-4 border-4 border-dashed border-amber-300 min-h-[120px]">
          <div className="flex items-center gap-2 mb-3">
            <Hammer size={20} className="text-amber-600" />
            <span className="text-sm font-bold text-amber-700">ZONA DE CONSTRUCCIÓN</span>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[50px]">
            {selectedWords.length === 0 ? (
              <p className="text-gray-400 italic">Arrastra las palabras aquí para construir la frase...</p>
            ) : (
              selectedWords.map((word, index) => {
                const getBorderColor = () => {
                  if (!showColorHints || !wordColors[index]) return '';
                  if (wordColors[index] === 'green') return 'border-4 border-green-500';
                  if (wordColors[index] === 'blue') return 'border-4 border-blue-500';
                  if (wordColors[index] === 'red') return 'border-4 border-red-500';
                  return '';
                };
                
                return (
                  <button
                    key={`selected-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => deselectWord(word, index)}
                    className={`px-4 py-2 bg-gradient-to-b from-amber-400 to-amber-500 text-white font-bold rounded-lg shadow-md hover:from-amber-500 hover:to-amber-600 transition-all transform hover:scale-105 active:scale-95 cursor-move ${
                      draggedIndex === index ? 'opacity-50 scale-95' : ''
                    } ${getBorderColor()}`}
                    style={{
                      boxShadow: '0 4px 0 0 rgba(180, 83, 9, 0.5), 0 6px 10px rgba(0,0,0,0.15)'
                    }}
                  >
                    {word}
                  </button>
                );
              })
            )}
          </div>
          
          {/* Feedback */}
          {feedback && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${
              feedback.type === 'success' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {feedback.type === 'success' ? <Check size={20} /> : <X size={20} />}
              <span className="font-bold">{feedback.message}</span>
            </div>
          )}
          
          {/* Color Hints Button - Only show after wrong answer */}
          {feedback?.type === 'error' && selectedWords.length > 0 && (
            <button
              onClick={calculateColorHints}
              className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Lightbulb size={18} />
              Ver posiciones
            </button>
          )}
        </div>

        {/* Available Words (Building Materials) */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg mb-4 border-2 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🧱</span>
            <span className="text-sm font-bold text-gray-600">MATERIALES DISPONIBLES</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {availableWords.map((word, index) => (
              <button
                key={`available-${index}`}
                onClick={() => selectWord(word, index)}
                className="px-4 py-2 bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 font-bold rounded-lg shadow hover:from-amber-100 hover:to-amber-200 hover:text-amber-800 transition-all transform hover:scale-105 active:scale-95 border-2 border-gray-300 hover:border-amber-400"
                style={{
                  boxShadow: '0 3px 0 0 rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0,0,0,0.1)'
                }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={resetPhrase}
            className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} />
            Reiniciar
          </button>
          <button
            onClick={checkAnswer}
            disabled={selectedWords.length === 0}
            className="flex-2 py-4 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Comprobar Frase
          </button>
        </div>
      </div>

      {/* Cobi Avatar - Asomándose desde la esquina inferior derecha */}
      {gameState === 'PLAYING' && (
        <>
          <div className="hidden lg:block fixed bottom-0 right-0 z-40 pointer-events-none overflow-visible">
            <div className="relative animate-float">
              {/* Bocadillo de diálogo */}
              {cobiMessage && !showChatWindow && (
                <div className="absolute top-16 -left-48 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border-2 border-gray-200 pointer-events-auto animate-fade-in">
                  <p className="text-gray-700 font-semibold text-sm text-center leading-snug whitespace-pre-line max-w-[180px]">
                    {cobiMessage}
                  </p>
                  {/* Pico del bocadillo */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
                </div>
              )}
              
              {/* Imagen del panda con sombra sutil */}
              <div className="relative -mb-16 -mr-8">
                {/* Hidden pre-rendered images for instant switching - no network delay */}
                <div className="absolute inset-0" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                  <img src={COBI_AVATARS.construction.base} alt="Preload base" />
                  <img src={COBI_AVATARS.construction.success} alt="Preload success" />
                  <img src={COBI_AVATARS.construction.error} alt="Preload error" />
                </div>
                
                {/* Active avatar with smooth transition */}
                <img
                  src={cobiImage}
                  alt="Cobi el Constructor"
                  className="w-56 h-auto object-contain transition-opacity duration-300"
                  style={{
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                  }}
                />
              </div>

              {/* Chat Button Wrapper - Moves with Cobi */}
              <div className="chat-button-wrapper">
                <div
                  onClick={() => setShowChatWindow(!showChatWindow)}
                  className={`cobi-chat-button ${
                    showButtonPulse ? 'pulse-button' : ''
                  }`}
                >
                  <svg viewBox="0 0 100 100" className="curved-text-svg">
                    <path id="chatTextPath" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                    <text>
                      <textPath href="#chatTextPath" startOffset="50%" textAnchor="middle" className="curved-text-style">
                        CHATEAR
                      </textPath>
                    </text>
                  </svg>
                  <div className="paws-icon">🐾</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Window */}
          {showChatWindow && (
            <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐾</span>
                  <div>
                    <h3 className="text-white font-bold text-sm">Cobi el Constructor</h3>
                    <p className="text-white/80 text-xs">Tu asistente arquitecto</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatWindow(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* Chat History */}
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-amber-50/30 to-white">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    <p className="mb-2">👷‍♂️</p>
                    <p>¡Hola! Soy Cobi, tu arquitecto personal.</p>
                    <p className="text-xs mt-2">Pregúntame lo que necesites sobre esta frase.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-white border-2 border-amber-200 text-gray-700'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Loading state */}
                {isLoadingResponse && (
                  <div className="flex justify-start">
                    <div className="bg-white border-2 border-amber-200 rounded-2xl px-4 py-3">
                      <p className="text-sm text-gray-600">
                        El Panda está revisando los planos... 🐾
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t-2 border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessageToCobi()}
                    placeholder="Escribe tu pregunta..."
                    disabled={isLoadingResponse}
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-amber-400 transition text-sm disabled:bg-gray-100"
                  />
                  <button
                    onClick={sendMessageToCobi}
                    disabled={isLoadingResponse || !chatInput.trim()}
                    className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PhraseBuilderGame;
