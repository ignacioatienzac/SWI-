import React, { useState } from 'react';
import { View } from '../types';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  currentView: View;
  onChangeView: (view: View) => void;
  cobiVisible: boolean;
  onToggleCobi: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onChangeView, cobiVisible, onToggleCobi }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Inicio', value: View.HOME },
    { label: 'Recursos', value: View.RESOURCES },
    { label: 'Juegos', value: View.GAMES },
  ];

  const handleNavClick = (value: View) => {
    onChangeView(value);
    setIsMobileMenuOpen(false);
  };

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
            <nav className="hidden md:flex space-x-8">
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

              {/* Cobi Toggle */}
              <button
                onClick={onToggleCobi}
                title={cobiVisible ? 'Ocultar a Cobi' : 'Mostrar a Cobi'}
                className="flex items-center px-1 py-2 rounded-md transition-colors duration-200 hover:bg-gray-50"
              >
                <div className={`relative w-11 h-[22px] rounded-full transition-colors duration-300 ${cobiVisible ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`absolute w-[30px] h-[30px] rounded-full overflow-hidden transition-all duration-300 bg-transparent ${cobiVisible ? 'left-[16px] opacity-100' : 'left-[-3px] opacity-50'}`} style={{ top: '-4px' }}>
                    <img
                      src="./data/images/favicon-cobi.png"
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
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-cream md:hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
             <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-spanish-red to-orange-500 rounded-md flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">Ñ</span>
              </div>
              <span className="ml-3 text-xl font-bold text-deep-blue">
                Menú
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-spanish-red hover:text-white transition-all"
            >
              <X size={28} />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center gap-8 p-8">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => handleNavClick(item.value)}
                className={`w-full text-center text-3xl font-bold py-4 rounded-2xl transition-all ${
                  currentView === item.value
                    ? 'text-spanish-red bg-white shadow-lg border border-red-100'
                    : 'text-gray-400 hover:text-deep-blue hover:bg-white/50'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Cobi Toggle (Mobile) */}
            <button
              onClick={onToggleCobi}
              className="flex items-center justify-center w-full py-3 rounded-2xl transition-all hover:bg-white/50"
            >
              <div className={`relative w-16 h-9 rounded-full transition-colors duration-300 ${cobiVisible ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute w-11 h-11 rounded-full overflow-hidden transition-all duration-300 bg-transparent ${cobiVisible ? 'left-[24px] opacity-100' : 'left-[-3px] opacity-50'}`} style={{ top: '-4px' }}>
                  <img
                    src="./data/images/favicon-cobi.png"
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
          </div>
          
          <div className="p-8 text-center text-gray-400 text-sm">
            <p>© CobiSpanish</p>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;