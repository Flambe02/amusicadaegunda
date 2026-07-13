import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/a11y.css'
import { HelmetProvider } from 'react-helmet-async'
import ErrorBoundary from './components/ErrorBoundary'
import { logBuildInfo } from '@/lib/buildInfo'
import { isTV } from '@/tv/platform'

const helmetContext = {}

logBuildInfo()

// ── Viewport TV — AVANT le montage de React (jamais après) ──────────────────
// La WebView Android TV rapporte ~960×540 px CSS sur une dalle 1080p (densité 2×)
// alors que toute l'UI TV est conçue sur un canvas logique 1920×1080. On force la
// largeur de conception ici, avant le 1er rendu : changer le viewport après coup
// provoquerait un double reflow (layout 960 → 1920), un scroll déjà décalé et un
// focus restauré sur de mauvaises coordonnées. Le canvas mis à l'échelle
// (src/tv/components/TvStage.jsx) complète ce réglage : même si la WebView ignore
// le wide viewport, l'échelle est recalculée explicitement.
try {
  if (isTV()) {
    document.querySelector('meta[name="viewport"]')
      ?.setAttribute('content', 'width=1920, user-scalable=no')
    document.documentElement.classList.add('tv-mode')
  }
} catch { /* jamais bloquant pour le boot mobile/web */ }

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
