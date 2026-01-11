import React, { useState } from 'react';
import { View } from '../types';
import { Menu, X, Globe } from 'lucide-react';

interface HeaderProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onChangeView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Inicio', value: View.HOME },
    { label: 'Recursos', value: View.RESOURCES },
    { label: 'Juegos', value: View.GAMES },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
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
              Spanish with <span className="text-spanish-red">Ignacio</span>
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
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-spanish-red hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  onChangeView(item.value);
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium ${
                  currentView === item.value
                    ? 'text-spanish-red bg-red-50'
                    : 'text-gray-600 hover:text-spanish-red hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;