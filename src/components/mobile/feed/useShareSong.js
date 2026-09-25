import { useToast } from '@/components/ui/use-toast';
import { getPublicSlug } from './feedMedia';

const SITE_URL = 'https://www.amusicadasegunda.com';

/** « Compartilhar » : Web Share, sinon copie du lien de la page de la chanson. */
export function useShareSong(song) {
  const { toast } = useToast();
  const slug = getPublicSlug(song);

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado', description: 'Cole onde quiser para compartilhar.', duration: 3000 });
    } catch {
      toast({ title: 'Não deu para copiar', description: url, duration: 5000 });
    }
  };

  return async () => {
    const url = slug ? `${SITE_URL}/musica/${slug}/` : window.location.href;
    const payload = { title: `${song.title} — A Música da Segunda`, url };
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
}
