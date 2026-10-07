import { ListMusic, Maximize, Minimize, Search, Settings } from 'lucide-react';
import { BRAND_SQUARE_SMALL } from '@/lib/imageAssets';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';
import { useTvChrome } from '../lib/chromeContext';

/**
 * Barre du haut de l'interface grand écran (maquette design/bigscreen/01-inicio.png) :
 * logo + « A Música da Segunda » à gauche ; à droite Início, Catálogo, Buscar, Festa
 * (en rose) et Ajustes. Sur ordinateur seulement, « Modo TV » (plein écran) s'y ajoute.
 *
 * Partagée par l'accueil, le catálogo et les écrans karaokê. « Buscar » et « Modo TV »
 * viennent de TvApp par contexte (useTvChrome) ; un écran peut fournir son propre
 * `onBuscar` (le catálogo ouvre sa recherche sur place).
 *
 * Les clés de focus HOME_NAV_* / TOPNAV_SETTINGS sont lues ailleurs (focus de secours,
 * retour du painel de ajustes) : ne pas les renommer. `onKaraoke` n'a plus de bouton —
 * les écrans karaokê restent atteignables depuis le catálogo (« Mais modos »).
 */
export default function TvTopNavigation({
  active = 'inicio', onInicio, onCatalogo, onFesta, onOpenSettings, onBuscar, festaQueueCount = null,
}) {
  const chrome = useTvChrome();
  const buscar = onBuscar || chrome.onBuscar;
  const cls = (key, extra = '') => `bs-nav-item bs-focus ${active === key ? 'is-active' : ''} ${extra}`;
  const hasFesta = typeof festaQueueCount === 'number';

  return (
    <header className="bs-nav">
      <div className="bs-nav-brand">
        <img src={BRAND_SQUARE_SMALL} alt="" aria-hidden="true" className="bs-nav-logo" />
        <span className="bs-nav-name">A Música da Segunda</span>
      </div>

      {hasFesta && (
        <span className="bs-nav-queue" aria-live="polite">
          <ListMusic size={18} aria-hidden="true" />
          Fila · {festaQueueCount} {festaQueueCount === 1 ? 'música' : 'músicas'}
        </span>
      )}

      <FocusRow className="bs-nav-menu" focusKey="HOME_NAV">
        <FocusableButton focusKey="HOME_NAV_INICIO" className={cls('inicio')} ariaLabel="Início" onPress={onInicio}>
          Início
        </FocusableButton>
        <FocusableButton focusKey="HOME_NAV_CATALOGO" className={cls('catalogo')} ariaLabel="Abrir o catálogo completo" onPress={onCatalogo}>
          Catálogo
        </FocusableButton>
        {buscar && (
          <FocusableButton focusKey="HOME_NAV_BUSCAR" className={cls('buscar')} ariaLabel="Buscar uma música" onPress={buscar}>
            <Search size={22} aria-hidden="true" /> Buscar
          </FocusableButton>
        )}
        <FocusableButton focusKey="HOME_NAV_FESTA" className={cls('festa', 'is-festa')} ariaLabel="Abrir o Modo Festa" onPress={onFesta}>
          Festa
        </FocusableButton>
        {chrome.canFullscreen && (
          <FocusableButton
            focusKey="HOME_NAV_MODOTV"
            className={cls('modotv')}
            ariaLabel={chrome.fullscreen ? 'Sair da tela cheia' : 'Modo TV — tela cheia'}
            onPress={chrome.toggleFullscreen}
          >
            {chrome.fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
            {chrome.fullscreen ? 'Sair da tela cheia' : 'Modo TV'}
          </FocusableButton>
        )}
        <FocusableButton focusKey="TOPNAV_SETTINGS" className="bs-nav-round bs-focus" ariaLabel="Ajustes" onPress={onOpenSettings}>
          <Settings size={26} aria-hidden="true" />
        </FocusableButton>
      </FocusRow>
    </header>
  );
}
