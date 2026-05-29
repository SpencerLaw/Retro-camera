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
import CourseSchedulerApp from './components/course-scheduler/CourseSchedulerApp';
import { VanglamHome } from './components/vanglam/VanglamHome';
import { VanglamColorDeck } from './components/vanglam/VanglamColorDeck';
import {
  VanglamApplicationsPage,
  VanglamArtcardLabPage,
  VanglamAtelierPage,
  VanglamCollectionsPage,
  VanglamColorSystemPage,
  VanglamRequestSampleKitPage,
  VanglamSurfacesPage,
} from './components/vanglam/VanglamPages';
import { VanglamLanguageProvider } from './components/vanglam/VanglamLanguage';

const TslSkinApp = React.lazy(() => import('./components/TslSkinApp'));

const TslSkinRoute: React.FC = () => (
  <React.Suspense
    fallback={
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-center text-sm font-bold text-sky-100">
        正在加载特斯拉皮肤工作台...
      </div>
    }
  >
    <TslSkinApp />
  </React.Suspense>
);

const withVanglamLanguage = (element: React.ReactElement) => (
  <VanglamLanguageProvider>{element}</VanglamLanguageProvider>
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
          <Route path="/course-scheduler" element={<CourseSchedulerApp />} />
          <Route path="/vanglam" element={withVanglamLanguage(<VanglamHome />)} />
          <Route path="/vanglam/color-system" element={withVanglamLanguage(<VanglamColorSystemPage />)} />
          <Route path="/vanglam/collections" element={withVanglamLanguage(<VanglamCollectionsPage />)} />
          <Route path="/vanglam/surfaces" element={withVanglamLanguage(<VanglamSurfacesPage />)} />
          <Route path="/vanglam/applications" element={withVanglamLanguage(<VanglamApplicationsPage />)} />
          <Route path="/vanglam/artcard-lab" element={withVanglamLanguage(<VanglamArtcardLabPage />)} />
          <Route path="/vanglam/atelier" element={withVanglamLanguage(<VanglamAtelierPage />)} />
          <Route path="/vanglam/request-sample-kit" element={withVanglamLanguage(<VanglamRequestSampleKitPage />)} />
          <Route path="/vanglam-42" element={<VanglamColorDeck />} />

        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
