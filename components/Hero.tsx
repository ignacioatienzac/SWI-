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

      <div className="w-full px-[30px] py-10 md:py-0 relative z-10">
        <div className="md:grid md:grid-cols-[40%_60%] md:items-center" style={{ gap: '30px' }}>
          
          {/* Left Column: Content */}
          <div className="text-center md:text-left mb-10 md:mb-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6" style={{ color: '#1a1a1a' }}>
              {t('hero.titleLine1')} <br />
              <span className="text-spanish-red">
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

            <div className="mt-5 space-y-1">
              <p className="text-sm font-medium flex items-center justify-center md:justify-start gap-2" style={{ color: '#4a4a4a' }}>
                <span className="text-green-500">✓</span> {t('hero.badge1')}
              </p>
              <p className="text-sm font-medium flex items-center justify-center md:justify-start gap-2" style={{ color: '#4a4a4a' }}>
                <span className="text-green-500">✓</span> {t('hero.badge2')}
              </p>
            </div>
          </div>

          {/* Right Column: Featured mosaic image */}
          <div className="flex items-center justify-center">
            <img
              src="./data/images/Mosaico.png"
              alt="Mosaico de juegos"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '15px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Hero;