import React, { useState, useEffect } from 'react';
import { GameDefinition } from '../types';
import WordleGame from './WordleGame';
import PowerOfVerbsGame from './PowerOfVerbsGame';
import LetterWheelGame from './LetterWheelGame';
import VerbMasterGame from './VerbMasterGame';
import PhraseBuilderGame from './PhraseBuilderGame';
import { Send, X } from 'lucide-react';
import { hablarConPanda } from '../services/geminiService';
import DraggableCobi from './DraggableCobi';
import { useI18n } from '../services/i18n';

// Banco de Mensajes de Cobi (incluye datos curiosos y recomendaciones de juegos)
const mensajesCobi = [
  "¡Datito curioso! 🐾 El español es el idioma más rápido del mundo: ¡7,82 sílabas por segundo! 💨",
  "¡Datito curioso! ✨ La letra 'Ñ' nació porque unos monjes querían gastar menos pergamino. ¡Ingenioso! 📜",
  "¡Datito curioso! 🍃 Somos los únicos que usamos los signos de apertura (¡ ¿). ¡Sorpresa! 🎉",
  "¡Datito curioso! 🧀 ¡El primer texto en español fue una lista de la compra de quesos hace 1000 años! 📝",
  "🔍 Si buscas vocabulario nuevo, Adivina la Palabra es una gran opción 🐾",
  "🏗️ ¿Practicamos el orden de las palabras en el Constructor de Frases? ✨",
  "🥋 ¡Explota burbujas y entrena verbos en Maestro de Verbos! 🫧",
  "🪄 Refuerza tus verbos y defiende el castillo en El Poder de los Verbos. ✨",
  "¿No sabes por dónde empezar? 🐾 ¡Habla conmigo y te ayudo!",
];

// Función para seleccionar un mensaje aleatorio
const seleccionarMensajeRandom = (): string => {
  const indiceAleatorio = Math.floor(Math.random() * mensajesCobi.length);
  return mensajesCobi[indiceAleatorio];
};

interface GamesProps {
  activeGameId: string | null;
  setActiveGameId: (id: string | null) => void;
  cobiVisible: boolean;
  soundEnabled: boolean;
}

interface Message {
  sender: 'user' | 'cobi';
  text: string;
}

const Games: React.FC<GamesProps> = ({ activeGameId, setActiveGameId, cobiVisible, soundEnabled }) => {
  const { t } = useI18n();
  // Estado del chat
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  
  // Estado para el mensaje aleatorio del bocadillo
  const [mensajeCobi, setMensajeCobi] = useState<string>('');
  
  // Avatar URL for Games page
  const COBI_AVATAR_LOBBY = './data/images/Avatar-pensando.webp';

  // Preload lobby avatar on mount
  useEffect(() => {
    const img = new Image();
    img.src = COBI_AVATAR_LOBBY;
  }, []);

  // Seleccionar un mensaje aleatorio al cargar el componente
  useEffect(() => {
    setMensajeCobi(seleccionarMensajeRandom());
  }, []);

  // Función para enviar mensaje a Cobi del Lobby
  const sendMessageToCobi = async () => {
    if (!currentMessage.trim() || isLoadingResponse) return;

    const userMsg = currentMessage.trim();
    
    // Añadir mensaje del usuario
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setCurrentMessage('');
    setIsLoadingResponse(true);

    try {
      // Llamar a Cobi del Lobby (tipoCobi: 'lobby')
      const respuesta = await hablarConPanda(
        userMsg,
        'Anfitrión del Lobby',
        null,
        'lobby'
      );

      // Añadir respuesta de Cobi
      setChatMessages(prev => [...prev, { sender: 'cobi', text: respuesta }]);
    } catch (error) {
      console.error('Error al hablar con Cobi:', error);
      setChatMessages(prev => [...prev, { 
        sender: 'cobi', 
        text: '🐾 ¡Ups! Algo salió mal. Inténtalo de nuevo.' 
      }]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const games: GameDefinition[] = [
    {
      id: 'power-verbs',
      title: t('games.powerVerbs.title'),
      description: t('gamesPage.powerVerbs'),
      iconName: 'Sword',
      isAiPowered: false
    },
    {
      id: 'wordle-game',
      title: t('games.wordle.title'),
      description: t('gamesPage.wordle'),
      iconName: 'Grid3X3',
      isAiPowered: false
    },
    {
      id: 'letter-wheel',
      title: t('games.letterWheel.title'),
      description: t('gamesPage.letterWheel'),
      iconName: 'Layers',
      isAiPowered: false
    },
    {
      id: 'verb-master',
      title: t('games.verbMaster.title'),
      description: t('gamesPage.verbMaster'),
      iconName: 'Zap',
      isAiPowered: false
    },
    {
      id: 'phrase-builder',
      title: t('games.phraseBuilder.title'),
      description: t('gamesPage.phraseBuilder'),
      iconName: 'Hammer',
      isAiPowered: false
    }
  ];

  if (activeGameId === 'phrase-builder') {
    return (
      <div className="w-full bg-cream min-h-screen">
        <PhraseBuilderGame onBack={() => setActiveGameId(null)} cobiVisible={cobiVisible} soundEnabled={soundEnabled} />
      </div>
    );
  }

  if (activeGameId === 'verb-master') {
    return (
      <div className="w-full bg-cream min-h-screen">
        <VerbMasterGame onBack={() => setActiveGameId(null)} cobiVisible={cobiVisible} soundEnabled={soundEnabled} />
      </div>
    );
  }

  if (activeGameId === 'wordle-game') {
      return (
          <div className="w-full bg-cream min-h-screen">
               <WordleGame onBack={() => setActiveGameId(null)} cobiVisible={cobiVisible} soundEnabled={soundEnabled} />
          </div>
      );
  }

  if (activeGameId === 'power-verbs') {
    return (
        <div className="w-full bg-cream min-h-screen">
             <PowerOfVerbsGame onBack={() => setActiveGameId(null)} cobiVisible={cobiVisible} soundEnabled={soundEnabled} />
        </div>
    );
  }

  if (activeGameId === 'letter-wheel') {
    return (
        <div className="w-full bg-cream min-h-screen">
             <LetterWheelGame onBack={() => setActiveGameId(null)} cobiVisible={cobiVisible} soundEnabled={soundEnabled} />
        </div>
    );
  }

  // Placeholder for other games
  if (activeGameId) {
     return (
       <div className="max-w-4xl mx-auto px-4 py-12 text-center">
         <button 
          onClick={() => setActiveGameId(null)}
          className="mb-6 text-gray-500 hover:text-deep-blue font-medium flex items-center gap-2 mx-auto"
        >
          ← {t('gamesPage.backToGames').slice(2)}
        </button>
         <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100">
           <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🚧</div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('gamesPage.underConstruction')}</h2>
           <p className="text-gray-600">{t('gamesPage.comingSoon')}</p>
         </div>
       </div>
     );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 relative">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-deep-blue mb-4 tracking-tight">
          {t('gamesPage.heading')}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {t('gamesPage.subtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {games.map((game) => (
          <div 
            key={game.id}
            onClick={() => setActiveGameId(game.id)}
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 hover:border-spanish-red/20 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-cream shadow-md transition-all overflow-hidden">
              {game.id === 'power-verbs' && (
                <img 
                  src="./data/images/sombrero.webp" 
                  alt="Sombrero Mago"
                  width="56"
                  height="56"
                  className="w-full h-full object-cover"
                />
              )}
              {game.id === 'wordle-game' && (
                <img 
                  src="./data/images/lupa.webp" 
                  alt="Lupa Detective"
                  width="56"
                  height="56"
                  className="w-full h-full object-cover"
                />
              )}
              {game.id === 'letter-wheel' && (
                <img 
                  src="./data/images/brujula.webp" 
                  alt="Brújula"
                  width="56"
                  height="56"
                  className="w-full h-full object-cover"
                />
              )}
              {game.id === 'verb-master' && (
                <img 
                  src="./data/images/burbuja.webp" 
                  alt="Burbuja"
                  width="56"
                  height="56"
                  className="w-full h-full object-cover"
                />
              )}
              {game.id === 'phrase-builder' && (
                <img 
                  src="./data/images/casco.webp" 
                  alt="Casco Constructor"
                  width="56"
                  height="56"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-spanish-red transition-colors">
              {game.title}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {game.description}
            </p>

            <div className="flex items-center justify-end mt-auto">
              <span className="text-deep-blue font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center">
                {t('gamesPage.playNow')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Avatar del panda asomándose desde la esquina (solo desktop) */}
      <div className={`cobi-container hidden lg:block fixed bottom-0 right-0 z-50 pointer-events-none overflow-visible${!cobiVisible ? ' cobi-hidden' : ''}`}>
        <div className="relative animate-float">
          {/* Bocadillo de diálogo con mensaje aleatorio - A la derecha de Cobi, debajo del bocadillo de pensamiento */}
          <div style={{ position: 'absolute', left: '-200px', bottom: '80px', zIndex: 5, maxWidth: '220px' }} className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-gray-200 pointer-events-auto">
            <p className="text-gray-700 font-semibold text-sm text-center leading-snug">
              {mensajeCobi || "¿Qué juego pruebo hoy?"}
            </p>
            {/* Pico del bocadillo apuntando hacia Cobi */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 transform rotate-[315deg]"></div>
          </div>
          
          {/* Botón circular de chat - Posición superior derecha */}
          <div className="chat-button-wrapper-games">
            <button 
              onClick={() => setShowChatWindow(!showChatWindow)}
              className="cobi-chat-button-neutral"
              aria-label="Chatear con Cobi"
            >
              {/* SVG con texto curvo "CHATEAR" */}
              <svg className="curved-text-svg" viewBox="0 0 100 100">
                <defs>
                  <path 
                    id="curve-games" 
                    d="M 50,50 m -32,0 a 32,32 0 0,1 64,0" 
                    fill="none" 
                  />
                </defs>
                <text className="curved-text-style-neutral">
                  <textPath href="#curve-games" startOffset="50%" textAnchor="middle">
                    CHATEAR
                  </textPath>
                </text>
              </svg>
              
              {/* Icono de patitas en el centro */}
              <span className="paws-icon">🐾</span>
            </button>
          </div>
          
          {/* Imagen del panda con sombra sutil */}
          <div className="relative -mb-16 -mr-8" style={{ zIndex: 10 }}>
            <img 
              src={COBI_AVATAR_LOBBY}
              alt="Avatar pensando" 
              className="w-56 h-auto object-contain"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(0, 0, 0, 0.08))'
              }}
            />
          </div>
        </div>
      </div>

      {/* Botón Cobi móvil */}
      <DraggableCobi onClick={() => setShowChatWindow(!showChatWindow)} icon="🐾" themeColor="#607D8B" cobiVisible={cobiVisible} />

      {/* Chat Window */}
      {showChatWindow && (
        <div className={`cobi-container fixed bottom-24 right-6 lg:bottom-48 lg:right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden animate-fade-in${!cobiVisible ? ' cobi-hidden' : ''}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-gray-500 to-blue-gray-600 p-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #607D8B, #546E7A)' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <div>
                <h3 className="text-white font-bold text-sm">Cobi - Anfitrión</h3>
                <p className="text-blue-100 text-xs">Lobby de Juegos</p>
              </div>
            </div>
            <button
              onClick={() => setShowChatWindow(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-3xl mb-2">🐾</p>
                <p className="text-sm">¡Hola! Soy Cobi, tu anfitrión.</p>
                <p className="text-xs mt-1">¿Qué juego quieres explorar hoy?</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 border-2 border-gray-200 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            {isLoadingResponse && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border-2 border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2">
                  <p className="text-sm">
                    <span className="inline-block animate-bounce">🐾</span> Pensando...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t-2 border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessageToCobi()}
                placeholder="Escribe tu mensaje..."
                disabled={isLoadingResponse}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              />
              <button
                onClick={sendMessageToCobi}
                disabled={!currentMessage.trim() || isLoadingResponse}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ background: !currentMessage.trim() || isLoadingResponse ? undefined : 'linear-gradient(to right, #607D8B, #546E7A)' }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;