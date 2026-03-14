import React from 'react';
import { useI18n } from '../services/i18n';

interface HeroProps {
  onStart: () => void;
  onResources: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart, onResources }) => {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden bg-cream min-h-[calc(100dvh-5rem)] flex items-center">
        
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-spanish-yellow/10 blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-spanish-red/5 blur-3xl opacity-70"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-0 relative z-10 w-full">
        <div className="md:grid md:grid-cols-2 md:gap-12 md:items-center">
          
          {/* Left Column: Content */}
          <div className="text-center md:text-left mb-10 md:mb-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6" style={{ color: '#1a1a1a' }}>
              {t('hero.titleLine1')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-spanish-red to-orange-600">
                {t('hero.titleLine2')}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl leading-relaxed mb-8" style={{ color: '#4a4a4a' }}>
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button 
                onClick={onStart}
                className="px-8 py-4 bg-spanish-red text-white text-lg font-bold rounded-full shadow-lg hover:bg-red-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {t('hero.cta')}
              </button>
              <button 
                onClick={onResources}
                className="px-8 py-4 bg-white text-deep-blue border-2 border-deep-blue/10 text-lg font-bold rounded-full hover:border-deep-blue hover:bg-blue-50 transition-all duration-300"
              >
                {t('hero.secondary')}
              </button>
            </div>

            <p className="mt-5 text-sm font-medium" style={{ color: '#6b7280' }}>
              ✅ Recursos creados por expertos nativos
            </p>
          </div>

          {/* Right Column: Game mosaic image */}
          <div className="rounded-2xl overflow-hidden shadow-lg border-2 border-white/80 hover:scale-[1.02] transition-transform duration-300">
            <img src="./data/images/Mosaico.png" alt="Juegos de CobiSpanish" className="w-full h-full object-cover" />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Hero;