import { useEffect, useMemo, useRef, useState } from 'react';
import { createScorer, GAME_MODES, TEAM } from '@/lib/karaokeGame';
import { expectedNoteAt, foldMidi, intoRange, laneRange } from '@/lib/karaokePitch';
import '@/styles/karaoke-game.css';

// Piste : 1,5 s de passé, 5,5 s à venir ; la tête de lecture au premier quart.
const PAST_SEC = 1.5;
const FUTURE_SEC = 5.5;
const LANE_W = 1700;
const ROW_H = 78;
const BLOCK_H = 46;
// Piste des notes (chansons avec melodia, K5) : plus haute, une barre par note.
const PITCH_H = 150;
const NOTE_H = 16;
const TEAM_COLOR = '#F5C542';

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
 *   - une piste : chaque mot est un bloc EN CONTOUR qui défile vers la ligne blanche ;
 *     il ne se remplit de la couleur du chanteur que quand on chante dans le tempo
 *     (chansons avec melodia : une barre par note, remplie quand on chante juste) ;
 *     un orbe pulse avec la voix et laisse un TRAIT qui défile (on voit qu'on a chanté) ;
 *   - la piste reste toujours affichée une fois la vidéo partie, instrumental compris
 *     (vide là où il n'y a rien à chanter), sans aucun texte (retours du 2026-11-16) ;
 *   - qui doit chanter se lit à la couleur de la ligne de paroles (KaraokePlayer), sans
 *     bandeau ; « Perfeito! » / « Boa! » discrets à la fin de chaque verso.
 * Dessin impératif (canvas + rAF) : aucun re-render par image (TV peu puissantes).
 */
export default function KaraokeGameHud({
  lines, game, getTime, isPlaying, voiceRmsRef, voicePitchRef, voiceLatencySec = 0, pitchNotes = null, scorerRef,
}) {
  const { mode, players } = game;
  const canvasRef = useRef(null);
  const scorer = useMemo(
    () => createScorer({ lines, mode, playerCount: players.length, pitchNotes }),
    [lines, mode, players.length, pitchNotes],
  );
  if (scorerRef) scorerRef.current = scorer;
  const pitchMode = scorer.notes.length > 0;
  const rows = !pitchMode && (mode === 'duel' || mode === 'duet') ? 2 : 1;
  const laneH = pitchMode ? PITCH_H : rows * ROW_H;
  const [owner, setOwner] = useState(null);
  const [popup, setPopup] = useState(null);
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  // La vidéo a vraiment démarré : avant (compte à rebours, chargement), l'horloge des
  // paroles vaut 0 et la piste croirait le premier verso imminent (retour 2026-11-16).
  const everPlayedRef = useRef(false);
  if (isPlaying) everPlayedRef.current = true;


  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return undefined;
    let raf; let last = performance.now();
    let lastOwner = null;
    const vtrail = []; // [{ t, level, row }] voix récente (piste des mots)
    const H = laneH;
    const range = laneRange(scorer.notes);
    const yOfMidi = (m) => {
      const v = intoRange(m, range);
      return 14 + (1 - (v - range.min) / (range.max - range.min)) * (H - 28);
    };
    const trail = []; // [{ t, midi }] voix récente (piste des notes)
    const headX = (PAST_SEC / (PAST_SEC + FUTURE_SEC)) * LANE_W;
    const xOf = (time, t) => headX + ((time - t) / (PAST_SEC + FUTURE_SEC)) * LANE_W;
    const rowY = (o) => (rows === 1 || o === TEAM ? H / 2 : ROW_H / 2 + (o % 2) * ROW_H);
    let orb = 0;

    const draw = (now) => {
      const dt = now - last; last = now;
      const t = getTime();
      const rms = voiceRmsRef?.current || 0;
      const midi = voicePitchRef?.current ?? null;
      if (playingRef.current) {
        // Voix venue du celular : elle date de ~0,25 s → comptée à ce moment de la chanson.
        const event = scorer.update({ t: t - voiceLatencySec, rms, midi, dtMs: dt });
        if (event?.label) setPopup({ text: event.label, color: colorOf(event.owner, players), key: now });
      }
      const lineIdx = scorer.lineAt(t);
      const cur = lineIdx >= 0 ? scorer.owners[lineIdx] : null;
      if (cur != null && cur !== lastOwner) { lastOwner = cur; setOwner(cur); }

      // La piste reste TOUJOURS là une fois la vidéo partie, passages instrumentaux
      // compris (retour du 2026-11-16) : elle est vide là où il n'y a rien à chanter.
      // Seulement cachée avant le départ (compte à rebours : horloge des paroles à 0).
      const waiting = !everPlayedRef.current;

      ctx.clearRect(0, 0, LANE_W, H);
      canvas.style.opacity = waiting ? '0' : '1';
      if (!waiting && pitchMode) {
        const from = t - PAST_SEC; const to = t + FUTURE_SEC;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundRect(ctx, 0, 0, LANE_W, H, 28); ctx.fill();
        // Mots sans note dans la melodia (carte incomplète) : barre fine au milieu, pour
        // que la piste ne paraisse jamais vide pendant qu'on chante.
        scorer.windows.forEach((words, li) => {
          const o = scorer.owners[li];
          if (o == null || !words.length || words[words.length - 1].end < from || words[0].start > to) return;
          ctx.fillStyle = colorOf(o, players);
          words.forEach((w) => {
            if (w.end < from || w.start > to) return;
            if (scorer.notes.some((n) => n.start < w.end && n.end > w.start)) return;
            const x = xOf(w.start, t);
            ctx.globalAlpha = w.end < t ? 0.1 : 0.2;
            roundRect(ctx, x, H / 2 - 3, Math.max(6, xOf(w.end, t) - x - 4), 6, 3); ctx.fill();
            // Chanté dans le tempo : la barre s'allume (ces mots comptent pour le tempo).
            ctx.globalAlpha = 1;
            scorer.hits.forEach((h) => {
              if (h.line !== li) return;
              const s = Math.max(h.start, w.start); const e = Math.min(h.end, w.end);
              if (e <= s) return;
              const hx = xOf(s, t); roundRect(ctx, hx, H / 2 - 4, Math.max(4, xOf(e, t) - hx), 8, 4); ctx.fill();
            });
          });
        });
        ctx.globalAlpha = 1;
        // Notes attendues : une barre à la hauteur de la note, couleur du chanteur.
        scorer.notes.forEach((n) => {
          if (n.end < from || n.start > to) return;
          const o = scorer.owners[n.line];
          const color = colorOf(o, players);
          const x = xOf(n.start, t); const width = Math.max(8, xOf(n.end, t) - x - 3);
          const y = yOfMidi(n.midi) - NOTE_H / 2;
          const active = t >= n.start && t <= n.end;
          // À chanter : contour seul (rien n'est « allumé » tant qu'on n'a pas chanté).
          ctx.fillStyle = 'rgba(255,255,255,0.07)'; roundRect(ctx, x, y, width, NOTE_H, 9); ctx.fill();
          ctx.globalAlpha = n.end < t ? 0.35 : 0.9;
          ctx.lineWidth = active ? 3 : 2; ctx.strokeStyle = active ? '#fff' : color;
          roundRect(ctx, x, y, width, NOTE_H, 9); ctx.stroke();
          ctx.globalAlpha = 1;
          // Chanté juste : rempli, lumineux.
          ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.fillStyle = color;
          scorer.pitchHits.forEach((h) => {
            if (h.line !== n.line || h.end < n.start || h.start > n.end) return;
            const s = Math.max(h.start, n.start); const e = Math.min(h.end, n.end);
            if (e <= s) return;
            const hx = xOf(s, t); roundRect(ctx, hx, y + 2, Math.max(4, xOf(e, t) - hx), NOTE_H - 4, 7); ctx.fill();
          });
          ctx.restore();
        });
        // La voix : une trace qui suit la note chantée (repliée près de la note attendue).
        // Repliée vers la note attendue, sinon vers le point précédent (pas de saut d'octave).
        const expected = expectedNoteAt(scorer.notes, t);
        const prev = trail.length ? trail[trail.length - 1].midi : null;
        if (midi != null && rms > 0) {
          const anchor = expected ? expected.midi : (prev ?? intoRange(midi, range));
          trail.push({ t, midi: foldMidi(midi, anchor) });
        } else trail.push({ t, midi: null });
        while (trail.length && trail[0].t < t - PAST_SEC) trail.shift();
        const oc = cur != null ? colorOf(cur, players) : '#fff';
        ctx.save(); ctx.strokeStyle = oc; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
        ctx.beginPath(); let pen = false;
        trail.forEach((p) => {
          if (p.midi == null) { pen = false; return; }
          const x = xOf(p.t, t); const y = yOfMidi(p.midi);
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
        });
        ctx.stroke(); ctx.restore();
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad; ctx.fillRect(headX - 2, 0, 4, H);
        orb += ((Math.min(1, Math.sqrt(rms) * 3.2)) - orb) * 0.35;
        const last = trail[trail.length - 1];
        const oy = last?.midi != null ? yOfMidi(last.midi) : (expected ? yOfMidi(expected.midi) : H / 2);
        ctx.save(); ctx.shadowColor = oc; ctx.shadowBlur = 20 + orb * 40; ctx.fillStyle = oc; ctx.globalAlpha = 0.35 + orb * 0.65;
        ctx.beginPath(); ctx.arc(headX, oy, 9 + orb * 16, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (!waiting && !pitchMode) {
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
              // À chanter : contour seul ; il se remplit quand on chante (plus bas).
              ctx.fillStyle = 'rgba(255,255,255,0.07)';
              roundRect(ctx, x, y, width, BLOCK_H, 23); ctx.fill();
              ctx.globalAlpha = w.end < t ? 0.35 : 0.9;
              ctx.lineWidth = active ? 3.5 : 2;
              ctx.strokeStyle = active ? '#fff' : color;
              roundRect(ctx, x, y, width, BLOCK_H, 23); ctx.stroke();
              ctx.globalAlpha = 1;
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
        // Le trait de la voix : il monte avec le volume et défile vers la gauche, pour
        // voir qu'on a chanté (même hors des mots).
        const level = Math.min(1, Math.sqrt(rms) * 3.2);
        vtrail.push({ t, level: level > 0.22 ? level : 0, row: cur != null ? cur : (vtrail[vtrail.length - 1]?.row ?? 0) });
        while (vtrail.length && vtrail[0].t < t - PAST_SEC) vtrail.shift();
        const tc = cur != null ? colorOf(cur, players) : '#fff';
        ctx.save(); ctx.strokeStyle = tc; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.85;
        ctx.beginPath(); let pen = false;
        vtrail.forEach((p) => {
          if (!p.level) { pen = false; return; }
          const x = xOf(p.t, t); const y = rowY(p.row) + BLOCK_H / 2 - 6 - p.level * (BLOCK_H - 10);
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
        });
        ctx.stroke(); ctx.restore();
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
  }, [scorer, getTime, voiceRmsRef, voicePitchRef, voiceLatencySec, players, rows, laneH, pitchMode]);

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
      <div className="kg-lane-wrap" style={{ height: laneH }}>
        <canvas ref={canvasRef} className="kg-lane" width={LANE_W} height={laneH} />
        {popup && <span key={popup.key} className="kg-popup" style={{ '--kg': popup.color }}>{popup.text}</span>}
      </div>
    </div>
  );
}
