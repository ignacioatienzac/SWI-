import React, { useState, useEffect, useCallback } from 'react';
import { generateVerbChallenge } from '../services/geminiService';
import { VerbChallenge } from '../types';
import { RefreshCw, CheckCircle, XCircle, BrainCircuit, ArrowRight } from 'lucide-react';

const VerbGame: React.FC = () => {
  const [challenge, setChallenge] = useState<VerbChallenge | null>(null);
  const [userInput, setUserInput] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [feedback, setFeedback] = useState<string>('');
  const [streak, setStreak] = useState(0);

  const fetchNewChallenge = useCallback(async () => {
    setStatus('LOADING');
    setFeedback('');
    setUserInput('');
    try {
      const newChallenge = await generateVerbChallenge('Medium');
      setChallenge(newChallenge);
      setStatus('IDLE');
    } catch (e) {
      setFeedback('Error al cargar. Intenta de nuevo.');
      setStatus('IDLE');
    }
  }, []);

  useEffect(() => {
    fetchNewChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;

    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedAnswer = challenge.answer.trim().toLowerCase();

    if (normalizedInput === normalizedAnswer) {
      setStatus('SUCCESS');
      setFeedback('¡Correcto! Muy bien hecho.');
      setStreak(s => s + 1);
    } else {
      setStatus('ERROR');
      setFeedback(`Incorrecto. La respuesta era: ${challenge.answer}`);
      setStreak(0);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-2xl mx-auto">
      <div className="bg-deep-blue p-6 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BrainCircuit className="text-spanish-yellow" size={28} />
          <h2 className="text-xl font-bold">Maestro de Verbos (AI)</h2>
        </div>
        <div className="bg-white/10 px-4 py-1 rounded-full text-sm font-medium">
          Racha: <span className="text-spanish-yellow font-bold text-lg">{streak}</span>
        </div>
      </div>

      <div className="p-8">
        {status === 'LOADING' && !challenge ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw className="animate-spin text-spanish-red" size={40} />
            <p className="text-gray-500 animate-pulse">Consultando a la IA...</p>
          </div>
        ) : challenge ? (
          <div className="space-y-8">
            {/* Challenge Card */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-center md:text-right flex-1">
                <span className="block text-sm text-gray-500 uppercase tracking-wide">Pronombre</span>
                <span className="text-2xl font-bold text-deep-blue">{challenge.pronoun}</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-gray-300"></div>
              <div className="text-center flex-1">
                <span className="block text-sm text-gray-500 uppercase tracking-wide">Verbo</span>
                <span className="text-2xl font-bold text-spanish-red">{challenge.verb}</span>
                <span className="block text-xs text-gray-400">({challenge.translation})</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-gray-300"></div>
              <div className="text-center md:text-left flex-1">
                <span className="block text-sm text-gray-500 uppercase tracking-wide">Tiempo</span>
                <span className="text-2xl font-bold text-deep-blue">{challenge.tense}</span>
              </div>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
              <label htmlFor="conjugation" className="sr-only">Tu respuesta</label>
              <div className="relative">
                <input
                  id="conjugation"
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={status === 'SUCCESS' || status === 'ERROR'}
                  className={`w-full text-center text-xl p-4 border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                    status === 'SUCCESS' ? 'border-green-500 bg-green-50 text-green-900' :
                    status === 'ERROR' ? 'border-red-500 bg-red-50 text-red-900' :
                    'border-gray-200 focus:border-deep-blue focus:ring-4 focus:ring-blue-50'
                  }`}
                  placeholder="Escribe la conjugación..."
                  autoComplete="off"
                />
                {status === 'SUCCESS' && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                {status === 'ERROR' && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" />}
              </div>

              {/* Feedback & Actions */}
              <div className="mt-6 text-center h-20">
                 {status === 'IDLE' && (
                    <button 
                      type="submit"
                      className="bg-deep-blue text-white px-8 py-3 rounded-full font-bold hover:bg-blue-900 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      Comprobar
                    </button>
                 )}

                 {(status === 'SUCCESS' || status === 'ERROR') && (
                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <p className={`text-lg font-semibold mb-4 ${status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback}
                      </p>
                      <button 
                        type="button"
                        onClick={fetchNewChallenge}
                        className="inline-flex items-center gap-2 bg-spanish-yellow text-deep-blue px-6 py-2 rounded-full font-bold hover:bg-yellow-400 transition-colors"
                      >
                        Siguiente Verbo <ArrowRight size={18} />
                      </button>
                   </div>
                 )}
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center text-red-500">Error loading game.</div>
        )}
      </div>
    </div>
  );
};

export default VerbGame;