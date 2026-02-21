import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/tiktok-optimized.css'
import './styles/a11y.css'
import { HelmetProvider } from 'react-helmet-async'
import ErrorBoundary from './components/ErrorBoundary'

const helmetContext = {}

// Handler pour logger les erreurs vers un service externe (future Sentry integration)
const handleError = (error, errorInfo) => {
  // TODO: Intégrer avec Sentry
  console.log('🔴 Global error handler:', { error, errorInfo });
  
  // En production, envoyer vers le service de monitoring
  if (import.meta.env.PROD) {
    // Future: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary onError={handleError}>
      <HelmetProvider context={helmetContext}>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Import Web Vitals en production
try {
  if (import.meta.env?.PROD) {
    import('./analytics/webvitals').catch(() => {
      // Ignore les erreurs d'import en production
    });
  }
} catch {
  // Ignore les erreurs d'import.meta en mode non-module
  console.warn('🔧 Mode non-module détecté, Web Vitals désactivé');
}

// Gating du Service Worker pour éviter les conflits en natif
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
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
