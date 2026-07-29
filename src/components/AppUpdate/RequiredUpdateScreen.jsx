// Écran plein écran bloquant (Android mobile + web/PWA de secours) — affiché
// AVANT le routeur (cf. src/App.jsx), donc aucune route/historique/deep link
// n'est jamais accessible tant que status === 'required'.
import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useToast } from '@/components/ui/use-toast';
import { DEFAULT_REQUIRED_TITLE, DEFAULT_REQUIRED_MESSAGE, STORE_OPEN_ERROR_MESSAGE } from '@/services/appUpdateService';
import { BRAND_SQUARE_LARGE } from '@/lib/imageAssets';

export default function RequiredUpdateScreen() {
  const { config, openStore } = useAppUpdate();
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);

  // Bouton retour matériel Android : absorbé (jamais de fermeture, jamais de
  // sortie d'app) — même mécanisme que src/components/karaoke/catalog/KaraokeModal.jsx,
  // mais SANS appeler de callback de fermeture : cet écran ne se ferme jamais au Back.
  useEffect(() => {
    let removeBackListener = null;
    import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => { /* no-op volontaire */ }))
      .then((handle) => { removeBackListener = () => handle.remove(); })
      .catch(() => { /* web/PWA pur — cet écran n'est de toute façon jamais monté ici */ });
    return () => { if (removeBackListener) removeBackListener(); };
  }, []);

  const handleUpdate = async () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    try {
      await openStore();
    } catch {
      toast({ title: STORE_OPEN_ERROR_MESSAGE, variant: 'destructive' });
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  };

  const title = config?.titleRequired || DEFAULT_REQUIRED_TITLE;
  const message = config?.messageRequired || DEFAULT_REQUIRED_MESSAGE;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black px-6 text-white"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'max(env(safe-area-inset-left), 1.5rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1.5rem)',
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-update-required-title"
      aria-describedby="app-update-required-message"
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
        <img src={BRAND_SQUARE_LARGE} alt="" className="mb-6 h-20 w-20 rounded-2xl" />

        <RefreshCw className="mb-4 h-8 w-8 text-[#FDE047]" aria-hidden="true" />

        <h1 id="app-update-required-title" className="text-xl font-black text-white">
          {title}
        </h1>
        <p id="app-update-required-message" className="mt-3 text-sm leading-6 text-white/70">
          {message}
        </p>

        <button
          type="button"
          onClick={handleUpdate}
          disabled={opening}
          aria-label="Atualizar agora na Google Play"
          className="mt-7 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#FDE047] px-6 text-sm font-black text-black transition active:scale-[0.99] disabled:opacity-70"
        >
          {opening && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Atualizar agora
        </button>

        <p className="mt-4 text-xs leading-5 text-white/48">
          A atualização é feita com segurança pela Google Play.
        </p>
      </div>
    </div>
  );
}
