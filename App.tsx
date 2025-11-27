import React, { useState } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { HomePage } from './components/HomePage';
import { CameraApp } from './components/CameraApp';
import FortuneApp from './fortune-sticks/FortuneApp';
import CoupleGameApp from './couple-game/CoupleGameApp';
import DoraemonMonitorApp from './doraemon-monitor/DoraemonMonitorApp';

type View = 'home' | 'camera' | 'fortune' | 'couple' | 'doraemon';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');

  const handleSelectProject = (project: 'camera' | 'fortune' | 'couple' | 'doraemon') => {
    setCurrentView(project);
  };

  const handleBackHome = () => {
    setCurrentView('home');
  };

  return (
    <LanguageProvider>
      {currentView === 'home' && (
        <HomePage onSelectProject={handleSelectProject} />
      )}
      {currentView === 'camera' && (
        <CameraApp onBackHome={handleBackHome} />
      )}
      {currentView === 'fortune' && (
        <FortuneApp onBackHome={handleBackHome} />
      )}
      {currentView === 'couple' && (
        <CoupleGameApp onBackHome={handleBackHome} />
      )}
      {currentView === 'doraemon' && (
        <DoraemonMonitorApp onBackHome={handleBackHome} />
      )}
    </LanguageProvider>
  );
};

export default App;
