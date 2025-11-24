import React, { useState } from 'react';
import { HomePage } from './components/HomePage';
import { CameraApp } from './components/CameraApp';
import FortuneApp from './fortune-sticks/FortuneApp';

type View = 'home' | 'camera' | 'fortune';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');

  const handleSelectProject = (project: 'camera' | 'fortune') => {
    setCurrentView(project);
  };

  const handleBackHome = () => {
    setCurrentView('home');
  };

  return (
    <>
      {currentView === 'home' && (
        <HomePage onSelectProject={handleSelectProject} />
      )}
      {currentView === 'camera' && (
        <CameraApp onBackHome={handleBackHome} />
      )}
      {currentView === 'fortune' && (
        <FortuneApp onBackHome={handleBackHome} />
      )}
    </>
  );
};

export default App;
