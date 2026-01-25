import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Pause } from 'lucide-react';
import {
  loadVerbData,
  getFilteredVerbs,
  generateChallenge,
  validateAnswer,
  calculateScore,
  getFallSpeed,
  getSpawnRate,
  VerbLevel,
  VerbType,
  GameMode,
  BubbleChallenge,
  VerbData
} from '../services/verbMasterService';

interface VerbMasterGameProps {
  onBack: () => void;
}

type GameState = 'LEVEL_SELECT' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

interface Bubble {
  id: string;
  challenge: BubbleChallenge;
  x: number;
  y: number;
  radius: number;
  speed: number;
}

const VerbMasterGame: React.FC<VerbMasterGameProps> = ({ onBack }) => {
  // Game configuration
  const [selectedLevel, setSelectedLevel] = useState<VerbLevel | null>(null);
  const [selectedVerbType, setSelectedVerbType] = useState<VerbType | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('LEVEL_SELECT');
  const [score, setScore] = useState(0);
  const [gameLevel, setGameLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(5);
  
  // Input state
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Game data
  const [verbPool, setVerbPool] = useState<VerbData[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  
  const canvasWidth = 800;
  const canvasHeight = 600;
  const groundY = canvasHeight - 50;

  // Load verb data on mount
  useEffect(() => {
    loadVerbData();
  }, []);

  // Start game
  const handleStartGame = async () => {
    if (!selectedLevel || !selectedVerbType || !selectedMode) return;
    
    const verbs = await getFilteredVerbs(selectedLevel, selectedVerbType, 'presente');
    if (verbs.length === 0) {
      alert('No hay verbos disponibles para esta configuración');
      return;
    }
    
    setVerbPool(verbs);
    setScore(0);
    setGameLevel(1);
    setStreak(0);
    setLives(5);
    bubblesRef.current = [];
    setGameState('PLAYING');
  };

  // Spawn new bubble
  const spawnBubble = (verbs: VerbData[], currentTime: number) => {
    const spawnRate = getSpawnRate(gameLevel);
    
    if (currentTime - lastSpawnRef.current > spawnRate && verbs.length > 0) {
      const challenge = generateChallenge(verbs, selectedMode!);
      if (!challenge) return;
      
      const radius = 40 + Math.random() * 20;
      const x = radius + Math.random() * (canvasWidth - radius * 2);
      
      bubblesRef.current.push({
        id: challenge.id,
        challenge,
        x,
        y: -radius,
        radius,
        speed: getFallSpeed(gameLevel)
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
      // Clear canvas
      ctx.fillStyle = '#E8F4F8';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw ground
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(0, groundY, canvasWidth, canvasHeight - groundY);
      
      // Spawn bubbles
      spawnBubble(verbPool, currentTime);
      
      // Update and draw bubbles
      bubblesRef.current = bubblesRef.current.filter(bubble => {
        bubble.y += bubble.speed;
        
        // Check if bubble reached ground
        if (bubble.y + bubble.radius >= groundY) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('GAMEOVER');
            }
            return newLives;
          });
          setStreak(0);
          return false;
        }
        
        // Draw photorealistic soap bubble effect
        ctx.save();
        
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
        
        // LAYER 2: Iridescent interference pattern (thin film effect)
        // Creating swirling rainbow colors
        ctx.globalCompositeOperation = 'screen';
        
        // First iridescent layer - cyan/magenta swirl
        const irid1 = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.2, 0,
          bubble.x, bubble.y, bubble.radius * 0.9
        );
        irid1.addColorStop(0, 'rgba(0, 255, 255, 0.08)');
        irid1.addColorStop(0.3, 'rgba(255, 0, 255, 0.12)');
        irid1.addColorStop(0.6, 'rgba(255, 255, 0, 0.08)');
        irid1.addColorStop(1, 'rgba(0, 255, 200, 0.06)');
        
        ctx.fillStyle = irid1;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Second iridescent layer - complementary colors
        const irid2 = ctx.createRadialGradient(
          bubble.x + bubble.radius * 0.2, bubble.y + bubble.radius * 0.3, 0,
          bubble.x, bubble.y, bubble.radius
        );
        irid2.addColorStop(0, 'rgba(255, 100, 200, 0.1)');
        irid2.addColorStop(0.4, 'rgba(100, 200, 255, 0.12)');
        irid2.addColorStop(0.7, 'rgba(200, 255, 100, 0.08)');
        irid2.addColorStop(1, 'rgba(255, 150, 255, 0.06)');
        
        ctx.fillStyle = irid2;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
        
        // LAYER 3: Fresnel edge effect (thicker glass appearance at edges)
        const fresnelGradient = ctx.createRadialGradient(
          bubble.x, bubble.y, bubble.radius * 0.7,
          bubble.x, bubble.y, bubble.radius
        );
        fresnelGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        fresnelGradient.addColorStop(0.7, 'rgba(200, 230, 255, 0.15)');
        fresnelGradient.addColorStop(0.9, 'rgba(180, 210, 240, 0.3)');
        fresnelGradient.addColorStop(1, 'rgba(160, 190, 230, 0.4)');
        
        ctx.fillStyle = fresnelGradient;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 4: Sharp white border (outer edge definition)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow edge
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius - 1.5, 0, Math.PI * 2);
        ctx.stroke();
        
        // LAYER 5: Main specular highlight (large curved reflection)
        const mainHighlight = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.4, bubble.y - bubble.radius * 0.4, 0,
          bubble.x - bubble.radius * 0.4, bubble.y - bubble.radius * 0.4, bubble.radius * 0.5
        );
        mainHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        mainHighlight.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
        mainHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
        mainHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = mainHighlight;
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.radius * 0.4, bubble.y - bubble.radius * 0.4, bubble.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 6: Secondary sharp highlight (small intense spot)
        const sharpHighlight = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.35, 0,
          bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.35, bubble.radius * 0.15
        );
        sharpHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        sharpHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        sharpHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = sharpHighlight;
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.35, bubble.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 7: Bottom light catch (opposite side reflection)
        const bottomHighlight = ctx.createRadialGradient(
          bubble.x + bubble.radius * 0.35, bubble.y + bubble.radius * 0.45, 0,
          bubble.x + bubble.radius * 0.35, bubble.y + bubble.radius * 0.45, bubble.radius * 0.3
        );
        bottomHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        bottomHighlight.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
        bottomHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = bottomHighlight;
        ctx.beginPath();
        ctx.arc(bubble.x + bubble.radius * 0.35, bubble.y + bubble.radius * 0.45, bubble.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // LAYER 8: Subtle rim light on right side
        const rimLight = ctx.createRadialGradient(
          bubble.x + bubble.radius * 0.7, bubble.y, 0,
          bubble.x + bubble.radius * 0.7, bubble.y, bubble.radius * 0.4
        );
        rimLight.addColorStop(0, 'rgba(180, 220, 255, 0.3)');
        rimLight.addColorStop(1, 'rgba(180, 220, 255, 0)');
        
        ctx.fillStyle = rimLight;
        ctx.beginPath();
        ctx.arc(bubble.x + bubble.radius * 0.7, bubble.y, bubble.radius * 0.4, 0, Math.PI * 2);
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
      
      // Check for level up
      if (score > 0 && score % 100 === 0 && score !== (gameLevel - 1) * 100) {
        setGameLevel(prev => prev + 1);
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, verbPool, gameLevel, selectedMode, score]);

  // Handle answer submission
  const handleSubmit = () => {
    if (!userInput.trim() || bubblesRef.current.length === 0) return;
    
    // Try to match with any bubble
    let matched = false;
    bubblesRef.current = bubblesRef.current.filter(bubble => {
      if (!matched && validateAnswer(bubble.challenge, userInput)) {
        matched = true;
        const points = calculateScore(gameLevel, streak);
        setScore(prev => prev + points);
        setStreak(prev => prev + 1);
        setFeedback({ text: `¡Correcto! +${points}`, type: 'success' });
        setTimeout(() => setFeedback(null), 1000);
        return false;
      }
      return true;
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

            {/* Level Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nivel de Español
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['A1', 'A2', 'B1', 'B2'] as VerbLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`py-3 rounded-lg border-2 font-bold transition-all ${
                      selectedLevel === level
                        ? 'border-deep-blue bg-deep-blue text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
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
                        ? 'border-spanish-red bg-spanish-red text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selection */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Modo de Juego
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedMode('conjugate')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMode === 'conjugate'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-gray-800 mb-1">Conjugar</div>
                  <div className="text-sm text-gray-600">
                    Ver: "hablar, yo" → Escribir: "hablo"
                  </div>
                </button>
                <button
                  onClick={() => setSelectedMode('identify')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMode === 'identify'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-gray-800 mb-1">Identificar</div>
                  <div className="text-sm text-gray-600">
                    Ver: "hablo" → Escribir: "hablar, yo"
                  </div>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              disabled={!selectedLevel || !selectedVerbType || !selectedMode}
              className="w-full py-4 bg-gradient-to-r from-deep-blue to-blue-600 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-xl rounded-xl transition-all shadow-lg"
            >
              Comenzar Juego
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING STATE ---
  if (gameState === 'PLAYING') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 bg-white rounded-2xl p-4 shadow-md">
            <button
              onClick={() => setGameState('LEVEL_SELECT')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex gap-8 text-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">PUNTUACIÓN</p>
                <p className="text-2xl font-black text-deep-blue">{score}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">NIVEL</p>
                <p className="text-2xl font-black text-green-600">{gameLevel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">RACHA</p>
                <p className="text-2xl font-black text-orange-500">{streak}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">VIDAS</p>
                <p className="text-2xl font-black text-red-500">{'❤️'.repeat(lives)}</p>
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
          <div className="bg-white rounded-2xl overflow-hidden shadow-xl mb-4">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full"
            />
          </div>

          {/* Input */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex gap-3">
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
            {feedback && (
              <p className={`mt-3 text-center font-bold ${
                feedback.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {feedback.text}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500 text-center">
              Usa las teclas 1-5 para vocales con tilde (á é í ó ú)
            </p>
          </div>
        </div>
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
      </div>
    );
  }

  // --- GAMEOVER STATE ---
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
            onClick={() => setGameState('LEVEL_SELECT')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
          >
            Cambiar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerbMasterGame;
