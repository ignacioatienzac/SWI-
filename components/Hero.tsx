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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-32 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold text-deep-blue mb-8 tracking-tight leading-tight">
            {t('hero.titleLine1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-spanish-red to-orange-600">
              {t('hero.titleLine2')}
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        </div>
      </div>
    </div>
  );
};

export default Hero;