import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, RotateCcw, Lightbulb, Check, X, Clock, Hammer, Send } from 'lucide-react';
import { hablarConPanda } from '../services/geminiService';
import DraggableCobi from './DraggableCobi';

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
  cobiVisible?: boolean;
  soundEnabled?: boolean;
}

type Level = 'A1' | 'A2' | 'B1' | 'B2';
type Difficulty = 'easy' | 'hard';
type GameMode = 'practice' | 'timed' | 'lives';
type GameState = 'MENU' | 'PLAYING' | 'CORRECT' | 'GAMEOVER' | 'VICTORY';
type PhraseLength = 'short' | 'long';

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

const PhraseBuilderGame: React.FC<PhraseBuilderGameProps> = ({ onBack, cobiVisible = true, soundEnabled = true }) => {
  // Configuration
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedPhraseLength, setSelectedPhraseLength] = useState<PhraseLength | null>(null);
  const [practiceCount, setPracticeCount] = useState(10);

  // B1 only has short phrases — auto-correct if 'long' was selected
  const longDisabled = selectedLevel === 'B1';
  useEffect(() => {
    if (longDisabled && selectedPhraseLength === 'long') {
      setSelectedPhraseLength('short');
    }
  }, [longDisabled, selectedPhraseLength]);
  
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
  const [cobiImage, setCobiImage] = useState('./data/images/Avatar-construction.webp');
  const [cobiMessage, setCobiMessage] = useState('');
  const [cobiMenuMessage, setCobiMenuMessage] = useState(''); // Mensaje del menú
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'cobi', text: string}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [showButtonPulse, setShowButtonPulse] = useState(false);
  const cobiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiPromptTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuPage, setMobileMenuPage] = useState(1);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to top on mount so the game always starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, []);

  // Scroll to top whenever gameState changes (entering menu or playing)
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, [gameState]);

  // Prevent page scroll while playing (desktop & mobile)
  useEffect(() => {
    if (gameState === 'PLAYING') {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [gameState]);
  
  // Cobi avatar image URLs - centralized for easy scalability
  const COBI_AVATARS = {
    construction: {
      base: './data/images/Avatar-construction.webp',
      success: './data/images/Avatar-construction-correcto.webp',
      error: './data/images/Avatar-construction-fallo.webp'
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
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabledRef.current) return;
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
      let contextoJuego;
      let tipo: 'lobby' | 'juego';

      // Si estamos en el menú, contexto de lobby
      if (gameState === 'MENU') {
        contextoJuego = {
          juego: 'Constructor de Frases',
          estado: 'menu',
          nivel_seleccionado: selectedLevel || 'ninguno',
          longitud_frases: selectedPhraseLength === 'short' ? 'cortas' : selectedPhraseLength === 'long' ? 'largas' : 'ninguna',
          dificultad_seleccionada: selectedDifficulty || 'ninguna',
          modo_seleccionado: selectedMode || 'ninguno',
          modos_disponibles: {
            'Orden Maestro': 'Ordena las palabras exactamente como aparecen en español',
            'Arquitecto Libre': 'Construye la frase con las palabras en cualquier orden',
            'Desafío Bilingüe': 'Traduce del inglés al español usando las palabras disponibles'
          }
        };
        tipo = 'lobby';
      } else {
        // Si estamos jugando, contexto de juego
        const currentPhrase = phrases[currentPhraseIndex];
        contextoJuego = {
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
        tipo = 'juego';
      }

      // Call Cobi AI with appropriate context
      const response = await hablarConPanda(
        userMessage,
        'Constructor de Frases - Maestro Arquitecto',
        contextoJuego,
        tipo
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

  // (A2 long phrases now supported — no reset needed)

  // Load phrases
  useEffect(() => {
    const loadPhrases = async () => {
      if (!selectedLevel || !selectedPhraseLength) return; // No cargar si no hay nivel o longitud seleccionada
      
      try {
        const prefix = selectedPhraseLength === 'short' ? 'frases-cortas-' : 'frases-';
        const baseUrl = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${baseUrl}data/${prefix}${selectedLevel.toLowerCase()}.json`);
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
  }, [selectedLevel, selectedPhraseLength]);

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

    // Re-shuffle every time so each game run has a different order
    let reshuffled = shuffleArray(phrases);
    // In practice mode, limit to the selected phrase count
    if (selectedMode === 'practice') {
      reshuffled = reshuffled.slice(0, practiceCount);
    }
    setPhrases(reshuffled);

    setScore(0);
    setStreak(0);
    setLives(3);
    setTimeLeft(60);
    setCurrentPhraseIndex(0);
    setShowHint(false);
    // Use reshuffled[0] directly to avoid stale state on first phrase
    loadPhraseData(reshuffled, 0);
    setGameState('PLAYING');
  };

  // Load a phrase — accepts explicit array to avoid stale state after re-shuffle
  const loadPhraseData = (phraseArray: Phrase[], index: number) => {
    if (index >= phraseArray.length) {
      setGameState('VICTORY');
      return;
    }

    const phrase = phraseArray[index];
    const rawWords = phrase.frase_objetivo.match(/[\w\u00C0-\u024F]+|[.,!?¡¿]/g) || [];

    const processedWords: string[] = [];

    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i];

      if (word === '.') continue;

      if (word === '¿' || word === '¡') {
        processedWords.push(word);
      } else if (word === '?' || word === '!') {
        processedWords.push(word);
      } else if (word === ',') {
        processedWords.push(word);
      } else {
        processedWords.push(word);
      }
    }

    let allWords = [...processedWords];

    if (selectedDifficulty === 'hard' && phrase.trampas) {
      allWords = [...allWords, ...phrase.trampas];
    }

    setAvailableWords(shuffleArray(allWords));
    setSelectedWords([]);
    setShowHint(false);
    setFeedback(null);
    setShowColorHints(false);
    setWordColors([]);
    changeCobiState('start');
  };

  // Convenience wrapper that uses current phrases state
  const loadPhrase = (index: number) => {
    loadPhraseData(phrases, index);
  };

  // Select a word from available (click mode: append to end)
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

  // --- Hybrid Drag & Drop System ---
  const [dragSource, setDragSource] = useState<'available' | 'construction' | null>(null);
  const [dragWord, setDragWord] = useState<string>('');
  const [dragSourceIndex, setDragSourceIndex] = useState<number>(-1);
  const [dropTargetIndex, setDropTargetIndex] = useState<number>(-1);

  // Start dragging from available words
  const handleAvailableDragStart = (e: React.DragEvent, word: string, index: number) => {
    setDragSource('available');
    setDragWord(word);
    setDragSourceIndex(index);
    setDraggedIndex(null);
    e.dataTransfer.effectAllowed = 'move';
    // Set transparent drag image
    const ghost = document.createElement('div');
    ghost.textContent = word;
    ghost.style.cssText = 'position:absolute;top:-9999px;padding:8px 16px;background:#f59e0b;color:white;border-radius:8px;font-weight:bold;font-size:14px;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  // Start dragging from construction zone (reorder)
  const handleConstructionDragStart = (e: React.DragEvent, index: number) => {
    setDragSource('construction');
    setDragWord(selectedWords[index]);
    setDragSourceIndex(index);
    setDraggedIndex(index);
    setDropTargetIndex(-1);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag over construction zone items (for reorder or insert)
  const handleConstructionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (dragSource === 'construction') {
      // Reorder within construction zone
      if (draggedIndex === null || draggedIndex === index) return;
      const newWords = [...selectedWords];
      const draggedW = newWords[draggedIndex];
      newWords.splice(draggedIndex, 1);
      newWords.splice(index, 0, draggedW);
      setSelectedWords(newWords);
      setDraggedIndex(index);
    } else if (dragSource === 'available') {
      // Show ghost preview at this position
      e.stopPropagation(); // Prevent container's handleZoneDragOver from overriding
      setDropTargetIndex(index);
    }
  };

  // Drag over the construction zone container itself (for appending)
  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSource === 'available') {
      // Set drop target to end
      setDropTargetIndex(selectedWords.length);
    }
  };

  // Drop on construction zone
  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragSource === 'available' && dragWord) {
      playPlace();
      const newAvailable = [...availableWords];
      newAvailable.splice(dragSourceIndex, 1);
      setAvailableWords(newAvailable);

      const insertAt = dropTargetIndex >= 0 ? dropTargetIndex : selectedWords.length;
      const newSelected = [...selectedWords];
      newSelected.splice(insertAt, 0, dragWord);
      setSelectedWords(newSelected);
    }
    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDragSource(null);
    setDragWord('');
    setDragSourceIndex(-1);
    setDraggedIndex(null);
    setDropTargetIndex(-1);
  };

  // --- Mobile Touch Drag & Drop System ---
  const touchStartRef = useRef<{
    word: string;
    source: 'available' | 'construction';
    sourceIndex: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const [touchDragWord, setTouchDragWord] = useState('');
  const ghostRef = useRef<HTMLDivElement>(null);
  const TOUCH_THRESHOLD = 10;

  // Keep refs current for use in document event listeners
  const selectedWordsRef = useRef(selectedWords);
  selectedWordsRef.current = selectedWords;
  const availableWordsRef = useRef(availableWords);
  availableWordsRef.current = availableWords;
  const dragSourceRef = useRef(dragSource);
  dragSourceRef.current = dragSource;
  const dragWordRef = useRef(dragWord);
  dragWordRef.current = dragWord;
  const dragSourceIndexRef = useRef(dragSourceIndex);
  dragSourceIndexRef.current = dragSourceIndex;
  const draggedIndexRef = useRef(draggedIndex);
  draggedIndexRef.current = draggedIndex;
  const dropTargetIndexRef = useRef(dropTargetIndex);
  dropTargetIndexRef.current = dropTargetIndex;
  const touchDraggingRef = useRef(touchDragging);
  touchDraggingRef.current = touchDragging;

  const handleWordTouchStart = (source: 'available' | 'construction', word: string, sourceIndex: number) => (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { word, source, sourceIndex, startX: touch.clientX, startY: touch.clientY };
  };

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const { startX, startY, word, source, sourceIndex } = touchStartRef.current;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!touchDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > TOUCH_THRESHOLD) {
        // Enter drag mode
        setTouchDragging(true);
        setTouchDragWord(word);
        setDragSource(source);
        setDragWord(word);
        setDragSourceIndex(sourceIndex);
        if (source === 'construction') {
          setDraggedIndex(sourceIndex);
        }
      }

      if (touchDraggingRef.current || Math.sqrt(dx * dx + dy * dy) > TOUCH_THRESHOLD) {
        e.preventDefault();
        setTouchPos({ x: touch.clientX, y: touch.clientY });

        // Hide ghost momentarily for elementFromPoint
        const ghostEl = ghostRef.current;
        if (ghostEl) ghostEl.style.display = 'none';
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghostEl) ghostEl.style.display = '';

        if (el) {
          const constructionEl = el.closest('[data-construction-index]');
          const zoneEl = el.closest('[data-construction-zone]');
          const currentSource = touchStartRef.current?.source || dragSourceRef.current;

          if (currentSource === 'construction' && constructionEl) {
            const targetIdx = parseInt(constructionEl.getAttribute('data-construction-index')!);
            const currentDragged = draggedIndexRef.current;
            if (currentDragged !== null && currentDragged !== targetIdx) {
              const newWords = [...selectedWordsRef.current];
              const draggedW = newWords[currentDragged];
              newWords.splice(currentDragged, 1);
              newWords.splice(targetIdx, 0, draggedW);
              setSelectedWords(newWords);
              setDraggedIndex(targetIdx);
            }
          } else if (currentSource === 'available') {
            if (constructionEl) {
              const idx = parseInt(constructionEl.getAttribute('data-construction-index')!);
              setDropTargetIndex(idx);
            } else if (zoneEl) {
              setDropTargetIndex(selectedWordsRef.current.length);
            } else {
              setDropTargetIndex(-1);
            }
          }
        }
      }
    };

    const handleTouchEnd = () => {
      if (touchDraggingRef.current) {
        const src = dragSourceRef.current;
        const word = dragWordRef.current;
        const srcIdx = dragSourceIndexRef.current;
        const dropIdx = dropTargetIndexRef.current;

        if (src === 'available' && word && dropIdx >= 0) {
          playPlace();
          const newAvailable = [...availableWordsRef.current];
          newAvailable.splice(srcIdx, 1);
          setAvailableWords(newAvailable);
          const newSelected = [...selectedWordsRef.current];
          newSelected.splice(dropIdx, 0, word);
          setSelectedWords(newSelected);
        }
        // Construction reorder already handled in touchmove
      }

      touchStartRef.current = null;
      setTouchDragging(false);
      setTouchDragWord('');
      setTouchPos({ x: 0, y: 0 });
      resetDragState();
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile]);

  // --- Mobile Pointer Events Drag System (separate from desktop touch/drag) ---
  const pointerStartRef = useRef<{
    word: string;
    source: 'available' | 'construction';
    sourceIndex: number;
    startX: number;
    startY: number;
    pointerId: number;
  } | null>(null);
  const [pointerDragging, setPointerDragging] = useState(false);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [pointerDragWord, setPointerDragWord] = useState('');
  const pointerGhostRef = useRef<HTMLDivElement>(null);
  const POINTER_THRESHOLD = 10;

  const pointerDraggingRef = useRef(pointerDragging);
  pointerDraggingRef.current = pointerDragging;

  const handleWordPointerDown = (source: 'available' | 'construction', word: string, sourceIndex: number) => (e: React.PointerEvent) => {
    pointerStartRef.current = { word, source, sourceIndex, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId };
  };

  useEffect(() => {
    if (!isMobile) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerStartRef.current) return;
      if (e.pointerId !== pointerStartRef.current.pointerId) return;
      const { startX, startY, word, source, sourceIndex } = pointerStartRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!pointerDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > POINTER_THRESHOLD) {
        setPointerDragging(true);
        setPointerDragWord(word);
        setDragSource(source);
        setDragWord(word);
        setDragSourceIndex(sourceIndex);
        if (source === 'construction') {
          setDraggedIndex(sourceIndex);
        }
      }

      if (pointerDraggingRef.current || Math.sqrt(dx * dx + dy * dy) > POINTER_THRESHOLD) {
        e.preventDefault();
        setPointerPos({ x: e.clientX, y: e.clientY });

        const ghostEl = pointerGhostRef.current;
        if (ghostEl) ghostEl.style.display = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (ghostEl) ghostEl.style.display = '';

        if (el) {
          const constructionEl = el.closest('[data-construction-index]');
          const zoneEl = el.closest('[data-construction-zone]');
          const currentSource = pointerStartRef.current?.source || dragSourceRef.current;

          if (currentSource === 'construction' && constructionEl) {
            const targetIdx = parseInt(constructionEl.getAttribute('data-construction-index')!);
            const currentDragged = draggedIndexRef.current;
            if (currentDragged !== null && currentDragged !== targetIdx) {
              const newWords = [...selectedWordsRef.current];
              const draggedW = newWords[currentDragged];
              newWords.splice(currentDragged, 1);
              newWords.splice(targetIdx, 0, draggedW);
              setSelectedWords(newWords);
              setDraggedIndex(targetIdx);
            }
          } else if (currentSource === 'available') {
            if (constructionEl) {
              const idx = parseInt(constructionEl.getAttribute('data-construction-index')!);
              setDropTargetIndex(idx);
            } else if (zoneEl) {
              setDropTargetIndex(selectedWordsRef.current.length);
            } else {
              setDropTargetIndex(-1);
            }
          }
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerStartRef.current) return;
      if (e.pointerId !== pointerStartRef.current.pointerId) return;

      if (pointerDraggingRef.current) {
        const src = dragSourceRef.current;
        const word = dragWordRef.current;
        const srcIdx = dragSourceIndexRef.current;
        const dropIdx = dropTargetIndexRef.current;

        if (src === 'available' && word && dropIdx >= 0) {
          playPlace();
          if (navigator.vibrate) navigator.vibrate(10);
          const newAvailable = [...availableWordsRef.current];
          newAvailable.splice(srcIdx, 1);
          setAvailableWords(newAvailable);
          const newSelected = [...selectedWordsRef.current];
          newSelected.splice(dropIdx, 0, word);
          setSelectedWords(newSelected);
        }
      }

      pointerStartRef.current = null;
      setPointerDragging(false);
      setPointerDragWord('');
      setPointerPos({ x: 0, y: 0 });
      resetDragState();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isMobile]);

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
    const normalize = (str: string) => str.toLowerCase().replace(/[.,:;]/g, '').replace(/\s+/g, ' ').trim();
    
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
    
    // Normalize for comparison - remove periods, commas, colons, semicolons, normalize whitespace and case
    const normalize = (str: string) => str.toLowerCase().replace(/[.,:;]/g, '').replace(/\s+/g, ' ').trim();
    
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
    // --- MOBILE: Paginated Wizard Menu ---
    if (isMobile) {
      const canGoNext = mobileMenuPage < 4;
      const canGoBack = mobileMenuPage > 1;

      const renderPBPage = () => {
        switch (mobileMenuPage) {
          case 1:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">1. Nivel de Español</h3>
                <div className="flex flex-col gap-3">
                  {(['A1', 'A2', 'B1', 'B2'] as Level[]).map(level => {
                    const isDisabled = level === 'B2';
                    return (
                      <button
                        key={level}
                        onClick={() => !isDisabled && setSelectedLevel(level)}
                        disabled={isDisabled}
                        className={`w-full py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                          selectedLevel === level
                            ? 'bg-amber-500 text-white border-amber-500'
                            : isDisabled
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {level}
                        {isDisabled && <span className="text-xs block font-normal">Próximamente</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          case 2:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">2. Longitud de Frases</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setSelectedPhraseLength('short')}
                    className={`w-full py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                      selectedPhraseLength === 'short' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">🧱</span>
                    Frases Cortas
                    <span className="text-xs block font-normal opacity-80">3–5 palabras</span>
                  </button>
                  <button
                    onClick={() => !longDisabled && setSelectedPhraseLength('long')}
                    disabled={longDisabled}
                    className={`w-full py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                      longDisabled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                        : selectedPhraseLength === 'long' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">🏗️</span>
                    Frases Largas
                    <span className="text-xs block font-normal opacity-80">{longDisabled ? 'Próximamente para B1' : '6–10 palabras'}</span>
                  </button>
                </div>
              </div>
            );
          case 3:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">3. Dificultad</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setSelectedDifficulty('easy')}
                    className={`w-full py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                      selectedDifficulty === 'easy' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    😊 Fácil
                    <span className="text-xs block font-normal opacity-80">Solo palabras necesarias</span>
                  </button>
                  <button
                    onClick={() => setSelectedDifficulty('hard')}
                    className={`w-full py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                      selectedDifficulty === 'hard' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    😈 Difícil
                    <span className="text-xs block font-normal opacity-80">Incluye palabras trampa</span>
                  </button>
                </div>
              </div>
            );
          case 4:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">4. Modo de Juego</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setSelectedMode('practice')}
                    className={`w-full py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                      selectedMode === 'practice' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">📖</span>
                    Práctica
                  </button>
                  {selectedMode === 'practice' && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mt-2">
                      <p className="text-xs font-bold text-amber-700 text-center mb-2">¿Cuántas frases?</p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setPracticeCount(c => Math.max(5, c - 5))}
                          className="w-9 h-9 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold text-lg flex items-center justify-center transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={5}
                          max={50}
                          value={practiceCount}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v)) setPracticeCount(Math.max(5, Math.min(50, v)));
                          }}
                          className="w-14 text-center text-lg font-black text-amber-800 bg-white border-2 border-amber-300 rounded-lg py-1 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={() => setPracticeCount(c => Math.min(50, c + 5))}
                          className="w-9 h-9 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold text-lg flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedMode('timed')}
                    className={`w-full py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                      selectedMode === 'timed' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">⏱️</span>
                    Contrarreloj
                  </button>
                  <button
                    onClick={() => setSelectedMode('lives')}
                    className={`w-full py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                      selectedMode === 'lives' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">❤️</span>
                    Vidas
                  </button>
                </div>
              </div>
            );
          default:
            return null;
        }
      };

      return (
        <div className="h-[100dvh] bg-amber-600 p-3 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-white rounded-3xl px-5 py-4 shadow-2xl flex flex-col" style={{ height: 'auto', maxHeight: 'calc(100dvh - 120px)', flex: '0 1 auto' }}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-lg font-black text-amber-700 flex-1 text-center">🏗️ Constructor de Frases</h1>
              <div className="w-8"></div>
            </div>

            <div className="flex justify-center gap-2 my-2">
              {[1, 2, 3, 4].map(p => (
                <div key={p} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  p === mobileMenuPage ? 'bg-amber-500 w-6' : p < mobileMenuPage ? 'bg-amber-700' : 'bg-gray-300'
                }`} />
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-center py-2 min-h-0 overflow-y-auto" style={{ flexShrink: 1 }}>
              {renderPBPage()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-shrink-0">
              {canGoBack ? (
                <button onClick={() => setMobileMenuPage(p => p - 1)} className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95 text-gray-600">
                  <ChevronLeft size={22} />
                </button>
              ) : (
                <div className="w-11" />
              )}

              {mobileMenuPage === 4 ? (
                <button
                  onClick={startGame}
                  disabled={phrases.length === 0 || !selectedLevel || !selectedPhraseLength || !selectedDifficulty || !selectedMode}
                  className="flex-1 mx-3 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-lg rounded-xl transition-all shadow-lg"
                >
                  ¡Empezar a Construir!
                </button>
              ) : (
                <div className="flex-1" />
              )}

              {canGoNext ? (
                <button onClick={() => setMobileMenuPage(p => p + 1)} className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95 text-gray-600">
                  <ChevronRight size={22} />
                </button>
              ) : (
                <div className="w-11" />
              )}
            </div>
          </div>

          <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔨" themeColor="#FF9F55" cobiVisible={cobiVisible} />

          {showChatWindow && gameState === 'MENU' && (
            <div className={`fixed bottom-24 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔨</span>
                  <div>
                    <h3 className="text-white font-bold text-sm">Cobi Constructor</h3>
                    <p className="text-xs text-amber-50">Tu arquitecto de frases</p>
                  </div>
                </div>
                <button onClick={() => setShowChatWindow(false)} className="p-1 hover:bg-white/20 rounded-full transition">
                  <ChevronLeft size={20} className="text-white" />
                </button>
              </div>
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-amber-50/30 to-white">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    <p className="mb-2">👷‍♂️</p>
                    <p>¡Hola! Soy Cobi, tu arquitecto personal.</p>
                    <p className="text-xs mt-2">Pregúntame sobre los modos de juego.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white border-2 border-amber-200 text-gray-700'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoadingResponse && (
                  <div className="flex justify-start">
                    <div className="bg-white border-2 border-amber-200 rounded-2xl px-4 py-3">
                      <p className="text-sm text-gray-600">El Panda revisa los planos... 🐾</p>
                    </div>
                  </div>
                )}
              </div>
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
        </div>
      );
    }

    // --- DESKTOP ---
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-deep-blue font-medium flex items-center gap-2 transition-colors"
            >
              <ChevronLeft size={20} />
              Volver a Juegos
            </button>
            <h1 className="text-2xl font-black text-amber-700">
              🏗️ Constructor de Frases
            </h1>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-amber-200">

            {/* Level Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📚 Nivel de Español
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['A1', 'A2', 'B1', 'B2'] as Level[]).map(level => {
                  const isDisabled = level === 'B2';
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

            {/* Phrase Length Selection */}
            {selectedLevel && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📏 Longitud de Frases
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPhraseLength('short')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                    selectedPhraseLength === 'short'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-xl">🧱</span>
                  <span>Frases Cortas</span>
                </button>
                <button
                  onClick={() => !longDisabled && setSelectedPhraseLength('long')}
                  disabled={longDisabled}
                  className={`py-3 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                    longDisabled
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : selectedPhraseLength === 'long'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-xl">🏗️</span>
                  <span>{longDisabled ? 'Frases Largas (Próximamente)' : 'Frases Largas'}</span>
                </button>
              </div>
            </div>
            )}

            {/* Difficulty Selection */}
            {selectedPhraseLength && (
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
            )}

            {/* Mode Selection */}
            {selectedDifficulty && (
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🎮 Modo de Juego
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedMode('practice')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                    selectedMode === 'practice'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : selectedMode === null
                      ? 'border-gray-300 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-xl">📖</span>
                  <span>Práctica</span>
                </button>
                <button
                  onClick={() => setSelectedMode('timed')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                    selectedMode === 'timed'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : selectedMode === null
                      ? 'border-gray-300 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-xl">⏱️</span>
                  <span>Contrarreloj</span>
                </button>
                <button
                  onClick={() => setSelectedMode('lives')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                    selectedMode === 'lives'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                      : selectedMode === null
                      ? 'border-gray-300 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-xl">❤️</span>
                  <span>Vidas</span>
                </button>
              </div>
              {selectedMode === 'practice' && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mt-3">
                  <p className="text-xs font-bold text-amber-700 text-center mb-2">¿Cuántas frases?</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPracticeCount(c => Math.max(5, c - 5))}
                      className="w-9 h-9 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold text-lg flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={practiceCount}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v)) setPracticeCount(Math.max(5, Math.min(50, v)));
                      }}
                      className="w-14 text-center text-lg font-black text-amber-800 bg-white border-2 border-amber-300 rounded-lg py-1 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => setPracticeCount(c => Math.min(50, c + 5))}
                      className="w-9 h-9 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold text-lg flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Start Button */}
            <button
              onClick={startGame}
              disabled={phrases.length === 0 || !selectedLevel || !selectedPhraseLength || !selectedDifficulty || !selectedMode}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xl rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <Play size={24} />
              {!selectedLevel || !selectedPhraseLength || !selectedDifficulty || !selectedMode ? 'Elige todas las opciones' : '¡Empezar a Construir!'}
            </button>
          </div>
        </div>
        
        {/* Cobi Constructor en el menú (solo desktop) */}
        <div className={`cobi-container hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible${!cobiVisible ? ' cobi-hidden' : ''}`}>
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje aleatorio - solo si NO hay chat abierto */}
            {!showChatWindow && (
              <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
                <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                  {cobiMenuMessage || "🏗️ ¡Construyamos frases juntos! 🐾"}
                </p>
                {/* Pico del bocadillo apuntando hacia Cobi */}
                <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
              </div>
            )}
            
            {/* Imagen de Cobi Constructor pensando */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-constructor-pensando.webp"
                alt="Cobi Constructor pensando" 
                className="w-56 h-auto object-contain"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>

            {/* Chat Button Wrapper - Mismo que dentro del juego */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathMenu" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathMenu" startOffset="50%" textAnchor="middle" className="curved-text-style">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🔨</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔨" themeColor="#FF9F55" cobiVisible={cobiVisible} />

        {/* Chat Window del Menú */}
        {showChatWindow && gameState === 'MENU' && (
          <div className={`cobi-container fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in${!cobiVisible ? ' cobi-hidden' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔨</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi el Constructor</h3>
                  <p className="text-xs text-amber-50">Tu arquitecto de frases</p>
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
                  <p className="text-xs mt-2">Pregúntame sobre los modos de juego o sobre español.</p>
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

  // ════════════════════════════════════════════════════════════════════════
  // ═══  MOBILE PLAYING — Pointer Events, responsive CSS, haptic  ═══════
  // ════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden fixed inset-0 z-40 p-2 flex flex-col">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-amber-200/30 to-transparent"></div>
        </div>

        <div className="w-[95%] mx-auto relative z-10 flex-1 flex flex-col min-h-0 overflow-auto" style={{ boxSizing: 'border-box' }}>
          {/* Mobile animations */}
          <style>{`
            @keyframes pbFadeIn { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
            @keyframes pbCascade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
          `}</style>

          {/* Header — compact for mobile */}
          <div className="flex justify-between items-center mb-2 bg-white/90 backdrop-blur rounded-xl p-2 shadow-md border-2 border-amber-200">
            <button onClick={() => setGameState('MENU')} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-3 text-center items-center">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">PTS</p>
                <p className="text-lg font-black text-amber-600">{score}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">RACHA</p>
                <p className="text-lg font-black text-orange-500">🔥{streak}</p>
              </div>
              {selectedMode === 'timed' && (
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">TIEMPO</p>
                  <p className={`text-lg font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                    <Clock className="inline w-4 h-4 mr-0.5" />{timeLeft}s
                  </p>
                </div>
              )}
              {selectedMode === 'timed' && (
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`p-1.5 rounded-full transition-colors ${isPaused ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}
                >
                  {isPaused ? '▶️' : '⏸️'}
                </button>
              )}
              {selectedMode === 'lives' && (
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">VIDAS</p>
                  <p className="text-lg font-black text-red-500">{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</p>
                </div>
              )}
              <button
                onClick={() => setShowHint(!showHint)}
                className={`p-1.5 rounded-full transition-colors ${showHint ? 'bg-amber-100 text-amber-600' : 'text-gray-400'}`}
              >
                <Lightbulb size={18} />
              </button>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className={`p-1.5 rounded-full transition-colors ${showInstructions ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
              >
                <span className="text-sm font-bold">?</span>
              </button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-medium">FRASE</p>
              <p className="text-sm font-bold text-gray-700">{currentPhraseIndex + 1}/{phrases.length}</p>
            </div>
          </div>

          {/* Hint display */}
          {showHint && currentPhrase && (
            <div className="bg-blue-100 rounded-xl p-3 mb-2 border-2 border-blue-300 shadow-md">
              <p className="text-blue-800 text-center font-medium italic text-sm">
                "{currentPhrase.pistas.traduccion_en}"
              </p>
            </div>
          )}

          {/* Instructions display */}
          {showInstructions && (
            <div className="bg-purple-100 rounded-xl p-3 mb-2 border-2 border-purple-300 shadow-md">
              <h3 className="text-purple-800 font-bold mb-1 text-center text-sm">🎯 Instrucciones</h3>
              {selectedDifficulty === 'easy' ? (
                <div className="text-purple-800 text-xs space-y-1">
                  <p>• <strong>Objetivo:</strong> Construye la frase usando TODAS las piezas</p>
                  <p>• 🟢 Correcta &nbsp; 🔴 Incorrecta</p>
                </div>
              ) : (
                <div className="text-purple-800 text-xs space-y-1">
                  <p>• <strong>Objetivo:</strong> Construye frases con las piezas correctas</p>
                  <p>• 🟢 Correcta &nbsp; 🔵 Mal ubicada &nbsp; 🔴 No pertenece</p>
                </div>
              )}
            </div>
          )}

          {/* Word count indicator for hard mode */}
          {selectedDifficulty === 'hard' && currentPhrase && (
            <div className="bg-amber-100 rounded-xl p-2 mb-2 border-2 border-amber-300">
              <p className="text-xs text-amber-800 text-center font-bold">
                🎯 Usa {currentPhrase.frase_objetivo.match(/[\w\u00C0-\u024F]+|[!?¡¿]/g)?.length || 0} piezas
              </p>
            </div>
          )}

          {/* Construction Zone — Mobile */}
          <div
            data-construction-zone
            className={`bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg mb-2 border-4 border-dashed min-h-[80px] transition-colors ${
              dragSource === 'available' ? 'border-amber-500 bg-amber-50/50' : 'border-amber-300'
            }`}
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Hammer size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-700">ZONA DE CONSTRUCCIÓN</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[40px]">
              {selectedWords.length === 0 && dropTargetIndex < 0 ? (
                <p className="text-gray-400 italic text-xs">{dragSource === 'available' ? '¡Suelta aquí!' : 'Arrastra o toca las palabras...'}</p>
              ) : (
                <>
                  {selectedWords.map((word, index) => {
                    const getMobileBorderColor = () => {
                      if (!showColorHints || !wordColors[index]) return '';
                      if (wordColors[index] === 'green') return 'border-4 border-green-500';
                      if (wordColors[index] === 'blue') return 'border-4 border-blue-500';
                      if (wordColors[index] === 'red') return 'border-4 border-red-500';
                      return '';
                    };
                    return (
                      <React.Fragment key={`m-selected-${index}`}>
                        {dragSource === 'available' && dropTargetIndex === index && (
                          <div className="px-2.5 py-1 text-xs bg-amber-200/60 text-amber-600 font-bold rounded-lg border-2 border-dashed border-amber-400 pointer-events-none" style={{ animation: 'pbFadeIn 0.15s ease-out' }}>
                            {dragWord}
                          </div>
                        )}
                        <button
                          data-construction-index={index}
                          onPointerDown={handleWordPointerDown('construction', word, index)}
                          onClick={() => !pointerDragging && deselectWord(word, index)}
                          className={`px-2.5 py-1 bg-gradient-to-b from-amber-400 to-amber-500 text-white font-bold rounded-lg shadow-md active:scale-95 cursor-move ${
                            draggedIndex === index ? 'opacity-50 scale-95' : ''
                          } ${getMobileBorderColor()}`}
                          style={{
                            touchAction: 'none',
                            fontSize: 'clamp(12px, 3vw, 16px)',
                            boxShadow: '0 3px 0 0 rgba(180, 83, 9, 0.5), 0 4px 8px rgba(0,0,0,0.15)',
                            transition: 'transform 0.2s ease, opacity 0.2s ease'
                          }}
                        >
                          {word}
                        </button>
                      </React.Fragment>
                    );
                  })}
                  {dragSource === 'available' && dropTargetIndex === selectedWords.length && (
                    <div className="px-2.5 py-1 text-xs bg-amber-200/60 text-amber-600 font-bold rounded-lg border-2 border-dashed border-amber-400 pointer-events-none" style={{ animation: 'pbFadeIn 0.15s ease-out' }}>
                      {dragWord}
                    </div>
                  )}
                </>
              )}
            </div>
            {feedback && (
              <div className={`mt-2 p-2 rounded-xl flex items-center gap-1.5 text-sm ${
                feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {feedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
                <span className="font-bold">{feedback.message}</span>
              </div>
            )}
            {feedback?.type === 'error' && selectedWords.length > 0 && (
              <button
                onClick={calculateColorHints}
                className="mt-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 text-xs"
              >
                <Lightbulb size={14} />
                Ver posiciones
              </button>
            )}
          </div>

          {/* Available Words — Mobile */}
          <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg mb-2 border-2 border-amber-200" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">🧱</span>
              <span className="text-xs font-bold text-gray-600">MATERIALES DISPONIBLES</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableWords.map((word, index) => (
                <button
                  key={`m-available-${index}`}
                  data-available-index={index}
                  onPointerDown={handleWordPointerDown('available', word, index)}
                  onClick={() => !pointerDragging && selectWord(word, index)}
                  className={`px-2.5 py-1 bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 font-bold rounded-lg shadow border-2 border-gray-300 active:scale-95 cursor-grab active:cursor-grabbing ${
                    (dragSource === 'available' && dragSourceIndex === index) ? 'opacity-40 scale-95' : ''
                  }`}
                  style={{
                    touchAction: 'none',
                    fontSize: 'clamp(12px, 3vw, 16px)',
                    boxShadow: '0 2px 0 0 rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease, opacity 0.2s ease',
                    animation: `pbCascade 0.25s ease-out ${index * 0.03}s both`
                  }}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons — Mobile (non-overlapping) */}
          <div className="flex gap-2 mt-auto pb-1">
            <button
              onClick={resetPhrase}
              className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-1 text-sm"
            >
              <RotateCcw size={16} />
              Reiniciar
            </button>
            <button
              onClick={checkAnswer}
              disabled={selectedWords.length === 0}
              className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-sm"
            >
              <Check size={16} />
              Comprobar
            </button>
          </div>
        </div>

        {/* Pointer drag ghost element — Mobile */}
        {pointerDragging && pointerDragWord && (
          <div
            ref={pointerGhostRef}
            className="fixed z-[9999] pointer-events-none px-2.5 py-1 bg-gradient-to-b from-amber-400 to-amber-500 text-white font-bold rounded-lg shadow-xl"
            style={{
              left: pointerPos.x - 30,
              top: pointerPos.y - 20,
              fontSize: 'clamp(12px, 3vw, 16px)',
              transform: 'scale(1.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            {pointerDragWord}
          </div>
        )}

        {/* Mobile Cobi + Chat */}
        {gameState === 'PLAYING' && (
          <>
            <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔨" themeColor="#FF9F55" cobiVisible={cobiVisible} />
            {showChatWindow && (
              <div className={`cobi-container fixed bottom-24 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in${!cobiVisible ? ' cobi-hidden' : ''}`}>
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔨</span>
                    <div>
                      <h3 className="text-white font-bold text-sm">Cobi el Constructor</h3>
                      <p className="text-white/80 text-xs">Tu asistente arquitecto</p>
                    </div>
                  </div>
                  <button onClick={() => setShowChatWindow(false)} className="p-1 hover:bg-white/20 rounded-full transition">
                    <X size={20} className="text-white" />
                  </button>
                </div>
                <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-amber-50/30 to-white">
                  {chatHistory.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8">
                      <p className="mb-2">👷‍♂️</p>
                      <p>¡Hola! Soy Cobi, tu arquitecto personal.</p>
                      <p className="text-xs mt-2">Pregúntame lo que necesites sobre esta frase.</p>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white border-2 border-amber-200 text-gray-700'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoadingResponse && (
                    <div className="flex justify-start">
                      <div className="bg-white border-2 border-amber-200 rounded-2xl px-4 py-3">
                        <p className="text-sm text-gray-600">El Panda está revisando los planos... 🐾</p>
                      </div>
                    </div>
                  )}
                </div>
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
  }

  // ════════════════════════════════════════════════════════════════════════
  // ═══  DESKTOP PLAYING — Original code, completely untouched  ══════════
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={`bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden ${isMobile ? 'fixed inset-0 z-40 p-3 flex flex-col' : 'min-h-screen p-4'}`}>
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

      <div className={`max-w-3xl mx-auto relative z-10 ${isMobile ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : ''}`}>
        {/* PhraseBuilder Animations */}
        <style>{`
          @keyframes pbFadeIn {
            0% { opacity: 0; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes pbCascade {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
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
        <div
          data-construction-zone
          className={`bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg mb-4 border-4 border-dashed min-h-[120px] transition-colors ${
            dragSource === 'available' ? 'border-amber-500 bg-amber-50/50' : 'border-amber-300'
          }`}
          onDragOver={handleZoneDragOver}
          onDrop={handleZoneDrop}
          onDragLeave={() => { if (dragSource === 'available') setDropTargetIndex(-1); }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Hammer size={20} className="text-amber-600" />
            <span className="text-sm font-bold text-amber-700">ZONA DE CONSTRUCCIÓN</span>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[50px]">
            {selectedWords.length === 0 && dropTargetIndex < 0 ? (
              <p className="text-gray-400 italic">{dragSource === 'available' ? '¡Suelta aquí!' : 'Arrastra o haz clic en las palabras para construir la frase...'}</p>
            ) : (
              <>
                {selectedWords.map((word, index) => {
                  const getBorderColor = () => {
                    if (!showColorHints || !wordColors[index]) return '';
                    if (wordColors[index] === 'green') return 'border-4 border-green-500';
                    if (wordColors[index] === 'blue') return 'border-4 border-blue-500';
                    if (wordColors[index] === 'red') return 'border-4 border-red-500';
                    return '';
                  };

                  return (
                    <React.Fragment key={`selected-${index}`}>
                      {/* Ghost preview before this position */}
                      {dragSource === 'available' && dropTargetIndex === index && (
                        <div className="px-5 py-2.5 bg-amber-200/60 text-amber-600 font-bold rounded-lg border-2 border-dashed border-amber-400 pointer-events-none" style={{ animation: 'pbFadeIn 0.15s ease-out' }}>
                          {dragWord}
                        </div>
                      )}
                      <button
                        data-construction-index={index}
                        draggable
                        onDragStart={(e) => handleConstructionDragStart(e, index)}
                        onDragOver={(e) => handleConstructionDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={handleWordTouchStart('construction', word, index)}
                        onClick={() => !touchDragging && deselectWord(word, index)}
                        className={`px-5 py-2.5 bg-gradient-to-b from-amber-400 to-amber-500 text-white font-bold rounded-lg shadow-md hover:from-amber-500 hover:to-amber-600 active:scale-95 cursor-move ${
                          draggedIndex === index ? 'opacity-50 scale-95' : ''
                        } ${getBorderColor()}`}
                        style={{
                          boxShadow: '0 4px 0 0 rgba(180, 83, 9, 0.5), 0 6px 10px rgba(0,0,0,0.15)',
                          transition: 'transform 0.2s ease, opacity 0.2s ease, margin 0.2s ease'
                        }}
                      >
                        {word}
                      </button>
                    </React.Fragment>
                  );
                })}
                {/* Ghost preview at end of list */}
                {dragSource === 'available' && dropTargetIndex === selectedWords.length && (
                  <div className="px-5 py-2.5 bg-amber-200/60 text-amber-600 font-bold rounded-lg border-2 border-dashed border-amber-400 pointer-events-none" style={{ animation: 'pbFadeIn 0.15s ease-out' }}>
                    {dragWord}
                  </div>
                )}
              </>
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
          
          <div className="flex flex-wrap gap-2.5">
            {availableWords.map((word, index) => (
              <button
                key={`available-${index}`}
                data-available-index={index}
                draggable
                onDragStart={(e) => handleAvailableDragStart(e, word, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={handleWordTouchStart('available', word, index)}
                onClick={() => !touchDragging && selectWord(word, index)}
                className={`px-5 py-2.5 bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 font-bold rounded-lg shadow hover:from-amber-100 hover:to-amber-200 hover:text-amber-800 active:scale-95 border-2 border-gray-300 hover:border-amber-400 cursor-grab active:cursor-grabbing ${
                  (dragSource === 'available' && dragSourceIndex === index) ? 'opacity-40 scale-95' : ''
                }`}
                style={{
                  boxShadow: '0 3px 0 0 rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease, opacity 0.2s ease',
                  animation: `pbCascade 0.25s ease-out ${index * 0.03}s both`
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

      {/* Touch drag ghost element */}
      {touchDragging && touchDragWord && (
        <div
          ref={ghostRef}
          className="fixed z-[9999] pointer-events-none px-5 py-2.5 bg-gradient-to-b from-amber-400 to-amber-500 text-white font-bold rounded-lg shadow-xl"
          style={{
            left: touchPos.x - 40,
            top: touchPos.y - 24,
            transform: 'scale(1.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {touchDragWord}
        </div>
      )}

      {/* Cobi Avatar - Asomándose desde la esquina inferior derecha */}
      {gameState === 'PLAYING' && (
        <>
          <div className={`cobi-container hidden lg:block fixed bottom-0 right-0 z-40 pointer-events-none overflow-visible${!cobiVisible ? ' cobi-hidden' : ''}`}>
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
                  <div className="paws-icon">🔨</div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón Cobi móvil */}
          <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔨" themeColor="#FF9F55" cobiVisible={cobiVisible} />

          {/* Chat Window */}
          {showChatWindow && (
            <div className={`cobi-container fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in${!cobiVisible ? ' cobi-hidden' : ''}`}>
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔨</span>
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
