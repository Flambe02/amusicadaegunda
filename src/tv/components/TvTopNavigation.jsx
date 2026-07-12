import { ListMusic } from 'lucide-react';
import { BRAND_SQUARE_SMALL } from '@/lib/imageAssets';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';

/**
 * Navigation supérieure des écrans TV « song-first ». Wordmark à gauche (SANS
 * mascote — le logo capivara de gauche a été retiré à la demande produit ; l'avatar
 * capivara reste à droite), 4 destinations centrées (Início | Catálogo | Karaokê |
 * Festa), avatar mascote décoratif à droite + statut « Fila · N músicas » quand une
 * session Festa est active.
 *
 * PAS de loupe/recherche (la recherche vit dans le Catálogo), PAS de réglages, PAS
 * de niveau/nom d'utilisateur.
 *
 * `active` = destination courante → texte jaune + soulignement discret. Le focus
 * D-pad (halo/pill fort) reste un concept séparé.
 */
export default function TvTopNavigation({
  active = 'inicio', onInicio, onCatalogo, onKaraoke, onFesta, festaQueueCount = null,
}) {
  const cls = (key) => `tvh-nav-item ${active === key ? 'is-active' : ''}`;
  const hasFesta = typeof festaQueueCount === 'number';

  return (
    <header className="tvh-nav">
      <div className="tvh-nav-brand">
        <span className="tvh-nav-wordmark">A Música<br />da Segunda</span>
      </div>

      <FocusRow className="tvh-nav-menu" focusKey="HOME_NAV">
        <FocusableButton
          focusKey="HOME_NAV_INICIO"
          className={cls('inicio')}
          ariaLabel="Início"
          onPress={onInicio}
        >
          Início
        </FocusableButton>
        <FocusableButton
          focusKey="HOME_NAV_CATALOGO"
          className={cls('catalogo')}
          ariaLabel="Abrir o catálogo completo"
          onPress={onCatalogo}
        >
          Catálogo
        </FocusableButton>
        <FocusableButton
          focusKey="HOME_NAV_KARAOKE"
          className={cls('karaoke')}
          ariaLabel="Abrir o Karaokê"
          onPress={onKaraoke}
        >
          Karaokê
        </FocusableButton>
        <FocusableButton
          focusKey="HOME_NAV_FESTA"
          className={cls('festa')}
          ariaLabel="Abrir o Modo Festa"
          onPress={onFesta}
        >
          Festa
        </FocusableButton>
      </FocusRow>

      <div className="tvh-nav-status" aria-live="polite">
        {hasFesta && (
          <span className="tvh-nav-festa-pill">
            <ListMusic size={16} />
            Fila · {festaQueueCount} {festaQueueCount === 1 ? 'música' : 'músicas'}
          </span>
        )}
        <img src={BRAND_SQUARE_SMALL} alt="" aria-hidden="true" className="tvh-nav-avatar" />
      </div>
    </header>
  );
}
