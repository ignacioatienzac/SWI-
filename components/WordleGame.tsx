import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, Calendar, Lightbulb, ChevronLeft, ChevronRight, X, Send } from 'lucide-react';
import { getWordOfDay } from '../services/vocabularyService';
import { isValidWord, getHintsForAttempt } from '../services/wordleService';
import { hablarConPanda } from '../services/geminiService';

// Mensajes aleatorios para el bocadillo del Cobi detective
const mensajesDetectiveCobi = [
  "¡Empezamos! 📁 Escribe tu primera palabra para buscar pistas. 🐾",
  "Vamos a concentrarnos... ¿cuál será la palabra oculta? 🔍",
  "¡Patitas a la obra, detective! 🐾 Tenemos 6 intentos para encontrar la solución. 🕵️‍♂️"
];

// Mensajes para cuando ninguna letra coincide (todas grises)
const mensajesSinCoincidencias = [
  "¡Mmm, un callejón sin salida! 🤨 Esta palabra no tiene ninguna pista... 🐾",
  "¡Pista falsa! 🚫 Intenta con otra palabra diferente. 🔍",
  "¡Vaya! Ni una sola letra... 🐾 ¡No te rindas, sigue investigando! 🕵️‍♂️"
];

// Mensajes para cuando está cerca (algunas letras coinciden)
const mensajesCerca = [
  "¡Ajá! Veo algo... 🔍 ¡Tenemos pistas importantes! 🐾",
  "¡Interesante! 🕵️‍♂️ Estamos más cerca de resolver el misterio... 🔍",
  "¡Buenas noticias! 🐾 Algunas letras ya están en su sitio. ¡Sigue así! ✨"
];

// Mensajes para cuando gana
const mensajesVictoria = [
  "¡Elemental, querido alumno! 🕵️‍♂️ ¡Has resuelto el caso! 🐾✨",
  "¡Eureka! 🔍 ¡La palabra era correcta! Eres un gran detective. 🐾",
  "¡Caso cerrado! 📁 ¡Felicidades! Tu español es increíble. 🌟"
];

const seleccionarMensajeDetectiveRandom = (): string => {
  const indice = Math.floor(Math.random() * mensajesDetectiveCobi.length);
  return mensajesDetectiveCobi[indice];
};

const seleccionarMensajeSinCoincidencias = (): string => {
  const indice = Math.floor(Math.random() * mensajesSinCoincidencias.length);
  return mensajesSinCoincidencias[indice];
};

const seleccionarMensajeCerca = (): string => {
  const indice = Math.floor(Math.random() * mensajesCerca.length);
  return mensajesCerca[indice];
};

const seleccionarMensajeVictoria = (): string => {
  const indice = Math.floor(Math.random() * mensajesVictoria.length);
  return mensajesVictoria[indice];
};

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
  const [showPandaChat, setShowPandaChat] = useState(false);
  const [pandaMessage, setPandaMessage] = useState<string>('');
  const [cobiDetectiveMessage, setCobiDetectiveMessage] = useState<string>(''); // Mensaje del detective
  const [cobiDetectiveAvatar, setCobiDetectiveAvatar] = useState<string>('./data/images/cobi-detective.webp'); // Avatar del detective
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'cobi', text: string}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [isLoadingPanda, setIsLoadingPanda] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealingGuess, setRevealingGuess] = useState<string | null>(null);

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
    // Seleccionar mensaje aleatorio del detective cuando comienza el juego
    setCobiDetectiveMessage(seleccionarMensajeDetectiveRandom());
    // Reiniciar avatar al estado base
    setCobiDetectiveAvatar('./data/images/cobi-detective.webp');

    const word = await getWordOfDay(level, date);
    if (word && word.length > 0 && word.length >= 3 && word.length <= 6) {
      setSecretWord(word);
      setStatus('PLAYING');
      playSound('correct');
    } else {
      setMessage('Error loading word');
    }
  }, []);

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

  // Handle keyboard input - only from physical keyboard, not from input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore keyboard input if user is typing in an input field or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Ignore events with modifier keys (Ctrl, Cmd, Alt, Shift) to allow browser shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
      return;
    }
    
    if (status !== 'PLAYING' || isAnimating) return;

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
  }, [status, currentGuess, wordLength, isAnimating]);

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

    if (isAnimating) return; // Prevent multiple submissions during animation

    // Validate if word exists in dictionary
    const isValid = await isValidWord(currentGuess, wordLength);
    if (!isValid) {
      setMessage(`${currentGuess} no está en el diccionario`);
      playSound('absent');
      return;
    }

    // Block input during animation
    setIsAnimating(true);
    
    const lastGuess = currentGuess;
    
    // Set the revealing guess to show it in the grid without colors yet
    setRevealingGuess(lastGuess);
    setCurrentGuess('');
    setMessage(''); // Clear any previous messages

    // Calculate animation timing: 150ms delay per letter + 600ms animation duration
    const delayPerLetter = 150;
    const animationDuration = 600;
    const totalDelay = (wordLength * delayPerLetter) + animationDuration;

    // After animation completes, update the game state
    setTimeout(() => {
      const newGuesses = [...guesses, lastGuess];
      setGuesses(newGuesses);
      setRevealingGuess(null);

      // Update hints based on attempt number
      getHintsForAttempt(secretWord, newGuesses.length, difficulty).then(newHints => {
        setHints(newHints);
      });

      // Analizar el resultado del intento para cambiar avatar y mensaje
      const analyzeGuessResult = () => {
        let hasCorrect = false;
        let hasPresent = false;
        
        for (let i = 0; i < lastGuess.length; i++) {
          const status = getLetterStatusInGuess(lastGuess, i);
          if (status === 'correct') hasCorrect = true;
          if (status === 'present') hasPresent = true;
        }
        
        // Todas grises (sin coincidencias)
        if (!hasCorrect && !hasPresent) {
          setCobiDetectiveAvatar('./data/images/cobi-detective-fallo.webp');
          setCobiDetectiveMessage(seleccionarMensajeSinCoincidencias());
        }
        // Algunas letras coinciden (cerca)
        else {
          setCobiDetectiveAvatar('./data/images/cobi-detective.webp');
          setCobiDetectiveMessage(seleccionarMensajeCerca());
        }
      };

      // Check win/loss conditions
      if (lastGuess === secretWord) {
        setStatus('WON');
        setMessage(`¡Ganaste! La palabra es ${secretWord}`);
        playSound('win');
        setIsAnimating(false);
        // Victoria: cambiar a avatar de acierto
        setCobiDetectiveAvatar('./data/images/cobi-detective-acierto.webp');
        setCobiDetectiveMessage(seleccionarMensajeVictoria());
      } else if (newGuesses.length >= MAX_GUESSES) {
        setStatus('LOST');
        setMessage(`¡Game over! La palabra era ${secretWord}`);
        playSound('lose');
        setIsAnimating(false);
        // Derrota: cambiar a avatar de fallo
        setCobiDetectiveAvatar('./data/images/cobi-detective-fallo.webp');
        setCobiDetectiveMessage(seleccionarMensajeSinCoincidencias());
      } else {
        analyzeGuessResult();
        playSound('absent');
        setIsAnimating(false);
      }
    }, totalDelay);
  }, [currentGuess, secretWord, guesses, wordLength, MAX_GUESSES, difficulty, isAnimating, getLetterStatusInGuess]);

  // Ask Panda for help
  const askPanda = async () => {
    if (!userQuestion.trim()) {
      setPandaMessage('🐾 ¡Hola! ¿En qué puedo ayudarte? Escribe tu pregunta arriba 🐾');
      return;
    }

    setIsLoadingPanda(true);
    try {
      const contextInfo = {
        nivel: difficulty.toUpperCase(),
        palabra_secreta: secretWord,
        letras: wordLength,
        intentos_usados: guesses.length,
        intentos_maximos: MAX_GUESSES,
        intentos_previos: guesses
      };

      const response = await hablarConPanda(
        userQuestion,
        'Maestro del Wordle en Español',
        contextInfo
      );

      setPandaMessage(response);
      setUserQuestion('');
    } catch (error) {
      console.error('Error al consultar al Panda:', error);
      setPandaMessage('🐾 ¡Ups! Parece que me quedé sin bambú... Intenta de nuevo en un momento 🐾');
    } finally {
      setIsLoadingPanda(false);
    }
  };
  
  // Enviar mensaje a Cobi Detective
  const sendMessageToCobi = async () => {
    if (!chatInput.trim() || isLoadingResponse) return;

    const userMsg = chatInput.trim();
    
    // Añadir mensaje del usuario
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsLoadingResponse(true);

    try {
      const contextInfo = {
        nivel: difficulty.toUpperCase(),
        palabra_secreta: secretWord,
        letras: wordLength,
        intentos_usados: guesses.length,
        intentos_maximos: MAX_GUESSES,
        intentos_previos: guesses
      };

      const respuesta = await hablarConPanda(
        userMsg,
        'Detective del Wordle',
        contextInfo,
        'juego'
      );

      // Añadir respuesta de Cobi
      setChatHistory(prev => [...prev, { role: 'cobi', text: respuesta }]);
    } catch (error) {
      console.error('Error al hablar con Cobi:', error);
      setChatHistory(prev => [...prev, { 
        role: 'cobi', 
        text: '🐾 ¡Ups! Algo salió mal. Intenta de nuevo. 🐾' 
      }]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Get letter status (Wordle logic) - kept for backward compatibility with getKeyColor
  const getLetterStatus = useCallback((letter: string, position: number) => {
    if (letter === secretWord[position]) return 'correct';
    if (secretWord.includes(letter)) return 'present';
    return 'absent';
  }, [secretWord]);

  // Get key color based on best status found
  const getKeyColor = useCallback((letter: string) => {
    // Check if letter has been used in any guess
    let bestStatus = 'unused';
    
    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === letter) {
          const status = getLetterStatus(letter, i);
          if (status === 'correct') {
            bestStatus = 'correct';
          } else if (status === 'present' && bestStatus !== 'correct') {
            bestStatus = 'present';
          } else if (bestStatus === 'unused') {
            bestStatus = 'absent';
          }
        }
      }
    }
    
    if (bestStatus === 'correct') return 'bg-green-500 text-white';
    if (bestStatus === 'present') return 'bg-yellow-500 text-white';
    if (bestStatus === 'absent') return 'bg-gray-400 text-white';
    // Unused keys: light gray background with black text
    return 'bg-gray-200 text-gray-800';
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

      {/* Panda Chat Modal */}
      {showPandaChat && (
        <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
              🐾 Pregunta al Panda
            </h3>
            <button
              onClick={() => setShowPandaChat(false)}
              className="p-1 hover:bg-green-200 rounded transition"
            >
              <X size={20} className="text-green-600" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-green-200">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && askPanda()}
                placeholder="¿Necesitas ayuda? Pregúntame algo..."
                className="w-full outline-none text-gray-700"
                disabled={isLoadingPanda}
              />
            </div>

            <button
              onClick={askPanda}
              disabled={isLoadingPanda}
              className={`w-full py-2 rounded-lg font-semibold transition ${
                isLoadingPanda
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLoadingPanda ? '🐾 Pensando...' : 'Enviar'}
            </button>

            {pandaMessage && (
              <div className="p-4 bg-white rounded-lg border-2 border-green-300 text-gray-800 whitespace-pre-wrap">
                {pandaMessage}
              </div>
            )}

            <p className="text-xs text-green-700 italic">
              💡 El Panda te dará pistas inteligentes, ¡nunca la respuesta directa!
            </p>
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
          50% { 
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
          50% { 
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
          50% { 
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
          {/* Render completed guesses */}
          {guesses.map((guess, guessIdx) => (
            guess.split('').map((letter, letterIdx) => {
              const status = getLetterStatusInGuess(guess, letterIdx);

              return (
                <div
                  key={`${guessIdx}-${letterIdx}`}
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg ${
                    status === 'correct'
                      ? 'bg-green-500 text-white'
                      : status === 'present'
                      ? 'bg-yellow-500 text-white'
                      : status === 'absent'
                      ? 'bg-gray-400 text-white'
                      : 'bg-white border-2 border-gray-300'
                  }`}
                >
                  {letter}
                </div>
              );
            })
          ))}

          {/* Render revealing guess (during animation) */}
          {revealingGuess && revealingGuess.split('').map((letter, letterIdx) => {
            const status = getLetterStatusInGuess(revealingGuess, letterIdx);
            const style: React.CSSProperties = { animationDelay: `${letterIdx * 150}ms` };

            return (
              <div
                key={`revealing-${letterIdx}`}
                style={style}
                className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg ${
                  status === 'correct'
                    ? 'tile-flip-correct'
                    : status === 'present'
                    ? 'tile-flip-present'
                    : status === 'absent'
                    ? 'tile-flip-absent'
                    : 'bg-white border-2 border-gray-300'
                }`}
              >
                {letter}
              </div>
            );
          })}

          {/* Render current guess (user typing) */}
          {status === 'PLAYING' && !revealingGuess && currentGuess.split('').map((letter, idx) => (
            <div
              key={`current-${idx}`}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg bg-white border-2 border-gray-400 animate-pulse"
            >
              {letter}
            </div>
          ))}

          {/* Render empty tiles */}
          {status === 'PLAYING' && !revealingGuess && Array.from({ length: wordLength - currentGuess.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white border-2 border-gray-200"
            />
          ))}

          {/* Always show remaining empty rows to complete 6 rows */}
          {Array.from({ length: Math.max(0, MAX_GUESSES - guesses.length - (status === 'PLAYING' ? 1 : 0)) }).map((_, rowIdx) =>
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

      {/* Keyboard */}
      <div className="mb-6 max-w-xl mx-auto">
        {/* Row 1 */}
        <div className="flex gap-1 justify-center mb-2">
          {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(key => (
            <button
              key={key}
              onClick={() => {
                if (currentGuess.length < wordLength && !isAnimating) {
                  setCurrentGuess(prev => prev + key);
                  playSound('present');
                }
              }}
              className={`w-8 h-12 sm:w-10 sm:h-12 flex items-center justify-center rounded font-bold text-base transition ${getKeyColor(key)}`}
              disabled={status !== 'PLAYING' || isAnimating}
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
              onClick={() => {
                if (currentGuess.length < wordLength && !isAnimating) {
                  setCurrentGuess(prev => prev + key);
                  playSound('present');
                }
              }}
              className={`w-8 h-12 sm:w-10 sm:h-12 flex items-center justify-center rounded font-bold text-base transition ${getKeyColor(key)}`}
              disabled={status !== 'PLAYING' || isAnimating}
            >
              {key}
            </button>
          ))}
        </div>
        {/* Row 3 */}
        <div className="flex gap-1 justify-center">
          <button
            onClick={() => {
              if (currentGuess.length > 0 && currentGuess.length === wordLength && !isAnimating) {
                submitGuess();
              }
            }}
            className="w-12 h-12 sm:w-14 sm:h-12 flex items-center justify-center rounded font-bold text-base bg-blue-500 text-white hover:bg-blue-600 transition"
            disabled={status !== 'PLAYING' || currentGuess.length !== wordLength || isAnimating}
            title="Enviar"
          >
            ↑
          </button>
          {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(key => (
            <button
              key={key}
              onClick={() => {
                if (currentGuess.length < wordLength && !isAnimating) {
                  setCurrentGuess(prev => prev + key);
                  playSound('present');
                }
              }}
              className={`w-8 h-12 sm:w-10 sm:h-12 flex items-center justify-center rounded font-bold text-base transition ${getKeyColor(key)}`}
              disabled={status !== 'PLAYING' || isAnimating}
            >
              {key}
            </button>
          ))}
          <button
            onClick={() => !isAnimating && setCurrentGuess(prev => prev.slice(0, -1))}
            className="w-12 h-12 sm:w-14 sm:h-12 flex items-center justify-center rounded font-bold text-base bg-red-500 text-white hover:bg-red-600 transition"
            disabled={status !== 'PLAYING' || isAnimating}
            title="Borrar"
          >
            ⌫
          </button>
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
      
      {/* Cobi Detective (durante el juego, victoria y derrota en desktop) */}
      {(status === 'PLAYING' || status === 'WON' || status === 'LOST') && (
        <>
          <div className="hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible">
            <div className="relative animate-float">
              {/* Bocadillo de diálogo con mensaje aleatorio */}
              {cobiDetectiveMessage && !showChatWindow && (
                <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
                  <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                    {cobiDetectiveMessage || "🔍 ¡Investiguemos juntos! 🐾"}
                  </p>
                  {/* Pico del bocadillo apuntando hacia Cobi */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
                </div>
              )}
              
              {/* Imagen de Cobi Detective - dinámica según resultado */}
              <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
                <img 
                  src={cobiDetectiveAvatar}
                  alt="Cobi Detective" 
                  className="w-56 h-auto object-contain transition-opacity duration-300"
                  style={{
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                  }}
                />
              </div>

              {/* Chat Button Wrapper - Moves with Cobi */}
              <div className="chat-button-wrapper">
                <div
                  onClick={() => setShowChatWindow(!showChatWindow)}
                  className="cobi-chat-button-detective"
                >
                  <svg viewBox="0 0 100 100" className="curved-text-svg">
                    <path id="chatTextPathDetective" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                    <text>
                      <textPath href="#chatTextPathDetective" startOffset="50%" textAnchor="middle" className="curved-text-style-detective">
                        CHATEAR
                      </textPath>
                    </text>
                  </svg>
                  <div className="paws-icon">🐾</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Window */}
          {showChatWindow && (
            <div className="fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="p-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #2D5A27, #234A1F)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐾</span>
                  <div>
                    <h3 className="text-white font-bold text-sm">Cobi el Detective</h3>
                    <p className="text-xs" style={{ color: '#FFF5E1' }}>Tu asistente investigador</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatWindow(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* Chat History */}
              <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-3xl mb-2">🔍</p>
                    <p className="text-sm">¡Hola detective! Soy Cobi.</p>
                    <p className="text-xs mt-1">Pregúntame lo que necesites 🐾</p>
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.role === 'user'
                            ? 'text-white'
                            : 'bg-white text-gray-800 border-2'
                        }`}
                        style={msg.role === 'user' ? { background: 'linear-gradient(to right, #2D5A27, #234A1F)' } : { borderColor: '#2D5A27' }}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoadingResponse && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border-2 rounded-2xl px-4 py-2" style={{ borderColor: '#2D5A27' }}>
                      <p className="text-sm">Cobi está pensando... 🐾</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t-2 border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessageToCobi();
                      }
                    }}
                    placeholder="Escribe tu pregunta..."
                    disabled={isLoadingResponse}
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none transition text-sm disabled:bg-gray-100"
                    style={{ borderColor: '#2D5A27' } as any}
                  />
                  <button
                    onClick={sendMessageToCobi}
                    disabled={!chatInput.trim() || isLoadingResponse}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#2D5A27' }}
                  >
                    <Send size={18} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WordleGame;
