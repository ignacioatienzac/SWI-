import React, { useState } from 'react';
import { View } from '../types';
import { Menu, X, Volume2, VolumeX, Globe } from 'lucide-react';
import { useI18n } from '../services/i18n';

interface HeaderProps {
  currentView: View;
  onChangeView: (view: View) => void;
  cobiVisible: boolean;
  onToggleCobi: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onChangeView, cobiVisible, onToggleCobi, soundEnabled, onToggleSound }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { lang, setLang, t } = useI18n();

  const navItems = [
    { label: t('header.home'), value: View.HOME },
    { label: t('header.resources'), value: View.RESOURCES },
    { label: t('header.games'), value: View.GAMES },
  ];

  const handleNavClick = (value: View) => {
    onChangeView(value);
    setIsMobileMenuOpen(false);
  };

  const toggleLang = () => setLang(lang === 'es' ? 'en' : 'es');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer group"
              onClick={() => onChangeView(View.HOME)}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-spanish-red to-orange-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-xl">Ñ</span>
              </div>
              <span className="ml-3 text-2xl font-bold text-deep-blue tracking-tight">
                Cobi<span className="text-spanish-red">Spanish</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onChangeView(item.value)}
                  className={`text-sm font-semibold transition-colors duration-200 px-3 py-2 rounded-md ${
                    currentView === item.value
                      ? 'text-spanish-red bg-red-50'
                      : 'text-gray-600 hover:text-spanish-red hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Language Toggle */}
              <button
                onClick={toggleLang}
                title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-md transition-colors duration-200 hover:bg-gray-50 text-gray-500 hover:text-spanish-red text-sm font-semibold"
              >
                <Globe size={18} />
                <span className="uppercase">{lang === 'es' ? 'EN' : 'ES'}</span>
              </button>

              {/* Sound Toggle */}
              <button
                onClick={onToggleSound}
                title={soundEnabled ? t('header.muteSound') : t('header.enableSound')}
                className="flex items-center px-2 py-2 rounded-md transition-colors duration-200 hover:bg-gray-50 text-gray-500 hover:text-spanish-red"
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-gray-400" />}
              </button>

              {/* Cobi Toggle */}
              <button
                onClick={onToggleCobi}
                title={cobiVisible ? t('header.hideCobi') : t('header.showCobi')}
                className="flex items-center px-1 py-2 rounded-md transition-colors duration-200 hover:bg-gray-50"
              >
                <div className={`relative w-12 h-[24px] rounded-full transition-colors duration-300 ${cobiVisible ? 'bg-spanish-red' : 'bg-gray-300'}`}>
                  <div className={`absolute w-[34px] h-[34px] rounded-full overflow-hidden transition-all duration-300 bg-transparent border-2 border-transparent ${cobiVisible ? 'left-[18px] opacity-100' : 'left-[-4px] opacity-50'}`} style={{ top: '-5px' }}>
                    <img
                      src="./data/images/cobi-feliz.png"
                      alt="Cobi activo"
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${cobiVisible ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <img
                      src="./data/images/cobi-triste.png"
                      alt="Cobi oculto"
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${cobiVisible ? 'opacity-0' : 'opacity-100'}`}
                    />
                  </div>
                </div>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-md text-gray-600 hover:text-spanish-red hover:bg-gray-100 transition-colors"
              >
                <Menu size={28} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Full Screen Menu Overlay */}
      {/* Mobile Side Drawer Backdrop */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backdropFilter: isMobileMenuOpen ? 'blur(6px)' : 'none', WebkitBackdropFilter: isMobileMenuOpen ? 'blur(6px)' : 'none', backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Side Drawer Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 md:hidden w-3/4 max-w-xs bg-white rounded-l-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-spanish-red to-orange-500 rounded-md flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">Ñ</span>
            </div>
            <span className="ml-3 text-xl font-bold text-deep-blue">
              {t('header.menu')}
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-spanish-red transition-all active:translate-y-0.5"
            style={{ border: '2px solid #B91C1C', boxShadow: '0 3px 0 rgba(0,0,0,0.15)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-1.5 p-5 pt-6">
          {navItems.map((item) => (
            <button
              key={item.value}
              onClick={() => handleNavClick(item.value)}
              className={`w-full text-left text-lg font-bold py-3.5 px-5 rounded-xl transition-all flex items-center min-h-[48px] ${
                currentView === item.value
                  ? 'text-spanish-red bg-red-50 border border-red-100'
                  : 'text-gray-500 hover:text-deep-blue hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-100 my-3"></div>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-3 w-full py-3 px-5 rounded-xl transition-all hover:bg-gray-50 min-h-[48px]"
          >
            <Globe size={22} className="text-gray-600 flex-shrink-0" />
            <span className="text-base font-semibold text-gray-600">
              {lang === 'es' ? 'English' : 'Español'}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="flex items-center gap-3 w-full py-3 px-5 rounded-xl transition-all hover:bg-gray-50 min-h-[48px]"
          >
            {soundEnabled ? (
              <Volume2 size={22} className="text-gray-600 flex-shrink-0" />
            ) : (
              <VolumeX size={22} className="text-gray-400 flex-shrink-0" />
            )}
            <span className={`text-base font-semibold ${soundEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
              {soundEnabled ? t('header.soundOn') : t('header.soundOff')}
            </span>
          </button>

          {/* Cobi Toggle */}
          <button
            onClick={onToggleCobi}
            className="flex items-center gap-3 w-full py-3 px-5 rounded-xl transition-all hover:bg-gray-50 min-h-[48px]"
          >
            <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${cobiVisible ? 'bg-spanish-red' : 'bg-gray-300'}`}>
              <div className={`absolute w-10 h-10 rounded-full overflow-hidden transition-all duration-300 bg-transparent border-2 border-transparent ${cobiVisible ? 'left-[20px] opacity-100' : 'left-[-3px] opacity-50'}`} style={{ top: '-4px' }}>
                <img
                  src="./data/images/cobi-feliz.png"
                  alt="Cobi activo"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${cobiVisible ? 'opacity-100' : 'opacity-0'}`}
                />
                <img
                  src="./data/images/cobi-triste.png"
                  alt="Cobi oculto"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${cobiVisible ? 'opacity-0' : 'opacity-100'}`}
                />
              </div>
            </div>
            <span className={`text-base font-semibold ${cobiVisible ? 'text-gray-600' : 'text-gray-400'}`}>
              {cobiVisible ? t('header.cobiActive') : t('header.cobiHidden')}
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-5 text-center text-gray-400 text-xs border-t border-gray-100">
          <p>{t('header.copyright')}</p>
        </div>
      </div>
    </>
  );
};

export default Header;