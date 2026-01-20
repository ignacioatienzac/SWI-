import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Info, X, Pause, Play } from 'lucide-react';
import { getFilteredVerbs, getAvailableTenses } from '../services/powerVerbsService';
import { PowerVerb, GameDifficulty, GameMode, BattleMode } from '../types';

interface PowerOfVerbsGameProps {
  onBack: () => void;
}

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
  
  // Image refs for rendering
  const enemyImagesRef = useRef<HTMLImageElement[]>([]);
  const bossImageRef = useRef<HTMLImageElement | null>(null);
  const wizardImageRef = useRef<HTMLImageElement | null>(null);
  const imagesLoadedRef = useRef<boolean>(false);

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
  
  // Load images on mount
  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    
    // Load enemy images
    for (let i = 1; i <= 6; i++) {
      const img = new Image();
      img.src = `${baseUrl}data/images/enemigo_${i}.png`;
      enemyImagesRef.current.push(img);
    }
    
    // Load boss image
    const bossImg = new Image();
    bossImg.src = `${baseUrl}data/images/Jefe.png`;
    bossImageRef.current = bossImg;
    
    // Load wizard image
    const wizardImg = new Image();
    wizardImg.src = `${baseUrl}data/images/Mago.png`;
    wizardImageRef.current = wizardImg;
    
    // Wait for all images to load
    Promise.all([
      ...enemyImagesRef.current.map(img => new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve; // Continue even if image fails
      })),
      new Promise(resolve => {
        bossImg.onload = resolve;
        bossImg.onerror = resolve;
      }),
      new Promise(resolve => {
        wizardImg.onload = resolve;
        wizardImg.onerror = resolve;
      })
    ]).then(() => {
      imagesLoadedRef.current = true;
    });
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
    
    const pool = await getFilteredVerbs(selectedGrammar, selectedTense, selectedVerbType);
    if (pool.length === 0) {
      setFeedbackMsg({ text: 'No hay verbos disponibles para esta configuración.', type: 'error' });
      return;
    }

    setVerbsPool(pool);
    setScore(0);
    setAttackPower(1);
    setLives(DIFFICULTY_SETTINGS[selectedDifficulty].castleLives);
    monstersRef.current = [];
    projectilesRef.current = [];
    bossRef.current = null;
    gameStartTimeRef.current = performance.now();
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
    
    const currentSpawnRate = Math.max(settings.minSpawnRate, settings.spawnRate - (score * 2));

    if (time - lastSpawnRef.current > currentSpawnRate) {
      const groundLevel = canvasHeight - 40;
      
      // Define 6 enemy types with progressive difficulty
      // enemigo_1 (weakest) to enemigo_6 (strongest)
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
      lastSpawnRef.current = time;
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
       const heroY = heroRef.current.y;
       // Increase projectile size to match larger elements
       const projectileSize = 35;
       projectilesRef.current.push({
         x: 80,
         y: heroY + 10,
         width: projectileSize,
         height: projectileSize,
         speed: 6,
         power: Math.max(1, attackPower),
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
          if (
            p.x < m.x + m.width && p.x + p.width > m.x &&
            p.y < m.y + m.height && p.y + p.height > m.y
          ) {
            m.hp -= p.power;
            hit = true;
            playHit(); // Play hit sound
            if (m.hp <= 0) {
              setScore(prev => prev + m.points);
              monstersRef.current.splice(j, 1);
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

    // In contrarreloj mode, check target score
    if (selectedBattleMode === 'contrarreloj' && selectedDifficulty && score >= DIFFICULTY_SETTINGS[selectedDifficulty].targetScore) {
        playVictory(); // Play victory sound
        setGameState('VICTORY');
    }
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
    const wizardSize = Math.floor((canvasHeight - groundHeight) * 0.28);
    
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
        ctx.fillText(p.emoji, p.x, p.y + p.height);
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
    
    if (isCorrect) {
        playSuccess();
        setAttackPower(prev => Math.min(prev + 1, 10));
        setFeedbackMsg({ text: '¡Correcto! +Poder', type: 'success' });
        setTimeout(() => pickNewVerb(verbsPool), 600);
    } else {
        playError();
        const newFailureCount = consecutiveFailures + 1;
        setConsecutiveFailures(newFailureCount);
        setAttackPower(prev => Math.max(1, prev - 1));
        
        // Only show answer after 3 consecutive failures
        if (newFailureCount >= 3) {
          setFeedbackMsg({ text: `Incorrecto. La respuesta es: ${validAnswers[0]}`, type: 'error' });
        } else {
          setFeedbackMsg({ text: `Incorrecto. Intenta de nuevo (${newFailureCount}/3)`, type: 'error' });
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
                        className={`flex-1 py-3 rounded-xl border-2 font-bold text-base capitalize transition-all ${
                            selectedGrammar === g ? 'border-spanish-red bg-red-50 text-spanish-red' : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                            className={`py-2 px-4 rounded-lg border font-medium capitalize text-base transition-all ${
                                selectedTense === t ? 'bg-deep-blue text-white border-deep-blue' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {t}
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
                        className={`flex-1 py-2 rounded-lg border font-medium text-base capitalize transition-all ${
                            selectedVerbType === t ? 'bg-spanish-yellow text-deep-blue border-spanish-yellow' : 'bg-white text-gray-600 border-gray-200'
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
                    className={`p-6 rounded-xl border-2 text-center transition-all ${selectedBattleMode === 'contrarreloj' ? 'border-spanish-red bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <div className="text-5xl mb-2">⏱️</div>
                      <span className="block font-bold text-base text-deep-blue">Contrarreloj</span>
                      <span className="block text-sm text-gray-500 mt-1">Alcanza la puntuación objetivo</span>
                  </button>
                  <button 
                    onClick={() => setSelectedBattleMode('jefe')}
                    className={`p-6 rounded-xl border-2 text-center transition-all ${selectedBattleMode === 'jefe' ? 'border-spanish-red bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <div className="text-5xl mb-2">🐉</div>
                      <span className="block font-bold text-base text-deep-blue">Modo Jefe</span>
                      <span className="block text-sm text-gray-500 mt-1">Derrota al dragón</span>
                  </button>
               </div>
            </div>

            {/* Step 5: Mode */}
            <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">5. Modo de Respuesta</h3>
               <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedMode('write')}
                    className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${selectedMode === 'write' ? 'border-deep-blue bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <span className="block font-bold text-base text-deep-blue">Escribir</span>
                  </button>
                  <button 
                    onClick={() => setSelectedMode('choice')}
                    className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${selectedMode === 'choice' ? 'border-deep-blue bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <span className="block font-bold text-base text-deep-blue">Selección</span>
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
                            selectedDifficulty === d ? 'border-spanish-red bg-red-50 text-spanish-red' : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
      </div>
    );
  }

  // --- PLAYING STATE ---
  if (gameState === 'PLAYING') {
    return (
      <div className="min-h-screen bg-deep-blue p-4 flex flex-col items-center justify-center">
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

                {feedbackMsg.text && (
                  <p className={`mt-4 text-lg font-bold ${feedbackMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {feedbackMsg.text}
                  </p>
                )}
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
                <p>🎯 <strong>Modo Contrarreloj:</strong> Alcanza la puntuación objetivo para ganar</p>
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
      </div>
    );
  }

  return null;
};

export default PowerOfVerbsGame;
