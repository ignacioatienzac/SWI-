import React from 'react';

const AboutMe: React.FC = () => {
  return (
    <section className="bg-white py-20 border-b border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
          
          {/* Image Side */}
          <div className="w-full md:w-1/2 flex justify-center md:justify-end relative group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-spanish-yellow/20 rounded-full blur-3xl transform translate-x-8 -translate-y-8"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-spanish-red/10 rounded-full blur-2xl transform -translate-x-4 translate-y-4"></div>
            
            {/* Profile Image Container */}
            <div className="relative w-72 h-72 md:w-80 md:h-80 transition-transform duration-500 ease-out group-hover:scale-105">
               <div className="absolute inset-0 border-4 border-spanish-yellow rounded-[2rem] rotate-6 transform transition-transform group-hover:rotate-12"></div>
               <div className="absolute inset-0 bg-spanish-red rounded-[2rem] -rotate-3 opacity-10 transform transition-transform group-hover:-rotate-6"></div>
               
               <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                <img 
                  src="/images/avatar-ignacio.webp" 
                  alt="Ignacio - Profesor de Español" 
                  className="w-full h-full object-cover bg-cream"
                />
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div className="w-full md:w-1/2 text-center md:text-left z-10">
            <div className="inline-block px-4 py-1.5 bg-red-50 text-spanish-red font-bold text-xs uppercase tracking-widest rounded-full mb-6">
              Sobre Mí
            </div>
            
            <h3 className="text-3xl md:text-5xl font-extrabold text-deep-blue mb-6 leading-tight">
              ¡Hola! Soy Ignacio
            </h3>
            
            <div className="space-y-6 text-gray-600 text-lg md:text-xl leading-relaxed font-light">
              <p>
                Bienvenidos a mi espacio personal de aprendizaje. Soy un profesor con 
                <span className="font-bold text-deep-blue"> más de 10 años de experiencia </span> 
                enseñando español a estudiantes apasionados de todo el mundo.
              </p>
              <p>
                No solo enseño el idioma, sino que soy un <span className="font-bold text-spanish-red">experto creador de recursos</span> educativos. 
                Mi objetivo es diseñar herramientas que hagan tu aprendizaje divertido, efectivo y memorable, ayudándote a alcanzar la fluidez que siempre has deseado.
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-8">
                <div className="text-center md:text-left">
                    <span className="block text-3xl font-bold text-deep-blue">10+</span>
                    <span className="text-sm text-gray-500">Años enseñando</span>
                </div>
                <div className="text-center md:text-left">
                    <span className="block text-3xl font-bold text-deep-blue">5k+</span>
                    <span className="text-sm text-gray-500">Alumnos felices</span>
                </div>
                <div className="text-center md:text-left">
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