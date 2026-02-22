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
  if (import.meta.env.DEV) {
    console.error('Global error handler:', { error, errorInfo })
  }

  if (import.meta.env.PROD) {
    // Future: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
}

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
    })
  }
} catch {
  if (import.meta.env.DEV) {
    console.warn('Mode non-module detecte, Web Vitals desactive')
  }
}

// Integration SplashScreen Capacitor
const hideSplashScreen = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform?.()) {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide()
    }
  } catch {
    // Ignore les erreurs en mode web
  }
}

// Masquer le splash screen apres le chargement de l'app
hideSplashScreen()
