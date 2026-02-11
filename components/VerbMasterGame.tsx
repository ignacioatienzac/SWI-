import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Pause } from 'lucide-react';
import { Send } from 'lucide-react';
import { hablarConPanda } from '../services/geminiService';
import {
  loadVerbData,
  getFilteredVerbs,
  generateChallenge,
  validateAnswer,
  calculateScore,
  getSpawnRate,
  VerbLevel,
  VerbType,
  VerbMode,
  GameMode,
  BubbleChallenge,
  VerbData
} from '../services/verbMasterService';

interface VerbMasterGameProps {
  onBack: () => void;
}

// Mensajes aleatorios para Cobi Sensei en el menú
const mensajesSenseiMenu = [
  "� ¡Bienvenido al Maestro de Verbos! Elige sabiamente tu desafío. 🐾",
  "🎯 Regular o irregular... Conjugar o identificar... ¡Tú decides! 🐾",
  "📚 Cada burbuja es una oportunidad de aprendizaje. ¿Listo? 🐾",
  "🥋 La práctica hace al maestro. ¡Configura tu entrenamiento! 🐾",
  "✨ Las burbujas caen, pero tu conocimiento permanece. ¡Adelante! 🐾",
  "🌟 Empieza con lo que sabes y conquista nuevos niveles. 🐾",
  "🎓 El camino hacia la maestría comienza con una elección. 🐾"
];

const seleccionarMensajeSenseiMenuRandom = (): string => {
  const indice = Math.floor(Math.random() * mensajesSenseiMenu.length);
  return mensajesSenseiMenu[indice];
};

// Mensajes aleatorios para Cobi Sensei durante el juego
const mensajesSenseiJuego = [
  "🫧 ¡Explota las burbujas con precisión! Cada conjugación cuenta. 🐾",
  "⚡ ¡Rápido pero certero! Las burbujas no esperan. 🐾",
  "🎯 ¡Excelente racha! Mantén el ritmo, aprendiz. 🐾",
  "📖 Respira, piensa y conjuga. ¡No dejes que caigan! 🐾",
  "🌊 Las burbujas fluyen como el tiempo verbal. ¡Domínalas! 🐾",
  "💫 Cada burbuja reventada es un paso hacia la maestría. 🐾"
];

const mensajesSenseiVictoria = [
  "🏆 ¡Increíble! Has reventado todas las burbujas con maestría. 🐾✨",
  "⭐ ¡Nivel superado! Tu dominio verbal es excepcional. 🐾",
  "🎉 ¡Magnífico, aprendiz! Las burbujas no tienen nada que hacer contigo. 🐾🌟"
];

const mensajesSenseiAcierto = [
  "🎊 ¡Nivel superado! Tu técnica mejora con cada burbuja. 🐾",
  "⭐ ¡Excelente! Avanzas hacia la maestría verbal. 🐾",
  "🥋 ¡Bien hecho, aprendiz! El siguiente nivel te espera. 🐾"
];

const mensajesSenseiFallo = [
  "💪 Las burbujas ganaron esta vez, pero aprenderás de esto. 🐾",
  "🔄 Incluso los maestros dejan caer burbujas. ¡Inténtalo de nuevo! 🐾",
  "🎈 Cada burbuja que cae enseña una lección. ¡No te rindas! 🐾"
];

const mensajesSenseiPausa = [
  "Inhala... exhala... 🎋 El descanso es parte del entrenamiento, pequeño saltamontes.",
  "Un buen guerrero sabe cuándo parar para recuperar su energía. 🥋",
  "Meditando... 🧘‍♂️ Estoy preparando mi mente para la próxima ola de verbos."
];

const seleccionarMensajeSenseiRandom = (tipo: 'juego' | 'victoria' | 'fallo' | 'pausa' | 'acierto'): string => {
  let mensajes;
  switch(tipo) {
    case 'victoria':
      mensajes = mensajesSenseiVictoria;
      break;
    case 'acierto':
      mensajes = mensajesSenseiAcierto;
      break;
    case 'fallo':
      mensajes = mensajesSenseiFallo;
      break;
    case 'pausa':
      mensajes = mensajesSenseiPausa;
      break;
    default:
      mensajes = mensajesSenseiJuego;
  }
  const indice = Math.floor(Math.random() * mensajes.length);
  return mensajes[indice];
};

type GameState = 'LEVEL_SELECT' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_TRANSITION';

// Level progression configuration (10 levels)
const LEVEL_SETTINGS = [
  { level: 1, fallDuration: 60.0, pointsRequired: 0 },      // Starting level - Very slow
  { level: 2, fallDuration: 55.0, pointsRequired: 100 },   // +100 = 100 total
  { level: 3, fallDuration: 50.0, pointsRequired: 300 },   // +200 = 300 total
  { level: 4, fallDuration: 45.0, pointsRequired: 600 },   // +300 = 600 total
  { level: 5, fallDuration: 40.0, pointsRequired: 1000 },  // +400 = 1000 total
  { level: 6, fallDuration: 37.5, pointsRequired: 1500 },  // +500 = 1500 total
  { level: 7, fallDuration: 35.0, pointsRequired: 2100 },  // +600 = 2100 total
  { level: 8, fallDuration: 30.0, pointsRequired: 2800 },  // +700 = 2800 total
  { level: 9, fallDuration: 25.0, pointsRequired: 3600 },  // +800 = 3600 total
  { level: 10, fallDuration: 20.0, pointsRequired: 4500 }   // +900 = 4500 total (max level)
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
  '#CFD8DC'  // Level 10 - Blue Grey
];

const MAX_LEVEL = 10;

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

const VerbMasterGame: React.FC<VerbMasterGameProps> = ({ onBack }) => {
  // Game configuration
  const [selectedVerbMode, setSelectedVerbMode] = useState<VerbMode>('indicativo');
  const [selectedVerbType, setSelectedVerbType] = useState<VerbType | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [selectedTense, setSelectedTense] = useState<string>('presente');
  const [selectedLevel] = useState<VerbLevel>('A1');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // Cobi Sensei State
  const [cobiSenseiMenuMessage] = useState<string>(seleccionarMensajeSenseiMenuRandom());
  const [cobiSenseiMessage, setCobiSenseiMessage] = useState<string>(seleccionarMensajeSenseiRandom('juego'));
  const [cobiSenseiPausaMessage] = useState<string>(seleccionarMensajeSenseiRandom('pausa'));
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
          modo_juego: selectedGameMode || 'ninguno'
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
          modo_juego: selectedGameMode,
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
    if (mode === 'imperativo') {
      setSelectedTense('afirmativo');
    } else if (mode === 'indicativo') {
      setSelectedTense('presente');
    } else if (mode === 'subjuntivo') {
      setSelectedTense('presente');
    }
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
  
  // Game data
  const [verbPool, setVerbPool] = useState<VerbData[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const canvasWidth = 800;
  const canvasHeight = 600;
  const groundY = canvasHeight - 50;

  // Audio functions
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
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

  // Calculate fall speed based on level settings and canvas dimensions
  const calculateFallSpeed = (level: number): number => {
    // Clamp level between 1 and MAX_LEVEL
    const clampedLevel = Math.max(1, Math.min(level, MAX_LEVEL));
    const levelConfig = LEVEL_SETTINGS[clampedLevel - 1];
    
    // Distance bubble needs to travel (from top to ground)
    const fallDistance = canvasHeight + 60; // Extra padding for radius
    
    // Assuming 60 FPS, calculate pixels per frame
    const FPS = 60;
    const totalFrames = levelConfig.fallDuration * FPS;
    const speed = fallDistance / totalFrames;
    
    return speed;
  };

  // Load verb data on mount
  useEffect(() => {
    loadVerbData();
  }, []);

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
    if (!selectedVerbType || !selectedGameMode) return;
    
    const verbs = await getFilteredVerbs(selectedLevel, selectedVerbType, selectedTense, selectedVerbMode);
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
    setCobiSenseiMessage(seleccionarMensajeSenseiRandom('juego'));
    
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
    setCobiSenseiMessage(seleccionarMensajeSenseiRandom('acierto'));
    
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
            setCobiSenseiMessage(seleccionarMensajeSenseiRandom('juego'));
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
      const challenge = generateChallenge(verbs, selectedGameMode!);
      if (!challenge) return;
      
      const radius = 40 + Math.random() * 20;
      
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
          if (Math.abs(dx) < minDistance && bubble.y < 150) {
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
          bubble.y += bubble.speed;
        }
        
        // Check if bubble reached ground
        if (bubble.y + bubble.radius >= groundY) {
          // Trigger splat animation instead of immediate removal
          bubble.isSplatting = true;
          bubble.splatStartTime = currentTime;
          
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
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add subtle shadow for text separation from complex background
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const text = bubble.challenge.displayText;
        const maxWidth = bubble.radius * 1.6;
        const words = text.split(' ');
        
        if (words.length > 1 && ctx.measureText(text).width > maxWidth) {
          ctx.fillText(words[0], bubble.x, bubble.y - 8);
          ctx.fillText(words.slice(1).join(' '), bubble.x, bubble.y + 8);
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
  }, [gameState, verbPool, selectedGameMode, score, showLevelTitle, countdown, backgroundColor]);

  // Handle answer submission
  const handleSubmit = () => {
    if (!userInput.trim() || bubblesRef.current.length === 0) return;
    
    // Try to match with any bubble
    let matched = false;
    bubblesRef.current.forEach(bubble => {
      if (!matched && !bubble.isPopping && validateAnswer(bubble.challenge, userInput)) {
        matched = true;
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
      }
    });
    
    if (!matched) {
      setStreak(0);
      setFeedback({ text: 'Intenta con otra burbuja', type: 'error' });
      setTimeout(() => setFeedback(null), 1000);
    }
    
    setUserInput('');
  };

  // --- LEVEL SELECT STATE ---
  if (gameState === 'LEVEL_SELECT') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 text-gray-500 hover:text-deep-blue font-medium flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={20} />
            Volver a Juegos
          </button>

          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-deep-blue mb-2">
                🫧 Maestro de Verbos
              </h1>
              <p className="text-gray-600">
                ¡Explota las burbujas antes de que lleguen al suelo!
              </p>
            </div>

            {/* Verb Mode Selection */}
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
                        ? 'border-deep-blue bg-deep-blue text-white'
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

            {/* Tense Selection */}
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
                          ? 'border-deep-blue bg-deep-blue text-white'
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
                          ? 'border-deep-blue bg-deep-blue text-white'
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
                          ? 'border-deep-blue bg-deep-blue text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Verb Type Selection */}
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
                        ? 'border-deep-blue bg-deep-blue text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Mode Selection */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Modo de Juego
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedGameMode('conjugate')}
                  className={`p-4 rounded-lg border-2 transition-all relative ${
                    selectedGameMode === 'conjugate'
                      ? 'border-deep-blue bg-deep-blue'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <button
                    onMouseEnter={() => setShowTooltip('conjugate')}
                    onMouseLeave={() => setShowTooltip(null)}
                    onClick={(e) => { e.stopPropagation(); setShowTooltip(showTooltip === 'conjugate' ? null : 'conjugate'); }}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 text-xs flex items-center justify-center transition-colors"
                  >
                    ?
                  </button>
                  {showTooltip === 'conjugate' && (
                    <div className="absolute -top-14 left-0 right-0 bg-gray-800 text-white text-xs px-2 py-2 rounded-lg z-10">
                      Ver: "hablar, yo" → Escribir: "hablo"
                    </div>
                  )}
                  <div className={`font-bold mb-1 ${
                    selectedGameMode === 'conjugate' ? 'text-white' : 'text-gray-800'
                  }`}>Conjugar</div>
                </button>
                <button
                  onClick={() => setSelectedGameMode('identify')}
                  className={`p-4 rounded-lg border-2 transition-all relative ${
                    selectedGameMode === 'identify'
                      ? 'border-deep-blue bg-deep-blue'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <button
                    onMouseEnter={() => setShowTooltip('identify')}
                    onMouseLeave={() => setShowTooltip(null)}
                    onClick={(e) => { e.stopPropagation(); setShowTooltip(showTooltip === 'identify' ? null : 'identify'); }}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 text-xs flex items-center justify-center transition-colors"
                  >
                    ?
                  </button>
                  {showTooltip === 'identify' && (
                    <div className="absolute -top-14 left-0 right-0 bg-gray-800 text-white text-xs px-2 py-2 rounded-lg z-10">
                      Ver: "hablo" → Escribir: "hablar, yo"
                    </div>
                  )}
                  <div className={`font-bold mb-1 ${
                    selectedGameMode === 'identify' ? 'text-white' : 'text-gray-800'
                  }`}>Identificar</div>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              disabled={!selectedVerbType || !selectedGameMode}
              className="w-full py-4 bg-gradient-to-r from-spanish-red to-spanish-red hover:from-red-700 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-xl rounded-xl transition-all shadow-lg"
            >
              Comenzar Juego
            </button>
          </div>

          {/* Cobi Sensei Pensando en el menú (solo desktop) */}
          <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible">
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

        {/* Chat Window del Menú */}
        {showChatWindow && gameState === 'LEVEL_SELECT' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
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
      <div className="min-h-screen bg-gray-50 p-4 relative">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 bg-white rounded-2xl p-4 shadow-md">
            <button
              onClick={() => setGameState('LEVEL_SELECT')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex gap-4 md:gap-8 text-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">PUNTOS</p>
                <p className="text-lg md:text-2xl font-black text-deep-blue">{score}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">NIVEL</p>
                <p className="text-lg md:text-2xl font-black text-green-600">{gameLevel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">RACHA</p>
                <p className="text-lg md:text-2xl font-black text-orange-500">{streak}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">VIDAS</p>
                <p className="text-lg md:text-2xl font-black text-red-500">
                  <span className="hidden md:inline">{'❤️'.repeat(lives)}</span>
                  <span className="md:hidden">❤️ x {lives}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setGameState('PAUSED')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Pause size={24} />
            </button>
          </div>

          {/* Canvas */}
          <div 
            className="rounded-2xl overflow-hidden shadow-xl mb-4 transition-colors duration-[2000ms] ease-in-out"
            style={{ backgroundColor }}
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full"
            />
          </div>

          {/* Input */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            {/* Desktop input with button */}
            <div className="hidden md:flex gap-3">
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
                placeholder="Escribe tu respuesta..."
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-deep-blue text-lg"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-deep-blue hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Enviar
              </button>
            </div>
            
            {/* Mobile input without native keyboard */}
            <div className="md:hidden">
              <input
                type="text"
                value={userInput}
                readOnly
                placeholder="Usa el teclado de abajo..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-lg text-center"
              />
            </div>
            
            {/* Virtual Keyboard - Mobile only */}
            <div className="md:hidden mt-4">
              {/* Row 1 */}
              <div className="flex gap-1 justify-center mb-2">
                {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(key => (
                  <button
                    key={key}
                    onClick={() => setUserInput(prev => prev + key.toLowerCase())}
                    className="w-8 h-10 flex items-center justify-center rounded font-bold text-sm bg-gray-200 hover:bg-gray-300 transition"
                  >
                    {key}
                  </button>
                ))}
              </div>
              {/* Row 2 */}
              <div className="flex gap-1 justify-center mb-2">
                {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'].map(key => (
                  <button
                    key={key}
                    onClick={() => setUserInput(prev => prev + key.toLowerCase())}
                    className="w-8 h-10 flex items-center justify-center rounded font-bold text-sm bg-gray-200 hover:bg-gray-300 transition"
                  >
                    {key}
                  </button>
                ))}
              </div>
              {/* Row 3 */}
              <div className="flex gap-1 justify-center mb-2">
                {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(key => (
                  <button
                    key={key}
                    onClick={() => setUserInput(prev => prev + key.toLowerCase())}
                    className="w-8 h-10 flex items-center justify-center rounded font-bold text-sm bg-gray-200 hover:bg-gray-300 transition"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={() => setUserInput(prev => prev.slice(0, -1))}
                  className="w-12 h-10 flex items-center justify-center rounded font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition"
                  title="Borrar"
                >
                  ⌫
                </button>
              </div>
              {/* Row 4 - Accented vowels */}
              <div className="flex gap-1 justify-center mb-2">
                {['á', 'é', 'í', 'ó', 'ú'].map(key => (
                  <button
                    key={key}
                    onClick={() => setUserInput(prev => prev + key)}
                    className="w-12 h-10 flex items-center justify-center rounded font-bold text-sm bg-blue-200 hover:bg-blue-300 transition"
                  >
                    {key}
                  </button>
                ))}
              </div>
              {/* Submit button centered */}
              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  className="px-12 py-2 bg-deep-blue hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  Enviar
                </button>
              </div>
            </div>
            
            {feedback && (
              <p className={`mt-3 text-center font-bold ${
                feedback.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {feedback.text}
              </p>
            )}
            <p className="hidden md:block mt-2 text-xs text-gray-500 text-center">
              Usa las teclas 1-5 para vocales con tilde (á é í ó ú)
            </p>
          </div>
        </div>

        {/* Level Transition Overlay */}
        {showLevelTitle && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div style={{
              animation: 'popIn 0.6s ease-out',
              animationFillMode: 'both'
            }}>
              <h1 
                className="text-8xl font-black text-white tracking-wider"
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
        `}} />

        {/* Cobi Sensei (solo desktop) */}
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible">
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

        {/* Chat Window durante el juego */}
        {showChatWindow && gameState === 'PLAYING' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <p className="text-7xl mb-4">⏸️</p>
          <h1 className="text-4xl font-black text-deep-blue mb-2">Pausa</h1>
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
        <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible">
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

        {/* Chat Window en pausa */}
        {showChatWindow && gameState === 'PAUSED' && (
          <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
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

  // --- GAMEOVER STATE ---
  // Cambiar avatar y mensaje al estado de fallo
  if (cobiSenseiAvatar !== './data/images/cobi-sensei-fallo.webp') {
    setCobiSenseiAvatar('./data/images/cobi-sensei-fallo.webp');
    setCobiSenseiMessage(seleccionarMensajeSenseiRandom('fallo'));
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
        <p className="text-7xl mb-4">💔</p>
        <h1 className="text-4xl font-black text-deep-blue mb-2">Fin del Juego</h1>
        <p className="text-lg text-gray-600 mb-2">Puntuación Final</p>
        <p className="text-5xl font-black text-spanish-red mb-4">{score}</p>
        <p className="text-gray-600 mb-6">Nivel alcanzado: {gameLevel}</p>
        <div className="space-y-3">
          <button
            onClick={handleStartGame}
            className="w-full bg-deep-blue hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
          >
            Jugar de Nuevo
          </button>
          <button
            onClick={() => {
              setGameState('LEVEL_SELECT');
              // Resetear avatar al estado normal
              setCobiSenseiAvatar('./data/images/cobi-sensei.webp');
              setCobiSenseiMessage(seleccionarMensajeSenseiRandom('juego'));
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
          >
            Cambiar Configuración
          </button>
        </div>
      </div>

      {/* Cobi Sensei Fallo (solo desktop) */}
      <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible">
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

      {/* Chat Window de GAMEOVER */}
      {showChatWindow && gameState === 'GAMEOVER' && (
        <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
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
