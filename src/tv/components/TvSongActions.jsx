import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Plus, BookOpen, Play } from 'lucide-react';
import FocusableButton from './FocusableButton';

/**
 * Rangée d'actions de la fiche, priorité (cf. spec) :
 *   1. CANTAR AGORA  (jaune, dominant, focus initial)
 *   2. ADICIONAR À FILA  (secondaire, sombre bordé) — « … DA FESTA » si session active
 *   3. VER CONTEXTO COMPLETO  (tertiaire, discret)
 *   4. PRÉVIA DO CLIPE  (tertiaire, discret) — le clip n'est JAMAIS une action primaire
 * Groupe de focus dédié (`DETAIL_ACTIONS`). Le CTA clip n'apparaît que si un teaser
 * existe ; « Ver contexto » que si un contexte complet existe.
 */
export default function TvSongActions({
  festaActive = false, hasContext = true, hasTeaser = true, canSing = true,
  onCantar, onFila, onContext, onTeaser,
}) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'DETAIL_ACTIONS', trackChildren: true, saveLastFocusedChild: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tvd-actions">
        {canSing && (
          <FocusableButton
            focusKey="DETAIL_CANTAR"
            className="tvd-btn tvd-btn-primary"
            ariaLabel="Cantar agora"
            onPress={onCantar}
          >
            <Mic size={24} /> Cantar agora
          </FocusableButton>
        )}
        <FocusableButton
          focusKey="DETAIL_FILA"
          className="tvd-btn tvd-btn-secondary"
          ariaLabel={festaActive ? 'Adicionar à fila da festa' : 'Adicionar à fila'}
          onPress={onFila}
        >
          <Plus size={22} /> {festaActive ? 'Adicionar à fila da festa' : 'Adicionar à fila'}
        </FocusableButton>
        {hasContext && (
          <FocusableButton
            focusKey="DETAIL_CONTEXT"
            className="tvd-btn tvd-btn-tertiary"
            ariaLabel="Ver contexto completo"
            onPress={onContext}
          >
            <BookOpen size={20} /> Ver contexto completo
          </FocusableButton>
        )}
        {hasTeaser && (
          <FocusableButton
            focusKey="DETAIL_CLIPE"
            className="tvd-btn tvd-btn-tertiary"
            ariaLabel="Prévia do clipe"
            onPress={onTeaser}
          >
            <Play size={19} className="tvd-icon-fill" /> Prévia do clipe
          </FocusableButton>
        )}
      </div>
    </FocusContext.Provider>
  );
}
