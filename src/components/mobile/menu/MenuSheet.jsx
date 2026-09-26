import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Drawer as DrawerPrimitive } from 'vaul';
import { ChevronRight, X } from 'lucide-react';
import { CatalogFilled, InfoFilled, TvFilled } from '@/components/mobile/icons/FilledIcons';
import { PLATFORMS } from './platforms';

const ROW =
  'flex min-h-[56px] w-full touch-manipulation items-center gap-4 rounded-2xl px-2 text-left active:bg-white/5';

/**
 * Menu mobile simplifié (étape 11, addendum D, version finale du 2026-09-25), ouvert
 * par l'onglet « Menu ». Panneau qui monte du bas, de la même famille que História et
 * Buscar (#111217, coins 26 px, poignée, pas de voile).
 *
 * En tête : la Caipivara, « A Música da Segunda », « Nova música toda segunda-feira ».
 * Lignes : Catálogo (/musica, le catalogue complet — la scène /catalogo a déjà sa
 * pastille au centre de la barre), Festa na TV (/festa), Sobre o projeto. Puis les
 * plateformes en pastilles neutres. Blog et Aprender restent accessibles par leur URL
 * et depuis Sobre. Icônes pleines blanches façon TikTok, aucun jaune.
 */
export default function MenuSheet({ open, onOpenChange, returnFocusRef }) {
  const closeRef = useRef(null);
  const close = () => onOpenChange(false);

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerPrimitive.Portal>
        {/* Transparente : pas de voile (la vidéo du feed peut être derrière). */}
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-transparent" />
        <DrawerPrimitive.Content
          aria-describedby={undefined}
          data-menu-sheet=""
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef?.current?.focus({ preventScroll: true });
          }}
          className="fixed inset-x-0 bottom-0 z-[200] flex max-h-[85svh] flex-col rounded-t-[26px] border-t border-white/10 bg-[#111217] pb-[max(env(safe-area-inset-bottom),1rem)] text-white shadow-app-float outline-none motion-reduce:!animate-none motion-reduce:!transition-none"
        >
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 flex-shrink-0 rounded-full bg-white/20" />

          <div className="flex items-center gap-3 px-5 pb-3 pt-4">
            <img
              src="/images/caipivara-3d-head-128.webp"
              srcSet="/images/caipivara-3d-head-128.webp 128w, /images/caipivara-3d-head-256.webp 256w"
              sizes="48px"
              alt=""
              width="48"
              height="48"
              className="h-12 w-12 flex-shrink-0 rounded-full border border-white/10 bg-white/10 object-cover"
            />
            <div className="min-w-0 flex-1">
              <DrawerPrimitive.Title className="text-lg font-black leading-tight tracking-tight">
                A Música da Segunda
              </DrawerPrimitive.Title>
              <p className="mt-0.5 text-sm text-white/70">Nova música toda segunda-feira</p>
            </div>
            <DrawerPrimitive.Close
              ref={closeRef}
              aria-label="Fechar menu"
              className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 active:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DrawerPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
            <ul data-menu-rows className="space-y-0.5">
              {[
                { to: '/musica', label: 'Catálogo', description: 'Todas as músicas, semana a semana', icon: CatalogFilled },
                { to: '/festa', label: 'Festa na TV', icon: TvFilled },
                { to: '/sobre', label: 'Sobre o projeto', icon: InfoFilled },
              ].map(({ to, label, description, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} onClick={close} className={ROW}>
                    <Icon className="h-7 w-7 flex-shrink-0 text-white" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold">{label}</span>
                      {description ? <span className="block text-sm leading-snug text-white/60">{description}</span> : null}
                    </span>
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-white/40" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>

            <section aria-labelledby="menu-platforms" className="px-2 pb-2 pt-5">
              <h2 id="menu-platforms" className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-white/60">
                Ouça também em
              </h2>
              <ul className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <li key={platform.label}>
                    <a
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 touch-manipulation items-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white active:bg-white/10"
                    >
                      {platform.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
