import React from 'react';
import { useI18n } from '../services/i18n';

const gameKeys = ['powerVerbs', 'wordle', 'letterWheel', 'verbMaster', 'phraseBuilder'] as const;
const gameEmojis = ['⚔️', '🔍', '🎡', '🫧', '🏗️'];
const gameStyles = [
  { color: 'from-purple-500 to-indigo-600', bgLight: 'bg-purple-100/60', textColor: 'text-purple-700', shadowColor: '139, 92, 246' },
  { color: 'from-emerald-500 to-green-600', bgLight: 'bg-emerald-100/60', textColor: 'text-emerald-700', shadowColor: '16, 185, 129' },
  { color: 'from-amber-500 to-orange-600', bgLight: 'bg-amber-100/60', textColor: 'text-amber-700', shadowColor: '245, 158, 11' },
  { color: 'from-cyan-500 to-blue-600', bgLight: 'bg-cyan-100/60', textColor: 'text-cyan-700', shadowColor: '6, 182, 212' },
  { color: 'from-rose-500 to-red-600', bgLight: 'bg-rose-100/60', textColor: 'text-rose-700', shadowColor: '244, 63, 94' },
];

const GamesExplainer: React.FC = () => {
  const { t } = useI18n();
  return (
    <section className="bg-gradient-to-b from-cream to-white py-20 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-red-50 text-spanish-red font-bold text-xs uppercase tracking-widest rounded-full mb-6">
            {t('games.badge')}
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-deep-blue mb-4 leading-tight">
            {t('games.title')}
          </h2>
          <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-light">
            {t('games.subtitle')}
          </p>
        </div>

        {/* Games Grid — flex-wrap so the bottom row auto-centers */}
        <div className="flex flex-wrap justify-center gap-8">
          {gameKeys.map((key, index) => {
            const style = gameStyles[index];
            const skills = t(`games.${key}.skills`).split(',');
            return (
              <div
                key={key}
                className="group relative w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.4rem)] rounded-3xl bg-white/80 backdrop-blur-sm text-center transition-all duration-300 ease-out cursor-default"
                style={{
                  boxShadow: `0 4px 24px rgba(${style.shadowColor}, 0.15)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = `0 12px 36px rgba(${style.shadowColor}, 0.30)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 24px rgba(${style.shadowColor}, 0.15)`;
                }}
              >
                <div className="p-7">
                  {/* Emoji */}
                  <span className="text-4xl block mb-3">{gameEmojis[index]}</span>

                  {/* Title */}
                  <h3 className="text-lg font-extrabold text-deep-blue leading-tight mb-3">
                    {t(`games.${key}.title`)}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-sm leading-relaxed mb-5">
                    {t(`games.${key}.description`)}
                  </p>

                  {/* Skills Pills */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {skills.map((skill, i) => (
                      <span
                        key={i}
                        className={`${style.bgLight} ${style.textColor} text-xs font-semibold px-3 py-1 rounded-full`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p className="text-center text-gray-400 text-sm mt-12">
          {t('games.note')}
        </p>
      </div>
    </section>
  );
};

export default GamesExplainer;
