import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Send, Delete } from 'lucide-react';
import { hablarConPanda } from '../services/geminiService';
import DraggableCobi from './DraggableCobi';
import { useI18n } from '../services/i18n';
import {
  loadVerbData,
  getFilteredVerbsSRS,
  recordVerbCorrect,
  recordVerbIncorrect,
  generateChallenge,
  validateAnswer,
  calculateScore,
  getSpawnRate,
  VerbLevel,
  VerbType,
  VerbMode,
  BubbleChallenge,
  VerbData
} from '../services/verbMasterService';

interface VerbMasterGameProps {
  onBack: () => void;
  cobiVisible?: boolean;
  soundEnabled?: boolean;
}

// Utility to pick a random element from an array
const selectRandom = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)] || '';

type GameState = 'LEVEL_SELECT' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_TRANSITION' | 'VICTORY';

// Level progression configuration (11 levels, level 11 is victory)
// fallDuration = real seconds for a bubble to cross the full canvas (top to ground)
// FPS in calculateFallSpeed is 120 to match the dt normalization base
const LEVEL_SETTINGS = [
  { level: 1, fallDuration: 30.0, pointsRequired: 0 },      // Starting level - Very slow (22 px/s)
  { level: 2, fallDuration: 28.75, pointsRequired: 100 },   // +100 = 100 total (23 px/s)
  { level: 3, fallDuration: 27.5, pointsRequired: 300 },    // +200 = 300 total (24 px/s)
  { level: 4, fallDuration: 25.0, pointsRequired: 600 },    // +300 = 600 total (26.4 px/s)
  { level: 5, fallDuration: 23.75, pointsRequired: 1000 },  // +400 = 1000 total (27.8 px/s)
  { level: 6, fallDuration: 21.25, pointsRequired: 1500 },  // +500 = 1500 total (31.1 px/s)
  { level: 7, fallDuration: 20.0, pointsRequired: 2100 },   // +600 = 2100 total (33 px/s)
  { level: 8, fallDuration: 18.75, pointsRequired: 2800 },  // +700 = 2800 total (35.2 px/s)
  { level: 9, fallDuration: 17.5, pointsRequired: 3600 },   // +800 = 3600 total (37.7 px/s)
  { level: 10, fallDuration: 15.0, pointsRequired: 4500 },  // +900 = 4500 total (44 px/s)
  { level: 11, fallDuration: 15.0, pointsRequired: 6000 }   // +1500 = 6000 total (VICTORY)
];

// Background colors for each level
const LEVEL_COLORS = [
  '#E0F2F1', // Level 1 - Teal
  '#E1F5FE', // Level 2 - Light Blue
  '#F3E5F5', // Level 3 - Purple
  '#FFF9C4', // Level 4 - Yellow
  '#FFE0B2', // Level 5 - Orange
  '#FFCCBC', // Level 6 - Deep Orange
  '#F8BBD0', // Level 7 - Pink
  '#D1C4E9', // Level 8 - Deep Purple
  '#FFAB91', // Level 9 - Deep Orange
  '#CFD8DC', // Level 10 - Blue Grey
  '#C5E1A5'  // Level 11 - Light Green (Victory)
];

const MAX_LEVEL = 10; // Max playable level (level 11 triggers victory)

interface Bubble {
  id: string;
  challenge: BubbleChallenge;
  x: number;
  y: number;
  radius: number;
  speed: number;
  birthTime: number; // Time when bubble was created, for wobble animation
  isPopping: boolean; // Is the bubble currently popping (correct answer)?
  popStartTime: number; // When the pop animation started
  isSplatting: boolean; // Is the bubble splatting on ground?
  splatStartTime: number; // When the splat animation started
  isShrinking: boolean; // Is shrinking during level transition?
  shrinkStartTime: number; // When shrink animation started
}

// ── WhatsApp-style Mobile Keyboard with pop-up effect ─────────────────────
const VM_ROWS = [
  ['á', 'é', 'í', 'ó', 'ú'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['SEND', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

interface VmMobileKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
}

const VmMobileKeyboard: React.FC<VmMobileKeyboardProps> = ({ onKeyPress, onDelete, onSubmit }) => {
  const [popupKey, setPopupKey] = useState<{ char: string; rect: DOMRect } | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((char: string, e: React.TouchEvent<HTMLButtonElement>) => {
    if (char === 'SEND' || char === 'DEL') return;
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setPopupKey({ char: char.toLowerCase() === char ? char : char, rect });
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Clear immediately
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setPopupKey(null);
  }, []);

  const handleKeyAction = useCallback((key: string) => {
    if (key === 'SEND') {
      onSubmit();
    } else if (key === 'DEL') {
      onDelete();
    } else {
      // Accented vowels stay lowercase, letters go lowercase
      const isAccent = ['á', 'é', 'í', 'ó', 'ú'].includes(key);
      onKeyPress(isAccent ? key : key.toLowerCase());
    }
  }, [onKeyPress, onDelete, onSubmit]);

  return (
    <div className="md:hidden" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', padding: '0 3px 6px 3px', position: 'relative' }}>
      {/* Pop-up preview */}
      {popupKey && (
        <div
          style={{
            position: 'fixed',
            left: popupKey.rect.left + popupKey.rect.width / 2 - 24,
            top: popupKey.rect.top - 52,
            width: 48,
            height: 48,
            backgroundColor: '#fff',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: '#003D5B',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {popupKey.char}
        </div>
      )}

      {VM_ROWS.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            marginBottom: rowIdx < VM_ROWS.length - 1 ? '10px' : 0,
            padding: '0 3px',
          }}
        >
          {row.map((key) => {
            const isSend = key === 'SEND';
            const isDel = key === 'DEL';
            const isAccent = ['á', 'é', 'í', 'ó', 'ú'].includes(key);
            const isSpecial = isSend || isDel;

            let bg = '#fff';
            let color = '#1a1a1a';
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
                  flex: isSpecial ? 1.5 : 1,
                  height: 46,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: bg,
                  color,
                  fontWeight: 700,
                  fontSize: isSpecial ? 14 : 16,
                  boxShadow: `0 3px 0 rgba(0,0,0,${isSpecial ? 0.2 : 0.15})`,
                  border: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none',
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

const VerbMasterGame: React.FC<VerbMasterGameProps> = ({ onBack, cobiVisible = true, soundEnabled = true }) => {
  const { tArray, lang } = useI18n();

  // Helper to pick a random Cobi Sensei message by type
  const senseiMsg = useCallback((tipo: 'juego' | 'victoria' | 'fallo' | 'pausa' | 'acierto' | 'menu'): string => {
    const keyMap: Record<string, string> = {
      juego: 'cobi.verbMaster.game',
      victoria: 'cobi.verbMaster.victory',
      fallo: 'cobi.verbMaster.miss',
      pausa: 'cobi.verbMaster.pause',
      acierto: 'cobi.verbMaster.hit',
      menu: 'cobi.verbMaster.menu',
    };
    return selectRandom(tArray(keyMap[tipo]));
  }, [tArray]);

  // Game configuration
  const [selectedVerbMode, setSelectedVerbMode] = useState<VerbMode | null>(null);
  const [selectedVerbType, setSelectedVerbType] = useState<VerbType | null>(null);
  const [selectedTense, setSelectedTense] = useState<string | null>(null);
  const [selectedLevel] = useState<VerbLevel>('A1');
  
  // Cobi Sensei State
  const [cobiSenseiMenuMessage, setCobiSenseiMenuMessage] = useState<string>('');
  const [cobiSenseiMessage, setCobiSenseiMessage] = useState<string>('');
  const [cobiSenseiPausaMessage, setCobiSenseiPausaMessage] = useState<string>('');

  // Update Cobi messages when language changes
  useEffect(() => {
    setCobiSenseiMenuMessage(senseiMsg('menu'));
    setCobiSenseiMessage(senseiMsg('juego'));
    setCobiSenseiPausaMessage(senseiMsg('pausa'));
  }, [lang, senseiMsg]);
  const [cobiSenseiAvatar, setCobiSenseiAvatar] = useState<string>('./data/images/cobi-sensei.webp');
  
  // Chat State
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'cobi', text: string}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  
  // Send message to Cobi Sensei
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

      // Si estamos en LEVEL_SELECT, contexto de lobby
      if (gameState === 'LEVEL_SELECT') {
        contextoJuego = {
          juego: 'Maestro de Verbos',
          estado: 'menu',
          modo_verbal_seleccionado: selectedVerbMode || 'ninguno',
          tiempo_seleccionado: selectedTense || 'ninguno',
          tipo_verbos: selectedVerbType || 'ninguno',
          modo_juego: 'conjugate'
        };
        tipo = 'lobby';
      } else {
        // Si estamos jugando, contexto de juego
        contextoJuego = {
          juego: 'Maestro de Verbos',
          nivel: gameLevel,
          modo_verbal: selectedVerbMode,
          tiempo_verbal: selectedTense,
          tipo_verbos: selectedVerbType,
          modo_juego: 'conjugate',
          puntuacion: score,
          racha: streak,
          vidas: lives
        };
        tipo = 'juego';
      }

      // Call Cobi AI with appropriate context
      const response = await hablarConPanda(
        userMessage,
        'Maestro de Verbos - Instructor Zen de Artes Marciales',
        contextoJuego,
        tipo
      );

      // Add Cobi response to history
      setChatHistory(prev => [...prev, { role: 'cobi', text: response }]);
    } catch (error) {
      console.error('Error al comunicarse con Cobi Sensei:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'cobi', text: '🥋 ¡Ups! Mi mente se distrajo un momento. ¿Puedes repetir eso, joven aprendiz? 🐾' }
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };
  
  // Update tense when verb mode changes
  const handleVerbModeChange = (mode: VerbMode) => {
    setSelectedVerbMode(mode);
    setSelectedTense(null);
    setSelectedVerbType(null);
  };
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('LEVEL_SELECT');
  const [score, setScore] = useState(0);
  const [gameLevel, setGameLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(5);
  
  // Level transition state
  const [showLevelTitle, setShowLevelTitle] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState(LEVEL_COLORS[0]);
  
  // Input state
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [inputFeedback, setInputFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Game data
  const [verbPool, setVerbPool] = useState<VerbData[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // SRS: Helper to find original VerbData from pool by challenge
  const findVerbFromChallenge = useRef((_challenge: BubbleChallenge): VerbData | null => {
    return null; // Will be updated when verbPool changes
  });
  
  // Update the lookup function when verbPool changes
  useEffect(() => {
    findVerbFromChallenge.current = (challenge: BubbleChallenge): VerbData | null => {
      return verbPool.find(v => 
        v.verb === challenge.verb && v.pronoun === challenge.pronoun
      ) || null;
    };
  }, [verbPool]);

  // Mobile detection for progressive revelation
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuPage, setMobileMenuPage] = useState(1);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent page scroll on desktop while playing
  useEffect(() => {
    if (gameState === 'PLAYING' && !isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [gameState, isMobile]);
  
  // --- Dynamic canvas dimensions ---
  // Base reference: 800×600.  On desktop, ResizeObserver sets real pixel size.
  const BASE_W = 800;
  const BASE_H = 600;
  const [canvasWidth, setCanvasWidth] = useState(BASE_W);
  const [canvasHeight, setCanvasHeight] = useState(BASE_H);

  // Scale factor: how the current canvas relates to the 800-wide reference
  const canvasScale = canvasWidth / BASE_W;

  // Ground strip: always proportional, pinned to bottom
  const groundY = isMobile
    ? canvasHeight - Math.round(50 * canvasScale)
    : canvasHeight - Math.round(25 * canvasScale);

  // ResizeObserver: on desktop, sync canvas logical size to the container's CSS size
  useEffect(() => {
    if (isMobile) {
      // Mobile keeps fixed 800×600
      setCanvasWidth(BASE_W);
      setCanvasHeight(BASE_H);
      return;
    }
    const container = canvasContainerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w > 0 && h > 0) {
        setCanvasWidth(w);
        setCanvasHeight(h);
      }
    };

    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    updateSize(); // initial measurement
    return () => ro.disconnect();
  }, [isMobile]);

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
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  };

  const playBubblePop = () => {
    // Bubble pop sound: quick ascending chirp
    playTone(400, 0.08, 'sine');
    setTimeout(() => playTone(600, 0.08, 'sine'), 40);
    setTimeout(() => playTone(800, 0.1, 'sine'), 80);
  };

  const playGroundHit = () => {
    // Error sound: descending buzz
    playTone(200, 0.15, 'sawtooth');
    setTimeout(() => playTone(150, 0.15, 'square'), 50);
  };

  const playLevelUp = () => {
    // Level up: triumphant ascending sequence
    playTone(523, 0.15, 'triangle'); // C
    setTimeout(() => playTone(659, 0.15, 'triangle'), 150); // E
    setTimeout(() => playTone(784, 0.25, 'sine'), 300); // G
    setTimeout(() => playTone(1047, 0.3, 'sine'), 450); // C (octave higher)
  };

  const playCountdown = () => {
    // Countdown beep: short high beep
    playTone(800, 0.12, 'square');
  };

  // Mobile bubble scale factor: 1.5x bigger on mobile
  const mobileBubbleFactor = isMobile ? 1.5 : 1;

  // Calculate fall speed based on level settings and canvas dimensions
  const calculateFallSpeed = (level: number): number => {
    // Clamp level between 1 and MAX_LEVEL
    const clampedLevel = Math.max(1, Math.min(level, MAX_LEVEL));
    const levelConfig = LEVEL_SETTINGS[clampedLevel - 1];
    
    // Distance bubble needs to travel (from top to ground)
    const fallDistance = canvasHeight + Math.round(60 * canvasScale); // Extra padding for radius (scaled)
    
    // 120 FPS matches the dt normalization base (see game loop: dt = elapsed / (1000/120))
    // Firefox runs at 120fps (dt≈1.0), Chrome/Edge/Safari at 60fps (dt≈2.0)
    // The dt multiplier ensures identical real-world speed across all browsers
    const FPS = 120;
    const adjustedFallDuration = levelConfig.fallDuration * mobileBubbleFactor;
    const totalFrames = adjustedFallDuration * FPS;
    const speed = fallDistance / totalFrames;
    
    return speed;
  };

  // Load verb data on mount
  useEffect(() => {
    loadVerbData();
  }, []);

  // Auto-focus desktop input when game enters PLAYING state
  useEffect(() => {
    if (gameState === 'PLAYING') {
      setTimeout(() => desktopInputRef.current?.focus(), 100);
    }
  }, [gameState]);

  // Auto-pause when player switches tabs/windows
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'PLAYING') {
        setGameState('PAUSED');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState]);

  // Start game
  const handleStartGame = async () => {
    if (!selectedVerbType || !selectedTense || !selectedVerbMode) return;
    
    // Use SRS-based pool for intelligent conjugation selection
    const verbs = await getFilteredVerbsSRS(selectedLevel, selectedVerbType, selectedTense, selectedVerbMode);
    if (verbs.length === 0) {
      alert('No hay verbos disponibles para esta configuración');
      return;
    }
    
    setVerbPool(verbs);
    setScore(0);
    setGameLevel(1);
    setStreak(0);
    setLives(5);
    setBackgroundColor(LEVEL_COLORS[0]);
    bubblesRef.current = [];
    
    // Resetear avatar al estado normal del juego
    setCobiSenseiAvatar('./data/images/cobi-sensei.webp');
    setCobiSenseiMessage(senseiMsg('juego'));
    
    setGameState('PLAYING');
  };

  // Start level transition sequence
  const startLevelTransition = (newLevel: number) => {
    // Play level up sound
    playLevelUp();
    
    // 1. Mark all bubbles for shrinking
    const currentTime = performance.now();
    bubblesRef.current.forEach(bubble => {
      bubble.isShrinking = true;
      bubble.shrinkStartTime = currentTime;
    });
    
    // 2. Update game level and background color immediately
    setGameLevel(newLevel);
    setBackgroundColor(LEVEL_COLORS[newLevel - 1]);
    
    // Cambiar a Cobi Sensei de acierto (celebración)
    setCobiSenseiAvatar('./data/images/cobi-sensei-acierto.webp');
    setCobiSenseiMessage(senseiMsg('acierto'));
    
    // 3. Show level title after 500ms (shrink duration)
    setTimeout(() => {
      setShowLevelTitle(true);
      
      // 4. Hide title and start countdown after 2 seconds
      setTimeout(() => {
        setShowLevelTitle(false);
        setCountdown(3);
        playCountdown(); // First countdown beep
        
        // Countdown sequence
        let currentCount = 3;
        const countdownInterval = setInterval(() => {
          currentCount--;
          if (currentCount > 0) {
            setCountdown(currentCount);
            playCountdown(); // Beep for each count
          } else {
            clearInterval(countdownInterval);
            setCountdown(0);
            // Volver a Cobi Sensei normal cuando comienza el siguiente nivel
            setCobiSenseiAvatar('./data/images/cobi-sensei.webp');
            setCobiSenseiMessage(senseiMsg('juego'));
          }
        }, 1000);
      }, 2000);
    }, 500);
  };

  // Spawn new bubble
  const spawnBubble = (verbs: VerbData[], currentTime: number) => {
    const spawnRate = getSpawnRate(gameLevel);
    
    // Limit max bubbles on screen based on level
    // Levels 1-3: max 2 bubbles
    // Levels 4-6: max 3 bubbles
    // Levels 7-8: max 4 bubbles
    // Levels 9-10: max 5 bubbles
    const maxBubbles = gameLevel <= 3 ? 2 : gameLevel <= 6 ? 3 : gameLevel <= 8 ? 4 : 5;
    const currentBubbleCount = bubblesRef.current.filter(b => !b.isShrinking && !b.isPopping && !b.isSplatting).length;
    
    if (currentBubbleCount >= maxBubbles) return;
    
    if (currentTime - lastSpawnRef.current > spawnRate && verbs.length > 0) {
      const challenge = generateChallenge(verbs, 'conjugate');
      if (!challenge) return;
      
      const radius = (40 + Math.random() * 20) * canvasScale * mobileBubbleFactor;
      
      // Try to find a position that doesn't overlap with existing bubbles
      let x = 0;
      let attempts = 0;
      let validPosition = false;
      const maxAttempts = 20;
      const minDistance = radius * 2.5; // Minimum distance between bubble centers
      
      while (!validPosition && attempts < maxAttempts) {
        x = radius + Math.random() * (canvasWidth - radius * 2);
        validPosition = true;
        
        // Check distance from all existing bubbles
        for (const bubble of bubblesRef.current) {
          if (bubble.isShrinking || bubble.isPopping || bubble.isSplatting) continue;
          
          const dx = x - bubble.x;
          
          // If too close horizontally and existing bubble is near top, reject position
          if (Math.abs(dx) < minDistance && bubble.y < 150 * canvasScale) {
            validPosition = false;
            break;
          }
        }
        
        attempts++;
      }
      
      // If no valid position found after max attempts, don't spawn
      if (!validPosition) return;
      
      bubblesRef.current.push({
        id: challenge.id,
        challenge,
        x,
        y: -radius,
        radius,
        speed: calculateFallSpeed(gameLevel),
        birthTime: currentTime, // Store creation time for wobble animation
        isPopping: false,
        popStartTime: 0,
        isSplatting: false,
        splatStartTime: 0,
        isShrinking: false,
        shrinkStartTime: 0
      });
      
      lastSpawnRef.current = currentTime;
    }
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      // Compute deltaTime normalized to 120fps
      // Firefox runs at 120fps (dt≈1.0), Chrome/Edge/Safari run at 60fps (dt≈2.0)
      // This ensures bubbles fall at the same speed across all browsers
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const elapsed = currentTime - lastTimeRef.current;
      const dt = Math.min(elapsed / (1000 / 120), 3);
      lastTimeRef.current = currentTime;

      // Clear canvas with current level background color
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw ground
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(0, groundY, canvasWidth, canvasHeight - groundY);
      
      // Spawn bubbles (only if not in transition)
      if (!showLevelTitle && countdown === 0) {
        spawnBubble(verbPool, currentTime);
      }
      
      // Update and draw bubbles
      bubblesRef.current = bubblesRef.current.filter(bubble => {
        // Check if bubble is shrinking (level transition animation)
        if (bubble.isShrinking) {
          const SHRINK_DURATION = 500; // 500ms shrink animation
          const shrinkAge = currentTime - bubble.shrinkStartTime;
          const shrinkProgress = Math.min(shrinkAge / SHRINK_DURATION, 1);
          
          // If animation finished, remove bubble
          if (shrinkProgress >= 1) {
            return false;
          }
          
          // SHRINK ANIMATION: Scale down and fade out
          ctx.save();
          
          const scale = 1 - shrinkProgress; // Scale from 1 to 0
          const opacity = 1 - shrinkProgress; // Fade from 1 to 0
          
          ctx.globalAlpha = opacity;
          ctx.translate(bubble.x, bubble.y);
          ctx.scale(scale, scale);
          ctx.translate(-bubble.x, -bubble.y);
          
          // Draw simplified bubble
          const shrinkGradient = ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, bubble.radius
          );
          shrinkGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
          shrinkGradient.addColorStop(1, 'rgba(200, 230, 255, 0.25)');
          
          ctx.fillStyle = shrinkGradient;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
          return true; // Keep bubble in array until animation completes
        }
        
        // Check if bubble is popping (correct answer animation)
        if (bubble.isPopping) {
          const POP_DURATION = 250; // 250ms for explosive pop animation
          const popAge = currentTime - bubble.popStartTime;
          const popProgress = Math.min(popAge / POP_DURATION, 1);
          
          // If animation finished, remove bubble
          if (popProgress >= 1) {
            return false;
          }
          
          // POP ANIMATION: Explosive expansion with fade out
          ctx.save();
          
          // Phase 1 (0% - 40%): Rapid expansion (tension breaking)
          // Phase 2 (40% - 100%): Continue expanding while fading out
          let scale, opacity;
          
          if (popProgress < 0.4) {
            // Rapid expansion phase (0 to 0.4 = first 100ms)
            const phase1Progress = popProgress / 0.4;
            scale = 1 + (phase1Progress * 0.25); // Scale from 1.0 to 1.25
            opacity = 1; // Full opacity during expansion
          } else {
            // Fade out phase (0.4 to 1.0 = last 150ms)
            const phase2Progress = (popProgress - 0.4) / 0.6;
            scale = 1.25 + (phase2Progress * 0.15); // Continue to 1.4
            opacity = 1 - Math.pow(phase2Progress, 2); // Quadratic fade out
          }
          
          // Apply transformation
          ctx.globalAlpha = opacity;
          ctx.translate(bubble.x, bubble.y);
          ctx.scale(scale, scale);
          ctx.translate(-bubble.x, -bubble.y);
          
          // Draw simplified bubble (no wobble during pop)
          const popGradient = ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, bubble.radius
          );
          popGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
          popGradient.addColorStop(0.5, 'rgba(220, 240, 255, 0.15)');
          popGradient.addColorStop(1, 'rgba(200, 230, 255, 0.25)');
          
          ctx.fillStyle = popGradient;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw border
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * opacity})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.restore();
          return true; // Keep bubble in array until animation completes
        }
        
        // Check if bubble is splatting on ground
        if (bubble.isSplatting) {
          const SPLAT_DURATION = 300; // 300ms for ground splat animation
          const splatAge = currentTime - bubble.splatStartTime;
          const splatProgress = Math.min(splatAge / SPLAT_DURATION, 1);
          
          // If animation finished, remove bubble
          if (splatProgress >= 1) {
            return false;
          }
          
          // SPLAT ANIMATION: Squash against ground
          ctx.save();
          
          // Transform origin: bottom center (where bubble touches ground)
          const groundContactY = groundY;
          
          // Ease-out for smooth squashing
          const easeOut = 1 - Math.pow(1 - splatProgress, 2);
          
          // Squash vertically (compress to almost flat)
          const scaleY = 1 - (easeOut * 0.95); // From 1.0 to 0.05
          
          // Expand horizontally (becomes wider as it flattens)
          const scaleX = 1 + (easeOut * 0.8); // From 1.0 to 1.8
          
          // Fade out
          const opacity = 1 - Math.pow(splatProgress, 1.5);
          
          // Apply transformation with bottom-center pivot
          ctx.globalAlpha = opacity;
          ctx.translate(bubble.x, groundContactY);
          ctx.scale(scaleX, scaleY);
          ctx.translate(-bubble.x, -groundContactY);
          
          // Draw simplified bubble during splat
          const splatGradient = ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, bubble.radius
          );
          splatGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
          splatGradient.addColorStop(0.5, 'rgba(220, 240, 255, 0.15)');
          splatGradient.addColorStop(1, 'rgba(200, 230, 255, 0.25)');
          
          ctx.fillStyle = splatGradient;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw border
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * opacity})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.restore();
          return true; // Keep bubble in array until animation completes
        }
        
        // Normal bubble behavior (not popping or splatting)
        // Only move bubbles if not in transition (no countdown)
        if (countdown === 0 && !showLevelTitle) {
          bubble.y += bubble.speed * dt;
        }
        
        // Check if bubble reached ground
        if (bubble.y + bubble.radius >= groundY) {
          // Trigger splat animation instead of immediate removal
          bubble.isSplatting = true;
          bubble.splatStartTime = currentTime;
          
          // SRS: Record missed bubble as incorrect answer
          const missedVerb = findVerbFromChallenge.current(bubble.challenge);
          if (missedVerb) {
            recordVerbIncorrect(missedVerb, 30000); // 30s = maximum penalty time
          }
          
          // Play ground hit error sound
          playGroundHit();
          
          // Lose life
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('GAMEOVER');
            }
            return newLives;
          });
          setStreak(0);
          return true; // Keep bubble for splat animation
        }
        
        // Draw photorealistic soap bubble effect with wobble animation
        ctx.save();
        
        // WOBBLE ANIMATION: Liquid oscillation effect (squash and stretch)
        // Calculate elapsed time since bubble birth for animation
        const age = (currentTime - bubble.birthTime) / 1000; // Convert to seconds
        
        // Create organic, chaotic wobble using multiple sine waves with different frequencies
        // This creates a non-robotic, liquid-like oscillation
        const wobbleSpeed1 = 0.8; // Primary slow wave
        const wobbleSpeed2 = 1.3; // Secondary medium wave
        const wobbleSpeed3 = 2.1; // Tertiary fast wave (chaotic element)
        
        // Combine multiple sine waves with different phases for organic feel
        const wobble1 = Math.sin(age * Math.PI * wobbleSpeed1) * 0.04;
        const wobble2 = Math.sin(age * Math.PI * wobbleSpeed2 + 1.2) * 0.025;
        const wobble3 = Math.sin(age * Math.PI * wobbleSpeed3 + 2.7) * 0.015;
        
        // Combine wobbles for complex, organic movement
        const totalWobble = wobble1 + wobble2 + wobble3;
        
        // Apply squash and stretch transformation
        // When stretched vertically, compress horizontally (and vice versa) to maintain volume
        const scaleY = 1 + totalWobble;
        const scaleX = 1 - totalWobble * 0.8; // Slightly less inverse for natural look
        
        // Translate to bubble center, apply scale, translate back
        ctx.translate(bubble.x, bubble.y);
        ctx.scale(scaleX, scaleY);
        ctx.translate(-bubble.x, -bubble.y);
        
        // LAYER 1: Base transparency - almost completely transparent center
        const baseGradient = ctx.createRadialGradient(
          bubble.x, bubble.y, 0,
          bubble.x, bubble.y, bubble.radius
        );
        baseGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        baseGradient.addColorStop(0.5, 'rgba(240, 248, 255, 0.08)');
        baseGradient.addColorStop(0.85, 'rgba(200, 220, 240, 0.12)');
        baseGradient.addColorStop(1, 'rgba(180, 200, 230, 0.18)');
        
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 2: Complex Iridescent Interference Pattern (Vibrant Rainbow Swirls)
        // This creates the characteristic "oil on water" soap bubble effect
        
        // Enable screen blend mode for luminous color mixing
        ctx.globalCompositeOperation = 'screen';
        
        // Iridescent Layer 1: Magenta swirl (top-left quadrant)
        const irid1 = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.4, bubble.y - bubble.radius * 0.5, 0,
          bubble.x - bubble.radius * 0.2, bubble.y - bubble.radius * 0.2, bubble.radius * 0.8
        );
        irid1.addColorStop(0, 'hsla(300, 100%, 50%, 0.35)'); // Vibrant magenta
        irid1.addColorStop(0.3, 'hsla(280, 100%, 60%, 0.28)'); // Purple-magenta
        irid1.addColorStop(0.6, 'hsla(320, 90%, 55%, 0.15)'); // Pink-magenta
        irid1.addColorStop(1, 'hsla(300, 80%, 50%, 0)');
        
        ctx.fillStyle = irid1;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Iridescent Layer 2: Cyan swirl (right side)
        const irid2 = ctx.createRadialGradient(
          bubble.x + bubble.radius * 0.5, bubble.y, 0,
          bubble.x + bubble.radius * 0.2, bubble.y, bubble.radius * 0.7
        );
        irid2.addColorStop(0, 'hsla(180, 100%, 50%, 0.40)'); // Vibrant cyan
        irid2.addColorStop(0.35, 'hsla(190, 100%, 55%, 0.30)'); // Cyan-blue
        irid2.addColorStop(0.7, 'hsla(170, 90%, 60%, 0.18)'); // Turquoise
        irid2.addColorStop(1, 'hsla(180, 80%, 50%, 0)');
        
        ctx.fillStyle = irid2;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Iridescent Layer 3: Yellow-lime swirl (bottom)
        const irid3 = ctx.createRadialGradient(
          bubble.x, bubble.y + bubble.radius * 0.4, 0,
          bubble.x + bubble.radius * 0.1, bubble.y + bubble.radius * 0.3, bubble.radius * 0.6
        );
        irid3.addColorStop(0, 'hsla(60, 100%, 50%, 0.32)'); // Vibrant yellow
        irid3.addColorStop(0.4, 'hsla(75, 100%, 55%, 0.25)'); // Yellow-lime
        irid3.addColorStop(0.7, 'hsla(90, 90%, 60%, 0.15)'); // Lime green
        irid3.addColorStop(1, 'hsla(60, 80%, 50%, 0)');
        
        ctx.fillStyle = irid3;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Switch to overlay mode for more complex color interaction
        ctx.globalCompositeOperation = 'overlay';
        
        // Iridescent Layer 4: Orange-red accent (left bottom)
        const irid4 = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.3, bubble.y + bubble.radius * 0.3, 0,
          bubble.x - bubble.radius * 0.1, bubble.y + bubble.radius * 0.2, bubble.radius * 0.5
        );
        irid4.addColorStop(0, 'hsla(30, 100%, 50%, 0.28)'); // Orange
        irid4.addColorStop(0.4, 'hsla(15, 100%, 55%, 0.20)'); // Red-orange
        irid4.addColorStop(0.7, 'hsla(345, 90%, 60%, 0.12)'); // Pink-red
        irid4.addColorStop(1, 'hsla(30, 80%, 50%, 0)');
        
        ctx.fillStyle = irid4;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Switch to color-dodge for intense luminous mixing
        ctx.globalCompositeOperation = 'color-dodge';
        
        // Iridescent Layer 5: Blue-violet accent (top right)
        const irid5 = ctx.createRadialGradient(
          bubble.x + bubble.radius * 0.3, bubble.y - bubble.radius * 0.4, 0,
          bubble.x + bubble.radius * 0.15, bubble.y - bubble.radius * 0.2, bubble.radius * 0.55
        );
        irid5.addColorStop(0, 'hsla(240, 100%, 60%, 0.25)'); // Blue-violet
        irid5.addColorStop(0.35, 'hsla(260, 100%, 65%, 0.18)'); // Violet
        irid5.addColorStop(0.65, 'hsla(220, 90%, 60%, 0.10)'); // Blue
        irid5.addColorStop(1, 'hsla(240, 80%, 60%, 0)');
        
        ctx.fillStyle = irid5;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Iridescent Layer 6: Green swirl (center-left, creates depth)
        const irid6 = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.2, bubble.y + bubble.radius * 0.1, 0,
          bubble.x, bubble.y, bubble.radius * 0.65
        );
        irid6.addColorStop(0, 'hsla(150, 100%, 50%, 0.22)'); // Emerald green
        irid6.addColorStop(0.4, 'hsla(140, 90%, 55%, 0.16)'); // Green
        irid6.addColorStop(0.7, 'hsla(160, 85%, 60%, 0.10)'); // Teal-green
        irid6.addColorStop(1, 'hsla(150, 80%, 50%, 0)');
        
        ctx.fillStyle = irid6;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Return to normal blending for subsequent layers
        ctx.globalCompositeOperation = 'source-over';
        
        // LAYER 3: Ultra-Thin Fresnel Edge (thin film light bending)
        // Creates the illusion of an incredibly thin soap film
        const fresnelGradient = ctx.createRadialGradient(
          bubble.x, bubble.y, bubble.radius * 0.92,
          bubble.x, bubble.y, bubble.radius
        );
        fresnelGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        fresnelGradient.addColorStop(0.5, 'rgba(220, 240, 255, 0.25)'); // Subtle light catch
        fresnelGradient.addColorStop(0.85, 'rgba(200, 230, 255, 0.45)'); // Brighter edge
        fresnelGradient.addColorStop(1, 'rgba(180, 220, 250, 0.6)'); // Sharp bright rim
        
        ctx.fillStyle = fresnelGradient;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 4: Crisp Outer Edge (ultra-thin bright line)
        // This is the actual membrane of the bubble - must be razor-sharp
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // Brighter white
        ctx.lineWidth = 1.5; // Thinner line for film appearance
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // LAYER 4B: Inner Fresnel Glow (inset effect for thin film)
        // Creates the "inset" look - light bending at the inner edge
        ctx.strokeStyle = 'rgba(240, 250, 255, 0.5)'; // Bright blue-white
        ctx.lineWidth = 1; // Ultra-thin
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius - 1, 0, Math.PI * 2);
        ctx.stroke();
        
        // LAYER 4C: Sharp inner highlight ring (Fresnel reflection)
        // This simulates light refracting through the thin membrane
        ctx.strokeStyle = 'rgba(200, 235, 255, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius - 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // LAYER 5: Sharp Main Specular Highlight (curved "banana" shape)
        // Ultra-sharp, pure white, intense reflection on top-left
        
        // Draw curved highlight using elliptical path
        ctx.save();
        ctx.translate(bubble.x - bubble.radius * 0.35, bubble.y - bubble.radius * 0.35);
        ctx.rotate(-Math.PI / 4); // Rotate 45 degrees for curved effect
        
        // Create sharp gradient with pure white center
        const mainHighlight = ctx.createRadialGradient(
          0, 0, 0,
          0, 0, bubble.radius * 0.28
        );
        mainHighlight.addColorStop(0, '#ffffff'); // Pure white, full opacity
        mainHighlight.addColorStop(0.15, 'rgba(255, 255, 255, 0.98)'); // Almost pure white
        mainHighlight.addColorStop(0.35, 'rgba(255, 255, 255, 0.75)'); // Sharp falloff
        mainHighlight.addColorStop(0.6, 'rgba(255, 255, 255, 0.25)');
        mainHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = mainHighlight;
        ctx.beginPath();
        // Elliptical shape for curved "banana" highlight
        ctx.ellipse(0, 0, bubble.radius * 0.28, bubble.radius * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // LAYER 6: Ultra-Sharp Secondary Highlight (intense pinpoint)
        // This creates the "burning" white spot effect
        const sharpHighlight = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.28, bubble.y - bubble.radius * 0.32, 0,
          bubble.x - bubble.radius * 0.28, bubble.y - bubble.radius * 0.32, bubble.radius * 0.08
        );
        sharpHighlight.addColorStop(0, '#ffffff'); // Pure white core
        sharpHighlight.addColorStop(0.25, 'rgba(255, 255, 255, 0.95)'); // Very sharp edge
        sharpHighlight.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
        sharpHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = sharpHighlight;
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.radius * 0.28, bubble.y - bubble.radius * 0.32, bubble.radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 7: Crisp Bottom Light Catch (sharp opposite reflection)
        const bottomHighlight = ctx.createRadialGradient(
          bubble.x + bubble.radius * 0.38, bubble.y + bubble.radius * 0.42, 0,
          bubble.x + bubble.radius * 0.38, bubble.y + bubble.radius * 0.42, bubble.radius * 0.2
        );
        bottomHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.85)'); // Bright white
        bottomHighlight.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)'); // Sharp dropoff
        bottomHighlight.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
        bottomHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = bottomHighlight;
        ctx.beginPath();
        ctx.arc(bubble.x + bubble.radius * 0.38, bubble.y + bubble.radius * 0.42, bubble.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 8: Sharp Rim Light (edge definition on right)
        const rimLight = ctx.createRadialGradient(
          bubble.x + bubble.radius * 0.7, bubble.y - bubble.radius * 0.05, 0,
          bubble.x + bubble.radius * 0.7, bubble.y - bubble.radius * 0.05, bubble.radius * 0.25
        );
        rimLight.addColorStop(0, 'rgba(255, 255, 255, 0.7)'); // Bright center
        rimLight.addColorStop(0.4, 'rgba(230, 245, 255, 0.4)'); // Crisp edge
        rimLight.addColorStop(0.8, 'rgba(200, 230, 255, 0.1)');
        rimLight.addColorStop(1, 'rgba(180, 220, 255, 0)');
        
        ctx.fillStyle = rimLight;
        ctx.beginPath();
        ctx.arc(bubble.x + bubble.radius * 0.7, bubble.y - bubble.radius * 0.05, bubble.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 9: Additional Sharp Accent Light (micro-highlight for extra crispness)
        const microHighlight = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.42, bubble.y - bubble.radius * 0.38, 0,
          bubble.x - bubble.radius * 0.42, bubble.y - bubble.radius * 0.38, bubble.radius * 0.05
        );
        microHighlight.addColorStop(0, '#ffffff'); // Pure white
        microHighlight.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
        microHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = microHighlight;
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.radius * 0.42, bubble.y - bubble.radius * 0.38, bubble.radius * 0.05, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Draw text with enhanced legibility
        ctx.fillStyle = '#003D5B';
        const bubbleFontSize = Math.round(18 * canvasScale * mobileBubbleFactor);
        ctx.font = `bold ${bubbleFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add subtle shadow for text separation from complex background
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = Math.round(4 * canvasScale);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const text = bubble.challenge.displayText;
        const maxWidth = bubble.radius * 1.6;
        const words = text.split(' ');
        const lineOffset = Math.round(8 * canvasScale * mobileBubbleFactor);
        
        if (words.length > 1 && ctx.measureText(text).width > maxWidth) {
          ctx.fillText(words[0], bubble.x, bubble.y - lineOffset);
          ctx.fillText(words.slice(1).join(' '), bubble.x, bubble.y + lineOffset);
        } else {
          ctx.fillText(text, bubble.x, bubble.y);
        }
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        return true;
      });
      
      // Check for level up based on score thresholds
      let newLevel = gameLevel;
      for (let i = gameLevel; i < MAX_LEVEL; i++) {
        if (score >= LEVEL_SETTINGS[i].pointsRequired) {
          newLevel = LEVEL_SETTINGS[i].level;
        } else {
          break;
        }
      }
      
      // Check for victory at 6000 points
      if (score >= 6000 && gameState === 'PLAYING') {
        setGameState('VICTORY');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return;
      }
      
      if (newLevel !== gameLevel && newLevel <= MAX_LEVEL) {
        // Trigger level transition
        startLevelTransition(newLevel);
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, verbPool, score, showLevelTitle, countdown, backgroundColor, isMobile, canvasWidth, canvasHeight]);

  // Handle answer submission
  const handleSubmit = () => {
    if (!userInput.trim() || bubblesRef.current.length === 0) return;
    
    // Try to match with any bubble
    let matched = false;
    bubblesRef.current.forEach(bubble => {
      if (!matched && !bubble.isPopping && validateAnswer(bubble.challenge, userInput)) {
        matched = true;
        
        // SRS: Calculate response time (from bubble birth to pop)
        const responseTime = performance.now() - bubble.birthTime;
        
        // SRS: Find original verb data from pool and record correct answer
        const originalVerb = findVerbFromChallenge.current(bubble.challenge);
        if (originalVerb) {
          recordVerbCorrect(originalVerb, responseTime);
        }
        
        // Mark bubble for popping animation instead of removing immediately
        bubble.isPopping = true;
        bubble.popStartTime = performance.now();
        
        // Play bubble pop sound
        playBubblePop();
        
        const points = calculateScore(gameLevel, streak);
        setScore(prev => prev + points);
        setStreak(prev => prev + 1);
        setFeedback({ text: `¡Correcto! +${points}`, type: 'success' });
        setTimeout(() => setFeedback(null), 1000);
        setInputFeedback('success');
        setTimeout(() => setInputFeedback('idle'), 1000);
      }
    });
    
    if (!matched) {
      setStreak(0);
      setFeedback({ text: 'Intenta con otra burbuja', type: 'error' });
      setTimeout(() => setFeedback(null), 1000);
      setInputFeedback('error');
      setTimeout(() => setInputFeedback('idle'), 1000);
    }
    
    setUserInput('');
    // Re-focus desktop input so it's always ready to type
    desktopInputRef.current?.focus();
  };

  // --- LEVEL SELECT STATE ---
  if (gameState === 'LEVEL_SELECT') {
    const vmAllSelected = !!selectedVerbType;

    // --- MOBILE: Paginated Wizard Menu ---
    if (isMobile) {
      const canGoNext = mobileMenuPage < 3;
      const canGoBack = mobileMenuPage > 1;

      const renderVMPage = () => {
        switch (mobileMenuPage) {
          case 1:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">1. Modo Verbal</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { value: 'indicativo' as VerbMode, label: 'Indicativo' },
                    { value: 'subjuntivo' as VerbMode, label: 'Subjuntivo' },
                    { value: 'imperativo' as VerbMode, label: 'Imperativo' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleVerbModeChange(option.value)}
                      className={`w-full py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                        selectedVerbMode === option.value ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          case 2:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">2. Tiempo Verbal</h3>
                {selectedVerbMode === 'indicativo' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '1fr', gap: '8px' }}>
                    {[
                      { value: 'presente', label: 'Presente' },
                      { value: 'pretérito perfecto', label: 'Pretérito Perfecto' },
                      { value: 'indefinido', label: 'Pretérito Indefinido' },
                      { value: 'imperfecto', label: 'Pretérito Imperfecto' },
                      { value: 'presente continuo', label: 'Presente Continuo' },
                      { value: 'futuro simple', label: 'Futuro Simple' },
                      { value: 'condicional simple', label: 'Condicional Simple' },
                      { value: 'pretérito pluscuamperfecto', label: 'Pret. Pluscuamperfecto' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedTense(option.value)}
                        className={`py-3 px-2 rounded-xl border-2 font-bold transition-all flex items-center justify-center text-center ${
                          selectedTense === option.value ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{ fontSize: '0.8rem', hyphens: 'auto', wordBreak: 'break-word' } as React.CSSProperties}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                {selectedVerbMode === 'imperativo' && (
                  <div className="flex flex-col gap-3">
                    {[
                      { value: 'afirmativo', label: 'Afirmativo' },
                      { value: 'negativo', label: 'Negativo' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedTense(option.value)}
                        className={`w-full py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                          selectedTense === option.value ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                {selectedVerbMode === 'subjuntivo' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '1fr', gap: '8px' }}>
                    {[
                      { value: 'presente', label: 'Presente' },
                      { value: 'imperfecto', label: 'Pretérito Imperfecto' },
                      { value: 'pretérito perfecto', label: 'Pretérito Perfecto' },
                      { value: 'pretérito pluscuamperfecto', label: 'Pret. Pluscuamperfecto' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedTense(option.value)}
                        className={`py-3 px-2 rounded-xl border-2 font-bold transition-all flex items-center justify-center text-center ${
                          selectedTense === option.value ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{ fontSize: '0.8rem', hyphens: 'auto', wordBreak: 'break-word' } as React.CSSProperties}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          case 3:
            return (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">3. Tipo de Verbos</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { value: 'regular' as VerbType, label: 'Regulares' },
                    { value: 'irregular' as VerbType, label: 'Irregulares' },
                    { value: 'all' as VerbType, label: 'Todos' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedVerbType(option.value)}
                      className={`w-full py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                        selectedVerbType === option.value ? 'bg-red-800 text-white border-red-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
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
        <div className="h-[100dvh] bg-red-100 p-3 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-white rounded-3xl px-5 py-4 shadow-2xl flex flex-col" style={{ height: 'auto', maxHeight: 'calc(100dvh - 120px)', flex: '0 1 auto' }}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-lg font-black text-red-800 flex-1 text-center">🫧 Maestro de Verbos</h1>
              <div className="w-8"></div>
            </div>

            <div className="flex justify-center gap-2 my-2">
              {[1, 2, 3].map(p => (
                <div key={p} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  p === mobileMenuPage ? 'bg-spanish-red w-6' : p < mobileMenuPage ? 'bg-red-800' : 'bg-gray-300'
                }`} />
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-center py-2 min-h-0 overflow-y-auto" style={{ flexShrink: 1 }}>
              {renderVMPage()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-shrink-0">
              {canGoBack ? (
                <button onClick={() => setMobileMenuPage(p => p - 1)} className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95 text-gray-600">
                  <ChevronLeft size={22} />
                </button>
              ) : (
                <div className="w-11" />
              )}

              {mobileMenuPage === 3 ? (
                <button
                  onClick={handleStartGame}
                  disabled={!selectedVerbType}
                  className="flex-1 mx-3 py-3 bg-gradient-to-r from-spanish-red to-spanish-red hover:from-red-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-lg rounded-xl transition-all shadow-lg"
                >
                  Comenzar Juego
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

          <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🥋" themeColor="#B71C1C" cobiVisible={cobiVisible} />

          {showChatWindow && gameState === 'LEVEL_SELECT' && (
            <div className={`fixed bottom-24 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
              <div className="bg-gradient-to-r from-red-800 to-red-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥋</span>
                  <div>
                    <h3 className="text-white font-bold text-sm">Cobi Sensei</h3>
                    <p className="text-xs text-red-50">Instructor Zen</p>
                  </div>
                </div>
                <button onClick={() => setShowChatWindow(false)} className="p-1 hover:bg-white/20 rounded-full transition">
                  <ChevronLeft size={20} className="text-white" />
                </button>
              </div>
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-red-50/30 to-white">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    <p className="mb-2">🥋</p>
                    <p>¡Bienvenido al dojo! Soy tu Maestro Cobi.</p>
                    <p className="text-xs mt-2">Pregúntame sobre conjugaciones.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white border-2 border-red-200 text-gray-700'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoadingResponse && (
                  <div className="flex justify-start">
                    <div className="bg-white border-2 border-red-200 rounded-2xl px-4 py-3">
                      <p className="text-sm text-gray-600">El Sensei medita tu pregunta... 🎋</p>
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
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-red-400 transition text-sm disabled:bg-gray-100"
                  />
                  <button
                    onClick={sendMessageToCobi}
                    disabled={isLoadingResponse || !chatInput.trim()}
                    className="w-10 h-10 bg-gradient-to-br from-red-800 to-red-600 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-red-800 font-medium flex items-center gap-2 transition-colors"
            >
              <ChevronLeft size={20} />
              Volver a Juegos
            </button>
            <h1 className="text-2xl font-black text-red-800">
              🫧 Maestro de Verbos
            </h1>
          </div>

          <div className={`bg-white rounded-3xl p-8 shadow-xl ${isMobile ? 'pb-24' : ''}`}>

            {/* Verb Mode Selection - always visible */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Modo Verbal
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'indicativo' as VerbMode, label: 'Indicativo', disabled: false },
                  { value: 'subjuntivo' as VerbMode, label: 'Subjuntivo', disabled: false },
                  { value: 'imperativo' as VerbMode, label: 'Imperativo', disabled: false }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => !option.disabled && handleVerbModeChange(option.value)}
                    disabled={option.disabled}
                    className={`py-3 rounded-lg border-2 font-bold transition-all ${
                      selectedVerbMode === option.value
                        ? 'border-red-800 bg-red-800 text-white'
                        : option.disabled
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tense Selection - revealed after mode selected */}
            {selectedVerbMode && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tiempo Verbal
              </label>
              {selectedVerbMode === 'indicativo' && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'presente', label: 'Presente' },
                    { value: 'pretérito perfecto', label: 'Pretérito Perfecto' },
                    { value: 'indefinido', label: 'Pretérito Indefinido' },
                    { value: 'imperfecto', label: 'Pretérito Imperfecto' },
                    { value: 'presente continuo', label: 'Presente Continuo' },
                    { value: 'futuro simple', label: 'Futuro Simple' },
                    { value: 'condicional simple', label: 'Condicional Simple' },
                    { value: 'pretérito pluscuamperfecto', label: 'Pretérito Pluscuamperfecto' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedTense(option.value)}
                      className={`py-3 rounded-lg border-2 font-bold transition-all ${
                        selectedTense === option.value
                          ? 'border-red-800 bg-red-800 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {selectedVerbMode === 'imperativo' && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'afirmativo', label: 'Afirmativo' },
                    { value: 'negativo', label: 'Negativo' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedTense(option.value)}
                      className={`py-3 rounded-lg border-2 font-bold transition-all ${
                        selectedTense === option.value
                          ? 'border-red-800 bg-red-800 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {selectedVerbMode === 'subjuntivo' && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'presente', label: 'Presente' },
                    { value: 'imperfecto', label: 'Pretérito Imperfecto' },
                    { value: 'pretérito perfecto', label: 'Pretérito Perfecto' },
                    { value: 'pretérito pluscuamperfecto', label: 'Pretérito Pluscuamperfecto' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedTense(option.value)}
                      className={`py-3 rounded-lg border-2 font-bold transition-all ${
                        selectedTense === option.value
                          ? 'border-red-800 bg-red-800 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Verb Type Selection - revealed after tense selected */}
            {selectedTense && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tipo de Verbos
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'regular' as VerbType, label: 'Regulares' },
                  { value: 'irregular' as VerbType, label: 'Irregulares' },
                  { value: 'all' as VerbType, label: 'Todos' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedVerbType(option.value)}
                    className={`py-3 rounded-lg border-2 font-bold transition-all ${
                      selectedVerbType === option.value
                        ? 'border-red-800 bg-red-800 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Start Button - sticky on mobile, normal on desktop */}
            {isMobile ? (
              <div
                className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-30"
                style={{
                  opacity: vmAllSelected ? 1 : 0.5,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <button
                  onClick={handleStartGame}
                  disabled={!selectedVerbType}
                  className="w-full py-4 bg-gradient-to-r from-spanish-red to-spanish-red hover:from-red-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-xl rounded-xl transition-all shadow-lg"
                >
                  Comenzar Juego
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartGame}
                disabled={!selectedVerbType}
                className="w-full py-4 bg-gradient-to-r from-spanish-red to-spanish-red hover:from-red-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-xl rounded-xl transition-all shadow-lg"
              >
                Comenzar Juego
              </button>
            )}
          </div>

          {/* Cobi Sensei Pensando en el menú (solo desktop) */}
          <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
            <div className="relative animate-float">
              {/* Bocadillo de diálogo con mensaje aleatorio */}
              {cobiSenseiMenuMessage && (
                <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
                  <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                    {cobiSenseiMenuMessage}
                  </p>
                  {/* Pico del bocadillo apuntando hacia Cobi */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
                </div>
              )}
              
              {/* Imagen de Cobi Sensei Pensando */}
              <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
                <img 
                  src="./data/images/cobi-sensei-pensando.webp"
                  alt="Cobi Sensei pensando" 
                  className="w-56 h-auto object-contain"
                  style={{
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                  }}
                />
              </div>
              
              {/* Botón CHARLAR dentro del animate-float */}
              <div className="chat-button-wrapper">
                <div
                  onClick={() => setShowChatWindow(!showChatWindow)}
                  className="cobi-chat-button-zen pointer-events-auto"
                >
                  <svg viewBox="0 0 100 100" className="curved-text-svg">
                    <path id="chatTextPathMenu" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                    <text>
                      <textPath href="#chatTextPathMenu" startOffset="50%" textAnchor="middle" className="curved-text-style-zen">
                        CHARLAR
                      </textPath>
                    </text>
                  </svg>
                  <div className="paws-icon">🥋</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🥋" themeColor="#B71C1C" cobiVisible={cobiVisible} />

        {/* Chat Window del Menú */}
        {showChatWindow && gameState === 'LEVEL_SELECT' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-800 to-red-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥋</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Sensei</h3>
                  <p className="text-xs text-red-50">Instructor Zen de Artes Marciales</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-red-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🥋</p>
                  <p>¡Bienvenido al dojo! Soy tu Maestro Cobi.</p>
                  <p className="text-xs mt-2">Pregúntame sobre los niveles o sobre conjugaciones.</p>
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
                          : 'bg-white border-2 border-red-200 text-gray-700'
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
                  <div className="bg-white border-2 border-red-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Sensei medita tu pregunta... 🎋
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-red-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="w-10 h-10 bg-gradient-to-br from-red-800 to-red-600 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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

  // --- PLAYING STATE ---
  if (gameState === 'PLAYING') {
    return (
      <div className="min-h-screen md:min-h-0 md:h-[calc(100vh-5rem)] bg-gradient-to-br from-red-50 to-pink-50 p-4 md:p-[10px] relative md:overflow-hidden">
        <div className="max-w-4xl mx-auto md:flex md:flex-col md:h-full md:gap-[10px]">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 md:mb-0 bg-white rounded-2xl p-4 md:py-1 md:px-3 shadow-md md:flex-shrink-0">
            <button
              onClick={() => setGameState('LEVEL_SELECT')}
              className="p-2 md:p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} className="md:w-5 md:h-5" />
            </button>
            <div className="flex gap-4 md:gap-5 text-center">
              <div>
                <p className="text-xs md:text-[10px] text-gray-500 font-medium md:leading-tight">PUNTOS</p>
                <p className="text-lg md:text-base font-black text-red-800 md:leading-tight">{score}</p>
              </div>
              <div>
                <p className="text-xs md:text-[10px] text-gray-500 font-medium md:leading-tight">NIVEL</p>
                <p className="text-lg md:text-base font-black text-green-600 md:leading-tight">{gameLevel}</p>
              </div>
              <div>
                <p className="text-xs md:text-[10px] text-gray-500 font-medium md:leading-tight">RACHA</p>
                <p className="text-lg md:text-base font-black text-orange-500 md:leading-tight">{streak}</p>
              </div>
              <div>
                <p className="text-xs md:text-[10px] text-gray-500 font-medium md:leading-tight">VIDAS</p>
                <p className="text-lg md:text-sm font-black text-red-500 md:leading-tight">
                  <span className="hidden md:inline">{'❤️'.repeat(lives)}</span>
                  <span className="md:hidden">❤️ x {lives}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setGameState('PAUSED')}
              className="p-2 md:p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Pause size={24} className="md:w-5 md:h-5" />
            </button>
          </div>

          {/* Canvas */}
          <div 
            ref={canvasContainerRef}
            className="rounded-2xl overflow-hidden shadow-xl mb-4 md:mb-0 md:flex-1 md:min-h-0 transition-colors duration-[2000ms] ease-in-out"
            style={{ backgroundColor }}
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full block"
              style={!isMobile ? { width: '100%', height: '100%' } : undefined}
            />
          </div>

          {/* Input */}
          <div className="md:bg-white md:rounded-xl md:py-1.5 md:px-3 md:shadow-lg md:flex-shrink-0">
            {/* Desktop input with button */}
            <div className="hidden md:flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                  // Accented vowels with number keys
                  if (e.key === '1') { e.preventDefault(); setUserInput(prev => prev + 'á'); }
                  if (e.key === '2') { e.preventDefault(); setUserInput(prev => prev + 'é'); }
                  if (e.key === '3') { e.preventDefault(); setUserInput(prev => prev + 'í'); }
                  if (e.key === '4') { e.preventDefault(); setUserInput(prev => prev + 'ó'); }
                  if (e.key === '5') { e.preventDefault(); setUserInput(prev => prev + 'ú'); }
                }}
                placeholder=""
                className={`flex-1 px-3 py-1.5 border-2 rounded-lg focus:outline-none text-sm transition-colors duration-200 ${
                  inputFeedback === 'success' ? 'border-green-500 text-green-600 font-bold' :
                  inputFeedback === 'error' ? 'border-red-500 text-red-600 font-bold' :
                  'border-gray-200 focus:border-red-800'
                }`}
                style={inputFeedback === 'error' ? { animation: 'vmShake 0.4s ease-in-out' } : undefined}
                autoFocus
                ref={desktopInputRef}
              />
              <button
                onClick={handleSubmit}
                className="px-6 py-1.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-lg transition-colors text-sm"
              >
                Enviar
              </button>
            </div>
            
            {/* Mobile input without native keyboard */}
            <div className="md:hidden px-2 mb-3">
              <input
                type="text"
                value={userInput}
                readOnly
                className={`w-full px-4 py-2 border-2 rounded-lg text-lg text-center bg-white transition-colors duration-200 ${
                  inputFeedback === 'success' ? 'border-green-500 text-green-600 font-bold' :
                  inputFeedback === 'error' ? 'border-red-500 text-red-600 font-bold' :
                  'border-gray-200'
                }`}
                style={inputFeedback === 'error' ? { animation: 'vmShake 0.4s ease-in-out' } : undefined}
              />
            </div>
            
            {/* Virtual Keyboard - Mobile only (WhatsApp-style, full-width) */}
            <VmMobileKeyboard
              onKeyPress={(key: string) => setUserInput(prev => prev + key)}
              onDelete={() => setUserInput(prev => prev.slice(0, -1))}
              onSubmit={handleSubmit}
            />
            
            {/* Mobile-only feedback message */}
            {feedback && (
              <p className={`md:hidden mt-3 text-center font-bold ${
                feedback.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {feedback.text}
              </p>
            )}
            <p className="hidden md:block mt-0.5 text-[10px] text-gray-400 text-center leading-tight">
              Usa las teclas 1-5 para vocales con tilde (á é í ó ú)
            </p>
          </div>
        </div>

        {/* Level Transition Overlay */}
        {showLevelTitle && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="w-full text-center" style={{
              animation: 'popIn 0.6s ease-out',
              animationFillMode: 'both'
            }}>
              <h1 
                className="text-5xl md:text-8xl font-black text-white tracking-wider"
                style={{
                  textShadow: '0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4), 4px 4px 8px rgba(0, 0, 0, 0.6)',
                  WebkitTextStroke: '2px rgba(30, 64, 175, 0.8)'
                }}
              >
                NIVEL {gameLevel}
              </h1>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown > 0 && !showLevelTitle && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-20 z-50">
            <div style={{
              animation: 'scaleIn 0.3s ease-out',
              animationFillMode: 'both'
            }}>
              <p 
                className="text-9xl font-black text-white"
                style={{
                  textShadow: '0 0 40px rgba(239, 68, 68, 0.8), 0 0 80px rgba(239, 68, 68, 0.4), 4px 4px 12px rgba(0, 0, 0, 0.7)',
                  WebkitTextStroke: '3px rgba(185, 28, 28, 0.8)'
                }}
              >
                {countdown}
              </p>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes popIn {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes scaleIn {
            0% {
              transform: scale(0.5);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes vmShake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-3px); }
            80% { transform: translateX(3px); }
          }
        `}} />

        {/* Cobi Sensei (solo desktop) */}
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje aleatorio */}
            {cobiSenseiMessage && (
              <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
                <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                  {cobiSenseiMessage}
                </p>
                {/* Pico del bocadillo apuntando hacia Cobi */}
                <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
              </div>
            )}
            
            {/* Imagen de Cobi Sensei */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src={cobiSenseiAvatar}
                alt="Cobi Sensei" 
                className="w-56 h-auto object-contain transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            
            {/* Botón CHARLAR durante el juego */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-zen pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathPlaying" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathPlaying" startOffset="50%" textAnchor="middle" className="curved-text-style-zen">
                      CHARLAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🥋</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🥋" themeColor="#B71C1C" cobiVisible={cobiVisible} />

        {/* Chat Window durante el juego */}
        {showChatWindow && gameState === 'PLAYING' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-800 to-red-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥋</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Sensei</h3>
                  <p className="text-xs text-red-50">Instructor Zen de Artes Marciales</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-red-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🥋</p>
                  <p>¡Concentración! Estoy aquí si necesitas ayuda.</p>
                  <p className="text-xs mt-2">Pregúntame sobre conjugaciones mientras juegas.</p>
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
                          : 'bg-white border-2 border-red-200 text-gray-700'
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
                  <div className="bg-white border-2 border-red-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Sensei medita tu pregunta... 🎋
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-red-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="w-10 h-10 bg-gradient-to-br from-red-800 to-red-600 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <p className="text-7xl mb-4">⏸️</p>
          <h1 className="text-4xl font-black text-red-800 mb-2">Pausa</h1>
          <p className="text-lg text-gray-600 mb-6">Puntuación: {score}</p>
          <div className="space-y-3">
            <button
              onClick={() => setGameState('PLAYING')}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Continuar
            </button>
            <button
              onClick={() => setGameState('LEVEL_SELECT')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
            >
              Salir al Menú
            </button>
          </div>
        </div>

        {/* Cobi Sensei Pausa (solo desktop) */}
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
          <div className="relative animate-float">
            {/* Bocadillo de diálogo */}
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiSenseiPausaMessage}
              </p>
              {/* Pico del bocadillo apuntando hacia Cobi */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
            </div>
            
            {/* Imagen de Cobi Sensei Pausa */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-sensei-pausa.webp"
                alt="Cobi Sensei estirando" 
                className="w-56 h-auto object-contain transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            
            {/* Botón CHARLAR en pausa */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-zen pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathPaused" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathPaused" startOffset="50%" textAnchor="middle" className="curved-text-style-zen">
                      CHARLAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🥋</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🥋" themeColor="#B71C1C" cobiVisible={cobiVisible} />

        {/* Chat Window en pausa */}
        {showChatWindow && gameState === 'PAUSED' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-800 to-red-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥋</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Sensei</h3>
                  <p className="text-xs text-red-50">Instructor Zen de Artes Marciales</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-red-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🥋</p>
                  <p>¡Un momento de meditación! Estoy aquí si necesitas algo.</p>
                  <p className="text-xs mt-2">Pregúntame lo que necesites.</p>
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
                          : 'bg-white border-2 border-red-200 text-gray-700'
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
                  <div className="bg-white border-2 border-red-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Sensei medita tu pregunta... 🎋
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-red-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="w-10 h-10 bg-gradient-to-br from-red-800 to-red-600 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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

  // --- VICTORY STATE ---
  // Cambiar avatar y mensaje al estado de victoria
  if (gameState === 'VICTORY' && cobiSenseiAvatar !== './data/images/cobi-sensei-acierto.webp') {
    setCobiSenseiAvatar('./data/images/cobi-sensei-acierto.webp');
    setCobiSenseiMessage(senseiMsg('victoria'));
  }
  
  if (gameState === 'VICTORY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50 p-4 flex items-center justify-center relative overflow-hidden">
        {/* Confetti Animation */}
        <style>{`
          @keyframes confettiFall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
          @keyframes victoryBounce {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
              opacity: 1;
            }
            65% {
              transform: scale(0.95);
            }
            80% {
              transform: scale(1.05);
            }
            90% {
              transform: scale(0.98);
            }
            100% {
              transform: scale(1);
            }
          }
          @keyframes victoryPulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            animation: confettiFall linear infinite;
            pointer-events: none;
          }
          .victory-card {
            animation: victoryBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
          .victory-card-pulse {
            animation: victoryPulse 0.5s ease-in-out 0.6s 4;
          }
        `}</style>
        
        {/* Generate 50 confetti pieces */}
        {Array.from({ length: 50 }).map((_, i) => {
          const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1', '#FF69B4', '#9370DB'];
          const left = Math.random() * 100;
          const animationDelay = Math.random() * 3;
          const animationDuration = 3 + Math.random() * 2;
          const backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          
          return (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${left}%`,
                backgroundColor,
                animationDelay: `${animationDelay}s`,
                animationDuration: `${animationDuration}s`,
              }}
            />
          );
        })}
        
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl border-4 border-yellow-400 victory-card victory-card-pulse relative z-10">
          <p className="text-7xl mb-4">🏆</p>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-green-600 mb-2">
            ¡Victoria!
          </h1>
          <p className="text-lg text-gray-600 mb-2">Has completado el juego</p>
          <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4">
            {score}
          </p>
          <p className="text-gray-600 mb-6">¡Has alcanzado los 6000 puntos!</p>
          <div className="space-y-3">
            <button
              onClick={handleStartGame}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg"
            >
              Jugar de Nuevo
            </button>
            <button
              onClick={() => {
                setGameState('LEVEL_SELECT');
                setCobiSenseiAvatar('./data/images/cobi-sensei.webp');
                setCobiSenseiMessage(senseiMsg('juego'));
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
            >
              Cambiar Configuración
            </button>
          </div>
        </div>

        {/* Cobi Sensei Victoria (solo desktop) */}
        <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
          <div className="relative animate-float">
            {/* Bocadillo de diálogo */}
            {cobiSenseiMessage && (
              <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-yellow-300 pointer-events-auto">
                <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                  {cobiSenseiMessage}
                </p>
                <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-yellow-300 transform rotate-[315deg]"></div>
              </div>
            )}
            
            {/* Imagen de Cobi Sensei Victoria */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi-sensei-acierto.webp"
                alt="Cobi Sensei Victorioso" 
                className="w-56 h-auto object-contain transition-opacity duration-300"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))'
                }}
              />
            </div>
            
            {/* Botón CHARLAR */}
            <div className="chat-button-wrapper">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-zen pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathVictory" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathVictory" startOffset="50%" textAnchor="middle" className="curved-text-style-zen">
                      CHARLAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🥋</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Cobi móvil */}
        <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🥋" themeColor="#B71C1C" cobiVisible={cobiVisible} />

        {/* Chat Window de VICTORY */}
        {showChatWindow && gameState === 'VICTORY' && (
          <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-yellow-300 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 to-green-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥋</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Cobi Sensei</h3>
                  <p className="text-xs text-yellow-50">¡Maestro Victorioso!</p>
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
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-yellow-50/30 to-white">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  <p className="mb-2">🏆</p>
                  <p>¡Felicitaciones! Has demostrado ser un verdadero maestro.</p>
                  <p className="text-xs mt-2">¿Quieres saber más técnicas avanzadas?</p>
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
                          : 'bg-white border-2 border-yellow-300 text-gray-700'
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
                  <div className="bg-white border-2 border-yellow-300 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-600">
                      El Sensei medita tu pregunta... 🎋
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
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-yellow-400 transition text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={sendMessageToCobi}
                  disabled={isLoadingResponse || !chatInput.trim()}
                  className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-green-600 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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

  // --- GAMEOVER STATE ---
  // Cambiar avatar y mensaje al estado de fallo
  if (cobiSenseiAvatar !== './data/images/cobi-sensei-fallo.webp') {
    setCobiSenseiAvatar('./data/images/cobi-sensei-fallo.webp');
    setCobiSenseiMessage(senseiMsg('fallo'));
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
        <p className="text-7xl mb-4">💔</p>
        <h1 className="text-4xl font-black text-red-800 mb-2">Fin del Juego</h1>
        <p className="text-lg text-gray-600 mb-2">Puntuación Final</p>
        <p className="text-5xl font-black text-spanish-red mb-4">{score}</p>
        <p className="text-gray-600 mb-6">Nivel alcanzado: {gameLevel}</p>
        <div className="space-y-3">
          <button
            onClick={handleStartGame}
            className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3 rounded-lg"
          >
            Jugar de Nuevo
          </button>
          <button
            onClick={() => {
              setGameState('LEVEL_SELECT');
              // Resetear avatar al estado normal
              setCobiSenseiAvatar('./data/images/cobi-sensei.webp');
              setCobiSenseiMessage(senseiMsg('juego'));
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
          >
            Cambiar Configuración
          </button>
        </div>
      </div>

      {/* Cobi Sensei Fallo (solo desktop) */}
      <div className={`hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
        <div className="relative animate-float">
          {/* Bocadillo de diálogo */}
          {cobiSenseiMessage && (
            <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
              <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                {cobiSenseiMessage}
              </p>
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
            </div>
          )}
          
          {/* Imagen de Cobi Sensei Fallo */}
          <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
            <img 
              src="./data/images/cobi-sensei-fallo.webp"
              alt="Cobi Sensei" 
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
              className="cobi-chat-button-zen pointer-events-auto"
            >
              <svg viewBox="0 0 100 100" className="curved-text-svg">
                <path id="chatTextPathGameover" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                <text>
                  <textPath href="#chatTextPathGameover" startOffset="50%" textAnchor="middle" className="curved-text-style-zen">
                    CHARLAR
                  </textPath>
                </text>
              </svg>
              <div className="paws-icon">🥋</div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Cobi móvil */}
      <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🥋" themeColor="#B71C1C" cobiVisible={cobiVisible} />

      {/* Chat Window de GAMEOVER */}
      {showChatWindow && gameState === 'GAMEOVER' && (
        <div className={`fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in cobi-container${!cobiVisible ? ' cobi-hidden' : ''}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-red-800 to-red-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥋</span>
              <div>
                <h3 className="text-white font-bold text-sm">Cobi Sensei</h3>
                <p className="text-xs text-red-50">Instructor Zen de Artes Marciales</p>
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
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-red-50/30 to-white">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                <p className="mb-2">🥋</p>
                <p>¡Ánimo! Todo maestro comenzó como aprendiz.</p>
                <p className="text-xs mt-2">Pregúntame lo que necesites para mejorar.</p>
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
                        : 'bg-white border-2 border-red-200 text-gray-700'
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
                <div className="bg-white border-2 border-red-200 rounded-2xl px-4 py-3">
                  <p className="text-sm text-gray-600">
                    El Sensei medita tu pregunta... 🎋
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
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-red-400 transition text-sm disabled:bg-gray-100"
              />
              <button
                onClick={sendMessageToCobi}
                disabled={isLoadingResponse || !chatInput.trim()}
                className="w-10 h-10 bg-gradient-to-br from-red-800 to-red-600 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerbMasterGame;
