import React from 'react';
import avatarImage from '../public/data/images/avatar-ignacio.webp';

const AboutMe: React.FC = () => {
  return (
    <section className="bg-white py-16 md:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Asymmetric Grid: 60% text + stats / 40% image. Stacks on mobile (image first) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 items-center">

          {/* IMAGE COLUMN — 40% (2/5) on desktop, shown first on mobile via order */}
          <div className="md:col-span-2 flex justify-center order-1 md:order-2">
            <div className="relative group">
              {/* Subtle floating glow behind image */}
              <div
                className="absolute inset-0 rounded-full blur-3xl opacity-30 transition-opacity duration-500 group-hover:opacity-50"
                style={{ background: 'radial-gradient(circle, #F1BF00 0%, transparent 70%)' }}
              ></div>
              {/* Illustration floats with transparent bg — no frame, no border */}
              <img
                src={avatarImage}
                alt="Ignacio - Creador de CobiSpanish"
                className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 object-contain transition-transform duration-500 ease-out group-hover:scale-105 drop-shadow-lg"
              />
            </div>
          </div>

          {/* TEXT + STATS COLUMN — 60% (3/5) on desktop */}
          <div className="md:col-span-3 text-center md:text-left order-2 md:order-1">
            <span className="inline-block px-4 py-1.5 bg-red-50 text-spanish-red font-bold text-xs uppercase tracking-widest rounded-full mb-5">
              Sobre el creador de CobiSpanish
            </span>

            <div className="space-y-5 text-gray-600 text-base sm:text-lg md:text-xl leading-relaxed font-light">
              <p className="text-justify">
                Ignacio es un profesor con <span className="font-semibold text-deep-blue">más de 10 años de experiencia</span> guiando a estudiantes de todo el mundo en su camino hacia el español. Como apasionado de la tecnología y la innovación educativa, siempre creyó que aprender un idioma debería sentirse menos como una tarea y más como un descubrimiento.
              </p>
              <p className="text-justify">
                Por eso comenzó a crear <span className="font-semibold text-spanish-red">CobiSpanish</span>: un espacio donde sus dos pasiones se unen para ofrecerte recursos interactivos y juegos que rompen con lo tradicional. Su meta es que, con la ayuda de herramientas creativas (y de nuestro querido Cobi), logres la fluidez que buscas de una forma divertida, visual y realmente memorable.
              </p>
            </div>

            {/* STATS — "Logros desbloqueados" row, no boxes */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-4 flex items-center justify-center md:justify-start gap-2">
                <span>🏆</span> Logros desbloqueados
              </p>
              <div className="flex items-start justify-center md:justify-start gap-10 sm:gap-14">
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-extrabold text-deep-blue leading-none">10+</span>
                  <span className="text-xs sm:text-sm text-gray-400 mt-1 block">Años enseñando</span>
                </div>
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-extrabold text-deep-blue leading-none">5k+</span>
                  <span className="text-xs sm:text-sm text-gray-400 mt-1 block">Alumnos felices</span>
                </div>
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-extrabold text-deep-blue leading-none">∞</span>
                  <span className="text-xs sm:text-sm text-gray-400 mt-1 block">Recursos creados</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutMe;