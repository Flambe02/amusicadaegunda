import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { exitApp } from './adapters/backButton';
import '@/styles/tv-error.css';

const COUNTDOWN_SECONDS = 5;

/**
 * Écran d'erreur dédié TV — remplace le fallback web (thème clair, boutons
 * souris) par une sortie de secours utilisable à la télécommande.
 *
 * Pourquoi : sur TV, un plantage React laissait l'utilisateur bloqué (le fallback
 * web n'est pas navigable au D-pad, et le Retour matériel pouvait re-planter). Ici :
 *  - compte à rebours de 5 s → rechargement automatique de l'app (récupération) ;
 *  - bouton « Sair do app » (Retour matériel aussi) → quitte proprement l'app ;
 *  - navigation 100 % native (focus DOM), SANS dépendre de la nav spatiale
 *    (norigin) qui peut être dans un état incohérent au moment du crash.
 */
export default function TvErrorFallback() {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const reloadBtnRef = useRef(null);

  const reload = () => { try { window.location.reload(); } catch { /* ignore */ } };

  // Compte à rebours → rechargement automatique.
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(id); reload(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Focus initial sur « Voltar ao início » (récupération, action la moins
  // destructive) — focus DOM natif, indépendant de la nav spatiale.
  useEffect(() => {
    const t = setTimeout(() => { try { reloadBtnRef.current?.focus(); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  // Retour matériel / télécommande → quitte l'app (l'utilisateur ne reste jamais
  // piégé). Escape/Backspace/Tizen 10009/webOS 461, comme l'adaptateur Back.
  useEffect(() => {
    const onKey = (e) => {
      const isBack = e.key === 'Escape' || e.key === 'Backspace'
        || e.key === 'GoBack' || e.key === 'BrowserBack'
        || e.keyCode === 10009 || e.keyCode === 461;
      if (isBack) { e.preventDefault(); exitApp(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="tv-error-root" role="alert">
      <div className="tv-error-card">
        <div className="tv-error-icon"><AlertTriangle size={54} /></div>
        <h1 className="tv-error-title">Algo deu errado</h1>
        <p className="tv-error-text">
          Encontramos um erro inesperado. Vamos reiniciar automaticamente
          em <strong>{secondsLeft}s</strong>.
        </p>
        <div className="tv-error-actions">
          <button
            ref={reloadBtnRef}
            type="button"
            className="tv-error-btn tv-error-btn--primary"
            onClick={reload}
          >
            <RefreshCw size={22} /> Voltar ao início
          </button>
          <button
            type="button"
            className="tv-error-btn tv-error-btn--exit"
            onClick={exitApp}
          >
            <LogOut size={22} /> Sair do app
          </button>
        </div>
        <p className="tv-error-hint">Pressiona Voltar na telecomando para sair.</p>
      </div>
    </div>
  );
}
