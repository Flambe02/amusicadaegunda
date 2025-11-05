import { useState, useEffect } from 'react';
import { enablePush, shouldShowPushCTA } from '@/lib/push';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Composant PushCTA - Affiche un CTA pour activer les notifications push
 * 
 * Affichage conditionnel :
 * - Seulement sur mobile (iOS/Android)
 * - Seulement si PWA installée (mode standalone)
 * - Pas si l'utilisateur a refusé ou opt-out
 * - Affichage avec délai de 3 secondes pour ne pas être intrusif
 */
export default function PushCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Vérifier si on doit afficher le CTA avec un délai
    const timer = setTimeout(async () => {
      try {
        const shouldShow = await shouldShowPushCTA();
        setIsVisible(shouldShow);
      } catch (err) {
        console.error('Erreur vérification CTA push:', err);
        setIsVisible(false);
      }
    }, 3000); // Afficher après 3 secondes

    return () => clearTimeout(timer);
  }, []);

  const handleEnablePush = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await enablePush();
      setIsVisible(false); // Cacher après succès
      // Optionnel : afficher un toast de succès
    } catch (err) {
      console.error("Échec de l'abonnement push :", err);
      
      if (Notification.permission === 'denied') {
        setError('Notifications bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.');
      } else {
        setError('Activation échouée. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Optionnel : enregistrer la préférence pour ne plus afficher
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
        {/* Bouton de fermeture */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-3 pr-6">
          {/* Icône */}
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Message */}
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                Ne manquez jamais une nouvelle chanson !
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Recevez une notification chaque lundi
              </p>
            </>
          )}

          {/* Bouton d'activation */}
          <Button
            onClick={handleEnablePush}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Activation...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Activer les notifications
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

