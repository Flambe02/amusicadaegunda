import { useEffect, useState } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { RefreshCw } from 'lucide-react';
import FocusableButton from './FocusableButton';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { DEFAULT_RECOMMENDED_TITLE, DEFAULT_RECOMMENDED_MESSAGE, STORE_OPEN_ERROR_MESSAGE } from '@/services/appUpdateService';
import '@/styles/tv-update.css';

/**
 * Overlay compact au-dessus de TvApp (même pattern que TvModeSelectionOverlay :
 * FocusContext dédié + SpatialNavigation.setFocus au montage). Le Retour
 * matériel est géré par TvApp lui-même (priorité la plus haute dans son
 * onBackPress, cf. TvApp.jsx) — jamais de second abonnement ici pour éviter un
 * double déclenchement (backButton peut avoir plusieurs listeners actifs).
 */
export default function TvRecommendedUpdateDialog() {
  const { config, openStore, dismissRecommendedUpdate } = useAppUpdate();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);
  const { ref, focusKey } = useFocusable({ focusKey: 'APP_UPDATE_RECOMMENDED', trackChildren: true, saveLastFocusedChild: false });

  useEffect(() => {
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('APP_UPDATE_RECOMMENDED_UPDATE'); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  const handleUpdate = async () => {
    if (opening) return;
    setOpening(true);
    setError(false);
    try {
      await openStore();
    } catch {
      setError(true);
    } finally {
      setOpening(false);
    }
  };

  const title = config?.titleRecommended || DEFAULT_RECOMMENDED_TITLE;
  const message = config?.messageRecommended || DEFAULT_RECOMMENDED_MESSAGE;

  return (
    <div className="tv-update-overlay" role="alertdialog" aria-modal="true" aria-labelledby="tv-update-recommended-title">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="tv-update-box">
          <div className="tv-update-icon"><RefreshCw size={34} /></div>
          <h2 id="tv-update-recommended-title" className="tv-update-box-title">{title}</h2>
          <p className="tv-update-box-text">{message}</p>

          {error && <p className="tv-update-error" role="alert">{STORE_OPEN_ERROR_MESSAGE}</p>}

          <div className="tv-update-actions">
            <FocusableButton
              focusKey="APP_UPDATE_RECOMMENDED_UPDATE"
              onPress={handleUpdate}
              className="tv-update-btn"
              ariaLabel="Atualizar agora na Google Play"
            >
              <RefreshCw size={20} className={opening ? 'tv-update-spin' : ''} />
              ATUALIZAR AGORA
            </FocusableButton>
            <FocusableButton
              focusKey="APP_UPDATE_RECOMMENDED_LATER"
              onPress={dismissRecommendedUpdate}
              className="tv-update-btn tv-update-btn--secondary"
              ariaLabel="Mais tarde"
            >
              Mais tarde
            </FocusableButton>
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}
