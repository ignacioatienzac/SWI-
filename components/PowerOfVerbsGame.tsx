import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, RefreshCw, Play, Pause, Info, X } from 'lucide-react';
import { powerVerbsData } from '../services/powerVerbsData';
import { PowerVerb, GameDifficulty, GameMode } from '../types';

interface PowerOfVerbsGameProps {
  onBack: () => void;
}

// --- GAME CONSTANTS & CONFIGURATION ---
const CANVAS_ASPECT_RATIO = 16 / 9;

const DIFFICULTY_SETTINGS = {
  facil: {
    label: 'Fácil',
    castleLives: 10,
    targetScore: 500,
    spawnRate: 3500,
    minSpawnRate: 1200,
    enemySpeedMultiplier: 0.8,
  },
  intermedio: {
    label: 'Intermedio',
    castleLives: 5,
    targetScore: 1000,
    spawnRate: 3000,
    minSpawnRate: 800,
    enemySpeedMultiplier: 1.0,
  },
  dificil: {
    label: 'Difícil',
    castleLives: 3,
    targetScore: 2000,
    spawnRate: 2500,
    minSpawnRate: 500,
    enemySpeedMultiplier: 1.3,
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
  color: string;
  points: number;
}

interface Projectile extends Entity {
  speed: number;
  power: number;
  emoji: string;
}

// --- COMPONENT ---
const PowerOfVerbsGame: React.FC<PowerOfVerbsGameProps> = ({ onBack }) => {
  // UI State
  const [gameState, setGameState] = useState<GameState>('SELECTION');
  const [selectedGrammar, setSelectedGrammar] = useState<string>('indicativo');
  const [selectedTense, setSelectedTense] = useState<string>('');
  const [selectedVerbType, setSelectedVerbType] = useState<string>('');
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
  
  // Canvas Refs (Mutable game state to avoid re-renders)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const lastShotRef = useRef<number>(0);
  
  const heroRef = useRef({ x: 50, y: 0, width: 40, height: 40 }); // Y position set dynamically
  const monstersRef = useRef<Monster[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  
  // --- DYNAMIC DATA HELPERS ---
  const availableTenses = useMemo<string[]>(() => {
    const tenses = new Set<string>();
    powerVerbsData.forEach(v => {
      const mode = v.mode || 'indicativo';
      if (mode === selectedGrammar) {
        tenses.add(v.tense);
      }
    });
    // Explicit comparator for strings to satisfy strict TS configurations if necessary
    return Array.from(tenses).sort((a, b) => a.localeCompare(b));
  }, [selectedGrammar]);

  // Reset tense or select first available when grammar mode changes
  useEffect(() => {
    if (availableTenses.length > 0) {
        if (!selectedTense || !availableTenses.includes(selectedTense)) {
            // Auto-select the first tense to help the user
            setSelectedTense(availableTenses[0]);
        }
    } else {
        setSelectedTense('');
    }
  }, [selectedGrammar, availableTenses, selectedTense]);

  // --- SELECTION LOGIC ---

  const getFilteredVerbs = () => {
    return powerVerbsData.filter(v => {
      const mode = v.mode || 'indicativo';
      return mode === selectedGrammar &&
             v.tense === selectedTense &&
             (selectedVerbType === 'mixed' ? true : selectedVerbType === 'regular' ? v.regular : !v.regular);
    });
  };

  const handleStartGame = () => {
    if (!selectedTense || !selectedVerbType || !selectedMode || !selectedDifficulty) return;
    
    const pool = getFilteredVerbs();
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
    setGameState('PLAYING');
    pickNewVerb(pool);
  };

  const pickNewVerb = (pool: PowerVerb[]) => {
    if (pool.length === 0) return;
    const randomVerb = pool[Math.floor(Math.random() * pool.length)];
    setCurrentVerb(randomVerb);
    setUserInput('');
    setFeedbackMsg({ text: '', type: '' });

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
    
    const currentSpawnRate = Math.max(settings.minSpawnRate, settings.spawnRate - (score * 2));

    if (time - lastSpawnRef.current > currentSpawnRate) {
      const groundLevel = canvasHeight - 40;
      const types = [
        { hp: 3, speed: 0.8, emoji: '👾', points: 10, color: '#8b5cf6' },
        { hp: 6, speed: 0.5, emoji: '👹', points: 20, color: '#ef4444' },
        { hp: 2, speed: 1.2, emoji: '👻', points: 15, color: '#ec4899' },
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      
      monstersRef.current.push({
        id: Date.now(),
        x: canvasWidth + 50,
        y: groundLevel - 40,
        width: 40,
        height: 40,
        hp: type.hp,
        maxHp: type.hp,
        speed: type.speed * settings.enemySpeedMultiplier,
        emoji: type.emoji,
        color: type.color,
        points: type.points
      });
      lastSpawnRef.current = time;
    }
  };

  const updateEntities = (canvasWidth: number) => {
    monstersRef.current.forEach(m => { m.x -= m.speed; });
    projectilesRef.current.forEach(p => { p.x += p.speed; });

    const now = performance.now();
    if (now - lastShotRef.current > 1000) { 
       const heroY = heroRef.current.y;
       projectilesRef.current.push({
         x: 80,
         y: heroY + 10,
         width: 20,
         height: 20,
         speed: 6,
         power: Math.max(1, attackPower),
         emoji: '🔥'
       });
       lastShotRef.current = now;
    }
  };

  const checkCollisions = () => {
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
      const p = projectilesRef.current[i];
      let hit = false;
      for (let j = monstersRef.current.length - 1; j >= 0; j--) {
        const m = monstersRef.current[j];
        if (
          p.x < m.x + m.width && p.x + p.width > m.x &&
          p.y < m.y + m.height && p.y + p.height > m.y
        ) {
          m.hp -= p.power;
          hit = true;
          if (m.hp <= 0) {
            setScore(prev => prev + m.points);
            monstersRef.current.splice(j, 1);
          }
          break;
        }
      }
      if (hit || p.x > 1000) projectilesRef.current.splice(i, 1);
    }

    for (let i = monstersRef.current.length - 1; i >= 0; i--) {
        const m = monstersRef.current[i];
        if (m.x <= 50) {
            setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) setGameState('GAMEOVER');
                return newLives;
            });
            monstersRef.current.splice(i, 1);
        }
    }

    if (selectedDifficulty && score >= DIFFICULTY_SETTINGS[selectedDifficulty].targetScore) {
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

    ctx.font = '60px Arial';
    ctx.fillText('🏰', 10, groundY - 5);
    
    heroRef.current.y = groundY - 50;
    ctx.font = '40px Arial';
    ctx.fillText('🧙‍♂️', heroRef.current.x, groundY - 10);
    
    if (attackPower > 1) {
        ctx.beginPath();
        ctx.arc(heroRef.current.x + 20, groundY - 30, 25 + (attackPower * 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(0.5, attackPower * 0.1)})`;
        ctx.fill();
    }

    monstersRef.current.forEach(m => {
        ctx.font = '35px Arial';
        ctx.fillText(m.emoji, m.x, m.y + 35);
        ctx.fillStyle = 'red';
        ctx.fillRect(m.x, m.y - 10, 40, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(m.x, m.y - 10, 40 * (m.hp / m.maxHp), 5);
    });

    projectilesRef.current.forEach(p => {
        ctx.font = '20px Arial';
        ctx.fillText(p.emoji, p.x, p.y + 20);
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
            updateEntities(canvas.width);
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

  // --- INTERACTION HANDLERS ---

  const handleAnswer = (answer: string) => {
    if (!currentVerb) return;
    
    // Normalize valid answers to array
    const validAnswers = Array.isArray(currentVerb.answer) 
        ? currentVerb.answer 
        : [currentVerb.answer];

    const isCorrect = validAnswers.some(a => a.toLowerCase() === answer.toLowerCase().trim());
    
    if (isCorrect) {
        setAttackPower(prev => Math.min(prev + 1, 10));
        setFeedbackMsg({ text: '¡Correcto! +Poder', type: 'success' });
        setTimeout(() => pickNewVerb(verbsPool), 600);
    } else {
        setAttackPower(prev => Math.max(1, prev - 1));
        setFeedbackMsg({ text: `Incorrecto. Era: ${validAnswers[0]}`, type: 'error' });
    }
  };

  const insertChar = (char: string) => {
      setUserInput(prev => prev + char);
      const input = document.getElementById('verb-input');
      if (input) input.focus();
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
                        className={`flex-1 py-3 rounded-xl border-2 font-bold capitalize transition-all ${
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
                            className={`py-2 px-4 rounded-lg border font-medium capitalize text-sm transition-all ${
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
                        className={`flex-1 py-2 rounded-lg border font-medium capitalize transition-all ${
                            selectedVerbType === t ? 'bg-spanish-yellow text-deep-blue border-spanish-yellow' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                    >
                        {t === 'mixed' ? 'Todos' : t}
                    </button>
                 ))}
               </div>
            </div>

            {/* Step 4: Mode */}
            <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">4. Modo de Juego</h3>
               <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedMode('write')}
                    className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${selectedMode === 'write' ? 'border-deep-blue bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <span className="block font-bold text-lg text-deep-blue">Escribir</span>
                  </button>
                  <button 
                    onClick={() => setSelectedMode('choice')}
                    className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${selectedMode === 'choice' ? 'border-deep-blue bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <span className="block font-bold text-lg text-deep-blue">Selección</span>
                  </button>
               </div>
            </div>

             {/* Step 5: Difficulty */}
             <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">5. Dificultad</h3>
               <div className="flex gap-3">
                 {(Object.keys(DIFFICULTY_SETTINGS) as GameDifficulty[]).map(d => (
                    <button
                        key={d}
                        onClick={() => setSelectedDifficulty(d)}
                        className={`flex-1 py-3 rounded-lg border font-bold capitalize transition-all ${
