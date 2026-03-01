import React from 'react';

const games = [
  {
    emoji: '⚔️',
    title: 'El Poder de los Verbos',
    description: 'Defiende el castillo conjugando verbos. Cada respuesta correcta potencia a tu mago y derrota a los monstruos que se acercan. Practica presente, pasado y subjuntivo en una aventura épica.',
    skills: ['Conjugaciones', 'Reflejos', 'Vocabulario verbal'],
    color: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700'
  },
  {
    emoji: '🔍',
    title: 'Adivina la Palabra',
    description: 'El clásico juego de palabras adaptado al español. Tienes 6 intentos para descubrir la palabra oculta del día. Las pistas de colores te guiarán hasta la solución.',
    skills: ['Vocabulario', 'Ortografía', 'Deducción'],
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700'
  },
  {
    emoji: '🎡',
    title: 'La Rueda de Letras',
    description: 'Forma todas las palabras posibles usando las letras de la rueda para completar el crucigrama del día. Un nuevo reto cada día con palabras de tu nivel.',
    skills: ['Vocabulario', 'Anagramas', 'Agilidad mental'],
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700'
  },
  {
    emoji: '🫧',
    title: 'Maestro de Verbos',
    description: 'Explota las burbujas antes de que lleguen al suelo seleccionando la conjugación correcta. La velocidad aumenta con cada nivel. ¿Cuánto aguantarás?',
    skills: ['Conjugaciones', 'Velocidad', 'Concentración'],
    color: 'from-cyan-500 to-blue-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-700'
  },
  {
    emoji: '🏗️',
    title: 'Constructor de Frases',
    description: 'Ordena las palabras desordenadas para formar oraciones correctas. Practica la estructura gramatical del español de forma interactiva y divertida.',
    skills: ['Gramática', 'Orden de palabras', 'Comprensión'],
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-700'
  }
];

const GamesExplainer: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-cream to-white py-20 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-red-50 text-spanish-red font-bold text-xs uppercase tracking-widest rounded-full mb-6">
            Nuestros Juegos
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-deep-blue mb-4 leading-tight">
            Aprende jugando 🎮
          </h2>
          <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-light">
            Cinco juegos diseñados para que practiques vocabulario, gramática y conjugaciones de forma divertida. Desde el nivel A1 hasta el B2.
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1"
            >
              {/* Color bar top */}
              <div className={`h-1.5 bg-gradient-to-r ${game.color}`}></div>

              <div className="p-6">
                {/* Emoji & Title */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{game.emoji}</span>
                  <h3 className="text-lg font-extrabold text-deep-blue leading-tight">
                    {game.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  {game.description}
                </p>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-2">
                  {game.skills.map((skill, i) => (
                    <span
                      key={i}
                      className={`${game.bgLight} ${game.textColor} text-xs font-semibold px-3 py-1 rounded-full`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-gray-400 text-sm mt-12">
          Todos los juegos están disponibles en los niveles A1, A2, B1 y B2. Cobi te acompaña en cada partida para darte pistas y resolver tus dudas.
        </p>
      </div>
    </section>
  );
};

export default GamesExplainer;
