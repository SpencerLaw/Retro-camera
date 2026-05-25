import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { HomePage } from './components/HomePage';
import AdventureGameApp from './adventure-game/AdventureGameApp';
import AdventureGameEdit from './adventure-game/AdventureGameEdit';
import AdventureLicenseGate from './adventure-game/AdventureLicenseGate';
import DoraemonMonitorApp from './doraemon-monitor/DoraemonMonitorApp';
import { GroupMakerApp } from './components/GroupMakerApp';
import BroadcastApp from './broadcast-assistant/BroadcastApp';
import KiddiePlanApp from './kiddieplan/KiddiePlanApp';
import { TugOfWarApp } from './components/TugOfWarApp';
import JuzimiApp from './components/JuzimiApp';
import PromptGalleryApp from './components/PromptGalleryApp';

const TslSkinApp = React.lazy(() => import('./components/TslSkinApp'));

const TslSkinRoute: React.FC = () => (
  <React.Suspense
    fallback={
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-center text-sm font-bold text-sky-100">
        Loading TSL Skin...
      </div>
    }
  >
    <TslSkinApp />
  </React.Suspense>
);

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/adventure" element={<AdventureLicenseGate><AdventureGameApp /></AdventureLicenseGate>} />
          <Route path="/adventure/edit" element={<AdventureLicenseGate><AdventureGameEdit /></AdventureLicenseGate>} />
          <Route path="/doraemon" element={<DoraemonMonitorApp />} />
          <Route path="/group-maker" element={<GroupMakerApp />} />
          <Route path="/broadcast" element={<BroadcastApp />} />
          <Route path="/broadcast/receiver" element={<BroadcastApp forceReceiver />} />
          <Route path="/kiddie-plan" element={<KiddiePlanApp />} />
          <Route path="/tug-of-war" element={<TugOfWarApp variant="math" />} />
          <Route path="/word-tug-of-war" element={<TugOfWarApp variant="word" />} />
          <Route path="/juzimi" element={<JuzimiApp />} />
          <Route path="/prompts" element={<PromptGalleryApp />} />
          <Route path="/tsl-skin" element={<TslSkinRoute />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
