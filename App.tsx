import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { HomePage } from './components/HomePage';
import { CameraApp } from './components/CameraApp';
import FortuneApp from './fortune-sticks/FortuneApp';
import AdventureGameApp from './adventure-game/AdventureGameApp';
import AdventureGameEdit from './adventure-game/AdventureGameEdit';
import DoraemonMonitorApp from './doraemon-monitor/DoraemonMonitorApp';
import WeatherApp from './nanoworld-weather/WeatherApp';
import ThreeJSParticles from './components/ThreeJSParticles';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/camera" element={<CameraApp />} />
          <Route path="/fortune" element={<FortuneApp />} />
          <Route path="/adventure" element={<AdventureGameApp />} />
          <Route path="/adventure/edit" element={<AdventureGameEdit />} />
          <Route path="/doraemon" element={<DoraemonMonitorApp />} />
          <Route path="/weather" element={<WeatherApp />} />
          <Route path="/particles" element={<ThreeJSParticles />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
