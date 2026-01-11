import React from 'react';
import { View } from '../types';

interface HeroProps {
  onStart: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  return (
    <div className="relative overflow-hidden bg-cream">
        
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-spanish-yellow/10 blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-spanish-red/5 blur-3xl opacity-70"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold text-deep-blue mb-8 tracking-tight leading-tight">
            Domina el español <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-spanish-red to-orange-600">
              con confianza
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
            Una plataforma moderna creada por Ignacio para llevar tu español al siguiente nivel. 
            Gramática clara, recursos útiles y juegos interactivos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-spanish-red text-white text-lg font-bold rounded-full shadow-lg hover:bg-red-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              Empezar a Jugar
            </button>
            <button className="px-8 py-4 bg-white text-deep-blue border-2 border-deep-blue/10 text-lg font-bold rounded-full hover:border-deep-blue hover:bg-blue-50 transition-all duration-300">
              Ver Recursos
            </button>
          </div>
        </div>
      </div>
      
      {/* Features strip */}
      <div className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="p-4">
                    <div className="text-4xl mb-2">🚀</div>
                    <h3 className="font-bold text-deep-blue">Aprendizaje Rápido</h3>
                    <p className="text-gray-500 text-sm mt-2">Métodos probados para acelerar tu fluidez.</p>
                </div>
                <div className="p-4">
                    <div className="text-4xl mb-2">🎮</div>
                    <h3 className="font-bold text-deep-blue">Gamificación</h3>
                    <p className="text-gray-500 text-sm mt-2">Aprende sin aburrirte con nuestros juegos.</p>
                </div>
                <div className="p-4">
                    <div className="text-4xl mb-2">🤖</div>
                    <h3 className="font-bold text-deep-blue">Potenciado por IA</h3>
                    <p className="text-gray-500 text-sm mt-2">Ejercicios infinitos generados por inteligencia artificial.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;