/**
 * Moteur de jeu du karaokê grand écran (2026-11-16) — PUR, sans React ni micro.
 *
 * Score « chanter au bon moment » : pour chaque ligne, la part du temps des mots où le
 * micro entend une voix (RMS au-dessus du seuil). Marche pour toutes les chansons, sans
 * carte de mélodie. Honnête : on mesure la présence de la voix en rythme, pas la justesse.
 *
 * Modes (un seul micro suffit — on alterne qui chante) :
 *   - solo   : un joueur chante tout ;
 *   - duet   : les parties {A}/{B} de la chanson, chacune à son joueur ({AB} = ensemble) ;
 *   - duel   : verso a verso — les lignes chantées alternent entre deux joueurs ;
 *   - coop   : tout le monde ensemble, une seule note d'équipe ;
 *   - pass   : « passa o microfone » — tous les `passEvery` versos, au suivant.
 */
import { splitSingerTag } from './lrc';
import { distributeWords } from './wordDistribution';

export const GAME_MODES = {
  solo: { label: 'Solo', min: 1, max: 1, needsMic: false, desc: 'Uma pessoa canta tudo.' },
  duet: { label: 'Dueto', min: 2, max: 2, needsMic: false, desc: 'Cada voz canta a sua parte da música, com a sua cor.' },
  duel: { label: 'Duelo', min: 2, max: 2, needsMic: true, desc: 'Verso a verso: cada um canta uma linha. No final, quem pontuar mais vence.' },
  coop: { label: 'Cooperação', min: 2, max: 4, needsMic: true, desc: 'Todos cantam juntos no mesmo microfone: uma nota só, da equipe.' },
  pass: { label: 'Passa o microfone', min: 2, max: 4, needsMic: true, desc: 'A cada 4 versos, a tela chama a próxima pessoa. Passe o microfone!' },
};

export const TEAM = 'team';
export const PASS_EVERY = 4;

/**
 * « Est-ce qu'on chante ? » — seuil qui suit le bruit de fond du micro (2026-11-16) :
 * un seuil fixe (0,045) ne voyait jamais la voix d'un micro USB sans gain automatique
 * (score 0). Le plancher de bruit descend vite (silences, respirations) et remonte
 * lentement (la musique qui revient dans le micro) ; la voix compte quand elle le
 * dépasse nettement. Plafonné : une voix franche compte toujours.
 */
export function createVoiceDetector({ floor = 0.003, minThreshold = 0.007, ratio = 2.2, maxNoise = 0.03 } = {}) {
  let noise = floor;
  return {
    update(rms, dtMs = 16) {
      const level = Number.isFinite(rms) ? rms : 0;
      const k = level < noise ? Math.min(1, dtMs / 250) : Math.min(1, dtMs / 20000);
      noise = Math.min(maxNoise, Math.max(floor, noise + (level - noise) * k));
      return level > Math.max(minThreshold, noise * ratio);
    },
    get noise() { return noise; },
  };
}
const LINE_POINTS = 1000;
const FALLBACK_LINE_SEC = 4;

const isSung = (line) => Boolean(line && line.time != null && String(line.text || '').replace(/\{[^}]*\}/g, '').trim());

/** Chanteur d'une ligne de dueto : champ `singer` (minutage structuré) ou tag {A}/{B}. */
export function lineSinger(line) {
  if (line?.singer) return String(line.singer).toUpperCase();
  return splitSingerTag(line?.text).singer;
}

/**
 * À qui est chaque ligne : index du joueur, TEAM (tout le monde), ou null (ligne vide,
 * instrumental). `playerCount` borne les index.
 */
export function lineOwners(lines, mode, playerCount = 1, { passEvery = PASS_EVERY } = {}) {
  let sungIndex = 0;
  return (lines || []).map((line) => {
    if (!isSung(line)) return null;
    const k = sungIndex;
    sungIndex += 1;
    if (mode === 'coop') return TEAM;
    if (mode === 'duel') return k % 2;
    if (mode === 'pass') return Math.floor(k / passEvery) % Math.max(1, playerCount);
    if (mode === 'duet') {
      const singer = lineSinger(line);
      if (singer === 'A') return 0;
      if (singer === 'B') return 1;
      return TEAM;
    }
    return 0;
  });
}

/** Fenêtres de mots d'une ligne (timing par mot, sinon réparti sur la ligne). */
export function wordWindows(line, nextTime) {
  if (!isSung(line)) return [];
  const end = line.endTime ?? nextTime ?? line.time + FALLBACK_LINE_SEC;
  let words = Array.isArray(line.words) && line.words.length ? line.words : null;
  // Minutage par mot resté d'un ancien calage (la ligne a été recalée, pas ses mots) :
  // des mots à 1,6 s pour une ligne à 8,6 s dessinaient la piste sur l'intro
  // instrumentale (2026-11-16). On recale les mots sur le début de la ligne ; s'ils ne
  // tiennent pas avant la ligne suivante, on les répartit sur la ligne.
  if (words) {
    const first = Number(words[0].start);
    if (!Number.isFinite(first)) words = null;
    else if (Math.abs(first - line.time) > 0.5) {
      const shift = line.time - first;
      const shifted = words.map((w) => ({ ...w, start: Number(w.start) + shift, ...(Number.isFinite(w.end) ? { end: w.end + shift } : {}) }));
      const last = shifted[shifted.length - 1];
      const lastEnd = Number.isFinite(last.end) ? last.end : last.start;
      words = nextTime == null || lastEnd <= nextTime + 0.3 ? shifted : null;
    }
  }
  if (!words) words = distributeWords(splitSingerTag(line.text).text, line.time, end > line.time ? end : line.time + FALLBACK_LINE_SEC);
  return words.map((w, i) => {
    const start = Number(w.start);
    const stop = Number.isFinite(w.end) ? w.end : (words[i + 1]?.start ?? end);
    return { start, end: Math.max(start + 0.05, stop), text: w.text };
  }).filter((w) => Number.isFinite(w.start));
}

/** Retour d'une ligne terminée. */
export function lineLabel(ratio) {
  if (ratio >= 0.85) return 'Perfeito!';
  if (ratio >= 0.6) return 'Boa!';
  if (ratio >= 0.3) return 'Quase!';
  return null;
}

export function starsFor(avgRatio) {
  if (!(avgRatio > 0)) return 0;
  return Math.max(1, Math.min(5, Math.ceil(avgRatio * 5 - 0.25)));
}

/**
 * Compteur de score. `update({ t, rms, dtMs })` à chaque image ; renvoie l'événement de
 * la ligne qui vient de se terminer (pour les « Perfeito! »), sinon null.
 */
export function createScorer({ lines, mode, playerCount = 1, passEvery = PASS_EVERY }) {
  const owners = lineOwners(lines, mode, playerCount, { passEvery });
  const windows = (lines || []).map((line, i) => wordWindows(line, lines[i + 1]?.time));
  const ids = mode === 'coop' ? [TEAM] : Array.from({ length: playerCount }, (_, i) => i);
  const players = Object.fromEntries(ids.map((id) => [id, { score: 0, combo: 0, bestCombo: 0, lines: 0, ratioSum: 0 }]));
  const perLine = windows.map(() => ({ needMs: 0, voicedMs: 0, done: false }));
  // Segments chantés (pour colorer la piste) : [{ line, start, end }]
  const hits = [];
  const detector = createVoiceDetector();
  let current = -1;

  const lineAt = (t) => {
    let idx = -1;
    for (let i = 0; i < lines.length; i += 1) { if (lines[i].time != null && lines[i].time <= t) idx = i; else if (lines[i].time != null) break; }
    return idx;
  };

  const credit = (owner, fn) => {
    if (owner == null) return;
    if (owner === TEAM && mode !== 'coop') { ids.forEach((id) => fn(players[id], id)); return; }
    const p = players[owner];
    if (p) fn(p, owner);
  };

  const close = (idx) => {
    const rec = perLine[idx];
    if (!rec || rec.done || owners[idx] == null) return null;
    rec.done = true;
    if (rec.needMs <= 0) return null;
    const ratio = Math.min(1, rec.voicedMs / rec.needMs);
    let gained = 0;
    credit(owners[idx], (p) => {
      p.lines += 1; p.ratioSum += ratio;
      p.combo = ratio >= 0.6 ? p.combo + 1 : 0;
      p.bestCombo = Math.max(p.bestCombo, p.combo);
      const mult = 1 + Math.min(4, Math.max(0, p.combo - 1)) * 0.1;
      gained = Math.round(ratio * LINE_POINTS * mult);
      p.score += gained;
    });
    return { line: idx, owner: owners[idx], ratio, points: gained, label: lineLabel(ratio) };
  };

  return {
    owners,
    windows,
    hits,
    players,
    ownerAt: (t) => { const i = lineAt(t); return i >= 0 ? owners[i] : null; },
    lineAt,
    update({ t, rms, dtMs }) {
      // Le détecteur écoute à chaque image (silences compris) pour suivre le bruit.
      const voiced = detector.update(rms, dtMs);
      const idx = lineAt(t);
      let event = null;
      if (idx !== current) {
        if (current >= 0) event = close(current);
        current = idx;
      }
      if (idx < 0 || owners[idx] == null) return event;
      const inWord = windows[idx].some((w) => t >= w.start && t <= w.end);
      if (!inWord) return event;
      const rec = perLine[idx];
      const dt = Math.max(0, Math.min(250, dtMs));
      rec.needMs += dt;
      if (voiced) {
        rec.voicedMs += dt;
        const last = hits[hits.length - 1];
        const from = t - dt / 1000;
        if (last && last.line === idx && from - last.end < 0.12) last.end = t;
        else hits.push({ line: idx, start: from, end: t });
      }
      return event;
    },
    /** Termine la chanson : clôt la ligne en cours, renvoie le classement. */
    finish() {
      if (current >= 0) close(current);
      return ids.map((id) => {
        const p = players[id];
        const avg = p.lines ? p.ratioSum / p.lines : 0;
        return { id, score: p.score, stars: starsFor(avg), bestCombo: p.bestCombo, lines: p.lines, avg };
      });
    },
  };
}

/** Index du joueur qui chante ensuite en « passa o microfone » / duelo (annonce). */
export function nextTurn(owners, fromLine) {
  const cur = owners[fromLine];
  for (let i = fromLine + 1; i < owners.length; i += 1) {
    if (owners[i] != null && owners[i] !== cur) return { line: i, owner: owners[i] };
  }
  return null;
}
