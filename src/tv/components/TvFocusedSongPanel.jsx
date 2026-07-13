import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Play, Mic } from 'lucide-react';
import FocusableButton from './FocusableButton';

const MODE_LABELS = { solo: 'Solo', duet: 'Dueto', family: 'Família', festa: 'Festa' };

function MetaRow({ label, value }) {
  return (
    <div className="tvc-panel-meta-row">
      <span className="tvc-panel-meta-label">{label}</span>
      <span className="tvc-panel-meta-value">{value}</span>
    </div>
  );
}

/**
 * Panneau contextuel de la chanson focalisée (~30% droite). Répond en un coup d'œil :
 * qu'est-ce que c'est, pourquoi c'est drôle, est-ce adapté au groupe, est-ce facile,
 * que faire ensuite. AUCUN autoplay vidéo. Se met à jour immédiatement au changement
 * de focus dans la grille.
 *
 * Le panneau N'EST PAS dans le flux D-pad normal : ses boutons ne deviennent
 * focusables que si l'utilisateur presse Droite depuis la dernière colonne de la
 * grille (géométrie Norigin). Seuls les CTA sont focusables ici — le texte ne l'est
 * jamais. `festaChosenBy` (optionnel) : nombre de personnes ayant choisi ce titre
 * en session Festa.
 */
export default function TvFocusedSongPanel({
  vm, artSrc, familiar = false, festaChosenBy = null, onConhecer, onCantar,
}) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_PANEL', trackChildren: true, saveLastFocusedChild: true,
  });

  if (!vm) {
    return (
      <aside className="tvc-panel tvc-panel-empty">
        <p>Escolha uma música para ver os detalhes.</p>
      </aside>
    );
  }

  const modes = vm.recommendedModes.map((m) => MODE_LABELS[m]).filter(Boolean).slice(0, 2).join(' / ');

  return (
    <FocusContext.Provider value={focusKey}>
      <aside ref={ref} className="tvc-panel">
        <div className="tvc-panel-art">
          {artSrc
            ? <img src={artSrc} alt="" decoding="async" />
            : <div className="tvc-panel-art-fallback" aria-hidden="true" />}
          <div className="tvc-panel-art-scrim" aria-hidden="true" />
        </div>

        <div className="tvc-panel-scroll">
          <h2 className="tvc-panel-title">{vm.title}</h2>
          <p className="tvc-panel-type">{vm.type}</p>
          {vm.shortPitch && <p className="tvc-panel-pitch">{vm.shortPitch}</p>}
          {typeof festaChosenBy === 'number' && festaChosenBy > 0 && (
            <p className="tvc-panel-festa">Escolhida por {festaChosenBy} {festaChosenBy === 1 ? 'pessoa' : 'pessoas'}</p>
          )}

          <div className="tvc-panel-meta">
            {vm.theme && <MetaRow label="Tema" value={vm.theme} />}
            <MetaRow label="Dificuldade" value={vm.difficultyLabel} />
            <MetaRow label="Energia" value={vm.energyLabel} />
            {modes && <MetaRow label="Ideal para" value={modes} />}
          </div>
        </div>

        <div className="tvc-panel-actions">
          <FocusableButton
            focusKey="CAT_PANEL_CONHECER"
            className="tvc-panel-cta is-primary"
            ariaLabel={`Abrir a ficha de ${vm.title}`}
            onPress={() => onConhecer(vm)}
          >
            <Play size={19} className="tvc-cta-icon-fill" /> Abrir ficha
          </FocusableButton>
          {/* « Cantar agora » : raccourci direct visible seulement si le titre est déjà
              familier (récemment ouvert/chanté) — ne concurrence jamais « Abrir ficha ». */}
          {familiar && vm.isSingable && (
            <FocusableButton
              focusKey="CAT_PANEL_CANTAR"
              className="tvc-panel-cta is-secondary"
              ariaLabel={`Cantar ${vm.title} agora`}
              onPress={() => onCantar(vm)}
            >
              <Mic size={17} /> Cantar agora
            </FocusableButton>
          )}
        </div>
      </aside>
    </FocusContext.Provider>
  );
}
