import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, Calendar, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { getWordOfDay } from '../services/vocabularyService';
import { isValidWord, getHintsForAttempt } from '../services/wordleService';

type GameStatus = 'SELECT_LEVEL' | 'PLAYING' | 'WON' | 'LOST';

interface WordleGameProps {
  onBack: () => void;
}

// Utility to play sounds
const playSound = (type: 'correct' | 'present' | 'absent' | 'win' | 'lose') => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  
  switch(type) {
    case 'correct':
      oscillator.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case 'present':
      oscillator.frequency.value = 600;
      gain.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
      break;
    case 'absent':
      oscillator.frequency.value = 400;
      gain.gain.setValueAtTime(0.1, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
      break;
    case 'win':
      for (let i = 0; i < 3; i++) {
        const osc = audioContext.createOscillator();
        const g = audioContext.createGain();
        osc.connect(g);
        g.connect(audioContext.destination);
        osc.frequency.value = 600 + (i * 200);
        g.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.15);
        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.15);
      }
      break;
    case 'lose':
      oscillator.frequency.value = 300;
      gain.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
  }
};

const WordleGame: React.FC<WordleGameProps> = ({ onBack }) => {
  const [status, setStatus] = useState<GameStatus>('SELECT_LEVEL');
  const [difficulty, setDifficulty] = useState<string>('a1');
  const [secretWord, setSecretWord] = useState<string>('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [hints, setHints] = useState<string[]>([]);
  const [activeFlipRow, setActiveFlipRow] = useState<number | null>(null);

  const DIFFICULTIES = [
    { value: 'a1', label: 'A1 - Principiante' },
    { value: 'a2', label: 'A2 - Elemental' },
    { value: 'b1', label: 'B1 - Intermedio' },
    { value: 'b2', label: 'B2 - Intermedio-Alto' }
  ];

  const wordLength = useMemo(() => secretWord.length as 3 | 4 | 5 | 6, [secretWord]);
  
  // MAX_GUESSES is always 6
  const MAX_GUESSES = 6;

  // Start new game
  const startGame = useCallback(async (level: string, date: string) => {
    setDifficulty(level);
    setSelectedDate(date);
    setGuesses([]);
    setCurrentGuess('');
    setMessage('');
    setShowHint(false);

    const word = await getWordOfDay(level, date);
    if (word && word.length > 0 && word.length >= 3 && word.length <= 6) {
      setSecretWord(word);
      setStatus('PLAYING');
      playSound('correct');
    } else {
      setMessage('Error loading word');
    }
  }, []);

  // Handle keyboard input - only from physical keyboard, not from input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (status !== 'PLAYING') return;

    const key = e.key.toUpperCase();
    
    if (/^[A-ZÑ]$/.test(key) || key === 'Ñ') {
      e.preventDefault();
      if (currentGuess.length < wordLength) {
        setCurrentGuess(prev => prev + key);
        playSound('present');
      }
    } else if (key === 'BACKSPACE') {
      e.preventDefault();
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key === 'ENTER') {
      e.preventDefault();
      submitGuess();
    }
  }, [status, currentGuess, wordLength]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Submit guess
  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== wordLength) {
      setMessage(`La palabra debe tener ${wordLength} letras`);
      playSound('absent');
      return;
    }

    // Validate if word exists in dictionary
    const isValid = await isValidWord(currentGuess, wordLength);
    if (!isValid) {
      setMessage(`${currentGuess} no está en el diccionario`);
      playSound('absent');
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    const attemptNumber = newGuesses.length;
    const lastGuess = currentGuess; // Store current guess before clearing
    setGuesses(newGuesses);

    // Update hints based on attempt number
    const newHints = await getHintsForAttempt(secretWord, attemptNumber, difficulty);
    setHints(newHints);

    // Trigger staggered flip animation for the newly submitted row
    const rowIndex = newGuesses.length - 1;
    setActiveFlipRow(rowIndex);
    setCurrentGuess('');

    // Delay win/loss evaluation until animation finishes (stagger per letter)
    const delayPerLetter = 150; // ms
    const totalDelay = (wordLength * delayPerLetter) + 250;

    setTimeout(() => {
      if (lastGuess === secretWord) {
        setStatus('WON');
        setMessage(`¡Ganaste! La palabra es ${secretWord}`);
        playSound('win');
      } else if (newGuesses.length >= MAX_GUESSES) {
        setStatus('LOST');
        setMessage(`¡Game over! La palabra era ${secretWord}`);
        playSound('lose');
      } else {
        setMessage('');
        playSound('absent');
      }

      // Clear active flip row after animation
      setActiveFlipRow(null);
    }, totalDelay);
  }, [currentGuess, secretWord, guesses, wordLength, MAX_GUESSES, difficulty]);

  // Get letter status for a specific guess position with proper duplicate handling
  const getLetterStatusInGuess = useCallback((guess: string, position: number) => {
    const letter = guess[position];
    
    // First check: exact match
    if (letter === secretWord[position]) return 'correct';
    
    // Count occurrences in secret word and guess
    const letterCountInSecret = secretWord.split('').filter(l => l === letter).length;
    const lettersBeforeCorrect = guess.slice(0, position)
      .split('')
      .filter((l, idx) => l === letter && l === secretWord[idx])
      .length;
    const lettersBeforePresent = guess.slice(0, position)
      .split('')
      .filter((l, idx) => l === letter && l !== secretWord[idx] && secretWord.includes(letter))
      .length;
    
    const totalLettersBefore = lettersBeforeCorrect + lettersBeforePresent;
    
    // Check if this letter instance should be yellow
    if (secretWord.includes(letter) && totalLettersBefore < letterCountInSecret) {
      return 'present';
    }
    
    return 'absent';
  }, [secretWord]);

  // Get letter status (Wordle logic) - kept for backward compatibility with getKeyColor
  const getLetterStatus = useCallback((letter: string, position: number) => {
    if (letter === secretWord[position]) return 'correct';
    if (secretWord.includes(letter)) return 'present';
    return 'absent';
  }, [secretWord]);

  // Get key color based on best status found
  const getKeyColor = useCallback((letter: string) => {
    let bestStatus = 'absent';
    
    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === letter) {
          const status = getLetterStatus(letter, i);
          if (status === 'correct') {
            bestStatus = 'correct';
          } else if (status === 'present' && bestStatus !== 'correct') {
            bestStatus = 'present';
          }
        }
      }
    }
    
    if (bestStatus === 'correct') return 'bg-green-500';
    if (bestStatus === 'present') return 'bg-yellow-500';
    return 'bg-gray-400';
  }, [guesses, getLetterStatus]);

  // Calendar - get all dates in current month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getCalendarDays = () => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const daysInMonth = getDaysInMonth(displayMonth);
    const firstDay = getFirstDayOfMonth(displayMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }

    return days;
  };

  // Select level screen
  if (status === 'SELECT_LEVEL') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button 
          onClick={onBack}
          className="mb-6 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Atrás
        </button>

        <h2 className="text-3xl font-bold text-center mb-8 text-spanish-red">Wordle - Selecciona Nivel</h2>

        <div className="space-y-3">
          {DIFFICULTIES.map(d => (
            <button
              key={d.value}
              onClick={() => startGame(d.value, new Date().toISOString().split('T')[0])}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition ${
                difficulty === d.value 
                  ? 'bg-spanish-red text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Calculate calendar days
  const calendarDays = showCalendar ? getCalendarDays() : [];

  // Playing screen
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header with back button and controls */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <button 
          onClick={onBack}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Atrás
        </button>
        
        <div className="text-center flex-1 min-w-fit">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Palabra del día</p>
          <p className="text-sm font-semibold text-gray-700">{selectedDate}</p>
        </div>

        <div className="flex gap-2">
          {/* Hint Button */}
          <button
            onClick={() => setShowHint(!showHint)}
            disabled={guesses.length < 3}
            className={`p-2 rounded-lg transition ${
              guesses.length < 3 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title={guesses.length < 3 ? "Pistas disponibles desde el 4º intento" : "Pista"}
          >
            <Lightbulb size={20} />
          </button>

          {/* Calendar Button */}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition"
            title="Calendario"
          >
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {/* Hint display */}
      {showHint && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded text-sm text-blue-800">
          <p className="font-semibold mb-2">Pistas:</p>
          {hints.length === 0 ? (
            <p className="text-gray-600 italic">Las pistas aparecerán después del 3er intento fallido</p>
          ) : (
            <ul className="list-disc list-inside space-y-1">
              {hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-600 mt-2">
            Intento {guesses.length + 1} de {MAX_GUESSES} - {hints.length}/3 pistas visibles
          </p>
        </div>
      )}

      {/* Calendar selector - Monthly view */}
      {showCalendar && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-200 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center font-semibold">
              {displayMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-200 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                {day}
              </div>
            ))}
            {calendarDays.map((dateStr, idx) => {
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today;
              const isFuture = !!(dateStr && dateStr > today);
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (dateStr && !isFuture) {
                      setSelectedDate(dateStr);
                      startGame(difficulty, dateStr);
                      setShowCalendar(false);
                    }
                  }}
                  disabled={isFuture}
                  className={`py-2 text-xs font-semibold rounded ${
                    !dateStr
                      ? ''
                      : isSelected
                      ? 'bg-spanish-red text-white'
                      : isToday
                      ? 'bg-green-500 text-white'
                      : isFuture
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-800 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {dateStr ? new Date(dateStr).getDate() : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Word grid */}
      <style>{`
        @keyframes flipToCorrect {
          0% { 
            transform: rotateX(0); 
            background-color: white;
            color: #374151;
            border-color: #9ca3af;
          }
          49% { 
            transform: rotateX(90deg); 
            background-color: white;
            color: #374151;
          }
          51% { 
            transform: rotateX(90deg); 
            background-color: #22c55e;
            color: white;
            border-color: #22c55e;
          }
          100% { 
            transform: rotateX(0); 
            background-color: #22c55e;
            color: white;
          }
        }
        @keyframes flipToPresent {
          0% { 
            transform: rotateX(0); 
            background-color: white;
            color: #374151;
            border-color: #9ca3af;
          }
          49% { 
            transform: rotateX(90deg); 
            background-color: white;
            color: #374151;
          }
          51% { 
            transform: rotateX(90deg); 
            background-color: #eab308;
            color: white;
            border-color: #eab308;
          }
          100% { 
            transform: rotateX(0); 
            background-color: #eab308;
            color: white;
          }
        }
        @keyframes flipToAbsent {
          0% { 
            transform: rotateX(0); 
            background-color: white;
            color: #374151;
            border-color: #9ca3af;
          }
          49% { 
            transform: rotateX(90deg); 
            background-color: white;
            color: #374151;
          }
          51% { 
            transform: rotateX(90deg); 
            background-color: #9ca3af;
            color: white;
            border-color: #9ca3af;
          }
          100% { 
            transform: rotateX(0); 
            background-color: #9ca3af;
            color: white;
          }
        }
        .tile-flip-correct {
          animation: flipToCorrect 0.6s ease-in-out forwards;
        }
        .tile-flip-present {
          animation: flipToPresent 0.6s ease-in-out forwards;
        }
        .tile-flip-absent {
          animation: flipToAbsent 0.6s ease-in-out forwards;
        }
      `}</style>
      <div className="mb-8 flex justify-center overflow-x-auto">
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${wordLength}, 1fr)`,
          gap: '8px',
        }}>
          {guesses.map((guess, guessIdx) => (
            guess.split('').map((letter, letterIdx) => {
              const status = getLetterStatusInGuess(guess, letterIdx);
              const isFlipping = activeFlipRow === guessIdx;
              const style: React.CSSProperties = isFlipping ? { animationDelay: `${letterIdx * 150}ms` } : {};

              return (
                <div
                  key={`${guessIdx}-${letterIdx}`}
                  style={style}
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg ${
                    isFlipping && status === 'correct'
                      ? 'tile-flip-correct'
                      : isFlipping && status === 'present'
                      ? 'tile-flip-present'
                      : isFlipping && status === 'absent'
                      ? 'tile-flip-absent'
                      : !isFlipping && status === 'correct'
                      ? 'bg-green-500 text-white'
                      : !isFlipping && status === 'present'
                      ? 'bg-yellow-500 text-white'
                      : !isFlipping && status === 'absent'
                      ? 'bg-gray-400 text-white'
                      : 'bg-white border-2 border-gray-300'
                  }`}
                >
                  {letter}
                </div>
              );
            })
          ))}

          {status === 'PLAYING' && currentGuess.split('').map((letter, idx) => (
            <div
              key={`current-${idx}`}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg bg-white border-2 border-gray-400 animate-pulse"
            >
              {letter}
            </div>
          ))}

          {status === 'PLAYING' && Array.from({ length: wordLength - currentGuess.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white border-2 border-gray-200"
            />
          ))}

          {status === 'PLAYING' && Array.from({ length: MAX_GUESSES - guesses.length - 1 }).map((_, rowIdx) =>
            Array.from({ length: wordLength }).map((_, colIdx) => (
              <div
                key={`empty-row-${rowIdx}-${colIdx}`}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-100 border-2 border-gray-200"
              />
            ))
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-center font-semibold text-sm ${
          status === 'WON' 
            ? 'bg-green-100 text-green-800 border border-green-300'
            : status === 'LOST'
            ? 'bg-red-100 text-red-800 border border-red-300'
            : 'bg-blue-100 text-blue-800 border border-blue-300'
        }`}>
          {message}
        </div>
      )}

      {/* Guesses counter */}
      <p className="text-center mb-6 text-gray-700 font-semibold text-sm">
        Intentos: {guesses.length} / {MAX_GUESSES}
      </p>

      {/* Input (hidden, only for keyboard input) */}
      {status === 'PLAYING' && (
        <input
          type="text"
          autoFocus
          className="hidden"
          onChange={() => {}}
        />
      )}

      {/* Visual input display */}
      {status === 'PLAYING' && (
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          <div className="px-4 py-2 border-2 border-gray-300 rounded-lg text-center font-semibold text-lg bg-white">
            {currentGuess || <span className="text-gray-400">Escribe {wordLength} letras...</span>}
          </div>
          <button
            onClick={submitGuess}
            className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition whitespace-nowrap"
          >
            Enviar
          </button>
        </div>
      )}

      {/* Keyboard */}
      <div className="mb-6">
        <div className="flex gap-1 flex-wrap justify-center mb-2">
          {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(key => (
            <button
              key={key}
              onClick={() => {
                if (currentGuess.length < wordLength) {
                  setCurrentGuess(prev => prev + key);
                  playSound('present');
                }
              }}
              className={`px-2 sm:px-3 py-2 rounded font-semibold text-xs sm:text-sm transition ${getKeyColor(key)} text-white`}
              disabled={status !== 'PLAYING'}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap justify-center mb-2">
          {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(key => (
            <button
              key={key}
              onClick={() => {
                if (currentGuess.length < wordLength) {
                  setCurrentGuess(prev => prev + key);
                  playSound('present');
                }
              }}
              className={`px-2 sm:px-3 py-2 rounded font-semibold text-xs sm:text-sm transition ${getKeyColor(key)} text-white`}
              disabled={status !== 'PLAYING'}
            >
              {key}
            </button>
          ))}
          <button
            onClick={() => {
              if (currentGuess.length < wordLength) {
                setCurrentGuess(prev => prev + 'Ñ');
                playSound('present');
              }
            }}
            className={`px-2 sm:px-3 py-2 rounded font-semibold text-xs sm:text-sm transition ${getKeyColor('Ñ')} text-white`}
            disabled={status !== 'PLAYING'}
          >
            Ñ
          </button>
        </div>
        <div className="flex gap-1 flex-wrap justify-center">
          <button
            onClick={() => setCurrentGuess(prev => prev.slice(0, -1))}
            className="px-2 sm:px-3 py-2 rounded font-semibold text-xs sm:text-sm bg-red-500 text-white hover:bg-red-600 transition"
            disabled={status !== 'PLAYING'}
          >
            DEL
          </button>
          {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(key => (
            <button
              key={key}
              onClick={() => {
                if (currentGuess.length < wordLength) {
                  setCurrentGuess(prev => prev + key);
                  playSound('present');
                }
              }}
              className={`px-2 sm:px-3 py-2 rounded font-semibold text-xs sm:text-sm transition ${getKeyColor(key)} text-white`}
              disabled={status !== 'PLAYING'}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Play again button */}
      {(status === 'WON' || status === 'LOST') && (
        <button
          onClick={() => startGame(difficulty, selectedDate)}
          className="w-full py-3 px-4 bg-spanish-red text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
        >
          <RotateCcw size={20} />
          Jugar de Nuevo
        </button>
      )}
    </div>
  );
};

export default WordleGame;
