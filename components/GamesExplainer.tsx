import React from 'react';

const games = [
  {
    emoji: '⚔️',
    title: 'El Poder de los Verbos',
    description: 'Defiende el castillo conjugando verbos. Cada respuesta correcta potencia a tu mago y derrota a los monstruos que se acercan.',
    skills: ['Conjugaciones', 'Reflejos', 'Vocabulario verbal'],
    color: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-100/60',
    textColor: 'text-purple-700',
    shadowColor: '139, 92, 246',   // purple-500
  },
  {
    emoji: '🔍',
    title: 'Adivina la Palabra',
    description: 'El clásico juego de palabras adaptado al español. Tienes 6 intentos para descubrir la palabra oculta del día.',
    skills: ['Vocabulario', 'Ortografía', 'Deducción'],
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-100/60',
    textColor: 'text-emerald-700',
    shadowColor: '16, 185, 129',   // emerald-500
  },
  {
    emoji: '🎡',
    title: 'La Rueda de Letras',
    description: 'Forma todas las palabras posibles usando las letras de la rueda para completar el crucigrama del día.',
    skills: ['Vocabulario', 'Anagramas', 'Agilidad mental'],
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-100/60',
    textColor: 'text-amber-700',
    shadowColor: '245, 158, 11',   // amber-500
  },
  {
    emoji: '🫧',
    title: 'Maestro de Verbos',
    description: 'Explota las burbujas antes de que lleguen al suelo escribiendo la conjugación correcta. La velocidad aumenta con cada nivel.',
    skills: ['Conjugaciones', 'Velocidad', 'Concentración'],
    color: 'from-cyan-500 to-blue-600',
    bgLight: 'bg-cyan-100/60',
    textColor: 'text-cyan-700',
    shadowColor: '6, 182, 212',    // cyan-500
  },
  {
    emoji: '🏗️',
    title: 'Constructor de Frases',
    description: 'Ordena las palabras desordenadas para formar oraciones correctas en español de forma interactiva y divertida.',
    skills: ['Gramática', 'Orden de palabras', 'Comprensión'],
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-100/60',
    textColor: 'text-rose-700',
    shadowColor: '244, 63, 94',    // rose-500
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

        {/* Games Grid — flex-wrap so the bottom row auto-centers */}
        <div className="flex flex-wrap justify-center gap-8">
          {games.map((game, index) => (
            <div
              key={index}
              className="group relative w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.4rem)] rounded-3xl bg-white/80 backdrop-blur-sm text-center transition-all duration-300 ease-out cursor-default"
              style={{
                boxShadow: `0 4px 24px rgba(${game.shadowColor}, 0.15)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 12px 36px rgba(${game.shadowColor}, 0.30)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(${game.shadowColor}, 0.15)`;
              }}
            >
              <div className="p-7">
                {/* Emoji */}
                <span className="text-4xl block mb-3">{game.emoji}</span>

                {/* Title */}
                <h3 className="text-lg font-extrabold text-deep-blue leading-tight mb-3">
                  {game.title}
                </h3>

                {/* Description */}
                <p className="text-gray-500 text-sm leading-relaxed mb-5">
                  {game.description}
                </p>

                {/* Skills Pills */}
                <div className="flex flex-wrap justify-center gap-2">
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
