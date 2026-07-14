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
// ⚠️ NE PAS forcer `width=1920` ici (ancien réglage retiré 2026-07-14) : sur la
// vraie WebView Android TV (Samsung), `width=1920` crée un LAYOUT viewport de
// 1920 px sur une dalle physique de ~960 px CSS, et la WebView applique EN PLUS
// son propre zoom pour tenir → double mise à l'échelle, `position:fixed` accroché
// au viewport de 1920, et un visual viewport « pannable » à la télécommande. C'est
// la cause du bug « rien n'est centré » (contenu en bas-à-droite). On garde donc
// le viewport NATUREL du device (device-width, initial-scale=1, sans zoom) et
// c'est le canvas mis à l'échelle par transform (src/tv/components/TvStage.jsx)
// qui adapte l'UI 1920×1080 à la taille réelle rapportée — de façon déterministe.
try {
  if (isTV()) {
    document.querySelector('meta[name="viewport"]')
      ?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
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
