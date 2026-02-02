import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { HomePage } from './components/HomePage';
import AdventureGameApp from './adventure-game/AdventureGameApp';
import AdventureGameEdit from './adventure-game/AdventureGameEdit';
import DoraemonMonitorApp from './doraemon-monitor/DoraemonMonitorApp';
import { GroupMakerApp } from './components/GroupMakerApp';
import BroadcastApp from './broadcast-assistant/BroadcastApp';
import KiddiePlanApp from './kiddieplan/KiddiePlanApp';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/adventure" element={<AdventureGameApp />} />
          <Route path="/adventure/edit" element={<AdventureGameEdit />} />
          <Route path="/doraemon" element={<DoraemonMonitorApp />} />
          <Route path="/group-maker" element={<GroupMakerApp />} />
          <Route path="/broadcast" element={<BroadcastApp />} />
          <Route path="/kiddie-plan" element={<KiddiePlanApp />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;