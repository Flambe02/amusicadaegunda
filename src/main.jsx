import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/tiktok-optimized.css'
import './styles/a11y.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Import Web Vitals en production
if (import.meta.env.PROD) {
  import('./analytics/webvitals');
}

// Gating du Service Worker pour éviter les conflits en natif
if ('serviceWorker' in navigator) {
  // Vérifier si on est en mode natif Capacitor
  const isNative = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      return Capacitor.isNativePlatform?.() === true;
    } catch {
      return false;
    }
  };

  // Enregistrer le SW seulement si pas en natif
  window.addEventListener('load', async () => {
    const native = await isNative();
    if (!native) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  });
}

// Intégration SplashScreen Capacitor
const hideSplashScreen = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform?.()) {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    }
  } catch {
    // Ignore les erreurs en mode web
  }
};

// Masquer le splash screen après le chargement de l'app
hideSplashScreen(); 