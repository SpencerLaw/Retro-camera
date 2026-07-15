import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const LOCAL_DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

async function clearLocalDevelopmentPwaCache() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  if (!LOCAL_DEVELOPMENT_HOSTS.has(window.location.hostname)) return;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }
}

async function mountApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  try {
    await clearLocalDevelopmentPwaCache();
  } catch (error) {
    console.warn('Unable to clear local PWA cache before mounting.', error);
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void mountApp();
