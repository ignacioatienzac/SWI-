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

          {/* Right Column: Game mosaic */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {/* El Poder de los Verbos */}
            <div style={{ gridColumn: 1, gridRow: 1 }}>
              <img src="./data/images/El-Poder-De-Los-Verbos.png" alt="El Poder de los Verbos" style={{ width: '100%', height: 'auto', objectFit: 'contain', aspectRatio: '2.38 / 1', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
            </div>
            {/* Constructor de Frases */}
            <div style={{ gridColumn: 1, gridRow: 2 }}>
              <img src="./data/images/Constructor-De-Frases.png" alt="Constructor de Frases" style={{ width: '100%', height: 'auto', objectFit: 'contain', aspectRatio: '2.38 / 1', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
            </div>
            {/* Adivina la Palabra (vertical, spans 2 rows) */}
            <div style={{ gridColumn: 2, gridRow: '1 / span 2' }}>
              <img src="./data/images/Adivina-La-Palabra.png" alt="Adivina la Palabra" style={{ width: '100%', height: 'auto', objectFit: 'contain', aspectRatio: '0.82 / 1', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
            </div>
            {/* La Rueda de Letras */}
            <div style={{ gridColumn: 1, gridRow: 3 }}>
              <img src="./data/images/La-Rueda-De-Letras.png" alt="La Rueda de Letras" style={{ width: '100%', height: 'auto', objectFit: 'contain', aspectRatio: '2 / 1', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
            </div>
            {/* Maestro de Verbos */}
            <div style={{ gridColumn: 2, gridRow: 3 }}>
              <img src="./data/images/Maestro-De-Verbos.png" alt="Maestro de Verbos" style={{ width: '100%', height: 'auto', objectFit: 'contain', aspectRatio: '1.6 / 1', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Hero;