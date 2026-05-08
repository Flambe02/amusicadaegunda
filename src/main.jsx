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

// Splash screen Capacitor: launchAutoHide ne se déclenche pas toujours sur Android 12+,
// donc on appelle SplashScreen.hide() manuellement après un délai minimum de 1500ms.
const hideSplashScreen = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform?.()) {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await new Promise((r) => setTimeout(r, 1500))
      await SplashScreen.hide({ fadeOutDuration: 300 })
    }
  } catch {
    // Ignore les erreurs en mode web
  }
}
hideSplashScreen()
