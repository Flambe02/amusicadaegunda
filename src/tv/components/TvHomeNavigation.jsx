import { BRAND_SQUARE_SMALL } from '@/lib/imageAssets';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';

/**
 * Barre horizontale partagée par TOUS les écrans « v2 » (accueil, fiche chanson,
 * landing karaokê) : identité (gauche), destinations Início/Karaokê/Festa/Clipes
 * (centre), avatar → réglages (droite). Aucune loupe, aucune barre de recherche.
 * Pas de destination « Todos » (catálogo complet retiré du menu — cf. `onAll`
 * conservé côté TvApp.jsx/écrans pour compat, simplement non rendu ici).
 *
 * `active` distingue la destination COURANTE (surlignage discret, cf. .is-active en
 * CSS) du focus D-pad (halo fort, cf. .is-focused) — les deux sont des concepts
 * différents. Valeurs : 'home' | 'karaoke' | 'festa' | 'clips' | null.
 */
export default function TvHomeNavigation({ active = 'home', onStart, onKaraoke, onFesta, onClips, onOpenSettings }) {
  const cls = (key) => `tv2-nav-item ${active === key ? 'is-active' : ''}`;
  return (
    <header className="tv2-nav">
      <div className="tv2-nav-brand">
        <img src={BRAND_SQUARE_SMALL} alt="" className="tv2-nav-logo" />
        <span className="tv2-nav-wordmark">A Música<br />da Segunda</span>
      </div>

      <FocusRow className="tv2-nav-menu" focusKey="HOME_NAV">
        <FocusableButton
          focusKey="HOME_NAV_START"
          className={cls('home')}
          ariaLabel="Início"
          onPress={onStart}
        >
          Início
        </FocusableButton>
        <FocusableButton
          focusKey="HOME_NAV_KARAOKE"
          className={cls('karaoke')}
          ariaLabel="Abrir Karaokê"
          onPress={onKaraoke}
        >
          Karaokê
        </FocusableButton>
        <FocusableButton
          focusKey="HOME_NAV_FESTA"
          className={cls('festa')}
          ariaLabel="Abrir Modo Festa"
          onPress={onFesta}
        >
          Festa
        </FocusableButton>
        <FocusableButton
          focusKey="HOME_NAV_CLIPS"
          className={cls('clips')}
          ariaLabel="Abrir Clipes"
          onPress={onClips}
        >
          Clipes
        </FocusableButton>
      </FocusRow>

      <FocusableButton
        focusKey="HOME_SETTINGS"
        className="tv2-nav-avatar"
        ariaLabel="Abrir configurações"
        onPress={onOpenSettings}
      >
        <img src={BRAND_SQUARE_SMALL} alt="" />
      </FocusableButton>
    </header>
  );
}
