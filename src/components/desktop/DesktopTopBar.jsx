import { Settings } from 'lucide-react';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';
import { bigScreenEntryUrl } from '@/lib/bigScreenEntry';

const ITEM =
  'rounded-full px-5 py-2.5 text-[15px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

/**
 * Barre du haut des pages hors interface grand écran, sur ordinateur (Sobre, Guia, Blog,
 * Apprendre, catégories, mentions…). Elle reprend celle du grand écran — logo, Início,
 * Catálogo, Buscar, Festa, Ajustes — pour revenir à l'accueil sans changer d'univers.
 *
 * Ce sont de simples liens : le grand écran est une autre app (chargée à part), on y
 * entre par une adresse (`/?abrir=…`, voir src/lib/bigScreenEntry.js). Remplace l'ancien
 * menu latéral ; `?ui=legacy` garde celui-ci.
 */
export default function DesktopTopBar() {
  return (
    <header
      data-desktop-topbar
      className="sticky top-0 z-40 flex h-[76px] items-center gap-2 border-b border-white/10 bg-[#05070c]/90 px-6 backdrop-blur-md xl:px-12"
    >
      <a href="/" className="mr-auto flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        <img src={BRAND_SQUARE_MEDIUM} alt="" width="40" height="40" className="h-10 w-10 rounded-[10px] object-cover" />
        <span className="whitespace-nowrap text-lg font-extrabold text-white">A Música da Segunda</span>
      </a>
      <nav aria-label="Navegação principal" className="flex items-center gap-1">
        <a href="/" className={ITEM}>Início</a>
        <a href={bigScreenEntryUrl('catalogo')} rel="nofollow" className={ITEM}>Catálogo</a>
        <a href={bigScreenEntryUrl('buscar')} rel="nofollow" className={ITEM}>Buscar</a>
        <a href={bigScreenEntryUrl('festa')} rel="nofollow" className={`${ITEM} !font-bold !text-pink-300`}>Festa</a>
        <a
          href={bigScreenEntryUrl('ajustes')}
          rel="nofollow"
          aria-label="Ajustes"
          className="ml-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </a>
      </nav>
    </header>
  );
}
