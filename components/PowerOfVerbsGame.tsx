import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Info, X, Pause, Play, Send } from 'lucide-react';
import { getAvailableTenses, getFilteredVerbs, getFilteredVerbsSRS, recordVerbCorrect, recordVerbIncorrect } from '../services/powerVerbsService';
import { PowerVerb, GameDifficulty, GameMode, BattleMode } from '../types';
import { hablarConPanda } from '../services/geminiService';
import { normalizePronoun } from '../services/srsService';

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
    targetScore: 1500,
    spawnRate: 4000,
    minSpawnRate: 1500,
    enemySpeedMultiplier: 0.35,
    bossHp: 400,
    bossAppearTime: 45000, // 45 segundos (solo usado en modo antiguo)
    bossSpeed: 0.12, // Velocidad media
    // Modo jefe con sistema de oleadas
    waveScoreThreshold: 1000, // Puntos para completar ola
    bossPreparationTime: 20000, // 20 segundos de preparación
  },
  intermedio: {
    label: 'Intermedio',
    castleLives: 5,
    targetScore: 4000,
    spawnRate: 3500,
    minSpawnRate: 1000,
    enemySpeedMultiplier: 0.45,
    bossHp: 1000,
    bossAppearTime: 40000,
    bossSpeed: 0.12, // Medio
    // Modo jefe con sistema de oleadas múltiples
    waves: [
      { threshold: 1500, enemyPool: [1, 2, 3], preparationTime: 10000 }, // Ola 1: E1, E2, E3
      { threshold: 3000, enemyPool: [2, 3, 4], preparationTime: 20000 }, // Ola 2: E2, E3, E4
    ],
  },
  dificil: {
    label: 'Difícil',
    castleLives: 3,
    targetScore: 8000,
    spawnRate: 3000,
    minSpawnRate: 600,
    enemySpeedMultiplier: 0.6,
    bossHp: 1500,
    bossAppearTime: 35000,
    bossSpeed: 0.17, // Más rápido
    // Modo jefe con sistema de oleadas múltiples (3 oleadas)
    waves: [
      { threshold: 2000, enemyPool: [2, 3], preparationTime: 10000 }, // Ola 1: E2, E3 (0→2000 pts)
      { threshold: 6000, enemyPool: [3, 4, 5], preparationTime: 10000 }, // Ola 2: E3, E4, E5 (2000→6000 pts, +4000)
      { threshold: 13000, enemyPool: [5, 6], preparationTime: 20000 }, // Ola 3: E5, E6 (6000→13000 pts, +7000)
    ],
  },
};

// --- CONTRARRELOJ ENEMY STATS ---
interface ContrarrelojEnemy {
  id: number; // 1-6
  image: string;
  hp: number;
  hpFacil?: number; // Override HP for facil difficulty
  hpDificil?: number; // Override HP for dificil difficulty
  baseTime: number; // seconds
  name: string;
  reward: number; // Points awarded on kill
}

const CONTRARRELOJ_ENEMIES: ContrarrelojEnemy[] = [
  { id: 1, image: '/data/images/enemigo_1.png', hp: 15,  baseTime: 15, name: 'Murciélago', reward: 60 },
  { id: 2, image: '/data/images/enemigo_2.png', hp: 20,  hpFacil: 20, hpDificil: 20, baseTime: 13, name: 'Fantasma', reward: 100 },
  { id: 3, image: '/data/images/enemigo_3.png', hp: 35,  hpDificil: 35, baseTime: 11,  name: 'Zombie', reward: 150 },
  { id: 4, image: '/data/images/enemigo_4.png', hp: 50, hpDificil: 50, baseTime: 7,  name: 'Hombre lobo', reward: 250 },
  { id: 5, image: '/data/images/enemigo_5.png', hp: 70, hpDificil: 70, baseTime: 6,  name: 'Ninja zombie', reward: 400 },
  { id: 6, image: '/data/images/enemigo_6.png', hp: 100, hpDificil: 100, baseTime: 5,  name: 'Oso zombie', reward: 800 },
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
      if (kills <= 4) return [{ id: 1, weight: 100 }];
      if (kills <= 9) return [{ id: 1, weight: 60 }, { id: 2, weight: 40 }];
      if (kills <= 20) return [{ id: 1, weight: 35 }, { id: 2, weight: 40 }, { id: 3, weight: 25 }];
      if (kills <= 30) return [{ id: 1, weight: 25 }, { id: 2, weight: 35 }, { id: 3, weight: 40 }];
      return [{ id: 2, weight: 20 }, { id: 3, weight: 35 }, { id: 4, weight: 45 }];
    },
  },
  intermedio: {
    timeMultiplier: 1.3,
    enemyPool: [1, 2, 3, 4, 5],
    castleLives: 5,
    getEnemyWeights: (kills: number) => {
      if (kills <= 2) return [{ id: 1, weight: 100 }];
      if (kills <= 5) return [{ id: 1, weight: 60 }, { id: 2, weight: 40 }];
      if (kills <= 15) return [{ id: 1, weight: 25 }, { id: 2, weight: 40 }, { id: 3, weight: 35 }];
      if (kills <= 25) return [{ id: 2, weight: 25 }, { id: 3, weight: 35 }, { id: 4, weight: 40 }];
      return [{ id: 3, weight: 20 }, { id: 4, weight: 35 }, { id: 5, weight: 45 }];
    },
  },
  dificil: {
    timeMultiplier: 1.25,
    enemyPool: [2, 3, 4, 5, 6],
    castleLives: 3,
    getEnemyWeights: (kills: number) => {
      if (kills <= 5) return [{ id: 2, weight: 100 }];  // Solo E2 al inicio
      if (kills <= 10) return [{ id: 2, weight: 60 }, { id: 3, weight: 40 }];
      if (kills <= 25) return [{ id: 2, weight: 15 }, { id: 3, weight: 40 }, { id: 4, weight: 45 }];
      if (kills <= 35) return [{ id: 2, weight: 15 }, { id: 3, weight: 30 }, { id: 4, weight: 35 }, { id: 5, weight: 20 }];
      if (kills <= 45) return [{ id: 3, weight: 10 }, { id: 4, weight: 25 }, { id: 5, weight: 35 }, { id: 6, weight: 30 }];
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
  // SRS: Track response time for spaced repetition
  const responseStartTimeRef = useRef<number>(0);
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
  const fullChoicePoolRef = useRef<PowerVerb[]>([]);
  
  // Boss mode wave system state
  const [bossCurrentWave, setBossCurrentWave] = useState(0); // 0=not started, 1=wave 1 in progress, 2=wave 2 in progress, etc.
  const [bossWaveCompleted, setBossWaveCompleted] = useState(false); // Track if current wave is completed
  const [bossPreparationActive, setBossPreparationActive] = useState(false);
  const [bossPreparationStartTime, setBossPreparationStartTime] = useState<number | null>(null);
  const [waveCompletionMessageShown, setWaveCompletionMessageShown] = useState(false);
  const [bossPreparationTimeRemaining, setBossPreparationTimeRemaining] = useState<number>(0);
  const [bossPreparationProgress, setBossPreparationProgress] = useState<number>(100); // Progress percentage (100 to 0)
  const [bossWaveNearCompletion, setBossWaveNearCompletion] = useState(false); // Stop spawning near threshold
  const [bossWaitingForCleanScreen, setBossWaitingForCleanScreen] = useState(false); // Waiting for monsters to clear
  const [lastSpawnTime, setLastSpawnTime] = useState<number>(0); // Track when last enemy spawned
  const [screenShake, setScreenShake] = useState(false); // Screen shake effect on boss spawn
  
  // Animated clouds state
  const [clouds, _setClouds] = useState([
    { x: 100, y: 40, size: 40, speed: 0.1 },
    { x: 400, y: 80, size: 50, speed: 0.15 },
    { x: 650, y: 50, size: 35, speed: 0.12 },
    { x: 850, y: 70, size: 45, speed: 0.08 }
  ]);
  
  // Wizard aura overlay ref
  const wizardAuraOverlayRef = useRef<HTMLDivElement>(null);
  
  // Keep refs in sync with state for gameLoop access
  useEffect(() => { killCountRef.current = killCount; }, [killCount]);
  useEffect(() => { attackPowerRef.current = attackPower; }, [attackPower]);
  useEffect(() => { killsByTypeRef.current = killsByType; }, [killsByType]);
  
  // Function to calculate aura drop-shadows based on power level
  const getAuraDropShadows = (power: number): string => {
    if (power <= 0) return 'none';
    
    // Base intensity increases with power
    const intensity = Math.min(power / 10, 1);
    
    // At power 10+, blur should be massive (half screen ~ 200-250px)
    const maxBlur = power >= 10 ? 250 : 150;
    const blur1 = Math.floor(8 * intensity);
    const blur2 = Math.floor(20 * intensity);
    const blur3 = Math.floor(50 * intensity * (maxBlur / 150));
    const blur4 = Math.floor(100 * intensity * (maxBlur / 150));
    const blur5 = Math.floor(maxBlur * intensity);
    
    // Color progression: blue (low) → cyan (mid) → white+cyan (high)
    if (power >= 8) {
      // Maximum power: white core + cyan glow
      return `
        drop-shadow(0 0 ${blur1}px rgba(255, 255, 255, 1))
        drop-shadow(0 0 ${blur2}px rgba(200, 255, 255, 1))
        drop-shadow(0 0 ${blur3}px rgba(34, 211, 238, 1))
        drop-shadow(0 0 ${blur4}px rgba(59, 130, 246, 0.9))
        drop-shadow(0 0 ${blur5}px rgba(37, 99, 235, 0.7))
      `;
    } else if (power >= 4) {
      // Medium power: cyan glow
      return `
        drop-shadow(0 0 ${blur1}px rgba(34, 211, 238, 1))
        drop-shadow(0 0 ${blur2}px rgba(59, 130, 246, 0.9))
        drop-shadow(0 0 ${blur3}px rgba(37, 99, 235, 0.7))
      `;
    } else {
      // Low power: soft blue
      return `
        drop-shadow(0 0 ${blur1}px rgba(59, 130, 246, 0.8))
        drop-shadow(0 0 ${blur2}px rgba(96, 165, 250, 0.6))
      `;
    }
  };
  
  // Update wizard aura overlay position
  useEffect(() => {
    if (!wizardAuraOverlayRef.current || gameState !== 'PLAYING' || !canvasRef.current) return;
    
    const updatePosition = () => {
      if (wizardAuraOverlayRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        
        const wizardX = heroRef.current.x;
        const wizardY = heroRef.current.y;
        
        // Position overlay at wizard's top-left corner (same as canvas)
        wizardAuraOverlayRef.current.style.left = `${wizardX * scaleX}px`;
        wizardAuraOverlayRef.current.style.top = `${wizardY * scaleY}px`;
        
        // Store scale for image sizing
        wizardAuraOverlayRef.current.style.setProperty('--wizard-scale', String(scaleX));
      }
    };
    
    const interval = setInterval(updatePosition, 16); // 60fps
    return () => clearInterval(interval);
  }, [gameState]);
  
  // Boss preparation timer - handle wave transitions or boss spawn
  useEffect(() => {
    if (!bossPreparationActive || !bossPreparationStartTime || !selectedDifficulty) return;
    
    const settings = DIFFICULTY_SETTINGS[selectedDifficulty];
    const difficultySettings = settings as any;
    
    // Get preparation time for current wave
    let preparationTime = 20000; // Default
    if (difficultySettings.waves) {
      // Multi-wave system
      const waveIndex = bossCurrentWave;
      if (waveIndex < difficultySettings.waves.length) {
        preparationTime = difficultySettings.waves[waveIndex].preparationTime;
      }
    } else if (difficultySettings.bossPreparationTime) {
      // Single-wave system
      preparationTime = difficultySettings.bossPreparationTime;
    }
    
    const checkTimer = setInterval(() => {
      const elapsed = performance.now() - bossPreparationStartTime;
      const remaining = Math.max(0, Math.ceil((preparationTime - elapsed) / 1000));
      const progress = Math.max(0, ((preparationTime - elapsed) / preparationTime) * 100);
      
      // Update timer display and dragon position in real-time (~60fps)
      setBossPreparationTimeRemaining(remaining);
      setBossPreparationProgress(progress);
      
      if (elapsed >= preparationTime) {
        // Check if there are more waves or if we should spawn the boss
        const hasMoreWaves = difficultySettings.waves && bossCurrentWave < difficultySettings.waves.length - 1;
        
        if (hasMoreWaves) {
          // Advance to next wave
          setBossCurrentWave(prev => prev + 1);
          setBossWaveCompleted(false);
          setBossWaveNearCompletion(false);
          setBossPreparationActive(false);
          setKillCount(0); // Reset kill counter for new wave
          nextSpawnTimeRef.current = performance.now() + 1000; // Reset spawn timing for new wave
          clearInterval(checkTimer);
          
          setFeedbackMsg({ text: `¡Oleada ${bossCurrentWave + 2} iniciada! 💪`, type: 'success' });
          setTimeout(() => setFeedbackMsg({ text: '', type: '' }), 3000);
        } else {
          // No more waves, spawn the boss
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 500);
          
          if (!bossRef.current && canvasRef.current) {
            const canvasHeight = canvasRef.current.height;
            const canvasWidth = canvasRef.current.width;
            const groundLevel = canvasHeight - 40;
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
            
            setFeedbackMsg({ text: '¡El dragón ha aparecido! 🐉', type: 'error' });
            setTimeout(() => setFeedbackMsg({ text: '', type: '' }), 3000);
          }
          
          setBossPreparationActive(false);
          clearInterval(checkTimer);
        }
      }
    }, 16); // Update ~60fps for smooth animation
    
    return () => clearInterval(checkTimer);
  }, [bossPreparationActive, bossPreparationStartTime, selectedDifficulty, bossCurrentWave]);
  
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
  
  // History ref to avoid repeating same verb+pronoun combinations
  const verbHistoryRef = useRef<string[]>([]);
  
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
    
    // Use SRS-based pool for intelligent conjugation selection
    const pool = await getFilteredVerbsSRS(selectedGrammar, selectedTense, selectedVerbType);
    if (pool.length === 0) {
      setFeedbackMsg({ text: 'No hay verbos disponibles para esta configuración.', type: 'error' });
      return;
    }

    // Full filtered pool (non-SRS) for choice-mode distractor construction.
    // This guarantees minimum same-verb options by difficulty.
    fullChoicePoolRef.current = await getFilteredVerbs(selectedGrammar, selectedTense, selectedVerbType);

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
      setKillsByType({});
      setPointsStreak(0);
    }
    
    // Initialize wave system for Boss mode
    if (selectedBattleMode === 'jefe') {
      setBossCurrentWave(0);
      setBossWaveCompleted(false);
      setBossPreparationActive(false);
      setBossPreparationStartTime(null);
      setWaveCompletionMessageShown(false);
      setKillCount(0); // Reset kill count for jefe mode
      setBossWaveNearCompletion(false);
      setBossWaitingForCleanScreen(false);
      setLastSpawnTime(0);
      setBossPreparationProgress(100);
      setScreenShake(false);
    }
    
    // Establecer mensaje inicial de Cobi Mago
    setCobiMagoMessage(seleccionarMensajeMagoRandom('juego'));
    
    setGameState('PLAYING');
    pickNewVerb(pool);
  };

  const pickNewVerb = (pool: PowerVerb[]) => {
    if (pool.length === 0) return;
    
    // Get history of recent verb+pronoun combinations
    const recentHistory = verbHistoryRef.current.slice(-5); // Last 5 conjugations
    
    // Filter out verbs that match recent history (same verb AND pronoun)
    let availableVerbs = pool.filter(v => {
      const verbKey = `${v.verb}_${v.pronoun}`;
      return !recentHistory.includes(verbKey);
    });
    
    // If all verbs are in history (unlikely but possible with small pools), use full pool
    if (availableVerbs.length === 0) {
      availableVerbs = pool;
      // Clear history to start fresh
      verbHistoryRef.current = [];
    }
    
    // Select from available verbs (already shuffled by getFilteredVerbs)
    const randomVerb = availableVerbs[Math.floor(Math.random() * availableVerbs.length)];
    
    // Add to history
    const verbKey = `${randomVerb.verb}_${randomVerb.pronoun}`;
    verbHistoryRef.current.push(verbKey);
    // Keep only last 10 items in history to prevent memory growth
    if (verbHistoryRef.current.length > 10) {
      verbHistoryRef.current = verbHistoryRef.current.slice(-10);
    }
    
    setCurrentVerb(randomVerb);
    setUserInput('');
    setFeedbackMsg({ text: '', type: '' });
    setConsecutiveFailures(0); // Reset consecutive failures on new verb
    
    // SRS: Start tracking response time
    responseStartTimeRef.current = Date.now();

    if (selectedMode === 'choice') {
      // Get correct answer (if array, pick first)
      const correct = Array.isArray(randomVerb.answer) ? randomVerb.answer[0] : randomVerb.answer;
      
      // Determine how many distractors should be from the same verb based on difficulty
      let sameVerbCount = 0; // Number of distractors from same verb (excluding correct answer)
      
      if (selectedDifficulty === 'facil') {
        sameVerbCount = 1; // At least 2 total (correct + 1 same verb)
      } else if (selectedDifficulty === 'intermedio') {
        sameVerbCount = 2; // At least 3 total (correct + 2 same verb)
      } else if (selectedDifficulty === 'dificil') {
        sameVerbCount = 3; // All 4 (correct + 3 same verb)
      }
      
      const distractors: string[] = [];
      
      // Normalize the current pronoun to treat él/ella/usted and ellos/ellas/ustedes as equivalent
      const normalizedCurrentPronoun = normalizePronoun(randomVerb.pronoun);
      
      // Get distractors from the SAME VERB (different conjugations)
      // Filter out conjugations with the same normalized pronoun to avoid duplicates like "están" appearing twice
      const choiceSourcePool = fullChoicePoolRef.current.length > 0 ? fullChoicePoolRef.current : pool;

      const sameVerbConjugations = choiceSourcePool
        .filter(v => {
          if (v.verb !== randomVerb.verb || v === randomVerb) return false;
          const normalizedPronoun = normalizePronoun(v.pronoun);
          return normalizedPronoun !== normalizedCurrentPronoun;
        })
        .map(v => Array.isArray(v.answer) ? v.answer[0] : v.answer);
      
      // Deduplicate answers and exclude any that match the correct answer
      // (e.g. in imperfecto de subjuntivo: yo/él/usted share the same form)
      const uniqueSameVerbConjugations = Array.from(new Set(sameVerbConjugations))
        .filter(ans => ans !== correct);
      
      // Shuffle same verb conjugations
      for (let i = uniqueSameVerbConjugations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueSameVerbConjugations[i], uniqueSameVerbConjugations[j]] = [uniqueSameVerbConjugations[j], uniqueSameVerbConjugations[i]];
      }
      
      // Add required number of same-verb distractors
      for (let i = 0; i < sameVerbCount && i < uniqueSameVerbConjugations.length; i++) {
        distractors.push(uniqueSameVerbConjugations[i]);
      }
      
      // Fill remaining distractors with OTHER VERBS
      const remainingNeeded = 3 - distractors.length;
      
      if (remainingNeeded > 0) {
        const otherVerbConjugations = choiceSourcePool
          .filter(v => v.verb !== randomVerb.verb)
          .map(v => Array.isArray(v.answer) ? v.answer[0] : v.answer)
          .filter(ans => ans !== correct && !distractors.includes(ans));
        
        // Shuffle other verb conjugations
        for (let i = otherVerbConjugations.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [otherVerbConjugations[i], otherVerbConjugations[j]] = [otherVerbConjugations[j], otherVerbConjugations[i]];
        }
        
        // Add remaining distractors from other verbs
        for (let i = 0; i < remainingNeeded && i < otherVerbConjugations.length; i++) {
          distractors.push(otherVerbConjugations[i]);
        }
      }
      
      // Fallback distractors if not enough options available
      while (distractors.length < 3) {
        // Generate fake distractor by reversing or modifying the correct answer
        const fakeDistractor = correct.split('').reverse().join('');
        if (!distractors.includes(fakeDistractor) && fakeDistractor !== correct) {
          distractors.push(fakeDistractor);
        } else {
          distractors.push(correct + 'x'); // Last resort
        }
      }

      // Shuffle choices using Fisher-Yates
      const choices = [correct, ...distractors];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      setChoiceOptions(choices);
    }
  };

  // --- GAME LOOP & CANVAS ---

  const spawnMonster = (canvasWidth: number, canvasHeight: number, time: number) => {
    if (!selectedDifficulty) return;
    const settings = DIFFICULTY_SETTINGS[selectedDifficulty];
    
    // In boss mode with wave system, don't spawn monsters during preparation or after wave is completed
    if (selectedBattleMode === 'jefe') {
      // Don't spawn if we're in preparation, wave is completed, or near completion
      if (bossWaveCompleted || bossPreparationActive || bossWaveNearCompletion) {
        return;
      }
      
      // Smart spawn control: calculate reachable points
      if (selectedDifficulty === 'facil' || selectedDifficulty === 'intermedio' || selectedDifficulty === 'dificil') {
        // Calculate points from monsters currently on screen
        const monstersOnScreenPoints = monstersRef.current.reduce((sum, m) => sum + m.points, 0);
        const reachablePoints = score + monstersOnScreenPoints;
        
        // Get current wave threshold
        const difficultySettings = DIFFICULTY_SETTINGS[selectedDifficulty] as any;
        let currentThreshold = 1000; // Default for facil
        
        if (difficultySettings.waves) {
          // For multi-wave systems (intermedio)
          const waveIndex = bossCurrentWave; // 0-based: 0=wave 1, 1=wave 2
          if (waveIndex < difficultySettings.waves.length) {
            currentThreshold = difficultySettings.waves[waveIndex].threshold;
          }
        } else if (difficultySettings.waveScoreThreshold) {
          // For single-wave systems (facil)
          currentThreshold = difficultySettings.waveScoreThreshold;
        }
        
        // Stop spawning when reachable points >= threshold + 50 (safety margin)
        if (reachablePoints >= currentThreshold + 50) {
          setBossWaveNearCompletion(true);
          return;
        }
      }
      
      // For facil, intermedio, and dificil, use wave system
      // For other difficulties (none currently), keep old time-based system
      if (selectedDifficulty !== 'facil' && selectedDifficulty !== 'intermedio' && selectedDifficulty !== 'dificil') {
        // Old boss spawn logic (time-based)
        if (!bossRef.current && (time - gameStartTimeRef.current) >= settings.bossAppearTime) {
          const groundLevel = canvasHeight - 40;
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
      }
    }
    
    // Use nextSpawnTimeRef for randomized spawn intervals
    if (time < nextSpawnTimeRef.current) return;
    
    // Calculate next spawn time with randomness (±30% variation)
    // For contrarreloj mode, use faster spawn rate
    let baseSpawnRate: number;
    if (selectedBattleMode === 'contrarreloj') {
      // Spawn rate adjusted for contrarreloj with progressive system
      if (selectedDifficulty === 'facil') {
        // Progressive spawn rate based on total kills
        const totalKills = killCount;
        if (totalKills <= 10) {
          baseSpawnRate = 3800; // Inicio muy tranquilo
        } else if (totalKills <= 25) {
          baseSpawnRate = 3000; // Ritmo medio-bajo
        } else {
          baseSpawnRate = 2500; // Final moderado
        }
      } else if (selectedDifficulty === 'intermedio') {
        // Progressive spawn rate based on total kills
        const totalKills = killCount;
        if (totalKills <= 10) {
          baseSpawnRate = 3500; // Inicio tranquilo
        } else if (totalKills <= 25) {
          baseSpawnRate = 2800; // Ritmo medio
        } else {
          baseSpawnRate = 2300; // Final intenso
        }
      } else {
        // Difícil: Progressive spawn rate
        const totalKills = killCount;
        if (totalKills <= 10) {
          baseSpawnRate = 3300; // Inicio controlado
        } else if (totalKills <= 25) {
          baseSpawnRate = 2700; // Ritmo desafiante
        } else {
          baseSpawnRate = 2200; // Caos final
        }
      }
    } else if (selectedBattleMode === 'jefe' && (selectedDifficulty === 'facil' || selectedDifficulty === 'intermedio' || selectedDifficulty === 'dificil')) {
      // Boss mode with wave system: use kill-based spawn rate (same as contrarreloj)
      if (selectedDifficulty === 'facil') {
        const totalKills = killCount;
        if (totalKills <= 10) {
          baseSpawnRate = 3800; // Inicio muy tranquilo
        } else if (totalKills <= 25) {
          baseSpawnRate = 3000; // Ritmo medio-bajo
        } else {
          baseSpawnRate = 2500; // Final moderado
        }
      } else if (selectedDifficulty === 'intermedio') {
        const totalKills = killCount;
        // Wave-specific spawn rates for intermedio
        if (bossCurrentWave === 0) {
          // Ola 1: Ritmo normal
          if (totalKills <= 10) {
            baseSpawnRate = 3500; // Inicio tranquilo
          } else if (totalKills <= 25) {
            baseSpawnRate = 2800; // Ritmo medio
          } else {
            baseSpawnRate = 2300; // Final intenso
          }
        } else {
          // Ola 2: Ritmo más rápido (igual que ola 2 de difícil)
          if (totalKills <= 10) {
            baseSpawnRate = 2200; // Inicio rápido
          } else if (totalKills <= 25) {
            baseSpawnRate = 1700; // Ritmo muy intenso
          } else {
            baseSpawnRate = 1200; // Caos muy extremo
          }
        }
      } else {
        // Difícil: Progressive spawn rate based on kills within current wave
        const totalKills = killCount;
        // Wave-specific spawn rates for dificil
        if (bossCurrentWave === 0) {
          // Ola 1: Same as before
          if (totalKills <= 10) {
            baseSpawnRate = 3300; // Inicio controlado
          } else if (totalKills <= 25) {
            baseSpawnRate = 2700; // Ritmo desafiante
          } else {
            baseSpawnRate = 2200; // Caos final
          }
        } else if (bossCurrentWave === 1) {
          // Ola 2: Faster spawn rates
          if (totalKills <= 10) {
            baseSpawnRate = 2200; // Inicio rápido
          } else if (totalKills <= 25) {
            baseSpawnRate = 1700; // Ritmo muy intenso
          } else {
            baseSpawnRate = 1200; // Caos muy extremo
          }
        } else {
          // Ola 3: Even faster spawn rates
          if (totalKills <= 10) {
            baseSpawnRate = 1900; // Inicio muy rápido
          } else if (totalKills <= 25) {
            baseSpawnRate = 1400; // Ritmo brutal
          } else {
            baseSpawnRate = 1000; // Caos máximo
          }
        }
      }
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
        
        // All difficulties use the kill-based progression system
        const weights = crConfig.getEnemyWeights(killCountRef.current);
        const enemy = pickWeightedEnemy(weights);
        
        // Use difficulty-specific HP
        let enemyHp = enemy.hp;
        if (selectedDifficulty === 'facil' && enemy.hpFacil) {
          enemyHp = enemy.hpFacil;
        } else if (selectedDifficulty === 'dificil' && enemy.hpDificil) {
          enemyHp = enemy.hpDificil;
        }
        const monsterSize = Math.floor((canvasHeight - 40) * 0.15);
        
        // Apply timeMultiplier to speed (higher baseTime = slower, so inverse relationship)
        // Base speed 0.5, adjusted by baseTime ratio and difficulty multiplier
        const baseSpeed = 0.5 * (12 / enemy.baseTime) * crConfig.timeMultiplier;
        
        // Calculate points with streak bonus (all difficulties)
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
        } else if (selectedDifficulty === 'intermedio') {
          // Base points by enemy type
          const basePointsByEnemy: { [key: number]: number } = {
            1: 30,   // Enemigo 1
            2: 50,   // Enemigo 2
            3: 70,   // Enemigo 3
            4: 120,  // Enemigo 4
            5: 170   // Enemigo 5
          };
          const basePoints = basePointsByEnemy[enemy.id] || enemy.reward;
          // Apply streak bonus: +15 per streak level, max at 4
          const streakBonus = Math.min(pointsStreak, 4) * 15;
          enemyPoints = basePoints + streakBonus;
        } else if (selectedDifficulty === 'dificil') {
          // Base points by enemy type
          const basePointsByEnemy: { [key: number]: number } = {
            2: 50,   // Enemigo 2
            3: 80,   // Enemigo 3
            4: 130,  // Enemigo 4
            5: 200,  // Enemigo 5
            6: 280   // Enemigo 6
          };
          const basePoints = basePointsByEnemy[enemy.id] || enemy.reward;
          // Apply streak bonus: +20 per streak level, max at 5
          const streakBonus = Math.min(pointsStreak, 5) * 20;
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
      
      // Jefe mode: For facil, intermedio, and dificil, use kill-based progression with wave system
      if (selectedBattleMode === 'jefe' && (selectedDifficulty === 'facil' || selectedDifficulty === 'intermedio' || selectedDifficulty === 'dificil')) {
        // Determine enemy pool based on difficulty and current wave
        let getEnemyWeights: (kills: number) => { id: number; weight: number }[];
        
        if (selectedDifficulty === 'facil') {
          const crConfig = CONTRARRELOJ_DIFFICULTY['facil'];
          getEnemyWeights = crConfig.getEnemyWeights;
        } else if (selectedDifficulty === 'intermedio') {
          const waveIndex = bossCurrentWave; // 0 = wave 1, 1 = wave 2
          
          // Custom progression for intermedio waves
          getEnemyWeights = (kills: number) => {
            if (waveIndex === 0) {
              // Wave 1: E1, E2, E3
              if (kills <= 3) return [{ id: 1, weight: 100 }];
              if (kills <= 9) return [{ id: 1, weight: 50 }, { id: 2, weight: 40 }, { id: 3, weight: 10 }];
              return [{ id: 1, weight: 25 }, { id: 2, weight: 45 }, { id: 3, weight: 30 }];
            } else if (waveIndex === 1) {
              // Wave 2: E2, E3, E4
              if (kills <= 3) return [{ id: 2, weight: 60 }, { id: 3, weight: 40 }];
              if (kills <= 7) return [{ id: 2, weight: 35 }, { id: 3, weight: 40 }, { id: 4, weight: 25 }];
              return [{ id: 2, weight: 20 }, { id: 3, weight: 35 }, { id: 4, weight: 45 }];
            }
            // Fallback
            return [{ id: 2, weight: 50 }, { id: 3, weight: 50 }];
          };
        } else if (selectedDifficulty === 'dificil') {
          const waveIndex = bossCurrentWave; // 0 = wave 1, 1 = wave 2, 2 = wave 3
          
          // Custom progression for dificil waves (3 oleadas)
          getEnemyWeights = (kills: number) => {
            if (waveIndex === 0) {
              // Wave 1: E2, E3
              if (kills <= 3) return [{ id: 2, weight: 100 }];
              if (kills <= 9) return [{ id: 2, weight: 50 }, { id: 3, weight: 50 }];
              return [{ id: 2, weight: 35 }, { id: 3, weight: 65 }];
            } else if (waveIndex === 1) {
              // Wave 2: E3, E4, E5
              if (kills <= 3) return [{ id: 3, weight: 30 }, { id: 4, weight: 70 }];
              if (kills <= 7) return [{ id: 3, weight: 10 }, { id: 4, weight: 50 }, { id: 5, weight: 40 }];
              return [{ id: 4, weight: 30 }, { id: 5, weight: 70 }];
            } else if (waveIndex === 2) {
              // Wave 3: E5, E6
              if (kills <= 5) return [{ id: 5, weight: 70 }, { id: 6, weight: 30 }];
              return [{ id: 5, weight: 30 }, { id: 6, weight: 70 }];
            }
            // Fallback
            return [{ id: 3, weight: 50 }, { id: 4, weight: 50 }];
          };
        } else {
          // Fallback (should not reach here)
          const crConfig = CONTRARRELOJ_DIFFICULTY['facil'];
          getEnemyWeights = crConfig.getEnemyWeights;
        }
        
        const weights = getEnemyWeights(killCountRef.current);
        const enemy = pickWeightedEnemy(weights);
        
        // Use difficulty-specific HP (NO multiplier, same as contrarreloj)
        let enemyHp = enemy.hp;
        if (selectedDifficulty === 'facil' && enemy.hpFacil) {
          enemyHp = enemy.hpFacil;
        } else if (selectedDifficulty === 'dificil' && enemy.hpDificil) {
          enemyHp = enemy.hpDificil;
        }
        
        const monsterSize = Math.floor((canvasHeight - 40) * 0.15);
        
        // Calculate speed using same formula as contrarreloj for consistency
        const crConfig = CONTRARRELOJ_DIFFICULTY[selectedDifficulty];
        const baseSpeed = 0.5 * (12 / enemy.baseTime) * crConfig.timeMultiplier;
        
        monstersRef.current.push({
          id: Date.now(),
          x: canvasWidth + 50,
          y: groundLevel - monsterSize,
          width: monsterSize,
          height: monsterSize,
          hp: enemyHp,
          maxHp: enemyHp,
          speed: baseSpeed * settings.enemySpeedMultiplier,
          emoji: ['👾', '👹', '👻', '👺', '💀', '☠️'][enemy.id - 1],
          imageIndex: enemy.id - 1,
          color: ['#8b5cf6', '#ec4899', '#3b82f6', '#ef4444', '#f59e0b', '#dc2626'][enemy.id - 1],
          points: enemy.reward
        });
        
        // Track spawn time for fallback logic
        setLastSpawnTime(time);
        return;
      }
      
      // Jefe mode (intermedio/dificil) uses CONTRARRELOJ enemy stats with score progression
      const enemyTypes = CONTRARRELOJ_ENEMIES.map((enemy, index) => ({
        imageIndex: index,
        hp: enemy.hp,
        hpFacil: enemy.hpFacil,
        hpDificil: enemy.hpDificil,
        speed: 0.9 - (index * 0.08), // Progressive speed: starts at 0.9, decreases by 0.08 each level
        emoji: ['👾', '👹', '👻', '👺', '💀', '☠️'][index],
        points: enemy.reward,
        color: ['#8b5cf6', '#ec4899', '#3b82f6', '#ef4444', '#f59e0b', '#dc2626'][index],
        minScore: [0, 0, 100, 250, 400, 600][index]
      }));
      
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
        availableEnemies = [enemyTypes[selectedDifficulty === 'dificil' ? 1 : 0]]; // Start with E2 in difficult, E1 otherwise
      }
      
      // Select random enemy from available ones
      const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
      
      // Select appropriate HP based on difficulty
      let enemyHp = type.hp;
      if (selectedDifficulty === 'facil' && type.hpFacil) {
        enemyHp = type.hpFacil;
      } else if (selectedDifficulty === 'dificil' && type.hpDificil) {
        enemyHp = type.hpDificil;
      }
      
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
        hp: Math.ceil(enemyHp * hpMultiplier),
        maxHp: Math.ceil(enemyHp * hpMultiplier),
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
    // Don't shoot during boss preparation phase
    if (now - lastShotRef.current > 1000 && !bossPreparationActive) { 
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
                
                // Check wave completion in Boss mode (facil, intermedio, and dificil with wave system)
                if (selectedBattleMode === 'jefe' && (selectedDifficulty === 'facil' || selectedDifficulty === 'intermedio' || selectedDifficulty === 'dificil') && !bossWaveCompleted) {
                  const difficultySettings = DIFFICULTY_SETTINGS[selectedDifficulty] as any;
                  let waveThreshold = 0;
                  
                  // Get current wave threshold
                  if (difficultySettings.waves) {
                    // Multi-wave system (intermedio)
                    const waveIndex = bossCurrentWave;
                    if (waveIndex < difficultySettings.waves.length) {
                      waveThreshold = difficultySettings.waves[waveIndex].threshold;
                    }
                  } else if (difficultySettings.waveScoreThreshold) {
                    // Single-wave system (facil)
                    waveThreshold = difficultySettings.waveScoreThreshold;
                  }
                  
                  if (waveThreshold > 0) {
                    // Condition A: Reached wave threshold
                    if (newScore >= waveThreshold) {
                      setBossWaveCompleted(true);
                      setBossWaitingForCleanScreen(true);
                    }
                  }
                }
                
                return newScore;
              });
              const killedEnemyType = m.imageIndex + 1; // imageIndex is 0-based, enemy id is 1-based
              monstersRef.current.splice(j, 1);
              // Track kills in both Contrarreloj and Jefe modes
              if (selectedBattleMode === 'contrarreloj') {
                setKillCount(prev => prev + 1);
                setKillsByType(prev => ({ ...prev, [killedEnemyType]: (prev[killedEnemyType] || 0) + 1 }));
              } else if (selectedBattleMode === 'jefe') {
                setKillCount(prev => prev + 1);
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

    // Sky background with enhanced gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, '#4A90E2');
    skyGradient.addColorStop(0.5, '#87CEEB');
    skyGradient.addColorStop(1, '#B0D4F1');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Distant mountains - simple silhouette
    const groundHeight = 40;
    const groundY = canvasHeight - groundHeight;
    const mountainHeight = 120;
    const mountainY = groundY - mountainHeight;
    
    ctx.fillStyle = '#5A7BA6';
    ctx.beginPath();
    // Mountain peaks using bezier curves
    ctx.moveTo(0, groundY);
    ctx.lineTo(0, mountainY + 60);
    ctx.quadraticCurveTo(100, mountainY, 200, mountainY + 40);
    ctx.quadraticCurveTo(300, mountainY + 80, 400, mountainY + 20);
    ctx.quadraticCurveTo(500, mountainY - 10, 600, mountainY + 50);
    ctx.quadraticCurveTo(700, mountainY + 90, 800, mountainY + 30);
    ctx.quadraticCurveTo(900, mountainY, canvasWidth, mountainY + 70);
    ctx.lineTo(canvasWidth, groundY);
    ctx.closePath();
    ctx.fill();
    
    // Animated clouds - simple circles
    clouds.forEach(cloud => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      // Main cloud body (3 overlapping circles)
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.5, cloud.y, cloud.size * 0.4, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Update cloud position
      cloud.x -= cloud.speed;
      // Reset cloud when it goes off screen
      if (cloud.x < -cloud.size * 2) {
        cloud.x = canvasWidth + cloud.size;
      }
    });

    // Ground with gradient (grass effect)
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvasHeight);
    groundGradient.addColorStop(0, '#6B8E23');
    groundGradient.addColorStop(0.5, '#556B2F');
    groundGradient.addColorStop(1, '#3D5218');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, canvasWidth, groundHeight);

    // Castle/wizard sizes for visibility
    const castleFontSize = Math.floor((canvasHeight - groundHeight) * 0.35);
    const wizardSize = Math.floor((canvasHeight - groundHeight) * 0.15);
    
    // Draw castle shadow (elliptical, before castle)
    const castleX = 10;
    const castleYOffset = 13; // 🎯 AJUSTA ESTE VALOR para controlar la altura del castillo
    const castleBaseY = groundY;
    const castleShadowWidth = 50;
    const castleShadowHeight = 12;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.filter = 'blur(8px)';
    ctx.beginPath();
    ctx.ellipse(
      castleX + 30, 
      castleBaseY - 1, 
      castleShadowWidth, 
      castleShadowHeight, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
    
    // Draw castle (still using emoji)
    ctx.font = `${castleFontSize}px Arial`;
    ctx.fillText('🏰', castleX, groundY - castleYOffset);
    
    // Calculate wizard position
    const castleWidth = 60; // Approximate castle emoji width
    heroRef.current.x = 10 + castleWidth + 10; // 10px padding from castle
    heroRef.current.y = groundY - wizardSize + 4; // Adjust for optimal ground contact
    heroRef.current.width = wizardSize;
    heroRef.current.height = wizardSize;
    
    // Draw wizard shadow (elliptical, before wizard)
    const wizardShadowWidth = wizardSize * 0.6;
    const wizardShadowHeight = wizardSize * 0.15;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.filter = 'blur(6px)';
    ctx.beginPath();
    ctx.ellipse(
      heroRef.current.x + wizardSize / 2, 
      groundY - 1, 
      wizardShadowWidth, 
      wizardShadowHeight, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
    
    // Draw wizard using image - positioned so feet are at ground level (same as castle base)
    
    if (imagesLoadedRef.current && wizardImageRef.current && wizardImageRef.current.complete) {
      ctx.drawImage(wizardImageRef.current, heroRef.current.x, heroRef.current.y, wizardSize, wizardSize);
    } else {
      // Fallback to emoji if image not loaded
      ctx.font = `${wizardSize}px Arial`;
      ctx.fillText('🧙‍♂️', heroRef.current.x, groundY - 2);
    }

    // Draw monsters using images
    const currentTime = performance.now();
    monstersRef.current.forEach(m => {
        // Floating animation for E1 (id 0) and E2 (id 1) only
        const floatOffset = (m.imageIndex === 0 || m.imageIndex === 1) 
          ? Math.sin(currentTime / 500) * 2.5 // 5px total range (-2.5 to +2.5)
          : 0;
        
        const drawY = m.y + floatOffset;
        
        if (imagesLoadedRef.current && enemyImagesRef.current[m.imageIndex] && enemyImagesRef.current[m.imageIndex].complete) {
          ctx.drawImage(enemyImagesRef.current[m.imageIndex], m.x, drawY, m.width, m.height);
        } else {
          // Fallback to emoji if image not loaded
          const monsterFontSize = Math.floor(m.height * 0.85);
          ctx.font = `${monsterFontSize}px Arial`;
          ctx.fillText(m.emoji, m.x, drawY + m.height * 0.85);
        }
        
        // Health bar with styled border and background
        const barX = m.x;
        const barY = drawY - 10;
        const barWidth = m.width;
        const barHeight = 5;
        
        // Dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Red background (damage portion)
        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Green foreground (current HP)
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barWidth * (m.hp / m.maxHp), barHeight);
        
        // Black border (1px)
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
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
            
            // Check if waiting for clean screen in boss mode
            if (bossWaitingForCleanScreen && monstersRef.current.length === 0 && !bossPreparationActive) {
              // Screen is clear! Start preparation immediately
              setBossWaitingForCleanScreen(false);
              setWaveCompletionMessageShown(true);
              
              // Start preparation timer (overlay will show message and progress bar)
              setBossPreparationActive(true);
              setBossPreparationStartTime(performance.now());
            }
            
            // Fallback conditions for wave completion (facil, intermedio, and dificil)
            if (selectedBattleMode === 'jefe' && (selectedDifficulty === 'facil' || selectedDifficulty === 'intermedio' || selectedDifficulty === 'dificil') && !bossWaveCompleted && !bossWaitingForCleanScreen && bossWaveNearCompletion) {
              const currentTime = time;
              const timeSinceLastSpawn = currentTime - lastSpawnTime;
              
              // Get current wave threshold
              const difficultySettings = DIFFICULTY_SETTINGS[selectedDifficulty] as any;
              let waveThreshold = 0;
              
              if (difficultySettings.waves) {
                const waveIndex = bossCurrentWave;
                if (waveIndex < difficultySettings.waves.length) {
                  waveThreshold = difficultySettings.waves[waveIndex].threshold;
                }
              } else if (difficultySettings.waveScoreThreshold) {
                waveThreshold = difficultySettings.waveScoreThreshold;
              }
              
              // Condition B: threshold-100+ points + clean screen
              if (score >= waveThreshold - 100 && monstersRef.current.length === 0) {
                setBossWaveCompleted(true);
                setBossWaitingForCleanScreen(true);
              }
              // Condition C: threshold-150+ points + clean screen + 5 seconds without spawn
              else if (score >= waveThreshold - 150 && monstersRef.current.length === 0 && timeSinceLastSpawn > 5000) {
                setBossWaveCompleted(true);
                setBossWaitingForCleanScreen(true);
              }
            }
            
            draw(ctx, canvas.width, canvas.height);
        }
    }
    requestRef.current = requestAnimationFrame(gameLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, score, attackPower, bossWaitingForCleanScreen, bossPreparationActive, waveCompletionMessageShown]); 

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
    
    // SRS: Calculate response time
    const responseTime = Date.now() - responseStartTimeRef.current;
    
    // Normalize valid answers to array
    const validAnswers = Array.isArray(currentVerb.answer) 
        ? currentVerb.answer 
        : [currentVerb.answer];

    const isCorrect = validAnswers.some(a => a.toLowerCase() === answer.toLowerCase().trim());
    
    // SRS: Record the result for spaced repetition
    if (isCorrect) {
      recordVerbCorrect(currentVerb, responseTime);
    } else {
      recordVerbIncorrect(currentVerb, responseTime);
    }
    
    // Contrarreloj uses damage streak system
    if (selectedBattleMode === 'contrarreloj') {
      if (isCorrect) {
        playSuccess();
        const newStreak = damageStreak + 1;
        const newDamage = 10 + newStreak * 2;
        setDamageStreak(newStreak);
        setPointsStreak(prev => prev + 1); // Incrementar racha de puntos
        // attackPower goes up +1 per correct (visual + aura), no limit
        setAttackPower(prev => prev + 1);
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
        setAttackPower(prev => prev + 1); // No limit
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
        <div className={`w-full max-w-4xl ${screenShake ? 'animate-[screenShake_0.5s_ease-in-out]' : ''}`}>
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

          {/* Canvas with Boss Preparation Overlay */}
          <div className="relative bg-white rounded-2xl shadow-2xl mb-6">
            <canvas
              ref={canvasRef}
              width={872}
              height={396}
              className="w-full rounded-2xl"
            />
            
            {/* Boss Preparation Overlay - Only visible during preparation */}
            {bossPreparationActive && (
              <div className="absolute top-0 left-0 right-0 z-10">
                {/* Progress Bar - Enhanced with icon and urgency effects */}
                <div className="px-6 py-8">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`flex-1 bg-gray-700 bg-opacity-60 rounded-full h-6 overflow-visible backdrop-blur-sm relative ${
                        bossPreparationTimeRemaining <= 3 ? 'animate-[shake_0.3s_ease-in-out_infinite]' : ''
                      }`}
                    >
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-red-600 h-full transition-all duration-75 ease-linear flex items-center justify-center rounded-full"
                        style={{ width: `${bossPreparationProgress}%` }}
                      >
                        <span className="text-white font-black text-sm drop-shadow-lg">
                          {bossPreparationTimeRemaining}s
                        </span>
                      </div>
                      
                      {/* Icon - moves with progress */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 transition-all duration-75 ease-linear"
                        style={{ 
                          left: `${bossPreparationProgress}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <span 
                          className="text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] inline-block"
                          style={{
                            filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                          }}
                        >
                          {(() => {
                            const difficultySettings = selectedDifficulty ? DIFFICULTY_SETTINGS[selectedDifficulty] as any : null;
                            const hasMoreWaves = difficultySettings?.waves && bossCurrentWave < difficultySettings.waves.length - 1;
                            return hasMoreWaves ? '⚔️' : '🐉';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Wizard Aura Overlay - Silhouette-based drop-shadow */}
            {gameState === 'PLAYING' && imagesReady && (
              <div
                ref={wizardAuraOverlayRef}
                className="absolute pointer-events-none"
                style={{
                  width: '1px',
                  height: '1px',
                  overflow: 'visible',
                  padding: '50px',
                  zIndex: 4
                }}
              >
                <img
                  src="/data/images/Mago.png"
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: `calc(${Math.floor((396 - 40) * 0.15)}px * var(--wizard-scale, 1))`,
                    height: `calc(${Math.floor((396 - 40) * 0.15)}px * var(--wizard-scale, 1))`,
                    pointerEvents: 'none',
                    filter: `
                      ${getAuraDropShadows(attackPower)}
                      ${attackPower >= 7 ? 'brightness(1.2) contrast(1.1)' : ''}
                    `,
                    opacity: 0.95,
                    mixBlendMode: 'screen'
                  }}
                />
              </div>
            )}
            
            {/* CSS Animations for Boss Preparation */}
            <style>{`
              @keyframes popIn {
                0% {
                  transform: scale(0);
                  opacity: 0;
                }
                50% {
                  transform: scale(1.1);
                }
                70% {
                  transform: scale(0.9);
                }
                100% {
                  transform: scale(1);
                  opacity: 1;
                }
              }
              
              @keyframes glowPulse {
                0%, 100% {
                  box-shadow: 0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2);
                }
                50% {
                  box-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.6), 0 0 90px rgba(239, 68, 68, 0.4);
                }
              }
              
              @keyframes shake {
                0%, 100% {
                  transform: translateX(0);
                }
                25% {
                  transform: translateX(-4px) rotate(-1deg);
                }
                75% {
                  transform: translateX(4px) rotate(1deg);
                }
              }
              
              @keyframes screenShake {
                0%, 100% {
                  transform: translate(0, 0);
                }
                10%, 30%, 50%, 70%, 90% {
                  transform: translate(-10px, 0);
                }
                20%, 40%, 60%, 80% {
                  transform: translate(10px, 0);
                }
              }
            `}</style>
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
                {selectedBattleMode === 'contrarreloj' && selectedDifficulty && (
                  <p>🎯 <strong>Modo Contrarreloj:</strong> ¡Debes conseguir {DIFFICULTY_SETTINGS[selectedDifficulty].targetScore} puntos para completar el juego! Cada acierto hace ⚔️ daño al enemigo. ¡Las rachas aumentan tu poder!</p>
                )}
                {selectedBattleMode === 'jefe' && (
                  <p>🐉 <strong>Modo Jefe:</strong> Derrota al dragón gigante que aparece después de un tiempo</p>
                )}
                {selectedMode === 'write' && (
                  <p>📝 <strong>Modo Escritura:</strong> Usa las teclas 1-5 para vocales con tilde (1=á, 2=é, 3=í, 4=ó, 5=ú)</p>
                )}
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
