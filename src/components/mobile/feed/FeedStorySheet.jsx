import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Drawer as DrawerPrimitive } from 'vaul';
import { X } from 'lucide-react';
import { themeLabel } from '@/lib/karaokeCatalog';
import { getPublicSlug, monthYearLabel } from './feedMedia';

/**
 * Panneau « História » : la description de la chanson (colonne `description`).
 *
 * Même style que le panneau de recherche prévu par l'addendum catálogo : il monte du
 * bas, fond #111217, coins de 26 px, poignée. Fermeture : glissement vers le bas,
 * bouton fermer, Escape, tap en dehors. La vidéo continue de jouer derrière — et
 * reste visible : aucun voile (règle « pas de voile sur la vidéo »), le fond du
 * panneau suffit.
 *
 * Focus : vaul désactive le focus automatique de Radix à l'ouverture, et en ouverture
 * contrôlée Radix ne sait pas à quel bouton le rendre. On le gère donc ici : à
 * l'ouverture, focus sur « Fechar » (le piège de Radix le garde alors dans le panneau) ;
 * à la fermeture, retour au bouton « História » (`returnFocusRef`).
 */
export default function FeedStorySheet({ song, open, onOpenChange, returnFocusRef }) {
  const closeRef = useRef(null);
  const slug = getPublicSlug(song);
  const period = monthYearLabel(song); // toujours mois et année, même la semaine en cours
  const theme = themeLabel(song?.category);
  const description = String(song?.description || '').trim();

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerPrimitive.Portal>
        {/* Transparente : elle ne sert qu'à fermer au tap en dehors du panneau. */}
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-transparent" />
        <DrawerPrimitive.Content
          aria-describedby="feed-story-text"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef?.current?.focus();
          }}
          className="fixed inset-x-0 bottom-0 z-[200] flex max-h-[85svh] flex-col rounded-t-[26px] border-t border-white/10 bg-[#111217] pb-[max(env(safe-area-inset-bottom),1rem)] text-white shadow-app-float outline-none motion-reduce:!animate-none motion-reduce:!transition-none"
        >
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 flex-shrink-0 rounded-full bg-white/20" />

          <div className="flex items-start gap-3 px-5 pb-2 pt-4">
            <div className="min-w-0 flex-1">
              <DrawerPrimitive.Title className="text-lg font-bold leading-tight tracking-tight">
                {song?.title}
              </DrawerPrimitive.Title>
              {period || theme ? (
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
                  {[period, theme].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>
            <DrawerPrimitive.Close
              ref={closeRef}
              aria-label="Fechar"
              className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 active:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DrawerPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
            <DrawerPrimitive.Description id="feed-story-text" className="whitespace-pre-line text-base leading-7 text-white/90">
              {description}
            </DrawerPrimitive.Description>
          </div>

          {slug ? (
            <div className="px-5 pt-3">
              <Link
                to={`/musica/${slug}/`}
                onClick={() => onOpenChange(false)}
                className="flex min-h-[48px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white active:bg-white/10"
              >
                Ver a página da música
              </Link>
            </div>
          ) : null}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
