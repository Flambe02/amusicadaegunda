import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getPublicSlug } from './feedMedia';
import ShareLinkSheet from './ShareLinkSheet';

const SITE_URL = 'https://www.amusicadasegunda.com';
const COPIED_TOAST_MS = 3000;

// Le Toast du site ne se ferme pas tout seul (il ignore `duration`) : on garde le
// dernier « Link copiado » pour le remplacer au lieu d'en empiler un par tap, et on le
// ferme nous-mêmes.
let copiedToast = null;
let copiedTimer = null;
function showCopiedToast() {
  copiedToast?.dismiss();
  clearTimeout(copiedTimer);
  copiedToast = toast({ title: 'Link copiado', description: 'Cole onde quiser para compartilhar.' });
  copiedTimer = setTimeout(() => copiedToast?.dismiss(), COPIED_TOAST_MS);
}

/**
 * « Compartilhar » : Web Share, sinon copie du lien de la page de la chanson. Si la
 * copie échoue (contexte non sécurisé, refus), un petit panneau montre le lien dans un
 * champ déjà sélectionné, prêt à être copié à la main — jamais de toast d'erreur.
 *
 * Renvoie `{ share, linkSheet }` : `linkSheet` est à rendre par l'appelant.
 */
export function useShareSong(song) {
  const slug = getPublicSlug(song);
  const [fallbackUrl, setFallbackUrl] = useState(null);

  const copy = async (url) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard indisponível');
      await navigator.clipboard.writeText(url);
      showCopiedToast();
    } catch {
      setFallbackUrl(url);
    }
  };

  const share = async () => {
    const url = slug ? `${SITE_URL}/musica/${slug}/` : window.location.href;
    const payload = { title: `${song?.title || 'A Música da Segunda'} — A Música da Segunda`, url };
    if (navigator.share) {
      try {
        await navigator.share(payload);
      } catch (error) {
        if (error?.name !== 'AbortError') copy(url);
      }
      return;
    }
    copy(url);
  };

  const linkSheet = (
    <ShareLinkSheet
      url={fallbackUrl}
      open={Boolean(fallbackUrl)}
      onOpenChange={(open) => { if (!open) setFallbackUrl(null); }}
      onCopied={() => { setFallbackUrl(null); showCopiedToast(); }}
    />
  );

  return { share, linkSheet };
}
