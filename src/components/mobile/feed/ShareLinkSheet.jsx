import { useRef } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { X } from 'lucide-react';

/**
 * Repli de « Compartilhar » quand ni le partage natif ni la copie automatique ne
 * marchent : le lien dans un champ déjà sélectionné, prêt à être copié à la main.
 * Même famille que le panneau História (monte du bas, #111217, coins 26 px, pas de
 * voile). « Copiar » retente une copie par la sélection (`execCommand`), qui marche
 * aussi hors contexte sécurisé sur la plupart des navigateurs.
 */
export default function ShareLinkSheet({ url, open, onOpenChange, onCopied }) {
  const inputRef = useRef(null);

  const selectAll = () => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(0, input.value.length); // iOS ignore select() seul
  };

  const copyBySelection = () => {
    selectAll();
    let copied = false;
    try {
      copied = document.execCommand?.('copy') === true;
    } catch {
      copied = false;
    }
    if (copied) onCopied?.();
  };

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-transparent" />
        <DrawerPrimitive.Content
          aria-describedby="share-link-help"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            // Après l'ouverture : champ sélectionné, prêt à copier.
            requestAnimationFrame(selectAll);
          }}
          data-share-link-sheet=""
          className="fixed inset-x-0 bottom-0 z-[200] flex flex-col rounded-t-[26px] border-t border-white/10 bg-[#111217] pb-[max(env(safe-area-inset-bottom),1rem)] text-white shadow-app-float outline-none motion-reduce:!animate-none motion-reduce:!transition-none"
        >
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 flex-shrink-0 rounded-full bg-white/20" />
          <div className="flex items-start gap-3 px-5 pb-2 pt-4">
            <div className="min-w-0 flex-1">
              <DrawerPrimitive.Title className="text-lg font-bold leading-tight tracking-tight">Copie o link</DrawerPrimitive.Title>
              <DrawerPrimitive.Description id="share-link-help" className="mt-1 text-sm text-white/70">
                O link já está selecionado: é só copiar e colar onde quiser.
              </DrawerPrimitive.Description>
            </div>
            <DrawerPrimitive.Close
              aria-label="Fechar"
              className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 active:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DrawerPrimitive.Close>
          </div>
          <div className="flex items-center gap-2 px-5 pt-2">
            <input
              ref={inputRef}
              type="url"
              readOnly
              value={url || ''}
              aria-label="Link da música"
              onFocus={(event) => event.currentTarget.setSelectionRange(0, event.currentTarget.value.length)}
              className="h-12 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-base text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={copyBySelection}
              className="flex h-12 flex-shrink-0 touch-manipulation items-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white active:bg-white/10"
            >
              Copiar
            </button>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
