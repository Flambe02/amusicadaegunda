import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/a11y.css'
import { HelmetProvider } from 'react-helmet-async'
import ErrorBoundary from './components/ErrorBoundary'
import { logBuildInfo } from '@/lib/buildInfo'

const helmetContext = {}

logBuildInfo()

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

// Splash screen Capacitor : masqué par App.jsx dès que le 1er contenu React est
// peint (évite l'écran noir de la WebView au cold start via deep link). Ici on ne
// garde qu'un FILET DE SÉCURITÉ : si React ne monte jamais (erreur fatale), on
// masque quand même le splash au bout de 5s pour ne pas le laisser figé.
import { hideNativeSplash } from '@/utils/splash'
setTimeout(() => { hideNativeSplash() }, 5000)
