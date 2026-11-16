import { useEffect, useRef } from 'react';
import { RotateCcw, Trophy, X } from 'lucide-react';
import { GAME_MODES, TEAM } from '@/lib/karaokeGame';
import '@/styles/karaoke-game.css';

const Stars = ({ n }) => (
  <span className="kg-stars" aria-label={`${n} de 5 estrelas`}>
    {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < n ? 'is-on' : ''}>★</span>)}
  </span>
);

function headline(mode, rows) {
  if (mode === 'coop') return 'Nota da equipe';
  if (mode === 'duel') {
    if (rows.length > 1 && rows[0].score === rows[1].score) return 'Empate!';
    return `${rows[0].name} venceu o duelo!`;
  }
  if (mode === 'pass') return `${rows[0].name} brilhou mais!`;
  if (mode === 'duet') return 'Dueto concluído!';
  return 'Sua nota';
}

/**
 * Fin de partie (grand écran) : le gagnant ou la note de l'équipe, chaque joueur avec son
 * score, ses étoiles et « Novo recorde! », puis les recordes de la música sur l'appareil.
 * Navigation spatiale en pause sur l'écran karaokê : focus natif, ◀ ▶ entre les boutons.
 */
export default function KaraokeGameResults({ mode, rows, top = [], onReplay, onClose, onNext }) {
  const firstRef = useRef(null);
  const boxRef = useRef(null);
  useEffect(() => { firstRef.current?.focus?.({ preventScroll: true }); }, []);
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const buttons = [...(boxRef.current?.querySelectorAll('button') || [])];
    const i = buttons.indexOf(document.activeElement);
    const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
    next?.focus();
    e.preventDefault();
  };
  const sorted = mode === 'duet' ? rows : [...rows].sort((a, b) => b.score - a.score);

  return (
    <div className="kg-results" role="dialog" aria-label="Resultado">
      <div className="kg-results-box">
        <p className="kg-results-mode">{GAME_MODES[mode]?.label}</p>
        <h2 className="kg-results-title"><Trophy size={44} aria-hidden="true" /> {headline(mode, sorted)}</h2>
        <ol className="kg-results-rows">
          {sorted.map((r, i) => (
            <li key={r.id} className={`kg-results-row ${i === 0 && sorted.length > 1 && mode !== 'duet' ? 'is-winner' : ''}`} style={{ '--kg': r.color }}>
              <span className="kg-results-name">{r.id === TEAM ? 'Equipe' : r.name}</span>
              <Stars n={r.stars} />
              <span className="kg-results-score">{r.score.toLocaleString('pt-BR')}</span>
              {r.pitch != null && <span className="kg-results-pitch" title="Notas cantadas no tom">Afinação {r.pitch}%</span>}
              {r.rank === 1 && <span className="kg-badge is-gold">Novo recorde!</span>}
              {r.rank !== 1 && r.personalBest && <span className="kg-badge">Melhor nota de {r.name}</span>}
            </li>
          ))}
        </ol>
        <p className="kg-results-note">
          {sorted.some((r) => r.pitch != null)
            ? 'A nota mede se você canta no tempo de cada palavra e no tom da melodia (na sua oitava).'
            : 'A nota mede se você canta no tempo de cada palavra (não a afinação).'}
        </p>

        {top.length > 0 && (
          <div className="kg-top">
            <p className="kg-top-title">Recordes desta música</p>
            <ol>
              {top.map((e, i) => (
                <li key={e.id || i}><span>{i + 1}</span><strong>{e.name}</strong><em>{GAME_MODES[e.mode]?.label || ''}</em><b>{e.score.toLocaleString('pt-BR')}</b></li>
              ))}
            </ol>
          </div>
        )}

        <div ref={boxRef} className="kg-results-actions" onKeyDown={onKeyDown}>
          <button ref={firstRef} type="button" className="kg-btn is-primary" onClick={onReplay}><RotateCcw size={24} aria-hidden="true" /> Cantar de novo</button>
          {onNext && <button type="button" className="kg-btn" onClick={onNext}>Próxima</button>}
          <button type="button" className="kg-btn" onClick={onClose}><X size={24} aria-hidden="true" /> Sair</button>
        </div>
      </div>
    </div>
  );
}
