import React from 'react';
import { GameDefinition } from '../types';
import WordleGame from './WordleGame';
import PowerOfVerbsGame from './PowerOfVerbsGame';
import LetterWheelGame from './LetterWheelGame';
import VerbMasterGame from './VerbMasterGame';
import { Gamepad2, Layers, Zap, Grid3X3, Sword } from 'lucide-react';

interface GamesProps {
  activeGameId: string | null;
  setActiveGameId: (id: string | null) => void;
}

const Games: React.FC<GamesProps> = ({ activeGameId, setActiveGameId }) => {
  const games: GameDefinition[] = [
    {
      id: 'power-verbs',
      title: 'El Poder de los Verbos',
      description: '¡Defiende el castillo! Responde correctamente para potenciar a tu héroe y derrotar a los monstruos.',
      iconName: 'Sword',
      isAiPowered: false
    },
    {
      id: 'wordle-game',
      title: 'Adivina la Palabra',
      description: 'El clásico juego de palabras. Tienes 6 intentos para descubrir la palabra oculta.',
      iconName: 'Grid3X3',
      isAiPowered: false
    },
    {
      id: 'letter-wheel',
      title: 'La Rueda de Letras',
      description: 'Forma palabras usando las letras de la rueda para completar el crucigrama del día.',
      iconName: 'Layers',
      isAiPowered: false
    },
    {
      id: 'verb-master',
      title: 'Maestro de Verbos',
      description: '¡Explota las burbujas antes de que lleguen al suelo! Practica conjugaciones en un juego estilo Tetris.',
      iconName: 'Zap',
      isAiPowered: false
    },
    {
      id: 'phrase-builder',
      title: 'Constructor de Frases',
      description: 'Ordena las palabras para formar oraciones gramaticalmente correctas.',
      iconName: 'Gamepad2',
      isAiPowered: false
    }
  ];

  if (activeGameId === 'verb-master') {
    return (
      <div className="w-full bg-cream min-h-screen">
        <VerbMasterGame onBack={() => setActiveGameId(null)} />
      </div>
    );
  }

  if (activeGameId === 'wordle-game') {
      return (
          <div className="w-full bg-cream min-h-screen">
               <WordleGame onBack={() => setActiveGameId(null)} />
          </div>
      );
  }

  if (activeGameId === 'power-verbs') {
    return (
        <div className="w-full bg-cream min-h-screen">
             <PowerOfVerbsGame onBack={() => setActiveGameId(null)} />
        </div>
    );
  }

  if (activeGameId === 'letter-wheel') {
    return (
        <div className="w-full bg-cream min-h-screen">
             <LetterWheelGame onBack={() => setActiveGameId(null)} />
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
          ← Volver a Juegos
        </button>
         <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100">
           <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🚧</div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">En Construcción</h2>
           <p className="text-gray-600">Este juego estará disponible pronto.</p>
         </div>
       </div>
     );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-deep-blue mb-4 tracking-tight">
          Aprende Jugando
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Mejora tu español con nuestros juegos interactivos. 
          <span className="block mt-1 text-spanish-red font-medium">¡Nuevos juegos añadidos cada semana!</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {games.map((game) => (
          <div 
            key={game.id}
            onClick={() => setActiveGameId(game.id)}
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 hover:border-spanish-red/20 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-white shadow-md transition-colors ${
              game.id === 'power-verbs' ? 'bg-orange-500' :
              game.id === 'verb-master' ? 'bg-spanish-red' : 'bg-deep-blue'
            }`}>
              {game.iconName === 'Zap' && <Zap size={28} />}
              {game.iconName === 'Sword' && <Sword size={28} />}
              {game.iconName === 'Layers' && <Layers size={28} />}
              {game.iconName === 'Gamepad2' && <Gamepad2 size={28} />}
              {game.iconName === 'Grid3X3' && <Grid3X3 size={28} />}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-spanish-red transition-colors">
              {game.title}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {game.description}
            </p>

            <div className="flex items-center justify-end mt-auto">
              <span className="text-deep-blue font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center">
                Jugar ahora →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Games;