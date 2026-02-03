import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Games from './components/Games';
import Resources from './components/Resources';
import AboutMe from './components/AboutMe';
import SocialMedia from './components/SocialMedia';
import { View } from './types';

const App: React.FC = () => {
  // Cargar estado desde localStorage al iniciar
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem('currentView');
    return (savedView as View) || View.HOME;
  });
  
  const [activeGameId, setActiveGameId] = useState<string | null>(() => {
    const savedGame = localStorage.getItem('activeGameId');
    return savedGame || null;
  });

  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    if (activeGameId) {
      localStorage.setItem('activeGameId', activeGameId);
    } else {
      localStorage.removeItem('activeGameId');
    }
  }, [activeGameId]);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    // Reset active game when changing views (e.g. clicking buttons in header)
    // Esto limpia el estado del juego al hacer clic en los botones de la cabecera
    setActiveGameId(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <>
            <Hero onStart={() => setCurrentView(View.GAMES)} />
            <AboutMe />
            <SocialMedia />
          </>
        );
      case View.GAMES:
        return <Games activeGameId={activeGameId} setActiveGameId={setActiveGameId} />;
      case View.RESOURCES:
        return <Resources />;
      default:
        return (
          <>
            <Hero onStart={() => setCurrentView(View.GAMES)} />
            <AboutMe />
            <SocialMedia />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-cream text-gray-800">
      <Header currentView={currentView} onChangeView={handleViewChange} />
      
      <main className="flex-grow">
        {renderContent()}
      </main>

      {/* Footer: Hidden on mobile if a game is active, but visible on desktop or if no game is active */}
      <footer className={`bg-deep-blue text-white py-12 ${activeGameId ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="font-bold text-xl">Spanish with Ignacio</span>
            <p className="text-gray-400 text-sm mt-2">© 2024 Todos los derechos reservados.</p>
          </div>
          <div className="flex space-x-6 text-sm text-gray-300">
            <a href="https://www.instagram.com/spanishwithignacio/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
            <a href="https://www.youtube.com/@SpanishwithIgnacio" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;