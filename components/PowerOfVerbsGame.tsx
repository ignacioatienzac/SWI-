import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Info, X, Pause, Play, Send } from 'lucide-react';
import { getFilteredVerbs, getAvailableTenses } from '../services/powerVerbsService';
import { PowerVerb, GameDifficulty, GameMode, BattleMode } from '../types';
import { hablarConPanda } from '../services/geminiService';

interface PowerOfVerbsGameProps {
  onBack: () => void;
}

// Función para formatear nombres de tiempos verbales
const formatTenseName = (tense: string): string => {
  const tenseMap: Record<string, string> = {
    'imperfecto': 'Pretérito Imperfecto',
    'indefinido': 'Pretérito Indefinido',
    'presente': 'Presente',
    'pretérito perfecto': 'Pretérito Perfecto',
    'pretérito indefinido': 'Pretérito Indefinido',
    'presente continuo': 'Presente Continuo',
    'futuro simple': 'Futuro Simple',
    'condicional simple': 'Condicional Simple',
    'pretérito pluscuamperfecto': 'Pretérito Pluscuamperfecto'
  };
  
  return tenseMap[tense.toLowerCase()] || tense.charAt(0).toUpperCase() + tense.slice(1);
};

// Mensajes aleatorios para Cobi Mago durante el juego
const mensajesMagoJuego = [
  "¡Prepara tu varita! ✨",
  "¡Que empiece la magia! 🔮",
  "¡Abre el grimorio! 📖",
  "¡Hora de conjurar! ⚡"
];

const mensajesMagoMenu = [
  "¡Bienvenido, mago! ¿Listo para conjugar? ✨",
  "Mi libro de hechizos está preparado. ¡Vamos! 📖",
  "¿Qué varita usamos hoy? 🪄",
  "¡Vamos a defender el castillo! 🏰"
];

const mensajesMagoAcierto = [
  "¡Pretéritum Totalus! ⚡",
  "¡Futurum Primus! ✨",
  "¡Imperativus Maxima! 💥",
  "¡Conjugatio Explosiva! 🔥",
  "¡Verbum Rayo! ⚡",
  "¡Participium Perfectum! 🌟",
  "¡Avada Kedavra, monstruo! 🔥"
];

const mensajesMagoFallo = [
  "¡Irregularis Chaos! 🌀",
  "¡Conjugatio Incompleta! 💨",
  "¡Tildus Absentia! 📉",
  "¡Syntaxis Confusum! 🌫️",
  "¡Verbum Fallidus! 🧨",
  "¡Modus Incorrektus! 🌫️",
  "¡Subjuntivum Dubia... 🌫️",
  "¡Infinitivus Errorus! 💨",
  "¡Gerundium Lento... 🐢"
];

const mensajesMagoPausa = [
  "Recargando maná... 🧘‍♂️",
  "Revisando hechizos 🪄",
  "Meditando el próximo ataque. 🎋"
];

const mensajesMagoVictoria = [
  "¡Conjugatum Victorium! 🏆",
  "¡Lo logramos, mago supremo! 🌟",
  "¡Así se hace, leyenda de la magia! 👑"
];

const mensajesMagoDerrota = [
  "Se nos acabó la magia... ¿volvemos a intentarlo?🪄",
  "¡Necesitamos más MP! 🧪",
  "Quizás necesitamos estudiar más hechizos 📚"
];

const seleccionarMensajeMagoRandom = (tipo: 'juego' | 'acierto' | 'fallo' | 'pausa' | 'victoria' | 'derrota' | 'menu'): string => {
  let mensajes;
  switch(tipo) {
    case 'acierto':
      mensajes = mensajesMagoAcierto;
      break;
    case 'fallo':
      mensajes = mensajesMagoFallo;
      break;
    case 'pausa':
      mensajes = mensajesMagoPausa;
      break;
    case 'victoria':
      mensajes = mensajesMagoVictoria;
      break;
    case 'derrota':
      mensajes = mensajesMagoDerrota;
      break;
    case 'menu':
      mensajes = mensajesMagoMenu;
      break;
    default:
      mensajes = mensajesMagoJuego;
  }
  const indice = Math.floor(Math.random() * mensajes.length);
  return mensajes[indice];
};

// --- GAME CONSTANTS & CONFIGURATION ---
const DIFFICULTY_SETTINGS = {
  facil: {
    label: 'Fácil',
    castleLives: 10,
    targetScore: 500,
    spawnRate: 4000,
    minSpawnRate: 1500,
    enemySpeedMultiplier: 0.35,
    bossHp: 80,
    bossAppearTime: 45000, // 45 segundos
    bossSpeed: 0.07, // Muy lento
  },
  intermedio: {
    label: 'Intermedio',
    castleLives: 5,
    targetScore: 1000,
    spawnRate: 3500,
    minSpawnRate: 1000,
    enemySpeedMultiplier: 0.45,
    bossHp: 150,
    bossAppearTime: 40000,
    bossSpeed: 0.12, // Medio
  },
  dificil: {
    label: 'Difícil',
    castleLives: 3,
    targetScore: 2000,
    spawnRate: 3000,
    minSpawnRate: 600,
    enemySpeedMultiplier: 0.6,
    bossHp: 250,
    bossAppearTime: 35000,
    bossSpeed: 0.17, // Más rápido
  },
};

// --- CONTRARRELOJ ENEMY STATS ---
interface ContrarrelojEnemy {
  id: number; // 1-6
  image: string;
  hp: number;
  hpFacil?: number; // Override HP for facil difficulty
  baseTime: number; // seconds
  name: string;
  reward: number; // Points awarded on kill
}

const CONTRARRELOJ_ENEMIES: ContrarrelojEnemy[] = [
  { id: 1, image: '/data/images/enemigo_1.png', hp: 10,  baseTime: 12, name: 'Duende', reward: 60 },
  { id: 2, image: '/data/images/enemigo_2.png', hp: 30,  hpFacil: 20, baseTime: 10, name: 'Trasgo', reward: 100 },
  { id: 3, image: '/data/images/enemigo_3.png', hp: 60,  baseTime: 8,  name: 'Ogro', reward: 150 },
  { id: 4, image: '/data/images/enemigo_4.png', hp: 100, baseTime: 7,  name: 'Troll', reward: 250 },
  { id: 5, image: '/data/images/enemigo_5.png', hp: 160, baseTime: 6,  name: 'Dragón', reward: 400 },
  { id: 6, image: '/data/images/enemigo_6.png', hp: 250, baseTime: 5,  name: 'Lich', reward: 800 },
];

interface ContrarrelojDifficultyConfig {
  timeMultiplier: number;
  enemyPool: number[]; // enemy ids
  castleLives: number;
  getEnemyWeights: (kills: number) => { id: number; weight: number }[];
}

const CONTRARRELOJ_DIFFICULTY: Record<GameDifficulty, ContrarrelojDifficultyConfig> = {
  facil: {
    timeMultiplier: 1.5,
    enemyPool: [1, 2, 3, 4],
    castleLives: 10,
    getEnemyWeights: (kills: number) => {
      // Progresión basada en kills por tipo de enemigo
      // El usuario pasa killsByType como parámetro kills, pero necesitamos acceso al objeto
      // Por ahora usamos kills total, pero modificaremos el llamado después
      return [
        { id: 1, weight: 60 },
        { id: 1, weight: 20 },
        { id: 2, weight: 15 },
        { id: 2, weight: 5 }
      ];
    },
  },
  intermedio: {
    timeMultiplier: 1.0,
    enemyPool: [1, 2, 3, 4, 5],
    castleLives: 5,
    getEnemyWeights: (kills: number) => {
      if (kills <= 5) return [{ id: 1, weight: 50 }, { id: 2, weight: 50 }];
      if (kills <= 15) return [{ id: 1, weight: 15 }, { id: 2, weight: 30 }, { id: 3, weight: 35 }, { id: 4, weight: 20 }];
      if (kills <= 25) return [{ id: 2, weight: 15 }, { id: 3, weight: 25 }, { id: 4, weight: 35 }, { id: 5, weight: 25 }];
      return [{ id: 3, weight: 20 }, { id: 4, weight: 35 }, { id: 5, weight: 45 }];
    },
  },
  dificil: {
    timeMultiplier: 0.8,
    enemyPool: [2, 3, 4, 5, 6],
    castleLives: 3,
    getEnemyWeights: (kills: number) => {
      if (kills <= 5) return [{ id: 2, weight: 50 }, { id: 3, weight: 50 }];
      if (kills <= 15) return [{ id: 2, weight: 15 }, { id: 3, weight: 30 }, { id: 4, weight: 35 }, { id: 5, weight: 20 }];
      if (kills <= 25) return [{ id: 3, weight: 10 }, { id: 4, weight: 25 }, { id: 5, weight: 35 }, { id: 6, weight: 30 }];
      return [{ id: 4, weight: 15 }, { id: 5, weight: 35 }, { id: 6, weight: 50 }];
    },
  },
};

// Pick enemy from weighted pool
const pickWeightedEnemy = (weights: { id: number; weight: number }[]): ContrarrelojEnemy => {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  for (const w of weights) {
    random -= w.weight;
    if (random <= 0) {
      return CONTRARRELOJ_ENEMIES[w.id - 1];
    }
  }
  return CONTRARRELOJ_ENEMIES[weights[weights.length - 1].id - 1];
};

type GameState = 'SELECTION' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

// --- CANVAS ENTITY TYPES ---
interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Monster extends Entity {
  id: number;
  hp: number;
  maxHp: number;
  speed: number;
  emoji: string;
  imageIndex: number; // 0-5 for enemigo_1 to enemigo_6
  color: string;
  points: number;
}

interface Projectile extends Entity {
  speed: number;
  power: number;
  emoji: string;
}

interface Boss extends Entity {
  hp: number;
  maxHp: number;
  emoji: string;
  defeated: boolean;
  speed: number;
}

// --- COMPONENT ---
const PowerOfVerbsGame: React.FC<PowerOfVerbsGameProps> = ({ onBack }) => {
  // UI State
  const [gameState, setGameState] = useState<GameState>('SELECTION');
  const [selectedGrammar, setSelectedGrammar] = useState<string>('indicativo');
  const [selectedTense, setSelectedTense] = useState<string>('');
  const [selectedVerbType, setSelectedVerbType] = useState<string>('');
  const [selectedBattleMode, setSelectedBattleMode] = useState<BattleMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // Game Logic State
  const [currentVerb, setCurrentVerb] = useState<PowerVerb | null>(null);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(0);
  const [attackPower, setAttackPower] = useState(1);
  const [verbsPool, setVerbsPool] = useState<PowerVerb[]>([]);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // Contrarreloj-specific state (damage system & progression)
  const [damageStreak, setDamageStreak] = useState(0);
  const [killCount, setKillCount] = useState(0);
  const [pointsStreak, setPointsStreak] = useState(0); // Racha para bonificación de puntos
  const [killsByType, setKillsByType] = useState<{ [key: number]: number }>({}); // Kills por tipo de enemigo
  
  // Keep refs in sync with state for gameLoop access
  useEffect(() => { killCountRef.current = killCount; }, [killCount]);
  useEffect(() => { attackPowerRef.current = attackPower; }, [attackPower]);
  useEffect(() => { killsByTypeRef.current = killsByType; }, [killsByType]);
  
  // Cobi Mago State
  const [cobiMagoMessage, setCobiMagoMessage] = useState<string>(seleccionarMensajeMagoRandom('juego'));
  const [cobiMagoMenuMessage] = useState<string>(seleccionarMensajeMagoRandom('menu'));
  const [cobiMagoPausaMessage] = useState<string>(seleccionarMensajeMagoRandom('pausa'));
  const [cobiMagoDerrotaMessage] = useState<string>(seleccionarMensajeMagoRandom('derrota'));
  const [cobiMagoVictoriaMessage] = useState<string>(seleccionarMensajeMagoRandom('victoria'));
  
  // Chat State
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'cobi', text: string}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  
  // Canvas Refs (Mutable game state to avoid re-renders)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const lastShotRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const heroRef = useRef({ x: 50, y: 0, width: 40, height: 40 }); // Y position set dynamically
  const monstersRef = useRef<Monster[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const bossRef = useRef<Boss | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const killCountRef = useRef<number>(0);
  const attackPowerRef = useRef<number>(1);
  const killsByTypeRef = useRef<{ [key: number]: number }>({});
  const nextSpawnTimeRef = useRef<number>(0);
  
  // Image refs for rendering
  const enemyImagesRef = useRef<HTMLImageElement[]>([]);
  const bossImageRef = useRef<HTMLImageElement | null>(null);
  const wizardImageRef = useRef<HTMLImageElement | null>(null);
  const imagesLoadedRef = useRef<boolean>(false);

  // Send message to Cobi Mago
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

      // Si estamos en SELECTION, contexto de lobby
      if (gameState === 'SELECTION') {
        contextoJuego = {
          juego: 'El Poder de los Verbos',
          estado: 'menu',
          dificultad_seleccionada: selectedDifficulty || 'ninguna',
          tiempo_seleccionado: selectedTense || 'ninguno',
          modo_juego: selectedMode || 'ninguno',
          modo_batalla: selectedBattleMode || 'ninguno'
        };
        tipo = 'lobby';
      } else {
        // Si estamos jugando, contexto de juego
        contextoJuego = {
          juego: 'El Poder de los Verbos',
          dificultad: selectedDifficulty,
          tiempo_verbal: selectedTense,
          modo_juego: selectedMode,
          modo_batalla: selectedBattleMode,
          puntuacion: score,
          poder_ataque: attackPower,
          vidas: lives
        };
        tipo = 'juego';
      }

      // Call Cobi AI with appropriate context
      const response = await hablarConPanda(
        userMessage,
        'El Poder de los Verbos - Mago Experto en Gramática Española 🪄',
        contextoJuego,
        tipo
      );

      // Add Cobi response to history
      setChatHistory(prev => [...prev, { role: 'cobi', text: response }]);
    } catch (error) {
      console.error('Error al comunicarse con Cobi Mago:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'cobi', text: '¡Ups! Mi varita mágica tuvo un problema. 🪄✨ Inténtalo de nuevo.' }
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // --- AUDIO HELPERS ---
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  };

  const playShoot = () => {
    playTone(880, 0.08, 'square');
    setTimeout(() => playTone(1100, 0.05, 'square'), 40);
  };

  const playHit = () => {
    playTone(320, 0.12, 'sawtooth');
  };

  const playSuccess = () => {
    playTone(520, 0.15, 'triangle');
    setTimeout(() => playTone(660, 0.18, 'sine'), 80);
  };

  const playError = () => {
    playTone(220, 0.12, 'sawtooth');
    setTimeout(() => playTone(180, 0.12, 'square'), 50);
  };

  const playVictory = () => {
    playTone(523, 0.15);
    setTimeout(() => playTone(659, 0.15), 150);
    setTimeout(() => playTone(784, 0.3), 300);
  };

  const playGameOver = () => {
    playTone(440, 0.2, 'sawtooth');
    setTimeout(() => playTone(330, 0.2, 'sawtooth'), 200);
    setTimeout(() => playTone(220, 0.4, 'sawtooth'), 400);
  };

  // State to track images loaded
  const [imagesReady, setImagesReady] = useState(false);
  
  // Load images on mount - ensure they're fully loaded before game can start
  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    
    // Clear any existing images
    enemyImagesRef.current = [];
    
    // Create promises for loading images
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn(`Failed to load image: ${src}`);
          resolve(img); // Continue even if image fails
        };
        img.src = src;
      });
    };
    
    // Load all images
    const loadAllImages = async () => {
      // Load enemy images
      const enemyPromises = [];
      for (let i = 1; i <= 6; i++) {
        enemyPromises.push(loadImage(`${baseUrl}data/images/enemigo_${i}.png`));
      }
      
      // Load boss and wizard
      const bossPromise = loadImage(`${baseUrl}data/images/Jefe.png`);
      const wizardPromise = loadImage(`${baseUrl}data/images/Mago.png`);
      
      try {
        const [enemyImages, bossImg, wizardImg] = await Promise.all([
          Promise.all(enemyPromises),
          bossPromise,
          wizardPromise
        ]);
        
        enemyImagesRef.current = enemyImages;
        bossImageRef.current = bossImg;
        wizardImageRef.current = wizardImg;
        imagesLoadedRef.current = true;
        setImagesReady(true);
      } catch (error) {
        console.error('Error loading images:', error);
        imagesLoadedRef.current = true;
        setImagesReady(true);
      }
    };
    
    loadAllImages();
  }, []);
  
  // --- DYNAMIC DATA HELPERS ---
  const [availableTenses, setAvailableTenses] = useState<string[]>([]);

  // Load available tenses when grammar mode changes
  useEffect(() => {
    const loadTenses = async () => {
      const tenses = await getAvailableTenses(selectedGrammar);
      setAvailableTenses(tenses);
      if (tenses.length > 0 && (!selectedTense || !tenses.includes(selectedTense))) {
        setSelectedTense(tenses[0]);
      }
    };
    loadTenses();
  }, [selectedGrammar]);

  // --- SELECTION LOGIC ---

  const handleStartGame = async () => {
    if (!selectedTense || !selectedVerbType || !selectedMode || !selectedDifficulty || !selectedBattleMode) return;
    
    // Wait for images to be loaded before starting
    if (!imagesReady) {
      setFeedbackMsg({ text: 'Cargando imágenes...', type: '' });
      return;
    }
    
    const pool = await getFilteredVerbs(selectedGrammar, selectedTense, selectedVerbType);
    if (pool.length === 0) {
      setFeedbackMsg({ text: 'No hay verbos disponibles para esta configuración.', type: 'error' });
      return;
    }

    setVerbsPool(pool);
    setScore(0);
    setAttackPower(1);
    setConsecutiveFailures(0);
    
    // Unified initialization for both modes
    setLives(DIFFICULTY_SETTINGS[selectedDifficulty].castleLives);
    monstersRef.current = [];
    projectilesRef.current = [];
    bossRef.current = null;
    
    // Initialize hero position based on expected canvas size
    const expectedCanvasHeight = 300;
    const groundY = expectedCanvasHeight - 40;
    const wizardSize = Math.floor((expectedCanvasHeight - 40) * 0.15);
    heroRef.current.y = groundY - wizardSize + 5;
    heroRef.current.width = wizardSize;
    heroRef.current.height = wizardSize;
    
    // Reset timing refs to prevent immediate spawn/shot
    lastSpawnRef.current = performance.now();
    lastShotRef.current = performance.now();
    gameStartTimeRef.current = performance.now();
    nextSpawnTimeRef.current = performance.now() + 1000; // First spawn after 1s
    killCountRef.current = 0;
    attackPowerRef.current = 1;
    
    // Initialize damage system for Contrarreloj
    if (selectedBattleMode === 'contrarreloj') {
      setDamageStreak(0);
      setKillCount(0);
    }
    
    // Establecer mensaje inicial de Cobi Mago
    setCobiMagoMessage(seleccionarMensajeMagoRandom('juego'));
    
    setGameState('PLAYING');
    pickNewVerb(pool);
  };

  const pickNewVerb = (pool: PowerVerb[]) => {
    if (pool.length === 0) return;
    const randomVerb = pool[Math.floor(Math.random() * pool.length)];
    setCurrentVerb(randomVerb);
    setUserInput('');
    setFeedbackMsg({ text: '', type: '' });
    setConsecutiveFailures(0); // Reset consecutive failures on new verb

    if (selectedMode === 'choice') {
      // Get correct answer (if array, pick first)
      const correct = Array.isArray(randomVerb.answer) ? randomVerb.answer[0] : randomVerb.answer;
      
      // Get distractors
      const distractors = pool
        .filter(v => v !== randomVerb)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(v => Array.isArray(v.answer) ? v.answer[0] : v.answer);
      
      // Fallback distractors
      while (distractors.length < 3) {
         distractors.push(correct.split('').reverse().join('')); 
      }

      setChoiceOptions([correct, ...distractors].sort(() => 0.5 - Math.random()));
    }
  };

  // --- GAME LOOP & CANVAS ---

  const spawnMonster = (canvasWidth: number, canvasHeight: number, time: number) => {
    if (!selectedDifficulty) return;
    const settings = DIFFICULTY_SETTINGS[selectedDifficulty];
    
    // Check if boss should appear (only in boss mode)
    if (selectedBattleMode === 'jefe' && !bossRef.current && (time - gameStartTimeRef.current) >= settings.bossAppearTime) {
      const groundLevel = canvasHeight - 40;
      // Boss should occupy 60% of game area height
      const bossSize = Math.floor((canvasHeight - 40) * 0.6);
      bossRef.current = {
        x: canvasWidth - bossSize - 20,
        y: groundLevel - bossSize,
        width: bossSize,
        height: bossSize,
        hp: settings.bossHp,
        maxHp: settings.bossHp,
        emoji: '🐉',
        defeated: false,
        speed: settings.bossSpeed
      };
    }
    
    // Use nextSpawnTimeRef for randomized spawn intervals
    if (time < nextSpawnTimeRef.current) return;
    
    // Calculate next spawn time with randomness (±30% variation)
    // For contrarreloj mode, use faster spawn rate
    let baseSpawnRate: number;
    if (selectedBattleMode === 'contrarreloj') {
      // Spawn rate adjusted for contrarreloj
      baseSpawnRate = selectedDifficulty === 'facil' ? 2200 : 1700;
    } else {
      baseSpawnRate = Math.max(settings.minSpawnRate, settings.spawnRate - (score * 2));
    }
    const spawnVariation = baseSpawnRate * 0.3;
    nextSpawnTimeRef.current = time + baseSpawnRate + (Math.random() * spawnVariation * 2 - spawnVariation);

    {
      const groundLevel = canvasHeight - 40;
      
      // Contrarreloj mode uses custom progression system
      if (selectedBattleMode === 'contrarreloj' && selectedDifficulty) {
        const crConfig = CONTRARRELOJ_DIFFICULTY[selectedDifficulty];
        
        // Special progression logic for facil mode
        let weights: { id: number; weight: number }[];
        if (selectedDifficulty === 'facil') {
          const kills = killsByTypeRef.current;
          const k1 = kills[1] || 0;
          const k2 = kills[2] || 0;
          const k3 = kills[3] || 0;
          
          // Start with only enemy 1
          if (k1 < 3) {
            weights = [{ id: 1, weight: 100 }];
          }
          // After 3-5 kills of E1, introduce E2
          else if (k1 < 5 || k2 === 0) {
            weights = [
              { id: 1, weight: 40 },
              { id: 2, weight: 60 }
            ];
          }
          // After E2 appears, continue with E1 and E2 until 3-5 kills of E2
          else if (k2 < 3) {
            weights = [
              { id: 1, weight: 50 },
              { id: 2, weight: 50 }
            ];
          }
          // After 3-5 kills of E2, introduce E3
          else if (k2 < 5 || k3 === 0) {
            weights = [
              { id: 1, weight: 20 },
              { id: 2, weight: 50 },
              { id: 3, weight: 30 }
            ];
          }
          // After E3 appears, continue until 3-5 kills of E3
          else if (k3 < 3) {
            weights = [
              { id: 1, weight: 15 },
              { id: 2, weight: 45 },
              { id: 3, weight: 40 }
            ];
          }
          // After 3-5 kills of E3, introduce E4
          else if (k3 < 5 || (kills[4] || 0) === 0) {
            weights = [
              { id: 1, weight: 10 },
              { id: 2, weight: 30 },
              { id: 3, weight: 40 },
              { id: 4, weight: 20 }
            ];
          }
          // Final mix with all 4 enemies
          else {
            weights = [
              { id: 1, weight: 10 },
              { id: 2, weight: 25 },
              { id: 3, weight: 35 },
              { id: 4, weight: 30 }
            ];
          }
        } else {
          weights = crConfig.getEnemyWeights(killCountRef.current);
        }
        
        const enemy = pickWeightedEnemy(weights);
        
        // Use difficulty-specific HP (facil uses hpFacil if available)
        const enemyHp = (selectedDifficulty === 'facil' && enemy.hpFacil) ? enemy.hpFacil : enemy.hp;
        const monsterSize = Math.floor((canvasHeight - 40) * 0.15);
        
        // Apply timeMultiplier to speed (higher baseTime = slower, so inverse relationship)
        // Base speed 0.5, adjusted by baseTime ratio and difficulty multiplier
        const baseSpeed = 0.5 * (12 / enemy.baseTime) * crConfig.timeMultiplier;
        
        // Calculate points with streak bonus (only for facil mode)
        let enemyPoints = enemy.reward;
        if (selectedDifficulty === 'facil') {
          // Base points by enemy type
          const basePointsByEnemy: { [key: number]: number } = {
            1: 20,  // Enemigo 1
            2: 40,  // Enemigo 2
            3: 60,  // Enemigo 3
            4: 90   // Enemigo 4
          };
          const basePoints = basePointsByEnemy[enemy.id] || enemy.reward;
          // Apply streak bonus: +10 per streak level, max at 3
          const streakBonus = Math.min(pointsStreak, 3) * 10;
          enemyPoints = basePoints + streakBonus;
        }
        
        monstersRef.current.push({
          id: Date.now(),
          x: canvasWidth + 50,
          y: groundLevel - monsterSize,
          width: monsterSize,
          height: monsterSize,
          hp: enemyHp,
          maxHp: enemyHp,
          speed: baseSpeed * settings.enemySpeedMultiplier,
          emoji: '👾',
          imageIndex: enemy.id - 1,
          color: '#8b5cf6',
          points: enemyPoints
        });
        return;
      }
      
      // Jefe mode uses original progression system
      const enemyTypes = [
        { imageIndex: 0, hp: 2, speed: 0.9, emoji: '👾', points: 10, color: '#8b5cf6', minScore: 0 },      // Enemigo 1 - muy débil
        { imageIndex: 1, hp: 4, speed: 0.75, emoji: '👹', points: 15, color: '#ec4899', minScore: 0 },    // Enemigo 2 - débil
        { imageIndex: 2, hp: 6, speed: 0.65, emoji: '👻', points: 25, color: '#3b82f6', minScore: 100 },  // Enemigo 3 - medio
        { imageIndex: 3, hp: 9, speed: 0.55, emoji: '👺', points: 35, color: '#ef4444', minScore: 250 },  // Enemigo 4 - medio-fuerte
        { imageIndex: 4, hp: 12, speed: 0.5, emoji: '💀', points: 50, color: '#f59e0b', minScore: 400 }, // Enemigo 5 - fuerte
        { imageIndex: 5, hp: 16, speed: 0.45, emoji: '☠️', points: 75, color: '#dc2626', minScore: 600 }   // Enemigo 6 - muy fuerte
      ];
      
      // Filter enemies based on difficulty and score progression
      let availableEnemies = enemyTypes.filter(enemy => {
        // Enemigo 1 no aparece en difícil
        if (selectedDifficulty === 'dificil' && enemy.imageIndex === 0) return false;
        // Enemigo 6 no aparece en fácil
        if (selectedDifficulty === 'facil' && enemy.imageIndex === 5) return false;
        // Solo aparecen enemigos para los que el jugador tiene suficiente score
        return score >= enemy.minScore;
      });
      
      // Ensure at least one enemy is available
      if (availableEnemies.length === 0) {
        availableEnemies = [enemyTypes[0]];
      }
      
      // Select random enemy from available ones
      const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
      
      // In boss mode, adjust enemy HP based on difficulty
      const hpMultiplier = selectedBattleMode === 'jefe' ? 1.5 : 1;
      
      // Monster size should be 15% of game area height
      const monsterSize = Math.floor((canvasHeight - 40) * 0.15);
      
      monstersRef.current.push({
        id: Date.now(),
        x: canvasWidth + 50,
        y: groundLevel - monsterSize,
        width: monsterSize,
        height: monsterSize,
        hp: Math.ceil(type.hp * hpMultiplier),
        maxHp: Math.ceil(type.hp * hpMultiplier),
        speed: type.speed * settings.enemySpeedMultiplier,
        emoji: type.emoji,
        imageIndex: type.imageIndex,
        color: type.color,
        points: type.points
      });
    }
  };

  const updateEntities = () => {
    monstersRef.current.forEach(m => { m.x -= m.speed; });
    projectilesRef.current.forEach(p => { p.x += p.speed; });
    
    // Move boss towards player if exists and not defeated
    if (bossRef.current && !bossRef.current.defeated) {
      bossRef.current.x -= bossRef.current.speed;
      
      // Check if boss reached the castle
      if (bossRef.current.x <= 50) {
        setGameState('GAMEOVER');
      }
    }

    const now = performance.now();
    if (now - lastShotRef.current > 1000) { 
       // Increase projectile size to match larger elements
       const projectileSize = 35;
       
       // Shoot from wizard's current position (center of wizard)
       const wizardCenterX = heroRef.current.x + heroRef.current.width;
       const wizardCenterY = heroRef.current.y + (heroRef.current.height / 2) - (projectileSize / 2);
       
       projectilesRef.current.push({
         x: wizardCenterX,
         y: wizardCenterY,
         width: projectileSize,
         height: projectileSize,
         speed: 6,
         power: Math.max(1, attackPowerRef.current),
         emoji: '🔥'
       });
       playShoot(); // Play shoot sound
       lastShotRef.current = now;
    }
  };

  const checkCollisions = () => {
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
      const p = projectilesRef.current[i];
      let hit = false;
      
      // Check collision with boss first
      if (bossRef.current && !bossRef.current.defeated) {
        const boss = bossRef.current;
        if (
          p.x < boss.x + boss.width && p.x + p.width > boss.x &&
          p.y < boss.y + boss.height && p.y + p.height > boss.y
        ) {
          boss.hp -= p.power;
          hit = true;
          playHit(); // Play hit sound
          if (boss.hp <= 0) {
            boss.defeated = true;
            if (selectedBattleMode === 'jefe') {
              playVictory(); // Play victory sound
              setGameState('VICTORY');
            }
          }
        }
      }
      
      // Check collision with regular monsters
      if (!hit) {
        for (let j = monstersRef.current.length - 1; j >= 0; j--) {
          const m = monstersRef.current[j];
          // Only check collision if monster is visible on screen (not off-screen to the right)
          if (m.x < canvasRef.current!.width && 
            p.x < m.x + m.width && p.x + p.width > m.x &&
            p.y < m.y + m.height && p.y + p.height > m.y
          ) {
            m.hp -= p.power;
            hit = true;
            playHit(); // Play hit sound
            if (m.hp <= 0) {
              setScore(prev => {
                const newScore = prev + m.points;
                // Check victory in Contrarreloj mode by targetScore
                if (selectedBattleMode === 'contrarreloj' && selectedDifficulty) {
                  const targetScore = DIFFICULTY_SETTINGS[selectedDifficulty].targetScore;
                  if (newScore >= targetScore) {
                    playVictory();
                    setTimeout(() => setGameState('VICTORY'), 300);
                  }
                }
                return newScore;
              });
              const killedEnemyType = m.imageIndex + 1; // imageIndex is 0-based, enemy id is 1-based
              monstersRef.current.splice(j, 1);
              // Track kills in Contrarreloj mode
              if (selectedBattleMode === 'contrarreloj') {
                setKillCount(prev => prev + 1);
                setKillsByType(prev => ({ ...prev, [killedEnemyType]: (prev[killedEnemyType] || 0) + 1 }));
              }
            }
            break;
          }
        }
      }
      
      if (hit || p.x > 1000) projectilesRef.current.splice(i, 1);
    }

    for (let i = monstersRef.current.length - 1; i >= 0; i--) {
        const m = monstersRef.current[i];
        if (m.x <= 50) {
            setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) {
                  playGameOver(); // Play game over sound
                  setGameState('GAMEOVER');
                }
                return newLives;
            });
            monstersRef.current.splice(i, 1);
        }
    }

    // Contrarreloj victory is handled in handleAnswer, not in canvas loop
  };

  const draw = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const groundHeight = 40;
    const groundY = canvasHeight - groundHeight;
    ctx.fillStyle = '#556B2F';
    ctx.fillRect(0, groundY, canvasWidth, groundHeight);

    // Castle/wizard sizes for visibility
    const castleFontSize = Math.floor((canvasHeight - groundHeight) * 0.35);
    const wizardSize = Math.floor((canvasHeight - groundHeight) * 0.15);
    
    // Draw castle (still using emoji)
    ctx.font = `${castleFontSize}px Arial`;
    ctx.fillText('🏰', 10, groundY - 5);
    
    // Draw wizard using image - positioned so feet are at ground level (same as castle base)
    const castleWidth = 60; // Approximate castle emoji width
    heroRef.current.x = 10 + castleWidth + 10; // 10px padding from castle
    heroRef.current.y = groundY - wizardSize + 5; // Adjust so feet touch ground
    heroRef.current.width = wizardSize;
    heroRef.current.height = wizardSize;
    
    if (imagesLoadedRef.current && wizardImageRef.current && wizardImageRef.current.complete) {
      ctx.drawImage(wizardImageRef.current, heroRef.current.x, heroRef.current.y, wizardSize, wizardSize);
    } else {
      // Fallback to emoji if image not loaded
      ctx.font = `${wizardSize}px Arial`;
      ctx.fillText('🧙‍♂️', heroRef.current.x, groundY - 5);
    }
    
    // Power aura around wizard
    if (attackPower > 1) {
        ctx.beginPath();
        ctx.arc(heroRef.current.x + wizardSize/2, heroRef.current.y + wizardSize/2, 25 + (attackPower * 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(0.5, attackPower * 0.1)})`;
        ctx.fill();
    }

    // Draw monsters using images
    monstersRef.current.forEach(m => {
        if (imagesLoadedRef.current && enemyImagesRef.current[m.imageIndex] && enemyImagesRef.current[m.imageIndex].complete) {
          ctx.drawImage(enemyImagesRef.current[m.imageIndex], m.x, m.y, m.width, m.height);
        } else {
          // Fallback to emoji if image not loaded
          const monsterFontSize = Math.floor(m.height * 0.85);
          ctx.font = `${monsterFontSize}px Arial`;
          ctx.fillText(m.emoji, m.x, m.y + m.height * 0.85);
        }
        
        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(m.x, m.y - 10, m.width, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(m.x, m.y - 10, m.width * (m.hp / m.maxHp), 5);
    });
    
    // Draw boss using image
    if (bossRef.current && !bossRef.current.defeated) {
        const boss = bossRef.current;
        
        if (imagesLoadedRef.current && bossImageRef.current && bossImageRef.current.complete) {
          ctx.drawImage(bossImageRef.current, boss.x, boss.y, boss.width, boss.height);
        } else {
          // Fallback to emoji if image not loaded
          const bossFontSize = Math.floor(boss.height * 0.9);
          ctx.font = `${bossFontSize}px Arial`;
          ctx.fillText(boss.emoji, boss.x, boss.y + boss.height * 0.85);
        }
        
        // Boss health bar (larger)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boss.x, boss.y - 30, boss.width, 20);
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x, boss.y - 30, boss.width, 20);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(boss.x, boss.y - 30, boss.width * (boss.hp / boss.maxHp), 20);
        
        // Boss HP text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(boss.hp)}/${boss.maxHp}`, boss.x + boss.width / 2, boss.y - 12);
        ctx.textAlign = 'left';
    }

    // Draw projectiles (fire emoji)
    projectilesRef.current.forEach(p => {
        ctx.font = `${p.width}px Arial`;
        // Position emoji properly - y coordinate should be at baseline
        ctx.fillText(p.emoji, p.x, p.y + p.height * 0.8);
    });
  };

  const gameLoop = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;
    if (!lastTimeRef.current) lastTimeRef.current = time;
    lastTimeRef.current = time;

    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            spawnMonster(canvas.width, canvas.height, time);
            updateEntities();
            checkCollisions();
            draw(ctx, canvas.width, canvas.height);
        }
    }
    requestRef.current = requestAnimationFrame(gameLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, score, attackPower]); 

  useEffect(() => {
    if (gameState === 'PLAYING') requestRef.current = requestAnimationFrame(gameLoop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, gameLoop]);

  // Pause game when tab/window loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'PLAYING') {
        setGameState('PAUSED');
      }
    };
    
    const handleBlur = () => {
      if (gameState === 'PLAYING') {
        setGameState('PAUSED');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState]);

  // --- INTERACTION HANDLERS ---

  const handleAnswer = (answer: string) => {
    if (!currentVerb) return;
    
    // Normalize valid answers to array
    const validAnswers = Array.isArray(currentVerb.answer) 
        ? currentVerb.answer 
        : [currentVerb.answer];

    const isCorrect = validAnswers.some(a => a.toLowerCase() === answer.toLowerCase().trim());
    
    // Contrarreloj uses damage streak system
    if (selectedBattleMode === 'contrarreloj') {
      if (isCorrect) {
        playSuccess();
        const newStreak = damageStreak + 1;
        const newDamage = 10 + newStreak * 2;
        setDamageStreak(newStreak);
        setPointsStreak(prev => prev + 1); // Incrementar racha de puntos
        // attackPower goes up +1 per correct (visual + aura), capped at 10
        setAttackPower(prev => Math.min(prev + 1, 10));
        setCobiMagoMessage(seleccionarMensajeMagoRandom('acierto'));
        setFeedbackMsg({ text: `¡Correcto! Daño: ${newDamage} (Racha: ${newStreak})`, type: 'success' });
        setTimeout(() => pickNewVerb(verbsPool), 600);
      } else {
        playError();
        const newFailureCount = consecutiveFailures + 1;
        setConsecutiveFailures(newFailureCount);
        // Reset streak but keep base damage at 10
        setDamageStreak(0);
        setPointsStreak(0); // Resetear racha de puntos
        // Only penalize attackPower in dificil mode
        if (selectedDifficulty === 'dificil') {
          setAttackPower(prev => Math.max(1, prev - 1));
        }
        setCobiMagoMessage(seleccionarMensajeMagoRandom('fallo'));
        
        if (newFailureCount >= 3) {
          setFeedbackMsg({ text: `Incorrecto. La respuesta es: ${validAnswers[0]}`, type: 'error' });
        } else {
          setFeedbackMsg({ text: `Incorrecto. Intenta de nuevo (${newFailureCount}/3)`, type: 'error' });
        }
      }
    } else {
      // Jefe mode uses original power system
      if (isCorrect) {
        playSuccess();
        setAttackPower(prev => Math.min(prev + 1, 10));
        setCobiMagoMessage(seleccionarMensajeMagoRandom('acierto'));
        setFeedbackMsg({ text: '¡Correcto! +Poder', type: 'success' });
        setTimeout(() => pickNewVerb(verbsPool), 600);
      } else {
        playError();
        const newFailureCount = consecutiveFailures + 1;
        setConsecutiveFailures(newFailureCount);
        // Only penalize attackPower in dificil mode
        if (selectedDifficulty === 'dificil') {
          setAttackPower(prev => Math.max(1, prev - 1));
        }
        setCobiMagoMessage(seleccionarMensajeMagoRandom('fallo'));
        
        if (newFailureCount >= 3) {
          setFeedbackMsg({ text: `Incorrecto. La respuesta es: ${validAnswers[0]}`, type: 'error' });
        } else {
          setFeedbackMsg({ text: `Incorrecto. Intenta de nuevo (${newFailureCount}/3)`, type: 'error' });
        }
      }
    }
  };

  // --- RENDER HELPERS ---

  if (gameState === 'SELECTION') {
    return (
      <div className="min-h-screen bg-deep-blue p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-4xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
          <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
               <ChevronLeft />
            </button>
            <h1 className="text-3xl font-black text-deep-blue flex-1 text-center">Configura tu Batalla</h1>
            <div className="w-10"></div>
          </div>

          <div className="space-y-8">
            {/* Step 1: Grammar Mode */}
            <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">1. Modo Gramatical</h3>
               <div className="flex gap-4">
                 {['indicativo', 'subjuntivo', 'imperativo'].map(g => (
                    <button
                        key={g}
                        onClick={() => setSelectedGrammar(g)}
                        className={`flex-1 py-3 rounded-lg border font-bold text-base capitalize transition-all ${
                            selectedGrammar === g ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {g}
                    </button>
                 ))}
               </div>
            </div>

            {/* Step 2: Tense (Dynamic) */}
            <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">2. Tiempo Verbal</h3>
               {availableTenses.length > 0 ? (
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {availableTenses.map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedTense(t)}
                            className={`py-3 px-4 rounded-lg border font-bold text-sm md:text-base transition-all ${
                                selectedTense === t ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {formatTenseName(t)}
                        </button>
                     ))}
                   </div>
               ) : (
                   <p className="text-sm text-gray-400 italic">No hay tiempos disponibles para este modo.</p>
               )}
            </div>

            {/* Step 3: Type */}
             <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">3. Tipo de Verbos</h3>
               <div className="flex gap-3">
                 {['regular', 'irregular', 'mixed'].map(t => (
                    <button
                        key={t}
                        onClick={() => setSelectedVerbType(t)}
                        className={`flex-1 py-3 rounded-lg border font-bold text-base capitalize transition-all ${
                            selectedVerbType === t ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {t === 'mixed' ? 'Todos' : t}
                    </button>
                 ))}
               </div>
            </div>

            {/* Step 4: Battle Mode */}
            <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">4. Modo de Batalla</h3>
               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSelectedBattleMode('contrarreloj')}
                    className={`p-6 rounded-xl border-2 text-center transition-all relative ${selectedBattleMode === 'contrarreloj' ? 'border-spanish-red bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <button
                        onMouseEnter={() => setShowTooltip('contrarreloj')}
                        onMouseLeave={() => setShowTooltip(null)}
                        onClick={(e) => { e.stopPropagation(); setShowTooltip(showTooltip === 'contrarreloj' ? null : 'contrarreloj'); }}
                        className="absolute top-2 left-2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-xs flex items-center justify-center transition-colors"
                      >
                        ?
                      </button>
                      {showTooltip === 'contrarreloj' && (
                        <div className="absolute -top-12 left-0 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg z-10">
                          Derrota 30 enemigos antes de que se acabe el tiempo
                        </div>
                      )}
                      <div className="text-5xl mb-2">⏱️</div>
                      <span className="block font-bold text-base text-deep-blue">Contrarreloj</span>
                  </button>
                  <button 
                    onClick={() => setSelectedBattleMode('jefe')}
                    className={`p-6 rounded-xl border-2 text-center transition-all relative ${selectedBattleMode === 'jefe' ? 'border-spanish-red bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <button
                        onMouseEnter={() => setShowTooltip('jefe')}
                        onMouseLeave={() => setShowTooltip(null)}
                        onClick={(e) => { e.stopPropagation(); setShowTooltip(showTooltip === 'jefe' ? null : 'jefe'); }}
                        className="absolute top-2 left-2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-xs flex items-center justify-center transition-colors"
                      >
                        ?
                      </button>
                      {showTooltip === 'jefe' && (
                        <div className="absolute -top-12 left-0 right-0 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg z-10">
                          Derrota al dragón
                        </div>
                      )}
                      <div className="text-5xl mb-2">🐉</div>
                      <span className="block font-bold text-base text-deep-blue">Modo Jefe</span>
                  </button>
               </div>
            </div>

            {/* Step 5: Mode */}
            <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">5. Modo de Respuesta</h3>
               <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedMode('write')}
                    className={`flex-1 py-3 rounded-lg border text-center transition-all font-bold text-base ${selectedMode === 'write' ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                      Escribir
                  </button>
                  <button 
                    onClick={() => setSelectedMode('choice')}
                    className={`flex-1 py-3 rounded-lg border text-center transition-all font-bold text-base ${selectedMode === 'choice' ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                      Selección
                  </button>
               </div>
            </div>

             {/* Step 6: Difficulty */}
             <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">6. Dificultad</h3>
               <div className="flex gap-3">
                 {(Object.keys(DIFFICULTY_SETTINGS) as GameDifficulty[]).map(d => (
                    <button
                        key={d}
                        onClick={() => setSelectedDifficulty(d)}
                        className={`flex-1 py-3 rounded-lg border font-bold text-base capitalize transition-all ${
                            selectedDifficulty === d ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {DIFFICULTY_SETTINGS[d].label}
                    </button>
                 ))}
               </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              disabled={!selectedTense || !selectedVerbType || !selectedBattleMode || !selectedMode || !selectedDifficulty}
              className="w-full py-4 bg-gradient-to-r from-spanish-red to-spanish-red hover:from-red-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-xl rounded-xl transition-all shadow-lg"
            >
              Iniciar Batalla
            </button>
          </div>
        </div>

        {/* Cobi Mago Menú (solo desktop) */}
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible" key="cobi-mago-menu">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiMagoMenuMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Mago Menú */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-mago-menu.webp"
                alt="Cobi Mago pensando" 
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
                className="cobi-chat-button-mago pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathMagoMenu" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathMagoMenu" startOffset="50%" textAnchor="middle" className="curved-text-style-mago">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🔮</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window del Menú */}
        {showChatWindow && gameState === 'SELECTION' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪄</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Mago</h3>
                  <p className="text-xs text-purple-50">Experto en Gramática Española</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🪄</p>
                  <p>¡Bienvenido a mi estudio mágico! Soy Cobi Mago.</p>
                  <p className="text-xs mt-2">Pregúntame sobre gramática o el juego. ✨</p>
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
                          : 'bg-white border-2 border-purple-200 text-gray-700'
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
                  <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Mago consulta su grimorio... 📖✨
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
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

  // --- PLAYING STATE ---
  if (gameState === 'PLAYING') {
    // Both modes use the same canvas-based UI
    return (
      <div className="min-h-screen bg-deep-blue p-4 flex flex-col items-center justify-start pt-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 text-white">
            <button onClick={() => setGameState('SELECTION')} className="p-2 hover:bg-white/10 rounded-full">
              <ChevronLeft size={32} />
            </button>
            <div className="text-center flex-1">
              <p className="text-sm opacity-70">Puntuación</p>
              <p className="text-4xl font-black">{score}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-sm opacity-70">Poder</p>
              <p className="text-4xl font-black">{attackPower}x</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-sm opacity-70">Vidas</p>
              <p className="text-4xl font-black text-red-400">{lives}</p>
            </div>
            <button onClick={() => setGameState('PAUSED')} className="p-2 hover:bg-white/10 rounded-full">
              <Pause size={32} />
            </button>
            <button onClick={() => setInstructionsOpen(true)} className="p-2 hover:bg-white/10 rounded-full">
              <Info size={32} />
            </button>
          </div>

          {/* Canvas */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl mb-6">
            <canvas
              ref={canvasRef}
              width={872}
              height={396}
              className="w-full"
            />
          </div>

          {/* Question & Input/Choices */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            {currentVerb ? (
              <div>
                {/* Nuevo layout: verbo,pronombre a la izquierda, tiempo verbal en rectángulo azul a la derecha */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-deep-blue">
                    {currentVerb.verb}, {currentVerb.pronoun}
                  </h2>
                  <div className="bg-deep-blue text-white px-6 py-2 rounded-lg font-bold">
                    {currentVerb.tense}
                  </div>
                </div>

                {selectedMode === 'write' ? (
                  <div className="space-y-4">
                    <input
                      id="verb-input"
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAnswer(userInput);
                        // Teclas numéricas para vocales con tilde
                        if (e.key === '1') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const start = input.selectionStart || 0;
                          const end = input.selectionEnd || 0;
                          const newValue = userInput.slice(0, start) + 'á' + userInput.slice(end);
                          setUserInput(newValue);
                          setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
                        }
                        if (e.key === '2') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const start = input.selectionStart || 0;
                          const end = input.selectionEnd || 0;
                          const newValue = userInput.slice(0, start) + 'é' + userInput.slice(end);
                          setUserInput(newValue);
                          setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
                        }
                        if (e.key === '3') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const start = input.selectionStart || 0;
                          const end = input.selectionEnd || 0;
                          const newValue = userInput.slice(0, start) + 'í' + userInput.slice(end);
                          setUserInput(newValue);
                          setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
                        }
                        if (e.key === '4') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const start = input.selectionStart || 0;
                          const end = input.selectionEnd || 0;
                          const newValue = userInput.slice(0, start) + 'ó' + userInput.slice(end);
                          setUserInput(newValue);
                          setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
                        }
                        if (e.key === '5') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const start = input.selectionStart || 0;
                          const end = input.selectionEnd || 0;
                          const newValue = userInput.slice(0, start) + 'ú' + userInput.slice(end);
                          setUserInput(newValue);
                          setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
                        }
                      }}
                      placeholder="Escribe tu respuesta..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-deep-blue text-lg"
                    />
                    <button
                      onClick={() => handleAnswer(userInput)}
                      className="w-full bg-deep-blue hover:bg-blue-900 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      Verificar Respuesta
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {choiceOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(option)}
                        className="p-4 bg-gray-100 hover:bg-deep-blue hover:text-white font-bold rounded-lg transition-colors text-lg"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 h-8 flex items-center justify-center">
                  {feedbackMsg.text && (
                    <p className={`text-lg font-bold ${feedbackMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {feedbackMsg.text}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">Cargando...</p>
            )}
          </div>
        </div>

        {/* Instructions Modal */}
        {instructionsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-deep-blue">Instrucciones</h2>
                <button onClick={() => setInstructionsOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>🧙‍♂️ <strong>Eres un mago:</strong> Responde preguntas para ganar poder</p>
                <p>👾 <strong>Monstruos atacan:</strong> Usa tu poder para defenderlos</p>
                <p>🏰 <strong>Protege el castillo:</strong> Si pierdes vidas, pierdes el juego</p>
                <p>⚡ <strong>Ataca automáticamente:</strong> Cada segundo dispara proyectiles</p>
                <p>🎯 <strong>Modo Contrarreloj:</strong> Derrota 30 enemigos conjugando verbos. Cada acierto hace ⚔️ daño al enemigo. ¡Las rachas aumentan tu poder!</p>
                <p>📝 <strong>Modo Escritura:</strong> Usa las teclas 1-5 para vocales con tilde (1=á, 2=é, 3=í, 4=ó, 5=ú)</p>
                <p>🐉 <strong>Modo Jefe:</strong> Derrota al dragón gigante que aparece después de un tiempo</p>
              </div>
              <button
                onClick={() => setInstructionsOpen(false)}
                className="w-full mt-6 bg-deep-blue text-white font-bold py-3 rounded-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Cobi Mago (solo desktop) */}
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible" key="cobi-mago-container">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiMagoMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Mago */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-mago.webp"
                alt="Cobi Mago" 
                className="w-56 h-auto object-contain transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            
            {/* Botón CHARLAR dentro del animate-float */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-mago pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathMago" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathMago" startOffset="50%" textAnchor="middle" className="curved-text-style-mago">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🔮</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window del Juego */}
        {showChatWindow && gameState === 'PLAYING' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪄</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Mago</h3>
                  <p className="text-xs text-purple-50">Experto en Gramática Española</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🪄</p>
                  <p>¡Bienvenido a mi estudio mágico! Soy Cobi Mago.</p>
                  <p className="text-xs mt-2">Pregúntame sobre gramática o el juego. ✨</p>
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
                          : 'bg-white border-2 border-purple-200 text-gray-700'
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
                  <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Mago consulta su grimorio... 📖✨
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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

  // --- PAUSED STATE ---
  if (gameState === 'PAUSED') {
    return (
      <div className="min-h-screen bg-deep-blue p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <p className="text-7xl mb-4">⏸️</p>
          <h1 className="text-4xl font-black text-deep-blue mb-2">Juego Pausado</h1>
          <p className="text-lg text-gray-600 mb-6">Puntuación actual: {score}</p>
          <div className="space-y-3">
            <button
              onClick={() => setGameState('PLAYING')}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Continuar
            </button>
            <button
              onClick={() => {
                setGameState('SELECTION');
                setSelectedDifficulty(null);
                setSelectedMode(null);
                setSelectedBattleMode(null);
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
            >
              Salir al Menú
            </button>
          </div>
        </div>

        {/* Cobi Mago Pausa (solo desktop) */}
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible" key="cobi-mago-pausa">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiMagoPausaMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Mago Pausa */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-mago-pausa.webp"
                alt="Cobi Mago meditando" 
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
                className="cobi-chat-button-mago pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathMagoPausa" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathMagoPausa" startOffset="50%" textAnchor="middle" className="curved-text-style-mago">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🔮</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window de Pausa */}
        {showChatWindow && gameState === 'PAUSED' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪄</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Mago</h3>
                  <p className="text-xs text-purple-50">Experto en Gramática Española</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🪄</p>
                  <p>¡Bienvenido a mi estudio mágico! Soy Cobi Mago.</p>
                  <p className="text-xs mt-2">Pregúntame sobre gramática o el juego. ✨</p>
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
                          : 'bg-white border-2 border-purple-200 text-gray-700'
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
                  <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Mago consulta su grimorio... 📖✨
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
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

  // --- GAMEOVER STATE ---
  if (gameState === 'GAMEOVER') {
    return (
      <div className="min-h-screen bg-deep-blue p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <p className="text-7xl mb-4">💀</p>
          <h1 className="text-4xl font-black text-deep-blue mb-2">¡Juego Terminado!</h1>
          <p className="text-3xl font-bold text-spanish-red mb-6">Puntuación: {score}</p>
          <button
            onClick={() => {
              setGameState('SELECTION');
              setSelectedDifficulty(null);
              setSelectedMode(null);
              setSelectedBattleMode(null);
            }}
            className="w-full bg-deep-blue hover:bg-blue-900 text-white font-bold py-3 rounded-lg"
          >
            Intentar de Nuevo
          </button>
        </div>

        {/* Cobi Mago Derrota (solo desktop) */}
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible" key="cobi-mago-derrota">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiMagoDerrotaMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Mago Derrota */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-mago-derrota.webp"
                alt="Cobi Mago agotado" 
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
                className="cobi-chat-button-mago pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathMagoDerrota" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathMagoDerrota" startOffset="50%" textAnchor="middle" className="curved-text-style-mago">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🔮</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window de Derrota */}
        {showChatWindow && gameState === 'GAMEOVER' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪄</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Mago</h3>
                  <p className="text-xs text-purple-50">Experto en Gramática Española</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🪄</p>
                  <p>¡Bienvenido a mi estudio mágico! Soy Cobi Mago.</p>
                  <p className="text-xs mt-2">Pregúntame sobre gramática o el juego. ✨</p>
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
                          : 'bg-white border-2 border-purple-200 text-gray-700'
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
                  <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Mago consulta su grimorio... 📖✨
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
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

  // --- VICTORY STATE ---
  if (gameState === 'VICTORY') {
    return (
      <div className="min-h-screen bg-deep-blue p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <p className="text-7xl mb-4">🎉</p>
          <h1 className="text-4xl font-black text-green-600 mb-2">¡Ganaste!</h1>
          <p className="text-3xl font-bold text-deep-blue mb-6">Puntuación: {score}</p>
          <button
            onClick={() => {
              setGameState('SELECTION');
              setSelectedDifficulty(null);
              setSelectedMode(null);
              setSelectedBattleMode(null);
            }}
            className="w-full bg-deep-blue hover:bg-blue-900 text-white font-bold py-3 rounded-lg"
          >
            Jugar de Nuevo
          </button>
        </div>

        {/* Cobi Mago Victoria (solo desktop) */}
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible" key="cobi-mago-victoria">
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiMagoVictoriaMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
            </div>
            
            {/* Imagen de Cobi Mago Victoria */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-mago-victoria.webp"
                alt="Cobi Mago celebrando" 
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
                className="cobi-chat-button-mago pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathMagoVictoria" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathMagoVictoria" startOffset="50%" textAnchor="middle" className="curved-text-style-mago">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🔮</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window de Victoria */}
        {showChatWindow && gameState === 'VICTORY' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪄</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Mago</h3>
                  <p className="text-xs text-purple-50">Experto en Gramática Española</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🪄</p>
                  <p>¡Bienvenido a mi estudio mágico! Soy Cobi Mago.</p>
                  <p className="text-xs mt-2">Pregúntame sobre gramática o el juego. ✨</p>
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
                          : 'bg-white border-2 border-purple-200 text-gray-700'
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
                  <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Mago consulta su grimorio... 📖✨
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
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

  return null;
};

export default PowerOfVerbsGame;
