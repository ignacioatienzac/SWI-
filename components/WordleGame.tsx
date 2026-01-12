import React, { useState, useEffect } from 'react';
import { generateSecretWord } from '../services/geminiService';
import { SecretWord } from '../types';
import { 
  RefreshCw, 
  Delete, 
  Info, 
  Calendar, 
  Lightbulb, 
  CircleHelp, 
  X,
  ChevronLeft
} from 'lucide-react';

interface WordleGameProps {
  onBack: () => void;
}

type GameStatus = 'SELECT_LEVEL' | 'LOADING' | 'PLAYING' | 'WON' | 'LOST';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const LEVELS = [
  { id: 'A1', label: 'Nivel A1', desc: 'Principiante', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'A2', label: 'Nivel A2', desc: 'Básico', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'B1', label: 'Nivel B1', desc: 'Intermedio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'B2', label: 'Nivel B2', desc: 'Avanzado', color: 'bg-red-100 text-red-800 border-red-200' },
];

const WordleGame: React.FC<WordleGameProps> = ({ onBack }) => {
  const [status, setStatus] = useState<GameStatus>('SELECT_LEVEL');
  const [target, setTarget] = useState<SecretWord | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toLocaleDateString('es-ES'));

  const startGame = async (level: string, date?: string) => {
    setStatus('LOADING');
    setSelectedLevel(level);
    setShowHint(false);
    
    const dateStr = date || new Date().toLocaleDateString('es-ES');
    setCurrentDate(dateStr);

    try {
      const data = await generateSecretWord(level, dateStr);
      if (data) {
        setTarget({ ...data, word: data.word.toUpperCase() });
        setGuesses([]);
        setCurrentGuess('');
        setStatus('PLAYING');
      } else {
        showError('Error al cargar la palabra.');
        setStatus('SELECT_LEVEL');
      }
    } catch (e) {
      showError('Error de conexión.');
      setStatus('SELECT_LEVEL');
    }
  };

  const handleKeyDown = (key: string) => {
    if (status !== 'PLAYING') return;

    if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) {
        showError('La palabra debe tener 5 letras');
        return;
      }
      submitGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-ZÑ]$/.test(key) && currentGuess.length < WORD_LENGTH) {
      setCurrentGuess(prev => prev + key);
    }
  };

  useEffect(() => {
    const handleNativeKey = (e: KeyboardEvent) => {
      // Do not handle if modifier keys are pressed (e.g. Cmd+R, Ctrl+C)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE') {
        handleKeyDown(key);
      } else if (/^[A-ZÑ]$/.test(key) && key.length === 1) {
        handleKeyDown(key);
      }
    };
    window.addEventListener('keydown', handleNativeKey);
    return () => window.removeEventListener('keydown', handleNativeKey);
  }, [currentGuess, status]);

  const submitGuess = () => {
    if (!target) return;
    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess === target.word) {
      setStatus('WON');
    } else if (newGuesses.length >= MAX_GUESSES) {
      setStatus('LOST');
    }
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 2000);
  };

  const getLetterStatus = (letter: string, index: number, word: string) => {
    if (!target) return 'bg-white border-gray-300 text-black';
    
    const targetLetter = target.word[index];
    
    if (letter === targetLetter) return 'bg-green-500 border-green-500 text-white';
    if (target.word.includes(letter)) return 'bg-yellow-500 border-yellow-500 text-white';
    return 'bg-gray-500 border-gray-500 text-white';
  };

  const getKeyColor = (key: string) => {
    if (!target) return 'bg-gray-200 text-gray-800';
    
    let state = 'bg-gray-200 text-gray-800';
    
    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          if (target.word[i] === key) return 'bg-green-500 text-white';
          if (target.word.includes(key)) state = 'bg-yellow-500 text-white';
          else if (state !== 'bg-yellow-500 text-white') state = 'bg-gray-500 text-white';
        }
      }
    }
    return state;
  };

  const renderCalendar = () => {
    const dates = [];
    // Generate last 60 days (approx 2 months)
    for (let i = 0; i < 60; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d);
    }
    return (
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-96 overflow-y-auto p-2">
            {dates.map((date, idx) => {
                const dateStr = date.toLocaleDateString('es-ES');
                const isSelected = dateStr === currentDate;
                return (
                    <button
                        key={idx}
                        onClick={() => {
                            setShowCalendar(false);
                            if (selectedLevel) {
                              startGame(selectedLevel, dateStr);
                            }
                        }}
                        className={`p-2 rounded-lg text-sm font-bold flex flex-col items-center justify-center border transition-all
                            ${isSelected 
                              ? 'bg-spanish-red text-white border-spanish-red shadow-md' 
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-spanish-red/30'}
                        `}
                    >
                        <span className="text-lg">{date.getDate()}</span>
                        <span className="text-[10px] uppercase opacity-80">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                    </button>
                );
            })}
        </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (status === 'SELECT_LEVEL') {
      return (
          <div className="max-w-2xl mx-auto px-4 py-8">
              <button 
                  onClick={onBack}
                  className="mb-6 text-gray-500 hover:text-deep-blue font-medium flex items-center gap-2 transition-colors"
              >
                  <ChevronLeft size={20} /> Volver
              </button>
              
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                  <div className="text-center mb-10">
                      <div className="w-20 h-20 bg-gradient-to-br from-spanish-yellow to-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg transform rotate-3">
                          🧩
                      </div>
                      <h2 className="text-3xl font-extrabold text-deep-blue mb-3">Adivina la Palabra</h2>
                      <p className="text-gray-600 max-w-md mx-auto">Selecciona tu nivel para comenzar el reto diario. La IA generará una palabra única para ti.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {LEVELS.map((level) => (
                          <button
                              key={level.id}
                              onClick={() => startGame(level.id)}
                              className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group flex flex-col gap-2 ${level.color} bg-opacity-30 border-opacity-50 hover:bg-opacity-50`}
                          >
                              <div className="flex justify-between items-start w-full">
                                  <span className="text-xl font-bold">{level.label}</span>
                                  <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">→</span>
                              </div>
                              <span className="text-sm font-medium opacity-80">{level.desc}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  if (status === 'LOADING') {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-spanish-red mb-6" size={56} />
              <p className="text-xl text-deep-blue font-bold animate-pulse">Generando palabra secreta...</p>
              <p className="text-sm text-gray-500 mt-2">Consultando a Gemini AI</p>
          </div>
      );
  }

  return (
      <div className="max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
              <button onClick={() => setStatus('SELECT_LEVEL')} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                  <ChevronLeft size={24} className="text-deep-blue" />
              </button>
              
              <div className="text-center">
                <h1 className="text-2xl font-black text-deep-blue tracking-tight">WORDLE</h1>
                <span className="text-xs font-bold text-spanish-red bg-red-100 px-2 py-0.5 rounded-full">{selectedLevel}</span>
              </div>
              
              <div className="flex gap-1">
                   <button onClick={() => setShowCalendar(!showCalendar)} className={`p-2 rounded-full transition-colors relative ${showCalendar ? 'bg-spanish-red text-white' : 'hover:bg-white/50 text-deep-blue'}`}>
                      <Calendar size={22} />
                      {currentDate !== new Date().toLocaleDateString('es-ES') && !showCalendar && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-spanish-red rounded-full border border-cream"></span>
                      )}
                  </button>
                  <button 
                      onClick={() => setShowHint(!showHint)} 
                      className={`p-2 rounded-full transition-colors ${showHint ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-white/50 text-deep-blue'}`}
                      disabled={status !== 'PLAYING' && status !== 'WON' && status !== 'LOST'}
                  >
                      <Lightbulb size={22} />
                  </button>
                  <button onClick={() => setShowInstructions(true)} className="p-2 hover:bg-white/50 rounded-full transition-colors text-deep-blue">
                      <CircleHelp size={22} />
                  </button>
              </div>
          </div>

          {/* Calendar Dropdown */}
          {showCalendar && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2 z-20 relative">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
                      <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                          <h3 className="font-bold text-deep-blue flex items-center gap-2">
                            <Calendar size={16} /> Retos anteriores
                          </h3>
                          <button onClick={() => setShowCalendar(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                          </button>
                      </div>
                      {renderCalendar()}
                  </div>
              </div>
          )}

          {/* Game Grid */}
          <div className="flex-1 mb-8 flex flex-col justify-center">
              <div className="grid grid-rows-6 gap-2 mb-4 mx-auto w-full max-w-[350px]">
                  {/* Past Guesses */}
                  {guesses.map((guess, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2">
                          {guess.split('').map((letter, j) => (
                              <div 
                                  key={j} 
                                  className={`aspect-square flex items-center justify-center text-3xl font-bold rounded-lg shadow-sm border-2 ${getLetterStatus(letter, j, guess)} transition-all duration-500 transform flip-in-hor-bottom`}
                              >
                                  {letter}
                              </div>
                          ))}
                      </div>
                  ))}
                  
                  {/* Current Guess */}
                  {status === 'PLAYING' && guesses.length < MAX_GUESSES && (
                      <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: WORD_LENGTH }).map((_, i) => {
                              const letter = currentGuess[i] || '';
                              return (
                                  <div 
                                      key={i} 
                                      className={`aspect-square flex items-center justify-center text-3xl font-bold rounded-lg border-2 bg-white ${letter ? 'border-deep-blue text-deep-blue animate-bounce-short shadow-md' : 'border-gray-200'}`}
                                  >
                                      {letter}
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {/* Empty Rows */}
                  {Array.from({ length: Math.max(0, MAX_GUESSES - 1 - guesses.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="grid grid-cols-5 gap-2 opacity-60">
                          {Array.from({ length: WORD_LENGTH }).map((_, j) => (
                              <div key={j} className="aspect-square border-2 border-gray-200 rounded-lg bg-white/50"></div>
                          ))}
                      </div>
                  ))}
              </div>
          </div>

          {/* Toast Notification */}
          {errorMsg && (
              <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-fade-in-up font-medium">
                  {errorMsg}
              </div>
          )}

          {/* Hints Area */}
          {(status === 'PLAYING' || status === 'WON' || status === 'LOST') && target && showHint && (
              <div className="mb-6 min-h-[60px] flex items-center justify-center animate-in fade-in slide-in-from-bottom-2">
                   <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-spanish-yellow/50 text-center shadow-sm w-full">
                      <p className="text-xs text-spanish-yellow font-black uppercase tracking-widest mb-1">Pista</p>
                      <p className="text-deep-blue italic font-medium">"{target.hint}"</p>
                   </div>
              </div>
          )}

          {/* Keyboard */}
          <div className="w-full max-w-lg mx-auto pb-4">
              {['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'].map((row, i) => (
                  <div key={i} className="flex justify-center gap-1.5 mb-2">
                      {row.split('').map((key) => (
                          <button
                              key={key}
                              onClick={() => handleKeyDown(key)}
                              className={`h-12 w-8 sm:w-10 flex items-center justify-center font-bold rounded-md text-sm transition-all duration-150 ${getKeyColor(key)} shadow-sm hover:shadow active:scale-95 active:shadow-inner`}
                          >
                              {key}
                          </button>
                      ))}
                      {i === 2 && (
                          <button
                              onClick={() => handleKeyDown('BACKSPACE')}
                              className="h-12 w-12 sm:w-14 flex items-center justify-center bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 shadow-sm active:scale-95"
                          >
                              <Delete size={20} />
                          </button>
                      )}
                  </div>
              ))}
              <div className="flex justify-center mt-4">
                  <button
                      onClick={() => handleKeyDown('ENTER')}
                      className="h-12 w-full max-w-[200px] bg-deep-blue text-white font-bold rounded-lg shadow-lg hover:bg-blue-900 active:scale-95 transition-transform tracking-wide"
                  >
                      ENVIAR PALABRA
                  </button>
              </div>
          </div>

          {/* Modal: Game Over / Win */}
          {(status === 'WON' || status === 'LOST') && (
              <div className="fixed inset-0 bg-deep-blue/40 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in">
                  <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 animate-in zoom-in-95 duration-300 border border-white/50">
                      <div className="mb-6 relative">
                          {status === 'WON' ? (
                              <>
                                <div className="absolute inset-0 bg-green-100 rounded-full scale-150 opacity-50 animate-pulse"></div>
                                <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto text-5xl text-white shadow-xl">
                                    🏆
                                </div>
                              </>
                          ) : (
                              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-5xl grayscale">
                                  😔
                              </div>
                          )}
                      </div>
                      
                      <h2 className="text-3xl font-black mb-2 text-deep-blue">
                          {status === 'WON' ? '¡Increíble!' : '¡Oh no!'}
                      </h2>
                      
                      <div className="bg-cream rounded-xl p-4 mb-8 border border-gray-100">
                          <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">La palabra era</p>
                          <span className="text-4xl font-black text-spanish-red block tracking-widest">{target?.word}</span>
                          <div className="h-px w-16 bg-gray-300 mx-auto my-3"></div>
                          <span className="text-lg text-gray-700 font-medium">"{target?.translation}"</span>
                      </div>

                      <button
                          onClick={() => setStatus('SELECT_LEVEL')}
                          className="w-full bg-deep-blue text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-900 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                      >
                          <RefreshCw size={20} /> Jugar Otra Vez
                      </button>
                  </div>
              </div>
          )}

          {/* Instructions Modal */}
          {showInstructions && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative">
                      <button 
                          onClick={() => setShowInstructions(false)}
                          className="absolute top-4 right-4 p-1 bg-gray-100 rounded-full text-gray-500 hover:text-deep-blue hover:bg-gray-200 transition-colors"
                      >
                          <X size={20} />
                      </button>
                      
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-deep-blue">
                          <Info size={24} className="text-spanish-red" /> Cómo jugar
                      </h3>
                      
                      <ul className="space-y-4 text-sm text-gray-600">
                          <li className="flex gap-4 items-center p-2 rounded-lg bg-gray-50">
                              <span className="w-10 h-10 bg-green-500 text-white flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">V</span>
                              <span>La letra está en la palabra y en la <strong className="text-green-600">posición correcta</strong>.</span>
                          </li>
                          <li className="flex gap-4 items-center p-2 rounded-lg bg-gray-50">
                              <span className="w-10 h-10 bg-yellow-500 text-white flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">A</span>
                              <span>La letra está en la palabra pero en la <strong className="text-yellow-600">posición incorrecta</strong>.</span>
                          </li>
                          <li className="flex gap-4 items-center p-2 rounded-lg bg-gray-50">
                              <span className="w-10 h-10 bg-gray-500 text-white flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">G</span>
                              <span>La letra <strong className="text-gray-600">no está</strong> en la palabra.</span>
                          </li>
                      </ul>
                      
                      <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                          <p className="text-xs text-gray-400 mb-4">
                              Las palabras son generadas por Gemini AI adaptadas a tu nivel.
                          </p>
                          <button 
                             onClick={() => setShowInstructions(false)}
                             className="w-full py-3 bg-spanish-yellow text-deep-blue font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                          >
                            ¡Entendido!
                          </button>
                      </div>
                  </div>
               </div>
          )}
      </div>
  );
};

export default WordleGame;