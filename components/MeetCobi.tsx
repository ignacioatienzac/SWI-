import React from 'react';
import { useI18n } from '../services/i18n';

const cobiImage = `${import.meta.env.BASE_URL}data/images/favicon-cobi.png`;

const MeetCobi: React.FC = () => {
  const { t } = useI18n();
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
                  src={cobiImage}
                  alt="Cobi - Tu compañero de aprendizaje" 
                  className="w-full h-full object-cover bg-cream"
                />
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div className="w-full md:w-1/2 text-center md:text-left z-10">
            <div className="inline-block px-4 py-1.5 bg-red-50 text-spanish-red font-bold text-xs uppercase tracking-widest rounded-full mb-6">
              {t('meetCobi.badge')}
            </div>
            
            <h3 className="text-3xl md:text-5xl font-extrabold text-deep-blue mb-6 leading-tight">
              {t('meetCobi.title')}
            </h3>
            
            <div className="space-y-6 text-gray-600 text-lg md:text-xl leading-relaxed font-light">
              <p className="text-justify">
                {t('meetCobi.paragraph')} <span className="font-bold text-spanish-red">{t('meetCobi.highlight')}</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default MeetCobi;
