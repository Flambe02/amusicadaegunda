import { useEffect, useMemo, useRef, useState } from 'react';
import { createScorer, GAME_MODES, TEAM } from '@/lib/karaokeGame';
import '@/styles/karaoke-game.css';

// Piste : 1,5 s de passé, 5,5 s à venir ; la tête de lecture au premier quart.
const PAST_SEC = 1.5;
const FUTURE_SEC = 5.5;
const LANE_W = 1700;
const ROW_H = 78;
const BLOCK_H = 46;
const TEAM_COLOR = '#F5C542';
// Sans mot à chanter pendant plus de 2 s : la piste s'efface au profit d'un message.
const GAP_SEC = 2;

const colorOf = (owner, players) => (owner === TEAM ? TEAM_COLOR : players[owner]?.color || TEAM_COLOR);

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Visualisation du chant sur grand écran (remplace la petite jauge de droite) :
 *   - en haut, discrètement, qui joue (prénom + couleur) — le score n'est donné qu'à la
 *     fin, pour chanter sans regarder des chiffres (retour du 2026-11-16) ;
 *   - une piste : chaque mot est un bloc qui défile vers la ligne blanche ;
 *     il se remplit de la couleur du chanteur quand on chante dans le tempo ; un orbe
 *     pulse avec la voix ;
 *   - pendant un passage sans paroles (après le premier verso), pas de piste vide :
 *     « ♪ Instrumental · próximo verso em 5 s » ; avant le premier verso, rien ;
 *   - qui doit chanter se lit à la couleur de la ligne de paroles (KaraokePlayer), sans
 *     bandeau ; « Perfeito! » / « Boa! » discrets à la fin de chaque verso.
 * Dessin impératif (canvas + rAF) : aucun re-render par image (TV peu puissantes).
 */
export default function KaraokeGameHud({ lines, game, getTime, isPlaying, voiceRmsRef, scorerRef }) {
  const { mode, players } = game;
  const canvasRef = useRef(null);
  const scorer = useMemo(
    () => createScorer({ lines, mode, playerCount: players.length }),
    [lines, mode, players.length],
  );
  if (scorerRef) scorerRef.current = scorer;
  const rows = mode === 'duel' || mode === 'duet' ? 2 : 1;
  const [owner, setOwner] = useState(null);
  const [popup, setPopup] = useState(null);
  const [gap, setGap] = useState(null); // secondes avant le prochain verso, ou null
  const [started, setStarted] = useState(false); // un premier verso a été chanté
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  // La vidéo a vraiment démarré : avant (compte à rebours, chargement), l'horloge des
  // paroles vaut 0 et la piste croirait le premier verso imminent (retour 2026-11-16).
  const everPlayedRef = useRef(false);
  if (isPlaying) everPlayedRef.current = true;

  // Début du premier mot de chaque ligne, pour savoir quand la piste est vide.
  const starts = useMemo(
    () => scorer.windows.map((w, i) => (scorer.owners[i] != null && w.length ? w[0].start : null)),
    [scorer],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return undefined;
    let raf; let last = performance.now();
    let lastOwner = null; let lastGap = null; let wasStarted = false;
    const H = rows * ROW_H;
    const headX = (PAST_SEC / (PAST_SEC + FUTURE_SEC)) * LANE_W;
    const xOf = (time, t) => headX + ((time - t) / (PAST_SEC + FUTURE_SEC)) * LANE_W;
    const rowY = (o) => (rows === 1 || o === TEAM ? H / 2 : ROW_H / 2 + (o % 2) * ROW_H);
    let orb = 0;

    const draw = (now) => {
      const dt = now - last; last = now;
      const t = getTime();
      const rms = voiceRmsRef?.current || 0;
      if (playingRef.current) {
        const event = scorer.update({ t, rms, dtMs: dt });
        if (event?.label) setPopup({ text: event.label, color: colorOf(event.owner, players), key: now });
      }
      const lineIdx = scorer.lineAt(t);
      const cur = lineIdx >= 0 ? scorer.owners[lineIdx] : null;
      const inWords = lineIdx >= 0 && scorer.windows[lineIdx].some((w) => t >= w.start - 0.3 && t <= w.end + 0.3);
      if (cur != null && cur !== lastOwner) { lastOwner = cur; setOwner(cur); }

      // Prochain verso : si rien à chanter avant longtemps, message au lieu de la piste.
      let next = null;
      for (let i = Math.max(0, lineIdx); i < starts.length; i += 1) { if (starts[i] != null && starts[i] > t) { next = starts[i]; break; } }
      // Avant le premier verso : la piste n'arrive qu'avec la première parole (pas
      // d'anticipation sur l'intro instrumentale) ; ensuite, 2 s d'anticipation.
      const lead = wasStarted ? GAP_SEC : 0.6;
      const waiting = !everPlayedRef.current || (!inWords && (next == null || next - t > lead));
      const gapSec = waiting && next != null ? Math.ceil(next - t) : (waiting ? -1 : null);
      if (gapSec !== lastGap) { lastGap = gapSec; setGap(gapSec); }
      if (!wasStarted && lineIdx >= 0 && inWords) { wasStarted = true; setStarted(true); }

      ctx.clearRect(0, 0, LANE_W, H);
      canvas.style.opacity = waiting ? '0' : '1';
      if (!waiting) {
        for (let r = 0; r < rows; r += 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          roundRect(ctx, 0, r * ROW_H + ROW_H / 2 - BLOCK_H / 2 - 6, LANE_W, BLOCK_H + 12, 29);
          ctx.fill();
        }
        const from = t - PAST_SEC; const to = t + FUTURE_SEC;
        scorer.windows.forEach((words, li) => {
          const o = scorer.owners[li];
          if (o == null || !words.length) return;
          if (words[words.length - 1].end < from || words[0].start > to) return;
          const color = colorOf(o, players);
          const rowsFor = o === TEAM && rows === 2 ? [0, 1] : [o === TEAM ? 0 : o];
          rowsFor.forEach((r) => {
            const y = (rows === 1 ? H / 2 : ROW_H / 2 + r * ROW_H) - BLOCK_H / 2;
            words.forEach((w) => {
              if (w.end < from || w.start > to) return;
              const x = xOf(w.start, t); const width = Math.max(10, xOf(w.end, t) - x - 6);
              const active = t >= w.start && t <= w.end;
              ctx.globalAlpha = w.end < t ? 0.2 : 0.38;
              ctx.fillStyle = color;
              roundRect(ctx, x, y, width, BLOCK_H, 23); ctx.fill();
              ctx.globalAlpha = 1;
              ctx.lineWidth = active ? 3.5 : 1.5;
              ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.35)';
              roundRect(ctx, x, y, width, BLOCK_H, 23); ctx.stroke();
            });
            // Ce qui a été chanté : rempli de la couleur du chanteur, lumineux.
            ctx.save();
            ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.fillStyle = color;
            scorer.hits.forEach((h) => {
              if (h.line !== li || h.end < from) return;
              words.forEach((w) => {
                const s = Math.max(h.start, w.start); const e = Math.min(h.end, w.end);
                if (e <= s) return;
                const x = xOf(s, t); const width = Math.max(4, xOf(e, t) - x);
                roundRect(ctx, x, y + 2, width, BLOCK_H - 4, 21); ctx.fill();
              });
            });
            ctx.restore();
          });
        });
        // Ligne blanche (le moment de chanter) + orbe de la voix.
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad; ctx.fillRect(headX - 2, 0, 4, H);
        orb += ((Math.min(1, Math.sqrt(rms) * 3.2)) - orb) * 0.35;
        const oc = cur != null ? colorOf(cur, players) : '#fff';
        ctx.save();
        ctx.shadowColor = oc; ctx.shadowBlur = 20 + orb * 40;
        ctx.fillStyle = oc; ctx.globalAlpha = 0.35 + orb * 0.65;
        ctx.beginPath(); ctx.arc(headX, cur != null ? rowY(cur) : H / 2, 10 + orb * 22, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [scorer, getTime, voiceRmsRef, players, rows, starts]);

  useEffect(() => { if (!popup) return undefined; const id = setTimeout(() => setPopup(null), 1000); return () => clearTimeout(id); }, [popup]);

  const chips = mode === 'coop'
    ? [{ id: TEAM, name: players.map((p) => p.name).join(' · '), color: TEAM_COLOR }]
    : players.map((p, i) => ({ id: i, name: p.name, color: p.color }));

  return (
    <div className="kg-hud" aria-hidden="true">
      <div className="kg-chips">
        <span className="kg-mode">{GAME_MODES[mode]?.label}</span>
        {chips.map((c) => {
          const isOn = mode === 'coop' || owner === c.id || owner === TEAM;
          return (
            <span key={c.id} className={`kg-chip ${isOn ? 'is-on' : ''}`} style={{ '--kg': c.color }}>
              <span className="kg-chip-dot" />{c.name}
            </span>
          );
        })}
      </div>
      <div className="kg-lane-wrap" style={{ height: rows * ROW_H }}>
        <canvas ref={canvasRef} className="kg-lane" width={LANE_W} height={rows * ROW_H} />
        {gap != null && started && (
          <p className="kg-gap">
            {gap > 0 ? <>♪ Instrumental · próximo verso em <strong>{gap}</strong> s</> : '♪ Instrumental'}
          </p>
        )}
        {popup && <span key={popup.key} className="kg-popup" style={{ '--kg': popup.color }}>{popup.text}</span>}
      </div>
    </div>
  );
}
