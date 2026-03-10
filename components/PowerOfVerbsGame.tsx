import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Info, X, Pause, Play, Send, Delete } from 'lucide-react';
import { getAvailableTenses, getFilteredVerbs, getFilteredVerbsSRS, recordVerbCorrect, recordVerbIncorrect } from '../services/powerVerbsService';
import { PowerVerb, GameDifficulty, GameMode, BattleMode } from '../types';
import { hablarConPanda } from '../services/geminiService';
import DraggableCobi from './DraggableCobi';
import { normalizePronoun } from '../services/srsService';

interface PowerOfVerbsGameProps {
  onBack: () => void;
  cobiVisible?: boolean;
  soundEnabled?: boolean;
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

// ── WhatsApp-style Mobile Keyboard for PowerOfVerbs ───────────────────────
const POV_ROWS = [
  ['á', 'é', 'í', 'ó', 'ú'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['SEND', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

interface PovMobileKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
}

const PovMobileKeyboard: React.FC<PovMobileKeyboardProps> = ({ onKeyPress, onDelete, onSubmit }) => {
  const [popupKey, setPopupKey] = useState<{ char: string; rect: DOMRect } | null>(null);

  const handleTouchStart = useCallback((char: string, e: React.TouchEvent<HTMLButtonElement>) => {
    if (char === 'SEND' || char === 'DEL') return;
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setPopupKey({ char, rect });
  }, []);

  const handleTouchEnd = useCallback(() => {
    setPopupKey(null);
  }, []);

  const handleKeyAction = useCallback((key: string) => {
    if (key === 'SEND') {
      onSubmit();
    } else if (key === 'DEL') {
      onDelete();
    } else {
      const isAccent = ['á', 'é', 'í', 'ó', 'ú'].includes(key);
      onKeyPress(isAccent ? key : key.toLowerCase());
    }
  }, [onKeyPress, onDelete, onSubmit]);

  return (
    <div style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', padding: '0 3px 6px 3px', position: 'relative' }}>
      {popupKey && (
        <div
          style={{
            position: 'fixed',
            left: popupKey.rect.left + popupKey.rect.width / 2 - 24,
            top: popupKey.rect.top - 52,
            width: 48, height: 48,
            backgroundColor: '#fff', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700, color: '#003D5B',
            zIndex: 9999, pointerEvents: 'none',
          }}
        >
          {popupKey.char}
        </div>
      )}
      {POV_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: rowIdx < POV_ROWS.length - 1 ? '10px' : 0, padding: '0 3px' }}>
          {row.map((key) => {
            const isSend = key === 'SEND';
            const isDel = key === 'DEL';
            const isAccent = ['á', 'é', 'í', 'ó', 'ú'].includes(key);
            const isSpecial = isSend || isDel;
            let bg = '#fff'; let color = '#1a1a1a';
            if (isSend) { bg = '#1D4ED8'; color = '#fff'; }
            if (isDel) { bg = '#F87171'; color = '#fff'; }
            if (isAccent) { bg = '#DBEAFE'; color = '#1E40AF'; }
            return (
              <button
                key={key}
                onClick={() => handleKeyAction(key)}
                onTouchStart={(e) => handleTouchStart(key, e)}
                onTouchEnd={handleTouchEnd}
                style={{
                  flex: isSpecial ? 1.5 : 1, height: 46,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, backgroundColor: bg, color, fontWeight: 700,
                  fontSize: isSpecial ? 14 : 16,
                  boxShadow: `0 3px 0 rgba(0,0,0,${isSpecial ? 0.2 : 0.15})`,
                  border: 'none', WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation', userSelect: 'none',
                  transition: 'transform 0.05s',
                }}
                className="active:translate-y-[2px] active:shadow-none"
              >
                {isSend ? <Send size={20} /> : isDel ? <Delete size={20} /> : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// --- COMPONENT ---
const PowerOfVerbsGame: React.FC<PowerOfVerbsGameProps> = ({ onBack, cobiVisible = true, soundEnabled = true }) => {
  // UI State
  const [gameState, setGameState] = useState<GameState>('SELECTION');
  const [selectedGrammar, setSelectedGrammar] = useState<string>('');
  const [selectedTense, setSelectedTense] = useState<string>('');
  const [selectedVerbType, setSelectedVerbType] = useState<string>('');
  const [selectedBattleMode, setSelectedBattleMode] = useState<BattleMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [mobileMenuPage, setMobileMenuPage] = useState(1); // Pages 1-6 for mobile wizard

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
  const lastSpawnTimeRef = useRef<number>(0); // Track when last enemy spawned (ref for loop stability)
  const [screenShake, setScreenShake] = useState(false); // Screen shake effect on boss spawn
  
  // Animated clouds state
  const [clouds, _setClouds] = useState([
    { x: 100, y: 40, size: 40, speed: 0.1 },
    { x: 400, y: 80, size: 50, speed: 0.15 },
    { x: 650, y: 50, size: 35, speed: 0.12 },
    { x: 850, y: 70, size: 45, speed: 0.08 }
  ]);
  
  // Keep refs in sync with state for gameLoop access
  useEffect(() => { killCountRef.current = killCount; }, [killCount]);
  useEffect(() => { attackPowerRef.current = attackPower; }, [attackPower]);
  useEffect(() => { killsByTypeRef.current = killsByType; }, [killsByType]);
  useEffect(() => { pointsStreakRef.current = pointsStreak; }, [pointsStreak]);
  
  // Draw wizard aura glow on canvas using shadow properties
  // Color progression: Green(0-5) → Blue(6-12) → Orange(13-20) → Purple(21-30) → White(31+)
  // Aura is visible from the start and grows gradually up to power 31
  const drawWizardAura = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, power: number) => {
    // Aura visible from power 0: base intensity starts at 0.3, grows to 1.0 at power 31
    const growthFactor = Math.min(power / 31, 1); // 0→1 over 31 levels
    const baseIntensity = 0.3 + 0.7 * growthFactor; // 0.3→1.0
    
    // Determine color tier and local progress within tier
    let outerR: number, outerG: number, outerB: number;
    let innerR: number, innerG: number, innerB: number;
    let coreR: number, coreG: number, coreB: number;
    
    if (power >= 31) {
      // White — brilliant white core with soft lavender outer
      outerR = 200; outerG = 180; outerB = 255; // soft lavender
      innerR = 230; innerG = 230; innerB = 255; // near-white
      coreR = 255; coreG = 255; coreB = 255;    // pure white
    } else if (power >= 21) {
      // Purple — deep purple outer, violet-pink inner
      outerR = 128; outerG = 0; outerB = 200;   // deep purple
      innerR = 180; innerG = 80; innerB = 220;   // violet
      coreR = 220; coreG = 160; coreB = 255;     // soft violet core
    } else if (power >= 13) {
      // Orange — warm orange outer, golden inner
      outerR = 230; outerG = 120; outerB = 0;    // deep orange
      innerR = 255; innerG = 170; innerB = 30;   // golden-orange
      coreR = 255; coreG = 220; coreB = 100;     // warm gold core
    } else if (power >= 6) {
      // Blue — royal blue outer, cyan inner
      outerR = 30; outerG = 80; outerB = 220;    // royal blue
      innerR = 50; innerG = 160; innerB = 240;   // bright blue
      coreR = 120; coreG = 210; coreB = 255;     // cyan core
    } else {
      // Green — emerald green outer, lime inner (0-5)
      outerR = 30; outerG = 160; outerB = 60;    // forest green
      innerR = 60; innerG = 200; innerB = 80;    // emerald
      coreR = 140; coreG = 255; coreB = 140;     // light green core
    }
    
    // Scale blur sizes with growth — visible from start, expanding to max at 31
    const outerBlur = Math.floor(15 + 50 * growthFactor);  // 15→65
    const innerBlur = Math.floor(8 + 25 * growthFactor);   // 8→33
    const coreBlur = Math.floor(4 + 12 * growthFactor);    // 4→16
    
    // Outer glow layer — large, soft, atmospheric
    ctx.save();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = `rgba(${outerR}, ${outerG}, ${outerB}, ${0.6 * baseIntensity})`;
    ctx.shadowBlur = outerBlur;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    
    // Inner glow layer — medium, brighter
    ctx.save();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = `rgba(${innerR}, ${innerG}, ${innerB}, ${0.8 * baseIntensity})`;
    ctx.shadowBlur = innerBlur;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    
    // Core glow layer — tight, intense
    ctx.save();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = `rgba(${coreR}, ${coreG}, ${coreB}, ${baseIntensity})`;
    ctx.shadowBlur = coreBlur;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    
    // At higher tiers (13+), add a pulsing overlay for extra drama
    if (power >= 13) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
      const pulseIntensity = 0.15 * growthFactor * pulse;
      ctx.save();
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowColor = `rgba(${coreR}, ${coreG}, ${coreB}, ${pulseIntensity})`;
      ctx.shadowBlur = Math.floor(outerBlur * 1.3);
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    }
  };
  
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
    
    let rafId = 0;

    const tick = () => {
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
          
          setFeedbackMsg({ text: `¡Oleada ${bossCurrentWave + 2} iniciada! 💪`, type: 'success' });
          playNewWave(); // Fanfare for new wave
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
            
            playBossSpawn(); // Epic dragon roar sound
            setFeedbackMsg({ text: '¡El dragón ha aparecido! 🐉', type: 'error' });
            setTimeout(() => setFeedbackMsg({ text: '', type: '' }), 3000);
          }
          
          setBossPreparationActive(false);
        }
      }
      else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    
    return () => cancelAnimationFrame(rafId);
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
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  
  const heroRef = useRef({ x: 50, y: 0, width: 40, height: 40 }); // Y position set dynamically
  const monstersRef = useRef<Monster[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const bossRef = useRef<Boss | null>(null);
  const gameStartTimeRef = useRef<number>(0);
  const killCountRef = useRef<number>(0);
  const attackPowerRef = useRef<number>(1);
  const killsByTypeRef = useRef<{ [key: number]: number }>({});
  const pointsStreakRef = useRef<number>(0);
  const nextSpawnTimeRef = useRef<number>(0);
  
  // FPS counter refs (temporary debug)
  const fpsFrameCountRef = useRef<number>(0);
  const fpsLastSecondRef = useRef<number>(0);
  const fpsDisplayRef = useRef<number>(0);
  const deltaTimeRef = useRef<number>(1); // Frame-rate normalization (1.0 = 120fps)
  
  // History ref to avoid repeating same verb+pronoun combinations
  const verbHistoryRef = useRef<string[]>([]);
  
  // Image refs for rendering
  const enemyImagesRef = useRef<HTMLImageElement[]>([]);
  const bossImageRef = useRef<HTMLImageElement | null>(null);
  const wizardImageRef = useRef<HTMLImageElement | null>(null);
  const castleImageRef = useRef<HTMLImageElement | null>(null);
  const attackImagesRef = useRef<HTMLImageElement[]>([]);
  const imagesLoadedRef = useRef<boolean>(false);

  // Mobile detection & responsive canvas
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // Prevent page scroll on desktop while playing
  useEffect(() => {
    if (gameState === 'PLAYING' && !isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [gameState, isMobile]);
  const [canvasDims, setCanvasDims] = useState({ w: 872, h: 396 });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(landscape);
      if (mobile) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (landscape) {
          // Landscape: use nearly full width, limited height
          setCanvasDims({ w: Math.floor(vw * 0.92), h: Math.floor(vh * 0.50) });
        } else {
          // Portrait: full width, proportional height
          setCanvasDims({ w: Math.floor(vw * 0.92), h: Math.floor(vw * 0.45) });
        }
      } else {
        setCanvasDims({ w: 872, h: 396 });
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile sprite scale factor: 2.25x on mobile for better visibility
  const mobileSpriteFactor = isMobile ? 2.25 : 1;
  // To maintain constant arrival time when sprites are larger:
  // Larger sprites have their collision edge closer to castle (arrive sooner).
  // Original monster width = (canvasHeight-40)*0.15, new = that * 3.
  // Difference in x covered = 2 * originalWidth. Need to slow down proportionally.
  // Speed compensation: reduce speed so time-to-castle stays the same.
  // arrival_time = distanceToCastle / speed. With bigger sprite, distance is shorter.
  // newDistance = oldDistance - (newWidth - oldWidth). Factor = newDistance / oldDistance.
  // Approx: castle at x=50, spawn at canvasWidth+50, distance ≈ canvasWidth.
  // monsterSize grows by 2*original, so distance shrinks by 2*original.
  // speedFactor = (canvasWidth - 2*origMonsterSize) / canvasWidth ≈ ~0.9 (barely changes).
  // But tripling changes collision detection significantly, so we use a simple ratio:
  const mobileSpeedCompensation = isMobile ? (0.95 / 2.25) : 1;

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
  const getAudioCtx = (): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
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

  // --- Improved shoot: laser burst with descending sweep + crackle ---
  const playShoot = () => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    // Layer 1: fast descending sweep (the "pew")
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1800, t);
    osc1.frequency.exponentialRampToValueAtTime(300, t + 0.12);
    g1.gain.setValueAtTime(0.18, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc1.connect(g1).connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.14);

    // Layer 2: bright harmonic ping
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2400, t);
    osc2.frequency.exponentialRampToValueAtTime(600, t + 0.08);
    g2.gain.setValueAtTime(0.10, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.10);

    // Layer 3: short noise burst for "crackle" texture
    const bufferSize = ctx.sampleRate * 0.06;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const ng = ctx.createGain();
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = 3000;
    ng.gain.setValueAtTime(0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(nf).connect(ng).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.07);
  };

  // --- Improved hit: punchy impact with sub-bass thud + metallic crunch ---
  const playHit = () => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    // Layer 1: sub-bass thud (body of the impact)
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(150, t);
    osc1.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc1.connect(g1).connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.20);

    // Layer 2: mid-frequency crunch
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(400, t);
    osc2.frequency.exponentialRampToValueAtTime(120, t + 0.10);
    g2.gain.setValueAtTime(0.13, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.14);

    // Layer 3: noise burst for "crunch/shatter" texture
    const bufferSize = ctx.sampleRate * 0.08;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const ng = ctx.createGain();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 1500;
    nf.Q.value = 1.2;
    ng.gain.setValueAtTime(0.15, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noise.connect(nf).connect(ng).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.10);
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

  // --- Boss hit: heavier impact with reverb-like echo tail ---
  const playBossHit = () => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    // Layer 1: deep boom
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(100, t);
    osc1.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    g1.gain.setValueAtTime(0.30, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    osc1.connect(g1).connect(ctx.destination);
    osc1.start(t); osc1.stop(t + 0.32);

    // Layer 2: distorted crunch
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(350, t);
    osc2.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    g2.gain.setValueAtTime(0.18, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t); osc2.stop(t + 0.20);

    // Layer 3: noise burst for shatter
    const bufLen = ctx.sampleRate * 0.12;
    const nBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = (Math.random() * 2 - 1);
    const ns = ctx.createBufferSource();
    ns.buffer = nBuf;
    const ng = ctx.createGain();
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 2000;
    ng.gain.setValueAtTime(0.18, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    ns.connect(nf).connect(ng).connect(ctx.destination);
    ns.start(t); ns.stop(t + 0.15);

    // Layer 4: echo tail (delayed faint repeat)
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(60, t + 0.15);
    osc3.frequency.exponentialRampToValueAtTime(25, t + 0.40);
    g3.gain.setValueAtTime(0.001, t);
    g3.gain.linearRampToValueAtTime(0.10, t + 0.16);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc3.connect(g3).connect(ctx.destination);
    osc3.start(t + 0.15); osc3.stop(t + 0.44);
  };

  // --- Damage received: pain sound when wizard loses a life ---
  const playDamageReceived = () => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    // Layer 1: descending "oof" tone
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(500, t);
    osc1.frequency.exponentialRampToValueAtTime(150, t + 0.20);
    g1.gain.setValueAtTime(0.22, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc1.connect(g1).connect(ctx.destination);
    osc1.start(t); osc1.stop(t + 0.27);

    // Layer 2: low rumble
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(120, t);
    osc2.frequency.exponentialRampToValueAtTime(60, t + 0.18);
    g2.gain.setValueAtTime(0.12, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t); osc2.stop(t + 0.24);

    // Layer 3: sharp glass-crack noise
    const bufLen = ctx.sampleRate * 0.06;
    const nBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = (Math.random() * 2 - 1);
    const ns = ctx.createBufferSource();
    ns.buffer = nBuf;
    const ng = ctx.createGain();
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass'; nf.frequency.value = 4000;
    ng.gain.setValueAtTime(0.14, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    ns.connect(nf).connect(ng).connect(ctx.destination);
    ns.start(t); ns.stop(t + 0.08);
  };

  // --- New wave fanfare: short brass roll ---
  const playNewWave = () => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.08;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(g).connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.18);
    });
    // Snare-like noise roll
    const bufLen = ctx.sampleRate * 0.15;
    const nBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.5;
    const ns = ctx.createBufferSource();
    ns.buffer = nBuf;
    const ng = ctx.createGain();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 5000; nf.Q.value = 0.8;
    ng.gain.setValueAtTime(0.10, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    ns.connect(nf).connect(ng).connect(ctx.destination);
    ns.start(t); ns.stop(t + 0.38);
  };

  // --- Power-up ding: bright ascending chime ---
  const playPowerUp = () => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    // Two quick ascending crystal pings
    [1047, 1319].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t + i * 0.06;
      g.gain.setValueAtTime(0.20, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(g).connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.14);
    });
    // Shimmer harmonic
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.value = 2637; // E7
    g3.gain.setValueAtTime(0.08, t + 0.10);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc3.connect(g3).connect(ctx.destination);
    osc3.start(t + 0.10); osc3.stop(t + 0.27);
  };

  // --- Boss spawn: epic dragon roar ---
  const playBossSpawn = () => {
    if (!soundEnabledRef.current) return;
    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    // Layer 1: Deep rumbling roar (low sawtooth sweep)
    const roar = ctx.createOscillator();
    const roarG = ctx.createGain();
    const roarF = ctx.createBiquadFilter();
    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(60, t);
    roar.frequency.linearRampToValueAtTime(120, t + 0.3);
    roar.frequency.linearRampToValueAtTime(45, t + 1.2);
    roarF.type = 'lowpass';
    roarF.frequency.setValueAtTime(300, t);
    roarF.frequency.linearRampToValueAtTime(600, t + 0.3);
    roarF.frequency.linearRampToValueAtTime(200, t + 1.2);
    roarF.Q.value = 2;
    roarG.gain.setValueAtTime(0.001, t);
    roarG.gain.linearRampToValueAtTime(0.25, t + 0.15);
    roarG.gain.setValueAtTime(0.25, t + 0.5);
    roarG.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    roar.connect(roarF).connect(roarG).connect(ctx.destination);
    roar.start(t); roar.stop(t + 1.5);

    // Layer 2: Distorted mid growl
    const growl = ctx.createOscillator();
    const growlG = ctx.createGain();
    const growlWS = ctx.createWaveShaper();
    growl.type = 'square';
    growl.frequency.setValueAtTime(90, t);
    growl.frequency.linearRampToValueAtTime(150, t + 0.25);
    growl.frequency.linearRampToValueAtTime(70, t + 1.0);
    // Simple distortion curve
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x));
    }
    growlWS.curve = curve;
    growlG.gain.setValueAtTime(0.001, t);
    growlG.gain.linearRampToValueAtTime(0.12, t + 0.1);
    growlG.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    growl.connect(growlWS).connect(growlG).connect(ctx.destination);
    growl.start(t); growl.stop(t + 1.3);

    // Layer 3: Noisy breath burst
    const nLen = Math.floor(ctx.sampleRate * 0.8);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1);
    const ns = ctx.createBufferSource();
    ns.buffer = nBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.setValueAtTime(400, t);
    nf.frequency.linearRampToValueAtTime(1200, t + 0.2);
    nf.frequency.linearRampToValueAtTime(300, t + 0.8);
    nf.Q.value = 1.5;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.001, t);
    ng.gain.linearRampToValueAtTime(0.15, t + 0.1);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    ns.connect(nf).connect(ng).connect(ctx.destination);
    ns.start(t); ns.stop(t + 1.0);

    // Layer 4: Dramatic low boom impact
    const boom = ctx.createOscillator();
    const boomG = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(80, t);
    boom.frequency.exponentialRampToValueAtTime(20, t + 0.6);
    boomG.gain.setValueAtTime(0.3, t);
    boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    boom.connect(boomG).connect(ctx.destination);
    boom.start(t); boom.stop(t + 0.75);
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
      
      // Load boss, wizard, castle and attack images
      const bossPromise = loadImage(`${baseUrl}data/images/Jefe.png`);
      const wizardPromise = loadImage(`${baseUrl}data/images/Mago.png`);
      const castlePromise = loadImage(`${baseUrl}data/images/castillo.png`);
      
      const attackPromises = [];
      for (let i = 1; i <= 5; i++) {
        attackPromises.push(loadImage(`${baseUrl}data/images/ataque_${i}.png`));
      }
      
      try {
        const [enemyImages, bossImg, wizardImg, castleImg, attackImages] = await Promise.all([
          Promise.all(enemyPromises),
          bossPromise,
          wizardPromise,
          castlePromise,
          Promise.all(attackPromises)
        ]);
        
        enemyImagesRef.current = enemyImages;
        bossImageRef.current = bossImg;
        wizardImageRef.current = wizardImg;
        castleImageRef.current = castleImg;
        attackImagesRef.current = attackImages;
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
      if (!selectedGrammar) {
        setAvailableTenses([]);
        return;
      }
      const tenses = await getAvailableTenses(selectedGrammar);
      setAvailableTenses(tenses);
      // Clear tense if it's no longer available for the new grammar mode
      if (selectedTense && !tenses.includes(selectedTense)) {
        setSelectedTense('');
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
    pointsStreakRef.current = 0;
    
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
      lastSpawnTimeRef.current = 0;
      setBossPreparationProgress(100);
      setScreenShake(false);
    }
    
    // Establecer mensaje inicial de Cobi Mago
    setCobiMagoMessage(seleccionarMensajeMagoRandom('juego'));
    
    setGameState('PLAYING');
    // Ambient music is started/stopped via useEffect on gameState
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
        const totalKills = killCountRef.current;
        if (totalKills <= 10) {
          baseSpawnRate = 3800; // Inicio muy tranquilo
        } else if (totalKills <= 25) {
          baseSpawnRate = 3000; // Ritmo medio-bajo
        } else {
          baseSpawnRate = 2500; // Final moderado
        }
      } else if (selectedDifficulty === 'intermedio') {
        // Progressive spawn rate based on total kills
        const totalKills = killCountRef.current;
        if (totalKills <= 10) {
          baseSpawnRate = 3500; // Inicio tranquilo
        } else if (totalKills <= 25) {
          baseSpawnRate = 2800; // Ritmo medio
        } else {
          baseSpawnRate = 2300; // Final intenso
        }
      } else {
        // Difícil: Progressive spawn rate
        const totalKills = killCountRef.current;
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
        const totalKills = killCountRef.current;
        if (totalKills <= 10) {
          baseSpawnRate = 3800; // Inicio muy tranquilo
        } else if (totalKills <= 25) {
          baseSpawnRate = 3000; // Ritmo medio-bajo
        } else {
          baseSpawnRate = 2500; // Final moderado
        }
      } else if (selectedDifficulty === 'intermedio') {
        const totalKills = killCountRef.current;
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
        const totalKills = killCountRef.current;
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
    // On mobile, multiply spawn rate by 2.25 to slow down enemy spawning
    const mobileSpawnFactor = isMobile ? 2.25 : 1;
    const adjustedSpawnRate = baseSpawnRate * mobileSpawnFactor;
    const spawnVariation = adjustedSpawnRate * 0.3;
    nextSpawnTimeRef.current = time + adjustedSpawnRate + (Math.random() * spawnVariation * 2 - spawnVariation);

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
        const monsterSize = Math.floor((canvasHeight - 40) * 0.15 * mobileSpriteFactor);
        
        // Apply timeMultiplier to speed (higher baseTime = slower, so inverse relationship)
        // Base speed 0.5, adjusted by baseTime ratio and difficulty multiplier
        const baseSpeed = 0.5 * (12 / enemy.baseTime) * crConfig.timeMultiplier * mobileSpeedCompensation;
        
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
          const streakBonus = Math.min(pointsStreakRef.current, 3) * 10;
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
          const streakBonus = Math.min(pointsStreakRef.current, 4) * 15;
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
          const streakBonus = Math.min(pointsStreakRef.current, 5) * 20;
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
        
        const monsterSize = Math.floor((canvasHeight - 40) * 0.15 * mobileSpriteFactor);
        
        // Calculate speed using same formula as contrarreloj for consistency
        const crConfig = CONTRARRELOJ_DIFFICULTY[selectedDifficulty];
        const baseSpeed = 0.5 * (12 / enemy.baseTime) * crConfig.timeMultiplier * mobileSpeedCompensation;
        
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
        lastSpawnTimeRef.current = time;
        return;
      }
    }
  };

  const updateEntities = () => {
    const dt = deltaTimeRef.current;
    monstersRef.current.forEach(m => { m.x -= m.speed * dt; });
    projectilesRef.current.forEach(p => { p.x += p.speed * dt; });
    
    // Move boss towards player if exists and not defeated
    if (bossRef.current && !bossRef.current.defeated) {
      bossRef.current.x -= bossRef.current.speed * dt;
      
      // Check if boss reached the castle
      if (bossRef.current.x <= 50) {
        setGameState('GAMEOVER');
      }
    }

    const now = performance.now();
    // Don't shoot during boss preparation phase
    if (now - lastShotRef.current > (isMobile ? 2250 : 1000) && !bossPreparationActive) { 
       // Projectile size: 75% on mobile for better proportions
       const projectileSize = isMobile ? Math.round(35 * 0.75) : 35;
       
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
          playBossHit(); // Play heavy boss hit sound
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
            playDamageReceived(); // Play pain sound when losing life
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
      
      // Update cloud position (frame-rate independent)
      cloud.x -= cloud.speed * deltaTimeRef.current;
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

    // Castle/wizard sizes for visibility (scaled on mobile)
    const castleSize = Math.floor((canvasHeight - groundHeight) * 0.35 * mobileSpriteFactor);
    const wizardSize = Math.floor((canvasHeight - groundHeight) * 0.15 * mobileSpriteFactor);
    
    // Draw castle using image
    const castleX = isMobile ? 30 : 60;
    const castleBaseY = groundY;
    
    // Draw castle shadow (elliptical, before castle)
    const castleShadowWidth = castleSize * 0.7;
    const castleShadowHeight = 12;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.filter = 'blur(8px)';
    ctx.beginPath();
    ctx.ellipse(
      castleX + castleSize / 2, 
      castleBaseY - 1, 
      castleShadowWidth, 
      castleShadowHeight, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
    
    // Draw castle image (bottom-aligned to ground)
    if (castleImageRef.current && castleImageRef.current.complete) {
      ctx.drawImage(castleImageRef.current, castleX, castleBaseY - castleSize, castleSize, castleSize);
    } else {
      // Fallback to emoji
      ctx.font = `${castleSize}px Arial`;
      ctx.fillText('🏰', castleX, groundY - 13);
    }
    
    // Calculate wizard position (same as before, relative to castle)
    const castleWidth = castleSize;
    heroRef.current.x = castleX + castleWidth - 60; // Wizard position relative to castle
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
      // Draw aura glow layers behind the wizard (canvas shadows follow silhouette)
      drawWizardAura(ctx, wizardImageRef.current, heroRef.current.x, heroRef.current.y, wizardSize, wizardSize, attackPowerRef.current);
      // Draw the main wizard on top
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

    // Draw projectiles using attack images based on attackPower level
    projectilesRef.current.forEach(p => {
        const power = attackPowerRef.current;
        let attackIdx = 0; // ataque_1 (green, 0-5)
        if (power >= 31) attackIdx = 4;       // ataque_5 (white)
        else if (power >= 21) attackIdx = 3;  // ataque_4 (purple)
        else if (power >= 13) attackIdx = 2;  // ataque_3 (orange)
        else if (power >= 6) attackIdx = 1;   // ataque_2 (blue)
        
        const attackImg = attackImagesRef.current[attackIdx];
        if (attackImg && attackImg.complete) {
          ctx.drawImage(attackImg, p.x, p.y, p.width, p.height);
        } else {
          // Fallback to emoji
          ctx.font = `${p.width}px Arial`;
          ctx.fillText(p.emoji, p.x, p.y + p.height * 0.8);
        }
    });
  };

  const gameLoop = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;
    if (!lastTimeRef.current) lastTimeRef.current = time;
    
    // Calculate deltaTime normalized to 120fps (8.33ms per frame)
    // At 120fps: dt ≈ 1.0 (no change), at 60fps: dt ≈ 2.0 (moves 2x per frame to compensate)
    const elapsed = time - lastTimeRef.current;
    deltaTimeRef.current = Math.min(elapsed / (1000 / 120), 3); // Cap at 3x to prevent teleporting
    lastTimeRef.current = time;
    
    // FPS counter update
    fpsFrameCountRef.current++;
    if (time - fpsLastSecondRef.current >= 1000) {
      fpsDisplayRef.current = fpsFrameCountRef.current;
      fpsFrameCountRef.current = 0;
      fpsLastSecondRef.current = time;
    }

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

            // Recovery for wave near-completion lock:
            // if prediction stopped spawns but real score is still below threshold and screen is clear,
            // resume spawns to avoid getting stuck between waves.
            if (
              selectedBattleMode === 'jefe' &&
              (selectedDifficulty === 'facil' || selectedDifficulty === 'intermedio' || selectedDifficulty === 'dificil') &&
              bossWaveNearCompletion &&
              !bossWaveCompleted &&
              !bossWaitingForCleanScreen &&
              monstersRef.current.length === 0
            ) {
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

              if (waveThreshold > 0 && score < waveThreshold) {
                setBossWaveNearCompletion(false);
                nextSpawnTimeRef.current = Math.min(nextSpawnTimeRef.current, time + 1000);
              }
            }
            
            // Fallback conditions for wave completion (facil, intermedio, and dificil)
            if (selectedBattleMode === 'jefe' && (selectedDifficulty === 'facil' || selectedDifficulty === 'intermedio' || selectedDifficulty === 'dificil') && !bossWaveCompleted && !bossWaitingForCleanScreen && bossWaveNearCompletion) {
              const currentTime = time;
              const timeSinceLastSpawn = currentTime - lastSpawnTimeRef.current;
              
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
  }, [gameState, score, attackPower, bossWaitingForCleanScreen, bossPreparationActive, waveCompletionMessageShown, bossWaveNearCompletion, bossWaveCompleted, selectedBattleMode, selectedDifficulty, bossCurrentWave]); 

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
        playPowerUp(); // Crystal chime for power increase
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
        playPowerUp(); // Crystal chime for power increase
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

    // --- MOBILE: Paginated Wizard Menu ---
    if (isMobile) {
      const canGoNext = mobileMenuPage < 6;
      const canGoBack = mobileMenuPage > 1;

      // Render mobile page content
      const renderMobilePage = () => {
        switch (mobileMenuPage) {
          case 1:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">1. Modo Gramatical</h3>
                <div className="flex flex-col gap-3">
                  {['indicativo', 'subjuntivo', 'imperativo'].map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGrammar(g)}
                      className={`w-full py-4 rounded-xl border-2 font-bold text-lg capitalize transition-all ${
                        selectedGrammar === g ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            );
          case 2:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">2. Tiempo Verbal</h3>
                {availableTenses.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '1fr', gap: '8px' }}>
                    {availableTenses.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTense(t)}
                        className={`py-3 px-2 rounded-xl border-2 font-bold transition-all flex items-center justify-center text-center ${
                          selectedTense === t ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{ fontSize: '0.8rem', hyphens: 'auto', wordBreak: 'break-word' } as React.CSSProperties}
                      >
                        {formatTenseName(t)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No hay tiempos disponibles para este modo.</p>
                )}
              </div>
            );
          case 3:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">3. Tipo de Verbos</h3>
                <div className="flex flex-col gap-3">
                  {['regular', 'irregular', 'mixed'].map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedVerbType(t)}
                      className={`w-full py-4 rounded-xl border-2 font-bold text-lg capitalize transition-all ${
                        selectedVerbType === t ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t === 'mixed' ? 'Todos' : t}
                    </button>
                  ))}
                </div>
              </div>
            );
          case 4:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">4. Modo de Batalla</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedBattleMode('contrarreloj')}
                    className={`p-5 rounded-xl border-2 text-center transition-all ${selectedBattleMode === 'contrarreloj' ? 'border-spanish-red bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="text-4xl mb-2">⏱️</div>
                    <span className="block font-bold text-sm text-deep-blue">Contrarreloj</span>
                  </button>
                  <button
                    onClick={() => setSelectedBattleMode('jefe')}
                    className={`p-5 rounded-xl border-2 text-center transition-all ${selectedBattleMode === 'jefe' ? 'border-spanish-red bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="text-4xl mb-2">🐉</div>
                    <span className="block font-bold text-sm text-deep-blue">Modo Jefe</span>
                  </button>
                </div>
              </div>
            );
          case 5:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">5. Modo de Respuesta</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setSelectedMode('write')}
                    className={`w-full py-4 rounded-xl border-2 text-center transition-all font-bold text-lg ${selectedMode === 'write' ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    ✍️ Escribir
                  </button>
                  <button
                    onClick={() => setSelectedMode('choice')}
                    className={`w-full py-4 rounded-xl border-2 text-center transition-all font-bold text-lg ${selectedMode === 'choice' ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    🎯 Selección
                  </button>
                </div>
              </div>
            );
          case 6:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">6. Dificultad</h3>
                <div className="flex flex-col gap-3">
                  {(Object.keys(DIFFICULTY_SETTINGS) as GameDifficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setSelectedDifficulty(d)}
                      className={`w-full py-4 rounded-xl border-2 font-bold text-lg capitalize transition-all ${
                        selectedDifficulty === d ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {DIFFICULTY_SETTINGS[d].label}
                    </button>
                  ))}
                </div>
              </div>
            );
          default:
            return null;
        }
      };

      return (
        <div className="h-[100dvh] bg-deep-blue p-3 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {/* Header */}
          <div className="bg-white rounded-3xl px-5 py-4 shadow-2xl flex flex-col" style={{ height: 'auto', maxHeight: 'calc(100dvh - 120px)', flex: '0 1 auto' }}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-lg font-black text-deep-blue flex-1 text-center">Configura tu Batalla</h1>
              <div className="w-8"></div>
            </div>

            {/* Page indicator dots */}
            <div className="flex justify-center gap-2 my-2">
              {[1, 2, 3, 4, 5, 6].map(p => (
                <div
                  key={p}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    p === mobileMenuPage ? 'bg-spanish-red w-6' : p < mobileMenuPage ? 'bg-deep-blue' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Page content */}
            <div className="flex-1 flex flex-col justify-center py-2 min-h-0 overflow-y-auto" style={{ flexShrink: 1 }}>
              {renderMobilePage()}
            </div>

            {/* Navigation arrows & start button */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-shrink-0">
              {canGoBack ? (
                <button
                  onClick={() => setMobileMenuPage(p => p - 1)}
                  className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95 text-gray-600"
                >
                  <ChevronLeft size={22} />
                </button>
              ) : (
                <div className="w-11" />
              )}

              {mobileMenuPage === 6 ? (
                <button
                  onClick={handleStartGame}
                  disabled={!selectedGrammar || !selectedTense || !selectedVerbType || !selectedBattleMode || !selectedMode || !selectedDifficulty}
                  className="flex-1 mx-3 py-3 bg-gradient-to-r from-spanish-red to-spanish-red hover:from-red-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-lg rounded-xl transition-all shadow-lg"
                >
                  Iniciar Batalla
                </button>
              ) : (
                <div className="flex-1" />
              )}

              {canGoNext ? (
                <button
                  onClick={() => setMobileMenuPage(p => p + 1)}
                  className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95 text-gray-600"
                >
                  <ChevronRight size={22} />
                </button>
              ) : (
                <div className="w-11" />
              )}
            </div>
          </div>

          {/* Botón Cobi móvil */}
          <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔮" themeColor="#7C3AED" cobiVisible={cobiVisible} useWhiteBg />

          {/* Chat Window del Menú (mobile) */}
          {showChatWindow && gameState === 'SELECTION' && (
            <div className={`fixed bottom-24 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🪄</span>
                  <div>
                    <h3 className="text-white font-bold text-sm">Cobi Mago</h3>
                    <p className="text-xs text-purple-50">Experto en Gramática Española</p>
                  </div>
                </div>
                <button onClick={() => setShowChatWindow(false)} className="p-1 hover:bg-white/20 rounded-full transition">
                  <ChevronLeft size={20} className="text-white" />
                </button>
              </div>
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/30 to-white">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    <p className="mb-2">🪄</p>
                    <p>¡Bienvenido a mi estudio mágico! Soy Cobi Mago.</p>
                    <p className="text-xs mt-2">Pregúntame sobre gramática o el juego. ✨</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white border-2 border-purple-200 text-gray-700'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoadingResponse && (
                  <div className="flex justify-start">
                    <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-3">
                      <p className="text-sm text-gray-600">El Mago consulta su grimorio... 📖✨</p>
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

    // --- DESKTOP: Original full menu (unchanged) ---
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
              disabled={!selectedGrammar || !selectedTense || !selectedVerbType || !selectedBattleMode || !selectedMode || !selectedDifficulty}
              className="w-full py-4 bg-gradient-to-r from-spanish-red to-spanish-red hover:from-red-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-xl rounded-xl transition-all shadow-lg"
            >
              Iniciar Batalla
            </button>
          </div>
        </div>

        {/* Cobi Mago Menú (solo desktop) */}
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-mago-menu">
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

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔮" themeColor="#7C3AED" cobiVisible={cobiVisible} useWhiteBg />

        {/* Chat Window del Menú */}
        {showChatWindow && gameState === 'SELECTION' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
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
      <div className={`bg-deep-blue flex flex-col items-center justify-start ${isMobile && isLandscape ? 'min-h-screen p-1 pt-1' : isMobile ? 'min-h-screen p-4 pt-8' : 'h-[calc(100vh-5rem)] p-[15px] overflow-hidden'}`}>
        <div className={`w-full max-w-4xl ${!isMobile ? 'flex flex-col h-full' : ''} ${screenShake ? 'animate-[screenShake_0.5s_ease-in-out]' : ''}`}>
          {/* Header - minimal on mobile landscape */}
          <div className={`flex justify-between items-center text-white flex-shrink-0 ${isMobile && isLandscape ? 'mb-1 px-2' : isMobile ? 'mb-4' : 'mb-[15px]'}`}>
            <button onClick={() => setGameState('SELECTION')} className="p-1 md:p-2 hover:bg-white/10 rounded-full">
              <ChevronLeft size={isMobile && isLandscape ? 20 : 32} />
            </button>
            <div className="text-center flex-1">
              <p className={`opacity-70 ${isMobile && isLandscape ? 'text-[10px] leading-tight' : 'text-sm'}`}>Puntos</p>
              <p className={`font-black ${isMobile && isLandscape ? 'text-lg' : 'text-4xl'}`}>{score}</p>
            </div>
            <div className="text-center flex-1">
              <p className={`opacity-70 ${isMobile && isLandscape ? 'text-[10px] leading-tight' : 'text-sm'}`}>Poder</p>
              <p className={`font-black ${isMobile && isLandscape ? 'text-lg' : 'text-4xl'}`}>{attackPower}x</p>
            </div>
            <div className="text-center flex-1">
              <p className={`opacity-70 ${isMobile && isLandscape ? 'text-[10px] leading-tight' : 'text-sm'}`}>Vidas</p>
              <p className={`font-black text-red-400 ${isMobile && isLandscape ? 'text-lg' : 'text-4xl'}`}>{lives}</p>
            </div>
            <button onClick={() => setGameState('PAUSED')} className="p-1 md:p-2 hover:bg-white/10 rounded-full">
              <Pause size={isMobile && isLandscape ? 20 : 32} />
            </button>
            <button onClick={() => setInstructionsOpen(true)} className="p-1 md:p-2 hover:bg-white/10 rounded-full">
              <Info size={isMobile && isLandscape ? 20 : 32} />
            </button>
          </div>

          {/* Canvas with Boss Preparation Overlay */}
          <div className={`relative bg-white shadow-2xl ${isMobile && isLandscape ? 'rounded-xl mb-2' : isMobile ? 'rounded-2xl mb-6' : 'rounded-2xl mb-[15px]'}`}>
            <canvas
              ref={canvasRef}
              width={canvasDims.w}
              height={canvasDims.h}
              className={`w-full ${isMobile && isLandscape ? 'rounded-xl' : 'rounded-2xl'}`}
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
                        className="bg-gradient-to-r from-orange-500 to-red-600 h-full flex items-center justify-center rounded-full"
                        style={{ width: `${bossPreparationProgress}%` }}
                      >
                        <span className="text-white font-black text-sm drop-shadow-lg">
                          {bossPreparationTimeRemaining}s
                        </span>
                      </div>
                      
                      {/* Icon - moves with progress */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2"
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
            
            {/* Wizard aura is now drawn directly on canvas via drawWizardAura() */}
            
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
          {isMobile && selectedMode === 'write' ? (
            /* Mobile Write Mode: no white container, verb+pronoun in white, virtual keyboard */
            <div>
              {currentVerb ? (
                <div>
                  <h2 className="text-center font-bold text-white text-xl mb-3" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    {currentVerb.verb}, {currentVerb.pronoun}
                  </h2>
                  {/* Mobile input bar */}
                  <div className="px-2 mb-3">
                    <input
                      type="text"
                      value={userInput}
                      readOnly
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-lg text-center bg-white"
                    />
                  </div>
                  {/* Virtual Keyboard - WhatsApp style */}
                  <PovMobileKeyboard
                    onKeyPress={(key: string) => setUserInput(prev => prev + key)}
                    onDelete={() => setUserInput(prev => prev.slice(0, -1))}
                    onSubmit={() => handleAnswer(userInput)}
                  />
                  <div className="mt-2 h-8 flex items-center justify-center">
                    {feedbackMsg.text && (
                      <p className={`text-lg font-bold ${feedbackMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                        {feedbackMsg.text}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-white">Cargando...</p>
              )}
            </div>
          ) : (
          <div className={`bg-white shadow-2xl flex-shrink-0 ${isMobile && isLandscape ? 'rounded-xl p-3' : isMobile ? 'rounded-2xl p-8' : 'rounded-2xl py-3 px-6'}`}>
            {currentVerb ? (
              <div>
                {/* Nuevo layout: verbo,pronombre a la izquierda, tiempo verbal en rectángulo azul a la derecha */}
                <div className={`flex justify-between items-center ${isMobile && isLandscape ? 'mb-2' : isMobile ? 'mb-6' : 'mb-2'}`}>
                  <h2 className={`font-bold text-deep-blue ${isMobile && isLandscape ? 'text-base' : isMobile ? 'text-2xl' : 'text-lg'}`}>
                    {currentVerb.verb}, {currentVerb.pronoun}
                  </h2>
                  <div className={`bg-deep-blue text-white rounded-lg font-bold ${isMobile && isLandscape ? 'px-3 py-1 text-xs' : isMobile ? 'px-6 py-2' : 'px-4 py-1 text-sm'}`}>
                    {currentVerb.tense}
                  </div>
                </div>

                {selectedMode === 'write' ? (
                  <div className={isMobile ? 'space-y-4' : 'flex gap-2'}>
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
                      className={`px-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-deep-blue ${isMobile ? 'w-full py-3 text-lg' : 'flex-1 py-1.5 text-sm'}`}
                    />
                    <button
                      onClick={() => handleAnswer(userInput)}
                      className={`bg-deep-blue hover:bg-blue-900 text-white font-bold rounded-lg transition-colors ${isMobile ? 'w-full py-3' : 'px-6 py-1.5 text-sm'}`}
                    >
                      Verificar Respuesta
                    </button>
                  </div>
                ) : (
                  <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'gap-2'}`}>
                    {choiceOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(option)}
                        className={`bg-gray-100 hover:bg-deep-blue hover:text-white font-bold rounded-lg transition-colors ${isMobile ? 'p-4 text-lg' : 'p-2 text-sm'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {isMobile && (
                  <div className="mt-4 h-8 flex items-center justify-center">
                    {feedbackMsg.text && (
                      <p className={`text-lg font-bold ${feedbackMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {feedbackMsg.text}
                      </p>
                    )}
                  </div>
                )}
                {!isMobile && (
                  <p className="mt-1 text-[10px] text-gray-400 text-center leading-tight">Usa las teclas 1-5 para vocales con tilde (á é í ó ú)</p>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500">Cargando...</p>
            )}
          </div>
          )}
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
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-mago-container">
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

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔮" themeColor="#7C3AED" cobiVisible={cobiVisible} useWhiteBg />

        {/* Chat Window del Juego */}
        {showChatWindow && gameState === 'PLAYING' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
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
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-mago-pausa">
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

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔮" themeColor="#7C3AED" cobiVisible={cobiVisible} useWhiteBg />

        {/* Chat Window de Pausa */}
        {showChatWindow && gameState === 'PAUSED' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
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
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-mago-derrota">
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

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔮" themeColor="#7C3AED" cobiVisible={cobiVisible} useWhiteBg />

        {/* Chat Window de Derrota */}
        {showChatWindow && gameState === 'GAMEOVER' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
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
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`} key="cobi-mago-victoria">
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

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🔮" themeColor="#7C3AED" cobiVisible={cobiVisible} useWhiteBg />

        {/* Chat Window de Victoria */}
        {showChatWindow && gameState === 'VICTORY' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
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
