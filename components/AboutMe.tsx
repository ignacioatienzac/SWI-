import React from 'react';
import avatarImage from '../public/data/images/avatar-ignacio.webp';

const AboutMe: React.FC = () => {
  return (
    <section className="bg-white py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop: row-reverse (text left, image right). Mobile: column (image top, text bottom) */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
          
          {/* Image Side (appears RIGHT on desktop, TOP on mobile) */}
          <div className="w-full md:w-1/2 flex justify-center md:justify-start relative group">
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-spanish-yellow/10 rounded-full blur-3xl transform -translate-x-8 -translate-y-8"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-spanish-red/8 rounded-full blur-2xl transform translate-x-4 translate-y-4"></div>
            
            {/* Profile Image Container — organic blob shape */}
            <div className="relative w-72 h-72 md:w-80 md:h-80 transition-transform duration-500 ease-out group-hover:scale-105">
               {/* Organic blob background */}
               <div
                 className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                 style={{
                   backgroundColor: '#FFFDF5',
                   borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
                   transform: 'rotate(-3deg)',
                 }}
               ></div>
               
               {/* Image clipped as organic circle */}
               <div
                 className="relative w-full h-full overflow-hidden shadow-2xl"
                 style={{
                   borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
                 }}
               >
                <img 
                  src={avatarImage}
                  alt="Ignacio - Creador de CobiSpanish" 
                  className="w-full h-full object-cover"
                  style={{ backgroundColor: '#FFFDF5' }}
                />
              </div>
            </div>
          </div>

          {/* Content Side (appears LEFT on desktop, BOTTOM on mobile) */}
          <div className="w-full md:w-1/2 text-center md:text-left z-10">
            <div className="inline-block px-4 py-1.5 bg-red-50 text-spanish-red font-bold text-xs uppercase tracking-widest rounded-full mb-6">
              Sobre el creador de CobiSpanish
            </div>
            
            <div className="space-y-6 text-gray-600 text-lg md:text-xl leading-relaxed font-light">
              <p className="text-justify">
                Ignacio es un profesor con <span className="font-bold text-deep-blue">más de 10 años de experiencia</span> guiando a estudiantes de todo el mundo en su camino hacia el español. Como apasionado de la tecnología y la innovación educativa, siempre creyó que aprender un idioma debería sentirse menos como una tarea y más como un descubrimiento.
              </p>
              <p className="text-justify">
                Por eso comenzó a crear <span className="font-bold text-spanish-red">CobiSpanish</span>: un espacio donde sus dos pasiones se unen para ofrecerte recursos interactivos y juegos que rompen con lo tradicional. Su meta es que, con la ayuda de herramientas creativas (y de nuestro querido Cobi), logres la fluidez que buscas de una forma divertida, visual y realmente memorable.
              </p>
            </div>

            {/* Stats as mini cards */}
            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 text-center min-w-[120px] transition-shadow hover:shadow-md">
                    <span className="block text-3xl font-bold text-deep-blue">10+</span>
                    <span className="text-sm text-gray-500">Años enseñando</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 text-center min-w-[120px] transition-shadow hover:shadow-md">
                    <span className="block text-3xl font-bold text-deep-blue">5k+</span>
                    <span className="text-sm text-gray-500">Alumnos felices</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 text-center min-w-[120px] transition-shadow hover:shadow-md">
                    <span className="block text-3xl font-bold text-deep-blue">∞</span>
                    <span className="text-sm text-gray-500">Recursos creados</span>
                </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutMe;