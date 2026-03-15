import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Info, X, Lightbulb, Calendar, ChevronRight, Send, Shuffle } from 'lucide-react';
import { loadLetterWheelVocabulary, getRandomWordForDate, getRelatedWords } from '../services/letterWheelService';
import { hablarConPanda } from '../services/geminiService';
import DraggableCobi from './DraggableCobi';
import { useI18n } from '../services/i18n';

interface LetterWheelGameProps {
  onBack: () => void;
  cobiVisible?: boolean;
  soundEnabled?: boolean;
}

interface VocabWord {
  palabra: string;
  pistas: string;
}

interface GameWord {
  word: VocabWord;
  normalized: string;
  number: number;
}

interface GameState {
  baseWord: VocabWord;
  baseWordNormalized: string;
  targetWords: GameWord[];
}

// Crossword types
interface PlacedWord {
  word: GameWord;
  row: number;
  col: number;
  direction: 'horizontal' | 'vertical';
}

interface CrosswordCell {
  letter: string;
  wordNumbers: number[];
  isStart: { number: number; direction: 'horizontal' | 'vertical' }[];
}

type GameStatus = 'MENU' | 'LOADING' | 'PLAYING' | 'VICTORY';

// Mensajes de Cobi Explorador
const mensajesExploradorEntrada = [
  "¡Bienvenido a la expedición! ✨",
  "¡Tenemos una misión! ¿Buscamos las palabras? 🗺️",
  "¡Prepárate! La aventura empieza aquí. 🎒",
  "¡Busquemos el tesoro de las letras! 💎",
  "¡Abre el mapa, es hora de explorar! 📜"
];

const mensajesExploradorAcierto = [
  "¡Tesoro encontrado! 💎",
  "¡Una palabra nueva para el mapa! 🗺️",
  "¡Increíble! Eres un gran explorador. ✨",
  "¡Zas! ¡Esa palabra encaja perfecta! 🧩",
  "¡Esa es la ruta correcta! 🛤️",
  "¡Buen hallazgo, aventurero! 🏺"
];

const mensajesExploradorFallo = [
  "¡Cuidado con la trampa! 🕸️",
  "¡Ese camino no lleva a ninguna parte! 🗺️",
  "¡Uy, una letra se ha escapado! 🔎",
  "¡Ruta equivocada! Probemos otra. 🧭",
  "¡Esa palabra no está en el mapa antiguo! 📜",
  "¡Casi caemos en el pozo! ¡Inténtalo otra vez! 🕳️"
];

const mensajesExploradorVictoria = [
  "¡Misión cumplida! 🏆 ¡Hemos descifrado el código antiguo!",
  "¡El tesoro de las letras es nuestro! 💎",
  "¡Increíble! Has encontrado todas las palabras ocultas. ✨",
  "¡Expedición finalizada con éxito! El mapa está completo. 🗺️",
  "¡Elemental, querido alumno! 🥇",
  "¡Eres el mejor explorador de palabras del mundo! 🐾"
];

const mensajesExploradorMenu = [
  "¡No hay mapa difícil si trabajamos juntos! 🐾",
  "¡Explorar palabras es la mejor forma de aprender! ¿Vamos? 🚀",
  "Aventurero, ¿qué nivel elegimos hoy? 🔎"
];

const seleccionarMensajeExploradorRandom = (tipo: 'entrada' | 'acierto' | 'fallo' | 'victoria' | 'menu'): string => {
  let mensajes: string[];
  switch (tipo) {
    case 'entrada':
      mensajes = mensajesExploradorEntrada;
      break;
    case 'acierto':
      mensajes = mensajesExploradorAcierto;
      break;
    case 'fallo':
      mensajes = mensajesExploradorFallo;
      break;
    case 'victoria':
      mensajes = mensajesExploradorVictoria;
      break;
    case 'menu':
      mensajes = mensajesExploradorMenu;
      break;
  }
  return mensajes[Math.floor(Math.random() * mensajes.length)];
};

const LetterWheelGame: React.FC<LetterWheelGameProps> = ({ onBack, cobiVisible = true, soundEnabled = true }) => {
  const { t } = useI18n();
  const [gameStatus, setGameStatus] = useState<GameStatus>('MENU');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [currentWord, setCurrentWord] = useState<string>('');
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [difficulty, setDifficulty] = useState<'a1' | 'a2' | 'b1' | 'b2'>('a1');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [letterPositions, setLetterPositions] = useState<number[]>([]);
  const [revealingCells, setRevealingCells] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [, forceUpdate] = useState({});
  const [cobiExploradorMessage, setCobiExploradorMessage] = useState<string>(seleccionarMensajeExploradorRandom('entrada'));
  const [cobiExploradorAvatar, setCobiExploradorAvatar] = useState<string>('./data/images/cobi-explorador.webp');
  const [cobiExploradorMenuMessage] = useState<string>(seleccionarMensajeExploradorRandom('menu'));
  
  // Chat State
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'cobi', text: string}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent page scroll on desktop while playing
  useEffect(() => {
    if (gameStatus === 'PLAYING' && !isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [gameStatus, isMobile]);

  // Hide site header on mobile while playing
  useEffect(() => {
    if (gameStatus === 'PLAYING' && isMobile) {
      const siteHeader = document.querySelector('header.sticky');
      if (siteHeader) (siteHeader as HTMLElement).style.display = 'none';
      return () => {
        if (siteHeader) (siteHeader as HTMLElement).style.display = '';
      };
    }
  }, [gameStatus, isMobile]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastAddedIndexRef = useRef<number | null>(null);

  // Send message to Cobi Explorador
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

      // Si estamos en MENU, contexto de lobby
      if (gameStatus === 'MENU') {
        contextoJuego = {
          juego: 'La Rueda de Letras',
          estado: 'menu',
          dificultad_seleccionada: difficulty || 'ninguna',
          fecha_seleccionada: selectedDate
        };
        tipo = 'lobby';
      } else {
        // Si estamos jugando, contexto de juego
        contextoJuego = {
          juego: 'La Rueda de Letras',
          dificultad: difficulty,
          palabra_base: gameState?.baseWord.palabra || 'ninguna',
          palabras_encontradas: Array.from(foundWords).length,
          palabras_totales: gameState?.targetWords.length || 0,
          fecha: selectedDate
        };
        tipo = 'juego';
      }

      // Call Cobi AI with appropriate context
      const response = await hablarConPanda(
        userMessage,
        'La Rueda de Letras - Cobi Explorador 🧭',
        contextoJuego,
        tipo
      );

      // Add Cobi response to history
      setChatHistory(prev => [...prev, { role: 'cobi', text: response }]);
    } catch (error) {
      console.error('Error al comunicarse con Cobi Explorador:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'cobi', text: '¡Ups! Mi brújula tuvo un problema. 🧭 Inténtalo de nuevo.' }
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Force re-render on window resize for responsive positioning
  useEffect(() => {
    const handleResize = () => forceUpdate({});
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio functions
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

  const playSuccess = () => {
    playTone(520, 0.15, 'triangle');
    setTimeout(() => playTone(660, 0.18, 'sine'), 80);
  };

  const playError = () => {
    playTone(220, 0.12, 'sawtooth');
    setTimeout(() => playTone(180, 0.12, 'square'), 50);
  };

  const playPop = () => playTone(420, 0.08, 'sine');

  const playVictory = () => {
    playTone(523, 0.15);
    setTimeout(() => playTone(659, 0.15), 150);
    setTimeout(() => playTone(784, 0.3), 300);
  };

  // Normalize function
  const normalizeStr = (str: string): string => {
    // Remove accents and convert to lowercase for comparison
    let normalized = str.replace(/ñ/gi, '§§§');
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    normalized = normalized.replace(/§§§/g, 'ñ');
    return normalized.toLowerCase();
  };

  // Alias for backwards compatibility
  const normalize = normalizeStr;

  // Generate crossword layout from words with strict professional rules
  const generateCrossword = (baseWord: string, words: GameWord[]): { grid: Map<string, CrosswordCell>; placed: PlacedWord[]; bounds: { minRow: number; maxRow: number; minCol: number; maxCol: number } } => {
    const grid = new Map<string, CrosswordCell>();
    const placed: PlacedWord[] = [];
    const baseNorm = normalizeStr(baseWord).toUpperCase();
    
    // Helper to check if a cell is occupied
    const isOccupied = (r: number, c: number): boolean => grid.has(`${r},${c}`);
    
    // Helper to get letter at position
    const getLetterAt = (r: number, c: number): string | null => {
      const cell = grid.get(`${r},${c}`);
      return cell ? cell.letter : null;
    };
    
    // Validate word placement with strict crossword rules
    const canPlaceWord = (word: string, startRow: number, startCol: number, direction: 'horizontal' | 'vertical'): boolean => {
      let intersectionCount = 0;
      
      for (let i = 0; i < word.length; i++) {
        const r = direction === 'vertical' ? startRow + i : startRow;
        const c = direction === 'horizontal' ? startCol + i : startCol;
        const existingLetter = getLetterAt(r, c);
        
        if (existingLetter) {
          // Cell occupied - must match letter (this is an intersection)
          if (existingLetter !== word[i]) return false;
          intersectionCount++;
          
          // Rule 1: Maximum ONE intersection per word placement
          if (intersectionCount > 1) return false;
        } else {
          // Cell is empty - check lateral neighbors (Rule 2: No parallel adjacency)
          if (direction === 'horizontal') {
            // For horizontal word: check above and below
            if (isOccupied(r - 1, c) || isOccupied(r + 1, c)) return false;
          } else {
            // For vertical word: check left and right
            if (isOccupied(r, c - 1) || isOccupied(r, c + 1)) return false;
          }
        }
      }
      
      // Rule 3: Check spacing before/after word (no words touching at endpoints)
      if (direction === 'horizontal') {
        if (isOccupied(startRow, startCol - 1)) return false; // Before
        if (isOccupied(startRow, startCol + word.length)) return false; // After
      } else {
        if (isOccupied(startRow - 1, startCol)) return false; // Before
        if (isOccupied(startRow + word.length, startCol)) return false; // After
      }
      
      // Must have exactly one intersection (except for first word)
      if (grid.size > 0 && intersectionCount !== 1) return false;
      
      return true;
    };
    
    // Place a word on the grid
    const placeWord = (word: string, startRow: number, startCol: number, direction: 'horizontal' | 'vertical', wordNumber: number) => {
      for (let i = 0; i < word.length; i++) {
        const r = direction === 'vertical' ? startRow + i : startRow;
        const c = direction === 'horizontal' ? startCol + i : startCol;
        const key = `${r},${c}`;
        
        const existing = grid.get(key);
        if (existing) {
          existing.wordNumbers.push(wordNumber);
          if (i === 0) {
            existing.isStart.push({ number: wordNumber, direction });
          }
        } else {
          grid.set(key, {
            letter: word[i],
            wordNumbers: [wordNumber],
            isStart: i === 0 ? [{ number: wordNumber, direction }] : []
          });
        }
      }
    };
    
    // Place base word horizontally in center (as word number 0, but not revealed)
    const baseRow = 10;
    const baseCol = 5;
    placeWord(baseNorm, baseRow, baseCol, 'horizontal', 0);
    placed.push({ 
      word: { word: { palabra: baseWord, pistas: '' }, normalized: baseNorm.toLowerCase(), number: 0 } as GameWord,
      row: baseRow, 
      col: baseCol, 
      direction: 'horizontal' 
    });
    
    // Try to place each target word
    for (const gameWord of words) {
      const wordNorm = gameWord.normalized.toUpperCase();
      let bestPlacement: { row: number; col: number; direction: 'horizontal' | 'vertical' } | null = null;
      
      // Try to find valid intersections with existing grid letters
      for (const [key, cell] of grid.entries()) {
        const [gridRow, gridCol] = key.split(',').map(Number);
        
        // Check if this letter appears in our word
        for (let charIdx = 0; charIdx < wordNorm.length; charIdx++) {
          if (wordNorm[charIdx] !== cell.letter) continue;
          
          // Try vertical placement (crossing a horizontal word)
          const vStartRow = gridRow - charIdx;
          if (canPlaceWord(wordNorm, vStartRow, gridCol, 'vertical')) {
            bestPlacement = { row: vStartRow, col: gridCol, direction: 'vertical' };
            break;
          }
          
          // Try horizontal placement (crossing a vertical word)
          const hStartCol = gridCol - charIdx;
          if (canPlaceWord(wordNorm, gridRow, hStartCol, 'horizontal')) {
            bestPlacement = { row: gridRow, col: hStartCol, direction: 'horizontal' };
            break;
          }
        }
        
        if (bestPlacement) break;
      }
      
      // Place the word if valid position found
      if (bestPlacement) {
        const { row, col, direction } = bestPlacement;
        placeWord(wordNorm, row, col, direction, gameWord.number);
        placed.push({ word: gameWord, row, col, direction });
      }
    }
    
    // Calculate bounds
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
    for (const key of grid.keys()) {
      const [row, col] = key.split(',').map(Number);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
    
    return { grid, placed, bounds: { minRow, maxRow, minCol, maxCol } };
  };

  // Memoize crossword generation
  const crosswordData = useMemo(() => {
    if (!gameState) return null;
    return generateCrossword(gameState.baseWord.palabra, gameState.targetWords);
  }, [gameState]);

  // Generate game
  const generateGame = async (dateStr: string, level: 'a1' | 'a2' | 'b1' | 'b2'): Promise<GameState | null> => {
    const allWords = await loadLetterWheelVocabulary(level);
    if (allWords.length === 0) {
      console.error('[Game] No words loaded for level:', level);
      return null;
    }

    // Fallback levels for B1/B2: load lower-level vocabularies to fill gaps
    const fallbackLevels: ('a1' | 'a2' | 'b1' | 'b2')[] =
      level === 'b2' ? ['b1', 'a2', 'a1'] :
      level === 'b1' ? ['a2', 'a1'] :
      [];
    
    // Preload fallback vocabularies
    const fallbackWords: VocabWord[][] = [];
    for (const fl of fallbackLevels) {
      const words = await loadLetterWheelVocabulary(fl);
      if (words.length > 0) fallbackWords.push(words);
    }

    const minValidWords = 4;
    const targetCount = 8;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      // Use a different date string for each attempt
      const attemptDateStr = attempts === 0 ? dateStr : `${dateStr}-${attempts}`;
      const baseWordObj = getRandomWordForDate(allWords, attemptDateStr, 6, 10);
      
      if (!baseWordObj) {
        attempts++;
        continue;
      }

      const baseWordNormalized = normalize(baseWordObj.palabra);
      
      // Get related words from current level
      const validWords = getRelatedWords(allWords, baseWordObj.palabra, 30);

      // Start with words from current level
      let combinedWords = [...validWords];

      // Fill from lower levels BEFORE checking minimum
      // (fixes B1/B2 where the primary level alone often has <4 related words)
      if (combinedWords.length < targetCount && fallbackWords.length > 0) {
        const usedNormalized = new Set([
          baseWordNormalized,
          ...combinedWords.map(w => normalize(w.palabra))
        ]);

        for (const lowerWords of fallbackWords) {
          if (combinedWords.length >= targetCount) break;
          const lowerRelated = getRelatedWords(lowerWords, baseWordObj.palabra, 30);
          for (const w of lowerRelated) {
            if (combinedWords.length >= targetCount) break;
            const wNorm = normalize(w.palabra);
            if (!usedNormalized.has(wNorm)) {
              combinedWords.push(w);
              usedNormalized.add(wNorm);
            }
          }
        }
      }

      // Now check if we have enough words (combining all levels)
      if (combinedWords.length >= minValidWords) {
        const finalWords = combinedWords.slice(0, targetCount);
        const targetWords: GameWord[] = finalWords.map((word, idx) => ({
          word,
          normalized: normalize(word.palabra),
          number: idx + 1
        }));

        const fromLevel = Math.min(validWords.length, targetCount);
        const fromFallback = finalWords.length - fromLevel;
        console.log('[Game] Base word:', baseWordObj.palabra, '| Target words:', targetWords.map(t => t.word.palabra).join(', '), '| From level:', fromLevel, '| From fallback:', fromFallback);

        return {
          baseWord: baseWordObj,
          baseWordNormalized,
          targetWords
        };
      }
      
      attempts++;
    }
    
    console.error('[Game] Could not find suitable base word after', maxAttempts, 'attempts');
    return null;
  };

  // Start game
  const startGame = async (level: 'a1' | 'a2' | 'b1' | 'b2', date?: string) => {
    const gameDate = date || new Date().toISOString().split('T')[0];
    setGameStatus('LOADING');
    setDifficulty(level);
    setSelectedDate(gameDate);
    setCurrentWord('');
    setUsedIndices([]);
    setFeedback({ text: '', type: '' });
    setFoundWords(new Set());
    setRevealingCells(new Set());

    const newGameState = await generateGame(gameDate, level);
    
    if (!newGameState) {
      alert('Error al generar el juego. Por favor, intenta de nuevo.');
      setGameStatus('MENU');
      return;
    }

    if (newGameState.targetWords.length === 0) {
      alert('No se encontraron palabras válidas. Por favor, intenta de nuevo.');
      setGameStatus('MENU');
      return;
    }

    setGameState(newGameState);
    
    // Create randomized letter positions
    const positions = Array.from({ length: newGameState.baseWordNormalized.length }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    setLetterPositions(positions);
    
    setGameStatus('PLAYING');
  };

  // Shuffle letter positions on the wheel
  const shuffleLetterPositions = () => {
    if (!gameState) return;
    const positions = Array.from({ length: gameState.baseWordNormalized.length }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    setLetterPositions(positions);
  };

  // Letter selection with toggle (for click)
  const selectLetter = (index: number) => {
    if (!gameState) return;
    
    // If already selected, only undo if it's the LAST letter
    const existingIndex = usedIndices.indexOf(index);
    if (existingIndex !== -1) {
      if (existingIndex === usedIndices.length - 1) {
        playPop();
        const newIndices = usedIndices.slice(0, -1);
        const newWord = newIndices.map(i => gameState.baseWordNormalized[i]).join('');
        setUsedIndices(newIndices);
        setCurrentWord(newWord);
        lastAddedIndexRef.current = newIndices.length > 0 ? newIndices[newIndices.length - 1] : null;
      }
      return;
    }
    
    playPop();
    setUsedIndices([...usedIndices, index]);
    setCurrentWord(currentWord + gameState.baseWordNormalized[index]);
    lastAddedIndexRef.current = index;
  };

  // Add letter during drag with backtracking support
  const addLetterDrag = (index: number) => {
    if (!gameState) return;
    
    // Prevent re-triggering if we're still on the same letter
    if (lastAddedIndexRef.current === index) return;
    
    // Check if this letter is already in the path
    const existingPosition = usedIndices.indexOf(index);
    
    if (existingPosition !== -1) {
      // Backtracking: if the user goes back to the PENULTIMATE letter, undo the last one
      if (existingPosition === usedIndices.length - 2 && usedIndices.length >= 2) {
        playPop();
        const newUsedIndices = usedIndices.slice(0, -1);
        const newWord = newUsedIndices.map(idx => gameState.baseWordNormalized[idx]).join('');
        setUsedIndices(newUsedIndices);
        setCurrentWord(newWord);
        lastAddedIndexRef.current = newUsedIndices[newUsedIndices.length - 1] ?? null;
      }
      // For the last letter or any other already-selected letter, do nothing
      return;
    }
    
    playPop();
    setUsedIndices(prev => [...prev, index]);
    setCurrentWord(prev => prev + gameState.baseWordNormalized[index]);
    lastAddedIndexRef.current = index;
  };

  // Actions
  const clearWord = () => {
    setUsedIndices([]);
    setCurrentWord('');
  };

  const removeLast = () => {
    if (usedIndices.length > 0) {
      setUsedIndices(usedIndices.slice(0, -1));
      setCurrentWord(currentWord.slice(0, -1));
    }
  };

  const submitWord = () => {
    if (!gameState || currentWord.length === 0) return;

    // Check target words and also the base word
    const matchTarget = gameState.targetWords.find(w => w.normalized === currentWord);
    const isBaseWord = currentWord === gameState.baseWordNormalized;
    const match = matchTarget || isBaseWord;

    if (match && !foundWords.has(currentWord)) {
      playSuccess();
      setFeedback({ text: isBaseWord ? '¡Excelente! ¡Encontraste la palabra base!' : '¡Correcto!', type: 'success' });
      setCobiExploradorMessage(seleccionarMensajeExploradorRandom('acierto'));
      setCobiExploradorAvatar('./data/images/cobi-explorador-victoria.webp');
      setTimeout(() => setCobiExploradorAvatar('./data/images/cobi-explorador.webp'), 2000);
      setFoundWords(new Set([...foundWords, currentWord]));
      
      // Trigger cell reveal animation
      if (crosswordData) {
        const wordNumber = isBaseWord ? 0 : matchTarget?.number;
        const cellsToReveal: string[] = [];
        crosswordData.grid.forEach((cell, key) => {
          if (cell.wordNumbers.includes(wordNumber!)) {
            cellsToReveal.push(key);
          }
        });
        
        // Reveal cells one by one
        cellsToReveal.forEach((cellKey, index) => {
          setTimeout(() => {
            setRevealingCells(prev => new Set([...prev, cellKey]));
          }, index * 100);
        });
        
        setTimeout(() => setRevealingCells(new Set()), cellsToReveal.length * 100 + 500);
      }

      // Total words = target words + base word
      const totalWords = gameState.targetWords.length + 1;
      if (foundWords.size + 1 >= totalWords) {
        setTimeout(() => {
          playVictory();
          setCobiExploradorMessage(seleccionarMensajeExploradorRandom('victoria'));
          setCobiExploradorAvatar('./data/images/cobi-explorador-victoria.webp');
          setGameStatus('VICTORY');
        }, 500);
      }
    } else if (foundWords.has(currentWord)) {
      setFeedback({ text: 'Ya encontraste esta palabra', type: 'error' });
    } else {
      playError();
      setCobiExploradorMessage(seleccionarMensajeExploradorRandom('fallo'));
      setCobiExploradorAvatar('./data/images/cobi-explorador-derrota.webp');
      setTimeout(() => setCobiExploradorAvatar('./data/images/cobi-explorador.webp'), 2000);
      setFeedback({ text: 'Palabra incorrecta', type: 'error' });
    }
    
    // Always clear the word after attempting (correct or incorrect)
    clearWord();

    setTimeout(() => setFeedback({ text: '', type: '' }), 2000);
  };

  // Mouse drag and auto-submit
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        lastAddedIndexRef.current = null;
        // Auto-submit when releasing mouse if word is not empty
        if (currentWord.length > 0) {
          setTimeout(() => submitWord(), 100);
        }
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, currentWord]);

  // Keyboard
  useEffect(() => {
    if (gameStatus !== 'PLAYING' || !gameState || showChatWindow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === 'backspace') {
        e.preventDefault();
        removeLast();
      } else if (key === 'enter') {
        e.preventDefault();
        submitWord();
      } else if (key === 'escape') {
        e.preventDefault();
        clearWord();
      } else if (/^[a-zñ]$/.test(key)) {
        e.preventDefault();
        for (let i = 0; i < gameState.baseWordNormalized.length; i++) {
          if (gameState.baseWordNormalized[i] === key && !usedIndices.includes(i)) {
            selectLetter(i);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, gameState, usedIndices, currentWord, showChatWindow]);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getCalendarDays = () => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const daysInMonth = getDaysInMonth(displayMonth);
    const firstDay = getFirstDayOfMonth(displayMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }

    return days;
  };

  const today = new Date().toISOString().split('T')[0];
  const calendarDays = showCalendar ? getCalendarDays() : [];

  // MENU
  if (gameStatus === 'MENU') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="max-w-3xl mx-auto">
          {!isMobile && (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-deep-blue font-medium flex items-center gap-2 transition-colors"
            >
              <ChevronLeft size={20} />
              {t('gameMenu.backToGames')}
            </button>
            <h1 className="text-2xl font-black text-deep-blue">
              🎯 La Rueda de Letras
            </h1>
          </div>
          )}

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-center text-deep-blue mb-6">{t('gameMenu.chooseLevel')}</h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'a1' as const, label: 'A1', desc: t('gameMenu.beginner') },
                { value: 'a2' as const, label: 'A2', desc: t('gameMenu.elementary') },
                { value: 'b1' as const, label: 'B1', desc: t('gameMenu.intermediate') },
                { value: 'b2' as const, label: 'B2', desc: t('gameMenu.advanced') }
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => startGame(value)}
                  className="p-6 rounded-2xl border-2 border-amber-800 bg-amber-800 hover:bg-amber-900 text-white transition-all hover:scale-105 shadow-lg font-bold"
                >
                  <div className="text-3xl font-black">{label}</div>
                  <div className="text-sm opacity-90">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cobi Explorador Menu */}
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-explorador-menu">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiExploradorMenuMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Explorador Menu */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-explorador-menu.webp"
                alt="Cobi Explorador" 
                className="w-56 h-auto object-contain transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            
            {/* Botón CHATEAR dentro del animate-float */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-explorador pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathExploradorMenu" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathExploradorMenu" startOffset="50%" textAnchor="middle" className="curved-text-style-explorador">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🧭</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🧭" themeColor="#CEAE85" cobiVisible={cobiVisible} />

        {/* Chat Window del Menu */}
        {showChatWindow && gameStatus === 'MENU' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧭</span>
                <div>
                  <h3 className="text-white font-bold text-sm">{t('gameMenu.cobiExplorer')}</h3>
                  <p className="text-xs text-amber-50">{t('gameMenu.cobiExplorerSub')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatWindow(false)}
                className="p-1 hover:bg-white/20 rounded-full transition"
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
            </div>

            {/* Chat History */}
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-amber-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🧭</p>
                  <p>¡Bienvenido! Soy Cobi Explorador.</p>
                  <p className="text-xs mt-2">Pregúntame sobre el juego o palabras. 🗺️</p>
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
                      El Explorador consulta su mapa... 🗺️
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
                  placeholder={t('gameMenu.chatPlaceholder')}
                  disabled={isLoadingResponse}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-amber-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LOADING
  if (gameStatus === 'LOADING') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎯</div>
          <div className="text-2xl font-bold text-deep-blue">Cargando...</div>
        </div>
      </div>
    );
  }

  // VICTORY
  if (gameStatus === 'VICTORY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-blue-50 p-4 flex items-center justify-center relative">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-5xl font-black text-green-600 mb-4">¡Felicidades!</h1>
          <p className="text-xl text-gray-700 mb-8">Encontraste todas las palabras</p>
          <div className="space-y-3">
            <button
              onClick={() => startGame(difficulty)}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
            >
              Jugar de Nuevo
            </button>
            <button
              onClick={() => setGameStatus('MENU')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl transition-colors"
            >
              Menú Principal
            </button>
          </div>
        </div>

        {/* Cobi Explorador Victoria */}
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-explorador-victoria">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiExploradorMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Explorador Victoria */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-explorador-victoria.webp"
                alt="Cobi Explorador Victoria" 
                className="w-56 h-auto object-contain transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            
            {/* Botón CHATEAR dentro del animate-float */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-explorador pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathExploradorVictoria" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathExploradorVictoria" startOffset="50%" textAnchor="middle" className="curved-text-style-explorador">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🧭</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🧭" themeColor="#CEAE85" cobiVisible={cobiVisible} />

        {/* Chat Window de Victoria */}
        {showChatWindow && gameStatus === 'VICTORY' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧭</span>
                <div>
                  <h3 className="text-white font-bold text-sm">{t('gameMenu.cobiExplorer')}</h3>
                  <p className="text-xs text-amber-50">{t('gameMenu.cobiExplorerSub')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatWindow(false)}
                className="p-1 hover:bg-white/20 rounded-full transition"
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
            </div>

            {/* Chat History */}
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-amber-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🧭</p>
                  <p>¡Bienvenido! Soy Cobi Explorador.</p>
                  <p className="text-xs mt-2">Pregúntame sobre el juego o palabras. 🗺️</p>
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
                      El Explorador consulta su mapa... 🗺️
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
                  placeholder={t('gameMenu.chatPlaceholder')}
                  disabled={isLoadingResponse}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-amber-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PLAYING
  if (!gameState) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <p className="text-red-600 font-bold">Error: No se pudo cargar el juego</p>
          <button
            onClick={() => setGameStatus('MENU')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg"
          >
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lw-playing-root min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <style>{`
        @keyframes inputShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .lw-input-shake {
          animation: inputShake 0.4s ease-in-out;
        }
        @media (max-width: 768px) {
          .lw-playing-root {
            overflow: hidden;
            height: 100dvh;
            min-height: unset;
            display: flex;
            flex-direction: column;
          }
          .lw-header-inner {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          .lw-header-row {
            margin-bottom: 0.25rem !important;
          }
          .lw-header-title {
            font-size: 1rem !important;
          }
          .lw-header-subtitle {
            display: none !important;
          }
          .lw-progress-section {
            display: none !important;
          }
          .lw-progress-bar {
            display: none !important;
          }
          .lw-main-content {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            padding: 0 !important;
            overflow: hidden;
          }
          .lw-main-grid {
            flex: 1;
            min-height: 0;
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
          }
          .lw-crucigrama-title {
            display: none !important;
          }
          /* Crossword area: fills available top space */
          .lw-crossword-card {
            padding: 0.5rem !important;
            flex: 1 1 auto;
            min-height: 0;
            border-radius: 0 !important;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .lw-crossword-scroll {
            flex: 1;
            min-height: 0;
            overflow: auto;
            width: 100%;
          }
          .lw-crossword-grid {
            display: grid !important;
            width: 100% !important;
            grid-template-columns: repeat(var(--cols), 1fr) !important;
          }
          .lw-crossword-grid > div {
            width: auto !important;
            height: auto !important;
            aspect-ratio: 1;
            font-size: 0.55rem !important;
          }
          .lw-crossword-grid > div span {
            width: 12px !important;
            height: 12px !important;
            font-size: 7px !important;
          }
          .lw-feedback-desktop {
            display: none !important;
          }
          /* Wheel area: fixed at bottom, perfect circle */
          .lw-wheel-card {
            padding: 0.25rem 20px !important;
            flex: 0 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow: hidden;
            border-radius: 0 !important;
          }
          .lw-input-row {
            margin-bottom: 0.25rem !important;
            width: 100%;
          }
          .lw-input-display {
            min-height: 2rem !important;
            padding: 0.25rem 0.5rem !important;
          }
          .lw-input-text {
            font-size: 1.25rem !important;
          }
          .lw-hint-text {
            display: none !important;
          }
          .lw-shuffle-btn {
            display: flex !important;
          }
          .lw-clear-btn {
            display: flex !important;
          }
          .lw-wheel-container {
            width: calc(100vw - 40px) !important;
            height: calc(100vw - 40px) !important;
            aspect-ratio: 1 / 1;
            max-width: 320px;
            max-height: 320px;
            flex-shrink: 0;
            margin-bottom: 0 !important;
          }
          .lw-wheel-bg {
            width: 100% !important;
            height: 100% !important;
          }
          .lw-wheel-svg {
            width: 100% !important;
            height: 100% !important;
          }
          .lw-letter-btn {
            width: 2.5em !important;
            height: 2.5em !important;
            font-size: clamp(0.7rem, 3vw, 1.1rem) !important;
          }
          .lw-bottom-buttons {
            display: none !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-20">
        <div className="lw-header-inner max-w-6xl mx-auto px-4 py-4">
          <div className="lw-header-row flex items-center justify-between mb-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft size={24} />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="lw-header-title text-2xl font-black text-deep-blue">La Rueda de Letras</h1>
              <p className="lw-header-subtitle text-xs text-gray-500">{difficulty.toUpperCase()}</p>
            </div>

            <div className="flex gap-2">
              {isMobile ? (
                <>
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className={`p-2 rounded-full transition-colors ${showHints ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                  >
                    <Lightbulb size={24} className="text-yellow-600" />
                  </button>
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition"
                    title="Calendario"
                  >
                    <Calendar size={20} />
                  </button>
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className={`p-2 rounded-full transition-colors ${showInstructions ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  >
                    <Info size={24} className="text-blue-600" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${showHints ? 'bg-yellow-200' : 'bg-yellow-100 hover:bg-yellow-200'}`}
                  >
                    <Lightbulb size={20} className="text-yellow-700" />
                    <span className="text-sm font-semibold text-yellow-800">PISTAS</span>
                  </button>
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${showCalendar ? 'bg-purple-200' : 'bg-purple-100 hover:bg-purple-200'}`}
                  >
                    <Calendar size={20} className="text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">CALENDARIO</span>
                  </button>
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${showInstructions ? 'bg-blue-200' : 'bg-blue-100 hover:bg-blue-200'}`}
                  >
                    <Info size={20} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">INSTRUCCIONES</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="lw-progress-section flex justify-between text-sm mb-2">
            <span className="font-semibold text-gray-700">Palabras encontradas</span>
            <span className="font-bold text-purple-600">{foundWords.size} / {gameState.targetWords.length}</span>
          </div>
          <div className="lw-progress-bar w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(foundWords.size / gameState.targetWords.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCalendar(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1))}
                className="p-2 hover:bg-gray-200 rounded"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center font-semibold">
                {displayMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1))}
                className="p-2 hover:bg-gray-200 rounded"
              >
                <ChevronRight size={20} />
              </button>
              <button onClick={() => setShowCalendar(false)} className="p-2 hover:bg-gray-100 rounded-full ml-2">
                <X size={20} />
              </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                  {day}
                </div>
              ))}
              {calendarDays.map((dateStr, idx) => {
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === today;
                const isFuture = !!(dateStr && dateStr > today);
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (dateStr && !isFuture) {
                        setSelectedDate(dateStr);
                        startGame(difficulty, dateStr);
                        setShowCalendar(false);
                      }
                    }}
                    disabled={isFuture}
                    className={`py-2 text-xs font-semibold rounded ${
                      !dateStr
                        ? ''
                        : isSelected
                        ? 'bg-purple-600 text-white'
                        : isToday
                        ? 'bg-green-500 text-white'
                        : isFuture
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'bg-white text-gray-800 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {dateStr ? new Date(dateStr).getDate() : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-2xl">
            <div className="flex justify-between mb-4">
              <h3 className="text-2xl font-black text-deep-blue">Instrucciones</h3>
              <button onClick={() => setShowInstructions(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>🎯 Forma palabras usando las letras de la palabra base.</p>
              <p>🔤 Solo puedes usar cada letra el número de veces que aparece.</p>
              <p>💻 En ordenador: click o teclado.</p>
              <p>📱 En móvil: toca y arrastra.</p>
              <p>⌨️ Enter para enviar, Backspace para borrar, Escape para limpiar.</p>
            </div>
          </div>
        </div>
      )}

      {/* Hints Modal */}
      {showHints && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                💡 Pistas
              </h3>
              <button onClick={() => setShowHints(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {/* Base word hint (★) */}
              {(() => {
                const baseFound = foundWords.has(gameState.baseWordNormalized);
                return (
                  <div
                    key="base-word"
                    className={`p-4 rounded-xl transition-all ${
                      baseFound 
                        ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-400' 
                        : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                        baseFound 
                          ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white' 
                          : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                      }`}>
                        ★
                      </span>
                      <div className="flex-1">
                        <p className={`font-medium ${baseFound ? 'text-purple-800' : 'text-gray-700'}`}>
                          {gameState.baseWord.pistas || 'Palabra principal'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {gameState.baseWordNormalized.length} letras
                          {baseFound && <span className="ml-2 text-purple-600 font-semibold">• {gameState.baseWordNormalized.toUpperCase()}</span>}
                        </p>
                      </div>
                      {baseFound && (
                        <span className="text-2xl">✅</span>
                      )}
                    </div>
                  </div>
                );
              })()}
              {/* Target words hints */}
              {gameState.targetWords.map((item) => {
                const found = foundWords.has(item.normalized);
                return (
                  <div
                    key={item.number}
                    className={`p-4 rounded-xl transition-all ${
                      found 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400' 
                        : 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                        found 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' 
                          : 'bg-gradient-to-br from-purple-500 to-blue-600 text-white'
                      }`}>
                        {item.number}
                      </span>
                      <div className="flex-1">
                        <p className={`font-medium ${found ? 'text-green-800' : 'text-gray-700'}`}>
                          {item.word.pistas || 'Sin pista'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.normalized.length} letras
                          {found && <span className="ml-2 text-green-600 font-semibold">• {item.normalized.toUpperCase()}</span>}
                        </p>
                      </div>
                      {found && (
                        <span className="text-2xl">✅</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lw-main-content max-w-6xl mx-auto px-4 py-6">
        <div className="lw-main-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Crossword Grid */}
          <div className="space-y-4">
            {/* Crossword */}
            <div className="lw-crossword-card bg-white rounded-2xl p-4 shadow-xl">
              <h2 className="lw-crucigrama-title text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                🧩 Crucigrama
              </h2>
              
              {crosswordData && (
                <div className="lw-crossword-scroll overflow-auto">
                  <div 
                    className="lw-crossword-grid inline-grid gap-0.5 p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl"
                    style={{
                      gridTemplateColumns: `repeat(${crosswordData.bounds.maxCol - crosswordData.bounds.minCol + 1}, 40px)`,
                      '--cols': crosswordData.bounds.maxCol - crosswordData.bounds.minCol + 1,
                    } as React.CSSProperties}
                  >
                    {Array.from({ length: crosswordData.bounds.maxRow - crosswordData.bounds.minRow + 1 }).map((_, rowIdx) => {
                      const row = crosswordData.bounds.minRow + rowIdx;
                      return Array.from({ length: crosswordData.bounds.maxCol - crosswordData.bounds.minCol + 1 }).map((_, colIdx) => {
                        const col = crosswordData.bounds.minCol + colIdx;
                        const key = `${row},${col}`;
                        const cell = crosswordData.grid.get(key);
                        
                        if (!cell) {
                          return <div key={`${row}-${col}`} className="w-8 h-8 sm:w-10 sm:h-10" />;
                        }
                        
                        // Check if any word containing this cell is found
                        const isBaseWord = cell.wordNumbers.includes(0);
                        const baseWordFound = foundWords.has(gameState.baseWordNormalized);
                        const foundWordNumbers = cell.wordNumbers.filter(num => {
                          if (num === 0) return baseWordFound;
                          return foundWords.has(gameState.targetWords.find(w => w.number === num)?.normalized || '');
                        });
                        const isCellRevealed = foundWordNumbers.length > 0;
                        // Show number badge for all words including base word (number 0)
                        const startInfo = cell.isStart.length > 0 ? cell.isStart[0] : null;
                        
                        const isRevealing = revealingCells.has(key);
                        
                        return (
                          <div
                            key={`${row}-${col}`}
                            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-black text-sm sm:text-lg rounded relative transition-all ${
                              isCellRevealed
                                ? isBaseWord && baseWordFound
                                  ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-md'
                                  : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md'
                                : 'bg-white border-2 border-purple-300 text-transparent'
                            } ${
                              isRevealing ? 'animate-flip' : ''
                            }`}
                            style={{
                              animation: isRevealing ? 'flip 0.6s ease-in-out' : undefined
                            }}
                          >
                            {startInfo && (
                              <span className={`absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-xs flex items-center justify-center font-bold z-10 ${
                                startInfo.number === 0
                                  ? isCellRevealed ? 'bg-yellow-400 text-yellow-900' : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                                  : isCellRevealed ? 'bg-yellow-400 text-yellow-900' : 'bg-purple-600 text-white'
                              }`}>
                                {startInfo.number === 0 ? '★' : startInfo.number}
                              </span>
                            )}
                            {isCellRevealed ? cell.letter : '?'}
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Feedback */}
            {feedback.text && (
              <div className={`lw-feedback-desktop p-4 rounded-xl font-bold text-center transition-all transform ${
                feedback.type === 'success' 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-400 animate-bounce' 
                  : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-2 border-red-400 animate-shake'
              }`}
              style={{
                animation: feedback.type === 'success' ? 'bounce 0.5s ease-in-out' : 'shake 0.5s ease-in-out'
              }}>
                {feedback.text}
              </div>
            )}
          </div>

          {/* Right: Letter Wheel */}
          <div className="space-y-4">
            {/* Input Area */}
            <div className="lw-wheel-card bg-white rounded-2xl p-6 shadow-xl">
              {/* Input + Shuffle row */}
              <div className="lw-input-row flex gap-2 mb-4">
                <div 
                  className="lw-input-display min-h-20 flex-1 bg-gradient-to-r from-blue-50 to-purple-50 border-3 border-dashed border-blue-300 rounded-xl flex items-center justify-center relative cursor-pointer"
                  onClick={() => { if (isMobile && currentWord.length > 0) submitWord(); }}
                >
                  {currentWord.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); clearWord(); }}
                      className="lw-clear-btn absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 flex items-center justify-center hidden"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <span className={`lw-input-text text-3xl font-black tracking-wider transition-all ${
                    feedback.type === 'success' ? 'text-green-600' : feedback.type === 'error' ? 'text-red-600 lw-input-shake' : 'text-blue-900'
                  }`}>
                    {currentWord.toUpperCase() || '...'}
                  </span>
                </div>
                <button
                  onClick={shuffleLetterPositions}
                  className="lw-shuffle-btn hidden items-center justify-center w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors flex-shrink-0 self-center"
                  title={t('gameMenu.lwShuffle')}
                >
                  <Shuffle size={20} />
                </button>
              </div>

              <p className="lw-hint-text text-xs text-center text-gray-500 mb-4 hidden sm:block">
                {t('gameMenu.lwHint')}
              </p>

              {/* Letter Wheel */}
              {(() => {
                const wheelSize = isMobile ? Math.min(window.innerWidth - 40, 320) : 300;
                const letterCount = gameState.baseWordNormalized.length;
                const btnSize = isMobile ? Math.max(Math.round(wheelSize * 0.14), letterCount > 8 ? 34 : 40) : 56;
                const btnRadius = btnSize / 2;
                const wheelRadius = (wheelSize / 2) - btnRadius - 4;
                const bgCircleSize = wheelSize - 16;
                const letterFontSize = isMobile ? `${Math.max(btnSize * 0.4, 10)}px` : '1.25rem';
                return (
              <>
              <div className="lw-wheel-container relative mx-auto mb-4" style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}>
                {/* Large background circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="lw-wheel-bg bg-gradient-to-br from-purple-100 via-blue-100 to-purple-100 rounded-full shadow-lg opacity-40" style={{ width: `${bgCircleSize}px`, height: `${bgCircleSize}px` }}></div>
                </div>
                
                {/* SVG for connecting lines */}
                <svg className="lw-wheel-svg absolute inset-0 pointer-events-none z-10" width={wheelSize} height={wheelSize}>
                  {usedIndices.length >= 1 && usedIndices.map((currentIdx, i) => {
                    if (i === 0) return null;
                    const prevIdx = usedIndices[i - 1];
                    const actualPrevPos = letterPositions.indexOf(prevIdx);
                    const actualCurrentPos = letterPositions.indexOf(currentIdx);
                    
                    if (actualPrevPos === -1 || actualCurrentPos === -1) return null;
                    
                    const total = gameState.baseWordNormalized.length;
                    const prevAngle = (actualPrevPos / total) * 2 * Math.PI - Math.PI / 2;
                    const currentAngle = (actualCurrentPos / total) * 2 * Math.PI - Math.PI / 2;
                    const center = wheelSize / 2;
                    
                    const x1 = center + wheelRadius * Math.cos(prevAngle);
                    const y1 = center + wheelRadius * Math.sin(prevAngle);
                    const x2 = center + wheelRadius * Math.cos(currentAngle);
                    const y2 = center + wheelRadius * Math.sin(currentAngle);
                    
                    const gradientId = `lineGradient-${i}-${prevIdx}-${currentIdx}`;
                    
                    return (
                      <g key={`line-${i}-${prevIdx}-${currentIdx}`}>
                        <defs>
                          <linearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
                            <stop offset="0%" style={{ stopColor: '#ec4899', stopOpacity: 0.9 }} />
                            <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.9 }} />
                          </linearGradient>
                        </defs>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={`url(#${gradientId})`}
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                </svg>
                
                {/* Letters in circle (randomized positions) */}
                {letterPositions.map((originalIndex, visualPosition) => {
                  const letter = gameState.baseWordNormalized[originalIndex];
                  const total = gameState.baseWordNormalized.length;
                  const angle = (visualPosition / total) * 2 * Math.PI - Math.PI / 2;
                  const center = wheelSize / 2;
                  
                  const x = center + wheelRadius * Math.cos(angle);
                  const y = center + wheelRadius * Math.sin(angle);
                  const used = usedIndices.includes(originalIndex);
                  const usedPosition = usedIndices.indexOf(originalIndex);
                  
                  return (
                    <button
                      key={`${originalIndex}-${visualPosition}`}
                      onClick={() => {
                        if (!isDragging) selectLetter(originalIndex);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                        lastAddedIndexRef.current = null;
                        addLetterDrag(originalIndex);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                        lastAddedIndexRef.current = null;
                        addLetterDrag(originalIndex);
                      }}
                      onMouseEnter={() => {
                        if (isDragging) addLetterDrag(originalIndex);
                      }}
                      onTouchMove={(e) => {
                        if (!isDragging) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const touch = e.touches[0];
                        const touchX = touch.clientX;
                        const touchY = touch.clientY;
                        const element = document.elementFromPoint(touchX, touchY) as HTMLElement;
                        
                        if (element?.hasAttribute('data-letter-index')) {
                          const idx = parseInt(element.getAttribute('data-letter-index')!);
                          if (!isNaN(idx)) {
                            addLetterDrag(idx);
                          }
                        }
                      }}
                      data-letter-index={originalIndex}
                      className={`lw-letter-btn absolute rounded-full font-black transition-all ${
                        used
                          ? 'bg-gradient-to-br from-red-400 to-pink-500 text-white scale-90 shadow-lg'
                          : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:scale-110 shadow-md active:scale-95'
                      }`}
                      style={{
                        width: `${btnSize}px`,
                        height: `${btnSize}px`,
                        fontSize: letterFontSize,
                        left: `${x - btnRadius}px`,
                        top: `${y - btnRadius}px`,
                        touchAction: 'none',
                      }}
                    >
                      {letter.toUpperCase()}
                      {used && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 rounded-full text-xs flex items-center justify-center font-bold pointer-events-none">
                          {usedPosition + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Buttons */}
              <div className="lw-bottom-buttons grid grid-cols-3 gap-2">
                <button
                  onClick={clearWord}
                  className="lw-bottom-btn bg-gray-200 hover:bg-gray-300 font-bold py-3 rounded-xl transition-colors"
                >
                  {t('gameMenu.lwClean')}
                </button>
                <button
                  onClick={removeLast}
                  className="lw-bottom-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {t('gameMenu.lwDelete')}
                </button>
                <button
                  onClick={submitWord}
                  className="lw-bottom-btn bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
                >
                  {t('gameMenu.lwSend')}
                </button>
              </div>
              </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Cobi Explorador - Visible solo en PLAYING */}
      {gameStatus === 'PLAYING' && (
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-explorador-container">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiExploradorMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Explorador */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                key={cobiExploradorAvatar}
                src={cobiExploradorAvatar}
                alt="Cobi Explorador" 
                className="w-56 h-auto object-contain transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            
            {/* Botón CHATEAR dentro del animate-float */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-explorador pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathExploradorPlaying" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathExploradorPlaying" startOffset="50%" textAnchor="middle" className="curved-text-style-explorador">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🧭</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón Cobi móvil */}
      <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🧭" themeColor="#CEAE85" cobiVisible={cobiVisible} />

      {/* Chat Window del Juego */}
      {showChatWindow && gameStatus === 'PLAYING' && (
        <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧭</span>
              <div>
                <h3 className="text-white font-bold text-sm">{t('gameMenu.cobiExplorer')}</h3>
                <p className="text-xs text-amber-50">{t('gameMenu.cobiExplorerSub')}</p>
              </div>
            </div>
            <button
              onClick={() => setShowChatWindow(false)}
              className="p-1 hover:bg-white/20 rounded-full transition"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
          </div>

          {/* Chat History */}
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-amber-50/30 to-white">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                <p className="mb-2">🧭</p>
                <p>¡Bienvenido! Soy Cobi Explorador.</p>
                <p className="text-xs mt-2">Pregúntame sobre el juego o palabras. 🗺️</p>
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
                    El Explorador consulta su mapa... 🗺️
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
                placeholder={t('gameMenu.chatPlaceholder')}
                disabled={isLoadingResponse}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-amber-400 transition text-sm disabled:bg-gray-100"
              />
              <button
                onClick={sendMessageToCobi}
                disabled={isLoadingResponse || !chatInput.trim()}
                className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterWheelGame;
