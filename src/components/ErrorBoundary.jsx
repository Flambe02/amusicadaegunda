import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';

/**
 * ErrorBoundary - Composant de gestion globale des erreurs
 * Capture les erreurs React non gérées et affiche une UI élégante
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Composants enfants à wrapper
 * @param {Function} props.onError - Callback optionnel pour logging externe
 * @param {React.ReactNode} props.fallback - UI de fallback personnalisée
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Mettre à jour l'état pour afficher le fallback UI
    return { hasError: true };
  }

  componentDidMount() {
    sessionStorage.removeItem('chunk-recovery-reload');
  }

  componentDidCatch(error, errorInfo) {
    // Log l'erreur
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('📍 Error info:', errorInfo);
    
    // Mettre à jour l'état avec les détails de l'erreur
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Appeler le callback onError si fourni (pour logging externe type Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-recovery for stale chunk issues after deployment (lazy route JS 404).
    this.handleDynamicImportFailure(error);

    // Log vers le service de monitoring (future implémentation Sentry)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // TODO: Intégrer avec Sentry ou autre service de monitoring
    const errorData = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorCount: this.state.errorCount
    };

    // Log uniquement en dev (sera remplacé par Sentry en prod)
    if (import.meta.env?.DEV) {
      console.log('📊 Error data for monitoring:', errorData);
    }

    // sessionStorage (effacé à la fermeture de l'onglet — évite la fuite d'infos entre sessions)
    try {
      const existingErrors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorData);
      sessionStorage.setItem('app_errors', JSON.stringify(existingErrors.slice(-10)));
    } catch (e) {
      console.error('Failed to save error to sessionStorage:', e);
    }
  };

  handleDynamicImportFailure = async (error) => {
    const message = String(error?.message || error || '');
    const isDynamicImportFailure =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('ChunkLoadError');

    if (!isDynamicImportFailure) return;

    const reloadKey = 'chunk-recovery-reload';
    if (sessionStorage.getItem(reloadKey) === '1') return;

    sessionStorage.setItem(reloadKey, '1');

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
    } catch {
      // Best effort recovery only.
    }

    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    const reloadCount = parseInt(sessionStorage.getItem('eb-manual-reload') || '0', 10);
    if (reloadCount >= 3) {
      // Trop de rechargements : vider le cache d'abord
      if ('caches' in window) {
        caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).finally(() => {
          sessionStorage.removeItem('eb-manual-reload');
          window.location.reload();
        });
      } else {
        sessionStorage.removeItem('eb-manual-reload');
        window.location.reload();
      }
    } else {
      sessionStorage.setItem('eb-manual-reload', String(reloadCount + 1));
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI d'erreur par défaut - élégante et user-friendly
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Card principale */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header avec icône */}
              <div className="bg-gradient-to-r from-red-500 to-pink-500 p-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-full p-4">
                    <AlertCircle className="w-12 h-12" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      Oops! Algo deu errado
                    </h1>
                    <p className="text-white/90 text-lg">
                      Encontramos um erro inesperado
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="mb-6">
                  <p className="text-gray-700 text-lg mb-4">
                    Não se preocupe, não é culpa sua! Nossa equipe foi notificada e 
                    estamos trabalhando para resolver o problema.
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="text-blue-500">ℹ️</span>
                      O que você pode fazer:
                    </h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>Recarregar a página para tentar novamente</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>Voltar para a página inicial</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>Limpar o cache do seu navegador</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Error details (only in development) */}
                {import.meta.env.DEV && this.state.error && (
                  <details className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <summary className="cursor-pointer font-semibold text-red-800 hover:text-red-900">
                      🔧 Detalhes técnicos (desenvolvimento)
                    </summary>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="font-semibold text-red-900 mb-2">Erro:</h4>
                        <pre className="bg-white p-3 rounded border border-red-200 overflow-x-auto text-sm text-red-800">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <h4 className="font-semibold text-red-900 mb-2">Stack Trace:</h4>
                          <pre className="bg-white p-3 rounded border border-red-200 overflow-x-auto text-xs text-red-700">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo && (
                        <div>
                          <h4 className="font-semibold text-red-900 mb-2">Component Stack:</h4>
                          <pre className="bg-white p-3 rounded border border-red-200 overflow-x-auto text-xs text-red-700">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Button
                    onClick={this.handleReload}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    size="lg"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Recarregar Página
                  </Button>
                  
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 border-2"
                    size="lg"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Ir para Início
                  </Button>
                </div>

                {/* Additional help */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Precisa de ajuda?</span> Se o problema 
                    persistir, entre em contato conosco através do{' '}
                    <a 
                      href="/sobre" 
                      className="underline hover:text-blue-900 font-semibold"
                      onClick={(e) => {
                        e.preventDefault();
                        this.handleGoHome();
                      }}
                    >
                      formulário de contato
                    </a>.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
                <p className="text-center text-sm text-gray-600">
                  Código do erro: <code className="bg-gray-200 px-2 py-1 rounded font-mono text-xs">
                    ERR_{new Date().getTime()}
                  </code>
                </p>
              </div>
            </div>

            {/* Help card */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                🎵 A Música da Segunda - Nova música toda segunda-feira
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

