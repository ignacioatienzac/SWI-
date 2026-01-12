import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Games from './components/Games';
import Resources from './components/Resources';
import AboutMe from './components/AboutMe';
import SocialMedia from './components/SocialMedia';
import { View } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);

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
        return <Games />;
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
      <Header currentView={currentView} onChangeView={setCurrentView} />
      
      <main className="flex-grow">
        {renderContent()}
      </main>

      <footer className="bg-deep-blue text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="font-bold text-xl">Spanish with Ignacio</span>
            <p className="text-gray-400 text-sm mt-2">© 2024 Todos los derechos reservados.</p>
          </div>
          <div className="flex space-x-6 text-sm text-gray-300">
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">YouTube</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;