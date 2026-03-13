import React from 'react';
import { useI18n } from '../services/i18n';

interface HeroProps {
  onStart: () => void;
  onResources: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart, onResources }) => {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden bg-cream">
        
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-spanish-yellow/10 blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-spanish-red/5 blur-3xl opacity-70"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-24 relative z-10">
        <div className="md:grid md:grid-cols-2 md:gap-12 md:items-center">
          
          {/* Left Column: Content */}
          <div className="text-center md:text-left mb-10 md:mb-0">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6" style={{ color: '#1a1a1a' }}>
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

          {/* Right Column: Visual mosaic */}
          <div className="relative flex items-center justify-center" style={{ minHeight: '360px' }}>
            {/* Cobi central avatar */}
            <img 
              src="./data/images/cobi.webp" 
              alt="Cobi" 
              className="w-36 h-36 md:w-44 md:h-44 rounded-full shadow-2xl border-4 border-white relative z-10 object-cover"
            />
            {/* Game character cards */}
            <img 
              src="./data/images/cobi-mago.webp" 
              alt="Cobi Mago" 
              className="absolute w-28 h-28 md:w-36 md:h-36 rounded-xl shadow-lg object-cover border-2 border-white"
              style={{ top: '0%', right: '5%', transform: 'rotate(6deg)' }}
            />
            <img 
              src="./data/images/cobi-detective.webp" 
              alt="Cobi Detective" 
              className="absolute w-28 h-28 md:w-36 md:h-36 rounded-xl shadow-lg object-cover border-2 border-white"
              style={{ top: '5%', left: '5%', transform: 'rotate(-8deg)' }}
            />
            <img 
              src="./data/images/cobi-explorador.webp" 
              alt="Cobi Explorador" 
              className="absolute w-24 h-24 md:w-32 md:h-32 rounded-xl shadow-lg object-cover border-2 border-white"
              style={{ bottom: '2%', left: '10%', transform: 'rotate(4deg)' }}
            />
            <img 
              src="./data/images/cobi-sensei.webp" 
              alt="Cobi Sensei" 
              className="absolute w-24 h-24 md:w-32 md:h-32 rounded-xl shadow-lg object-cover border-2 border-white"
              style={{ bottom: '0%', right: '8%', transform: 'rotate(-5deg)' }}
            />
            <img 
              src="./data/images/Avatar-construction.webp" 
              alt="Cobi Constructor" 
              className="absolute w-20 h-20 md:w-28 md:h-28 rounded-xl shadow-lg object-cover border-2 border-white"
              style={{ top: '45%', left: '0%', transform: 'rotate(-3deg)' }}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Hero;