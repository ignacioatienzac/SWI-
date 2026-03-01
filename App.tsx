import React, { useState, useEffect } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import Header from './components/Header';
import Hero from './components/Hero';
import Games from './components/Games';
import Resources from './components/Resources';
import AboutMe from './components/AboutMe';
import MeetCobi from './components/MeetCobi';
import GamesExplainer from './components/GamesExplainer';
import SocialMedia from './components/SocialMedia';
import { View } from './types';
import { hablarConPanda } from './services/geminiService';

// Mensajes de bienvenida para Cobi en la página principal
const mensajesBienvenidaCobi = [
  "¡Bienvenido, compawñero! 🐾 ¿Estás preparado para practicar?",
  "¡Hola! 🎉 Aquí encontrarás todo lo que necesitas para aprender español. 🐾",
  "¡Qué alegría verte! 📚 ¿Listo para mejorar tu español? 🐾",
  "¡Bienvenido a tu espacio de aprendizaje! 🌟 ¡Vamos a aprender juntos! 🐾",
  "¡Hola, estudiante! 🥋 El español te espera. ¿Empezamos? 🐾",
  "¡Encantado de verte! ✨ Explora los juegos y recursos disponibles. 🐾"
];

const seleccionarMensajeCobiRandom = (): string => {
  const indice = Math.floor(Math.random() * mensajesBienvenidaCobi.length);
  return mensajesBienvenidaCobi[indice];
};

// ── Hash-based routing ──────────────────────────────────────────────────────
const VIEW_TO_HASH: Record<View, string> = {
  [View.HOME]: '/',
  [View.GAMES]: '/juegos',
  [View.RESOURCES]: '/recursos',
};

const GAME_TO_SLUG: Record<string, string> = {
  'phrase-builder': 'constructor-de-frases',
  'verb-master': 'maestro-de-verbos',
  'wordle-game': 'adivina-la-palabra',
  'power-verbs': 'poder-de-verbos',
  'letter-wheel': 'rueda-de-letras',
};

const SLUG_TO_GAME: Record<string, string> = Object.fromEntries(
  Object.entries(GAME_TO_SLUG).map(([id, slug]) => [slug, id])
);

const GAME_DISPLAY_NAMES: Record<string, string> = {
  'phrase-builder': 'Constructor de Frases',
  'verb-master': 'Maestro de Verbos',
  'wordle-game': 'Adivina la Palabra',
  'power-verbs': 'Poder de los Verbos',
  'letter-wheel': 'Rueda de Letras',
};

function parseHash(): { view: View; gameId: string | null } {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { view: View.HOME, gameId: null };
  if (parts[0] === 'juegos') {
    if (parts[1] && SLUG_TO_GAME[parts[1]]) {
      return { view: View.GAMES, gameId: SLUG_TO_GAME[parts[1]] };
    }
    return { view: View.GAMES, gameId: null };
  }
  if (parts[0] === 'recursos') return { view: View.RESOURCES, gameId: null };
  return { view: View.HOME, gameId: null };
}
// ────────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  // Inicializar estado desde la URL (hash routing)
  const [currentView, setCurrentView] = useState<View>(() => parseHash().view);
  const [activeGameId, setActiveGameId] = useState<string | null>(() => parseHash().gameId);

  // Estado global para mostrar/ocultar Cobi (persistido en localStorage)
  const [cobiVisible, setCobiVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('cobiVisible');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleCobi = () => {
    setCobiVisible(prev => {
      const next = !prev;
      localStorage.setItem('cobiVisible', String(next));
      return next;
    });
  };

  // Estado global para sonido (persistido en localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('soundEnabled', String(next));
      return next;
    });
  };

  // Estado para mensaje de Cobi
  const [cobiMessage] = useState<string>(seleccionarMensajeCobiRandom());
  
  // Estados de chat
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'cobi', text: string}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);

  // Función para enviar mensaje a Cobi
  const sendMessageToCobi = async () => {
    if (!chatInput.trim() || isLoadingResponse) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to history
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoadingResponse(true);

    try {
      const contextoJuego = {
        pagina: 'Página Principal',
        estado: 'navegando',
        seccion_actual: currentView
      };

      // Call Cobi AI
      const response = await hablarConPanda(
        userMessage,
        'Página Principal - Cobi Mascota 🐾',
        contextoJuego,
        'lobby'
      );

      // Add Cobi response to history
      setChatHistory(prev => [...prev, { role: 'cobi', text: response }]);
    } catch (error) {
      console.error('Error al comunicarse con Cobi:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'cobi', text: '¡Ups! Tuve un problema. 🐾 Inténtalo de nuevo.' }
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Sincronizar URL y título de la pestaña con la vista activa
  useEffect(() => {
    let hash: string;
    if (currentView === View.GAMES && activeGameId && GAME_TO_SLUG[activeGameId]) {
      hash = `/juegos/${GAME_TO_SLUG[activeGameId]}`;
    } else {
      hash = VIEW_TO_HASH[currentView] ?? '/';
    }
    // pushState para que el botón Atrás del navegador funcione
    const newUrl = window.location.pathname + window.location.search + '#' + hash;
    window.history.pushState(null, '', newUrl);

    // Actualizar título de la pestaña dinámicamente
    let title = 'CobiSpanish';
    if (currentView === View.GAMES && activeGameId && GAME_DISPLAY_NAMES[activeGameId]) {
      title = `${GAME_DISPLAY_NAMES[activeGameId]} | CobiSpanish`;
    } else if (currentView === View.GAMES) {
      title = 'Juegos | CobiSpanish';
    } else if (currentView === View.RESOURCES) {
      title = 'Recursos | CobiSpanish';
    }
    document.title = title;
  }, [currentView, activeGameId]);

  // Escuchar el botón Atrás/Adelante del navegador
  useEffect(() => {
    const handlePopState = () => {
      const { view, gameId } = parseHash();
      setCurrentView(view);
      setActiveGameId(gameId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    // Reset active game when changing views (e.g. clicking buttons in header)
    // Esto limpia el estado del juego al hacer clic en los botones de la cabecera
    setActiveGameId(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <>
            <Hero onStart={() => setCurrentView(View.GAMES)} />
            <MeetCobi />
            <GamesExplainer />
            <AboutMe />
            <SocialMedia />
          </>
        );
      case View.GAMES:
        return <Games activeGameId={activeGameId} setActiveGameId={setActiveGameId} cobiVisible={cobiVisible} />;
      case View.RESOURCES:
        return <Resources />;
      default:
        return (
          <>
            <Hero onStart={() => setCurrentView(View.GAMES)} />
            <MeetCobi />
            <GamesExplainer />
            <AboutMe />
            <SocialMedia />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-cream text-gray-800">
      <Header currentView={currentView} onChangeView={handleViewChange} cobiVisible={cobiVisible} onToggleCobi={toggleCobi} soundEnabled={soundEnabled} onToggleSound={toggleSound} />
      
      <main className="flex-grow">
        {renderContent()}
      </main>

      {/* Cobi en la página principal (solo en HOME y solo desktop) */}
      {currentView === View.HOME && (
        <div className={`cobi-container hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible${!cobiVisible ? ' cobi-hidden' : ''}`}>
          <div className="relative animate-float">
            {/* Bocadillo de diálogo con mensaje de bienvenida */}
            {cobiMessage && (
              <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
                <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
                  {cobiMessage}
                </p>
                {/* Pico del bocadillo apuntando hacia Cobi */}
                <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]" style={{ zIndex: -1 }}></div>
              </div>
            )}
            
            {/* Imagen de Cobi */}
            <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
              <img 
                src="./data/images/cobi.webp"
                alt="Cobi mascota" 
                className="w-56 h-auto object-contain"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            
            {/* Botón CHATEAR dentro del animate-float - Posición Mago */}
            <div className="chat-button-wrapper-home">
              <div
                onClick={() => setShowChatWindow(!showChatWindow)}
                className="cobi-chat-button-neutral pointer-events-auto"
              >
                <svg viewBox="0 0 100 100" className="curved-text-svg">
                  <path id="chatTextPathHome" d="M 20,50 A 30,30 0 1,1 80,50" fill="none" />
                  <text>
                    <textPath href="#chatTextPathHome" startOffset="50%" textAnchor="middle" className="curved-text-style-neutral">
                      CHATEAR
                    </textPath>
                  </text>
                </svg>
                <div className="paws-icon">🐾</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window de la página principal */}
      {showChatWindow && currentView === View.HOME && (
        <div className={`cobi-container fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in${!cobiVisible ? ' cobi-hidden' : ''}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-gray-500 to-blue-gray-600 p-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #607D8B, #546E7A)' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <div>
                <h3 className="text-white font-bold text-sm">Cobi</h3>
                <p className="text-xs text-blue-gray-50">Tu guía de aprendizaje</p>
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
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-blue-gray-50/30 to-white">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                <p className="mb-2">🐾</p>
                <p>¡Hola! Soy Cobi, tu compañero de aprendizaje.</p>
                <p className="text-xs mt-2">Pregúntame lo que quieras sobre español. ✨</p>
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
                        : 'bg-white border-2 border-blue-gray-200 text-gray-700'
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
                <div className="bg-white border-2 border-blue-gray-200 rounded-2xl px-4 py-3">
                  <p className="text-sm text-gray-600">
                    Cobi está pensando... 🐾
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
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-gray-400 transition text-sm disabled:bg-gray-100"
              />
              <button
                onClick={sendMessageToCobi}
                disabled={isLoadingResponse || !chatInput.trim()}
                className="p-2 bg-gradient-to-br from-blue-gray-500 to-blue-gray-600 hover:from-blue-gray-600 hover:to-blue-gray-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-full transition-all"
                style={{ background: isLoadingResponse || !chatInput.trim() ? undefined : 'linear-gradient(to bottom right, #607D8B, #546E7A)' }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Hidden on mobile if a game is active, but visible on desktop or if no game is active */}
      <footer className={`bg-deep-blue text-white py-12 ${activeGameId ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="font-bold text-xl">CobiSpanish</span>
            <p className="text-gray-400 text-sm mt-2">© 2024 Todos los derechos reservados.</p>
          </div>
          <div className="flex space-x-6 text-sm text-gray-300">
            <a href="https://www.instagram.com/spanishwithignacio/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
            <a href="https://www.youtube.com/@SpanishwithIgnacio" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;