import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { HomePage } from './components/HomePage';
import { CameraApp } from './components/CameraApp';
import FortuneApp from './fortune-sticks/FortuneApp';
import CoupleGameApp from './couple-game/CoupleGameApp';
import DoraemonMonitorApp from './doraemon-monitor/DoraemonMonitorApp';
import WeatherApp from './nanoworld-weather/WeatherApp';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/camera" element={<CameraApp />} />
          <Route path="/fortune" element={<FortuneApp />} />
          <Route path="/couple" element={<CoupleGameApp />} />
          <Route path="/doraemon" element={<DoraemonMonitorApp />} />
          <Route path="/weather" element={<WeatherApp />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
