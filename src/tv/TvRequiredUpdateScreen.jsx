import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { onBackPress } from './adapters/backButton';
import { applyTvFlag } from './platform';
import TvStage from './components/TvStage';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { DEFAULT_REQUIRED_TITLE, DEFAULT_REQUIRED_MESSAGE, STORE_OPEN_ERROR_MESSAGE } from '@/services/appUpdateService';
import '@/styles/tv-update.css';

/**
 * Écran plein écran bloquant Android TV — remplace TvApp entièrement (jamais
 * monté en même temps, cf. src/App.jsx). Focus DOM natif, SANS la nav spatiale
 * (norigin) : même choix que TvErrorFallback.jsx pour un écran autonome qui ne
 * dépend d'aucun état applicatif préalable. Un seul bouton → pas besoin de
 * gestion de flèches, juste l'autofocus + Entrée/OK du D-pad (Enter natif).
 */
export default function TvRequiredUpdateScreen() {
  const { config, openStore } = useAppUpdate();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);
  const openingRef = useRef(false);
  const btnRef = useRef(null);

  useEffect(() => { applyTvFlag(true); return () => applyTvFlag(false); }, []);

  // Focus initial natif sur « ATUALIZAR AGORA ».
  useEffect(() => {
    const t = setTimeout(() => { try { btnRef.current?.focus(); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  // Retour matériel/télécommande : totalement absorbé, jamais de sortie d'app
  // ni de retour à TvApp — cf. exigence « never trap... except required ».
  useEffect(() => onBackPress(() => { /* no-op volontaire */ }), []);

  const handleUpdate = async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setError(false);
    try {
      await openStore();
    } catch {
      setError(true);
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  };

  const title = config?.titleRequired || DEFAULT_REQUIRED_TITLE;
  const message = config?.messageRequired || DEFAULT_REQUIRED_MESSAGE;

  return (
    <TvStage>
      <div className="tv-update-required-root" role="alertdialog" aria-modal="true" aria-labelledby="tv-update-required-title">
        <div className="tv-update-required-card">
          <div className="tv-update-icon"><RefreshCw size={54} /></div>
          <h1 id="tv-update-required-title" className="tv-update-title">{title}</h1>
          <p className="tv-update-text">{message}</p>

          <button
            ref={btnRef}
            type="button"
            className="tv-update-btn"
            onClick={handleUpdate}
            disabled={opening}
            aria-label="Atualizar agora na Google Play"
          >
            <RefreshCw size={22} className={opening ? 'tv-update-spin' : ''} />
            ATUALIZAR AGORA
          </button>

          {error && <p className="tv-update-error" role="alert">{STORE_OPEN_ERROR_MESSAGE}</p>}

          <p className="tv-update-hint">A atualização é feita com segurança pela Google Play.</p>
        </div>
      </div>
    </TvStage>
  );
}
