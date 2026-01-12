import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const lastShotRef = useRef<number>(0);
  
  const heroRef = useRef({ x: 50, y: 0, width: 40, height: 40 }); // Y position set dynamically
  const monstersRef = useRef<Monster[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  
  // --- SELECTION LOGIC ---

  const getFilteredVerbs = () => {
    return powerVerbsData.filter(v => 
      v.mode === selectedGrammar &&
      v.tense === selectedTense &&
      (selectedVerbType === 'mixed' ? true : selectedVerbType === 'regular' ? v.regular : !v.regular)
    );
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
      // Generate options (1 correct + 3 distractors)
      const correct = randomVerb.answer[0];
      const distractors = pool
        .filter(v => v !== randomVerb) // Simple distractor logic: other verbs from pool
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(v => v.answer[0]);
      
      // If not enough distractors, generate fake ones (fallback)
      while (distractors.length < 3) {
         distractors.push(correct.split('').reverse().join('')); // Silly fallback
      }

      setChoiceOptions([correct, ...distractors].sort(() => 0.5 - Math.random()));
    }
  };

  // --- GAME LOOP & CANVAS ---

  const spawnMonster = (canvasWidth: number, canvasHeight: number, time: number) => {
    if (!selectedDifficulty) return;
    const settings = DIFFICULTY_SETTINGS[selectedDifficulty];
    
    // Calculate spawn rate (decreases as score increases to make it harder)
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
    // Move Monsters
    monstersRef.current.forEach(m => {
      m.x -= m.speed;
    });

    // Move Projectiles
    projectilesRef.current.forEach(p => {
      p.x += p.speed;
    });

    // Hero Shooting (Auto-fire)
    const now = performance.now();
    if (now - lastShotRef.current > 1000) { // 1 second cooldown
       const heroY = heroRef.current.y;
       projectilesRef.current.push({
         x: 80,
         y: heroY + 10,
         width: 20,
         height: 20,
         speed: 6,
         power: Math.max(1, attackPower), // Power comes from answering questions
         emoji: '🔥'
       });
       lastShotRef.current = now;
    }
  };

  const checkCollisions = () => {
    // Projectile vs Monster
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
      const p = projectilesRef.current[i];
      let hit = false;
      for (let j = monstersRef.current.length - 1; j >= 0; j--) {
        const m = monstersRef.current[j];
        if (
          p.x < m.x + m.width &&
          p.x + p.width > m.x &&
          p.y < m.y + m.height &&
          p.y + p.height > m.y
        ) {
          m.hp -= p.power;
          hit = true;
          if (m.hp <= 0) {
            setScore(prev => prev + m.points);
            monstersRef.current.splice(j, 1);
          }
          break; // Projectile destroys one enemy (or passes through? let's destroy it)
        }
      }
      if (hit || p.x > 1000) { // Remove if hit or out of bounds
        projectilesRef.current.splice(i, 1);
      }
    }

    // Monster vs Castle (Left side)
    for (let i = monstersRef.current.length - 1; i >= 0; i--) {
        const m = monstersRef.current[i];
        if (m.x <= 50) { // Castle wall position
            setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) setGameState('GAMEOVER');
                return newLives;
            });
            monstersRef.current.splice(i, 1);
        }
    }

    // Victory Condition
    if (selectedDifficulty && score >= DIFFICULTY_SETTINGS[selectedDifficulty].targetScore) {
        setGameState('VICTORY');
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ground
    const groundHeight = 40;
    const groundY = canvasHeight - groundHeight;
    ctx.fillStyle = '#556B2F';
    ctx.fillRect(0, groundY, canvasWidth, groundHeight);

    // Castle
    ctx.font = '60px Arial';
    ctx.fillText('🏰', 10, groundY - 5);
    
    // Hero
    // Update hero Y just in case canvas resized, keep on ground
    heroRef.current.y = groundY - 50;
    ctx.font = '40px Arial';
    ctx.fillText('🧙‍♂️', heroRef.current.x, groundY - 10);
    
    // Draw Aura based on power
    if (attackPower > 1) {
        ctx.beginPath();
        ctx.arc(heroRef.current.x + 20, groundY - 30, 25 + (attackPower * 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(0.5, attackPower * 0.1)})`;
        ctx.fill();
    }

    // Monsters
    monstersRef.current.forEach(m => {
        ctx.font = '35px Arial';
        ctx.fillText(m.emoji, m.x, m.y + 35);
        
        // HP Bar
        ctx.fillStyle = 'red';
        ctx.fillRect(m.x, m.y - 10, 40, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(m.x, m.y - 10, 40 * (m.hp / m.maxHp), 5);
    });

    // Projectiles
    projectilesRef.current.forEach(p => {
        ctx.font = '20px Arial';
        ctx.fillText(p.emoji, p.x, p.y + 20);
    });
  };

  const gameLoop = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;

    if (!lastTimeRef.current) lastTimeRef.current = time;
    // const deltaTime = time - lastTimeRef.current; // can use for frame independence
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
  }, [gameState, score, attackPower]); // Dependencies that might change logic inside loop

  useEffect(() => {
    if (gameState === 'PLAYING') {
        requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, gameLoop]);

  // --- INTERACTION HANDLERS ---

  const handleAnswer = (answer: string) => {
    if (!currentVerb) return;
    
    // Check if correct (simple string match)
    const isCorrect = currentVerb.answer.some(a => a.toLowerCase() === answer.toLowerCase().trim());
    
    if (isCorrect) {
        setAttackPower(prev => Math.min(prev + 1, 10)); // Cap power
        setFeedbackMsg({ text: '¡Correcto! +Poder', type: 'success' });
        setTimeout(() => {
            pickNewVerb(verbsPool);
        }, 600);
    } else {
        setAttackPower(prev => Math.max(1, prev - 1));
        setFeedbackMsg({ text: `Incorrecto. Era: ${currentVerb.answer[0]}`, type: 'error' });
    }
  };

  const insertChar = (char: string) => {
      setUserInput(prev => prev + char);
      // Focus back on input
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

            {/* Step 2: Tense */}
            <div>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">2. Tiempo Verbal</h3>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {['presente', 'indefinido', 'futuro simple'].map(t => (
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
                    className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${selectedMode === 'write' ? 'border-deep-blue bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <span className="block font-bold text-lg text-deep-blue">Escribir</span>
                      <span className="text-sm text-gray-500">Escribe la conjugación correcta.</span>
                  </button>
                  <button 
                    onClick={() => setSelectedMode('choice')}
                    className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${selectedMode === 'choice' ? 'border-deep-blue bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                      <span className="block font-bold text-lg text-deep-blue">Selección</span>
                      <span className="text-sm text-gray-500">Elige entre opciones.</span>
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
                            selectedDifficulty === d 
                                ? d === 'facil' ? 'bg-green-100 border-green-300 text-green-800' 
                                : d === 'intermedio' ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                : 'bg-red-100 border-red-300 text-red-800'
                                : 'bg-white border-gray-200 text-gray-400'
                        }`}
                    >
                        {d}
                    </button>
                 ))}
               </div>
            </div>

            <div className="pt-4">
                {feedbackMsg.type === 'error' && <p className="text-red-500 text-center mb-4">{feedbackMsg.text}</p>}
                <button 
                    onClick={handleStartGame}
                    disabled={!selectedTense || !selectedVerbType || !selectedMode || !selectedDifficulty}
                    className="w-full py-4 bg-spanish-red text-white font-black text-xl rounded-xl shadow-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1"
                >
                    ¡COMENZAR DEFENSA!
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* Top Bar (HUD) */}
      <div className="bg-deep-blue text-white p-2 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4">
            <button onClick={() => setGameState('PAUSED')} className="p-2 hover:bg-white/10 rounded-full">
                {gameState === 'PAUSED' ? <Play size={20} /> : <Pause size={20} />}
            </button>
            <div>
                <span className="text-xs text-gray-300 block">CASTILLO</span>
                <span className="font-bold text-xl text-red-400">{'❤️'.repeat(lives)}</span>
            </div>
        </div>

        <div className="flex flex-col items-center">
            <span className="text-xs text-gray-300 uppercase tracking-wider">Puntuación</span>
            <span className="font-black text-2xl text-spanish-yellow">{score}</span>
        </div>

        <div className="flex items-center gap-4">
             <div className="text-right">
                <span className="text-xs text-gray-300 block">PODER</span>
                <span className="font-bold text-xl text-blue-300">{'⚡'.repeat(attackPower)}</span>
            </div>
            <button onClick={() => setInstructionsOpen(true)} className="p-2 hover:bg-white/10 rounded-full">
                <Info size={20} />
            </button>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative flex-grow bg-blue-200 cursor-crosshair">
        <canvas 
            ref={canvasRef} 
            width={window.innerWidth} 
            height={window.innerHeight * 0.55}
            className="w-full h-full block"
        />
        
        {/* Overlays (Pause, Game Over) */}
        {(gameState === 'PAUSED' || gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                 <div className="bg-white p-8 rounded-3xl text-center max-w-md shadow-2xl animate-in zoom-in-95">
                     {gameState === 'PAUSED' && (
                         <>
                             <h2 className="text-3xl font-black text-deep-blue mb-4">Pausa</h2>
                             <button onClick={() => setGameState('PLAYING')} className="w-full py-3 bg-spanish-yellow text-deep-blue font-bold rounded-xl mb-3 hover:bg-yellow-400">Continuar</button>
                             <button onClick={() => setGameState('SELECTION')} className="w-full py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">Salir</button>
                         </>
                     )}
                     {gameState === 'GAMEOVER' && (
                         <>
                             <div className="text-6xl mb-4">💀</div>
                             <h2 className="text-4xl font-black text-spanish-red mb-2">¡GAME OVER!</h2>
                             <p className="text-gray-600 mb-6">Los monstruos han invadido el castillo.</p>
                             <div className="text-2xl font-bold mb-8">Puntos: {score}</div>
                             <button onClick={handleStartGame} className="w-full py-3 bg-deep-blue text-white font-bold rounded-xl mb-3 hover:bg-blue-900">Reintentar</button>
                             <button onClick={() => setGameState('SELECTION')} className="w-full py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">Menú Principal</button>
                         </>
                     )}
                      {gameState === 'VICTORY' && (
                         <>
                             <div className="text-6xl mb-4">🏆</div>
                             <h2 className="text-4xl font-black text-spanish-yellow mb-2">¡VICTORIA!</h2>
                             <p className="text-gray-600 mb-6">El castillo está a salvo gracias a tu gramática.</p>
                             <div className="text-2xl font-bold mb-8">Puntos: {score}</div>
                             <button onClick={() => setGameState('SELECTION')} className="w-full py-3 bg-deep-blue text-white font-bold rounded-xl hover:bg-blue-900">Continuar</button>
                         </>
                     )}
                 </div>
             </div>
        )}
      </div>

      {/* Control Panel (Questions) */}
      <div className="bg-white p-4 border-t-4 border-deep-blue shadow-lg h-[35vh] flex flex-col z-10">
         
         <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
            {currentVerb ? (
                <>
                    {/* Question Display */}
                    <div className="flex items-center justify-center gap-6 mb-6">
                        <div className="text-center">
                             <span className="block text-xs uppercase text-gray-400 font-bold tracking-widest">Pronombre</span>
                             <span className="text-2xl md:text-3xl font-bold text-green-600">{currentVerb.pronoun}</span>
                        </div>
                        <div className="text-2xl text-gray-300">➜</div>
                        <div className="text-center">
                             <span className="block text-xs uppercase text-gray-400 font-bold tracking-widest">Verbo</span>
                             <span className="text-3xl md:text-4xl font-black text-deep-blue">{currentVerb.verb}</span>
                        </div>
                    </div>

                    {/* Input Mode */}
                    {selectedMode === 'write' && (
                        <div className="relative max-w-md mx-auto w-full">
                             <div className="flex gap-2 mb-2 justify-center">
                                 {['á','é','í','ó','ú','ñ'].map(char => (
                                     <button key={char} onClick={() => insertChar(char)} className="w-8 h-8 bg-gray-100 rounded hover:bg-gray-200 font-bold text-gray-600 text-sm border border-gray-300">{char}</button>
                                 ))}
                             </div>
                             <form onSubmit={(e) => { e.preventDefault(); handleAnswer(userInput); }} className="flex gap-2">
                                <input 
                                    id="verb-input"
                                    type="text" 
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="Escribe la conjugación..."
                                    className={`flex-1 p-3 text-lg border-2 rounded-xl focus:outline-none text-center font-bold ${feedbackMsg.type === 'error' ? 'border-red-500 bg-red-50 animate-shake' : feedbackMsg.type === 'success' ? 'border-green-500 bg-green-50' : 'border-gray-300 focus:border-deep-blue'}`}
                                    autoComplete="off"
                                    autoFocus
                                />
                                <button type="submit" className="bg-deep-blue text-white px-6 rounded-xl font-bold hover:bg-blue-900">
                                    ATACAR
                                </button>
                             </form>
                        </div>
                    )}

                    {/* Choice Mode */}
                    {selectedMode === 'choice' && (
                        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto w-full">
                            {choiceOptions.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleAnswer(opt)}
                                    className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 font-bold text-lg text-gray-700 transition-all active:scale-95"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Feedback */}
                    <div className="h-8 mt-2 text-center font-bold">
                        <span className={feedbackMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}>
                            {feedbackMsg.text}
                        </span>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-400">Cargando...</div>
            )}
         </div>
      </div>

      {/* Instructions Modal */}
      {instructionsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full relative">
                  <button onClick={() => setInstructionsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X size={24} />
                  </button>
                  <h3 className="text-2xl font-bold text-deep-blue mb-4 flex items-center gap-2">
                      <Info className="text-spanish-red" /> Cómo Jugar
                  </h3>
                  <ul className="space-y-3 text-gray-600 mb-6">
                      <li className="flex gap-3">
                          <span className="text-2xl">🧙‍♂️</span>
                          <span>Eres el mago. Tu poder de ataque depende de tus respuestas correctas.</span>
                      </li>
                      <li className="flex gap-3">
                          <span className="text-2xl">👾</span>
                          <span>Los monstruos atacan el castillo. Si llegan al muro izquierdo, pierdes vidas.</span>
                      </li>
                      <li className="flex gap-3">
                          <span className="text-2xl">⚡</span>
                          <span>Responde rápido y bien para aumentar tu daño y lanzar bolas de fuego más grandes.</span>
                      </li>
                  </ul>
                  <button onClick={() => setInstructionsOpen(false)} className="w-full py-3 bg-spanish-yellow text-deep-blue font-bold rounded-xl hover:bg-yellow-400">
                      ¡Entendido!
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default PowerOfVerbsGame;
