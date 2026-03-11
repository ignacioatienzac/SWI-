import React from 'react';
import avatarImage from '../public/data/images/avatar-ignacio.webp';
import { useI18n } from '../services/i18n';

const AboutMe: React.FC = () => {
  const { t } = useI18n();
  return (
    <section className="bg-white py-10 md:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Mobile only: Title above image */}
        <h2 className="md:hidden text-3xl font-extrabold text-deep-blue mb-6 leading-tight text-center">
          {t('aboutMe.title')}
        </h2>

        {/* Asymmetric Grid: 60% title+text / 40% image+stats on DESKTOP. Stacks on mobile. */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 items-start">

          {/* LEFT COLUMN (desktop) — 60% (3/5): Title + Text */}
          <div className="md:col-span-3 text-center md:text-left order-2 md:order-1">
            <h2 className="hidden md:block text-3xl md:text-5xl font-extrabold text-deep-blue mb-6 leading-tight text-center">
              {t('aboutMe.title')}
            </h2>

            <div className="space-y-5 text-gray-600 text-base sm:text-lg md:text-xl leading-relaxed font-light">
              <p className="text-justify" dangerouslySetInnerHTML={{ __html: t('aboutMe.paragraph1') }} />
              <p className="text-justify" dangerouslySetInnerHTML={{ __html: t('aboutMe.paragraph2') }} />
            </div>

            {/* STATS — visible only on MOBILE (below text) */}
            <div className="mt-8 pt-8 border-t border-gray-100 md:hidden">
              <div className="flex items-start justify-center gap-10 sm:gap-14">
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-extrabold text-deep-blue leading-none">10+</span>
                  <span className="text-xs sm:text-sm text-gray-400 mt-1 block">{t('aboutMe.statYears')}</span>
                </div>
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-extrabold text-deep-blue leading-none">5k+</span>
                  <span className="text-xs sm:text-sm text-gray-400 mt-1 block">{t('aboutMe.statStudents')}</span>
                </div>
                <div className="text-center">
                  <span className="block text-3xl sm:text-4xl font-extrabold text-deep-blue leading-none">∞</span>
                  <span className="text-xs sm:text-sm text-gray-400 mt-1 block">{t('aboutMe.statResources')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (desktop) — 40% (2/5): Image on top + Stats below */}
          <div className="md:col-span-2 flex flex-col items-center order-1 md:order-2">
            {/* Image */}
            <div className="relative group">
              <div
                className="absolute inset-0 rounded-full blur-3xl opacity-30 transition-opacity duration-500 group-hover:opacity-50"
                style={{ background: 'radial-gradient(circle, #F1BF00 0%, transparent 70%)' }}
              ></div>
              <img
                src={avatarImage}
                alt="Ignacio - Creador de CobiSpanish"
                className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 object-contain transition-transform duration-500 ease-out group-hover:scale-105 drop-shadow-lg"
              />
            </div>

            {/* STATS — visible only on DESKTOP (below image in right column) */}
            <div className="hidden md:block mt-8 pt-8 border-t border-gray-100 w-full">
              <div className="flex items-start justify-center gap-10">
                <div className="text-center">
                  <span className="block text-3xl font-extrabold text-deep-blue leading-none">10+</span>
                  <span className="text-xs text-gray-400 mt-1 block">{t('aboutMe.statYears')}</span>
                </div>
                <div className="text-center">
                  <span className="block text-3xl font-extrabold text-deep-blue leading-none">5k+</span>
                  <span className="text-xs text-gray-400 mt-1 block">{t('aboutMe.statStudents')}</span>
                </div>
                <div className="text-center">
                  <span className="block text-3xl font-extrabold text-deep-blue leading-none">∞</span>
                  <span className="text-xs text-gray-400 mt-1 block">{t('aboutMe.statResources')}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutMe;