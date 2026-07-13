/**
 * localFileMatcher — suggère des associations fichier local ↔ chanson, sans réseau.
 * Déterministe. Ne propose jamais une association automatique incertaine.
 */
import { fileExtension } from './localAudioMetadata';

const COMMON_SUFFIXES = ['master', 'final', 'final2', 'mix', 'instrumental', 'karaoke', 'wav', 'mp3', 'audio', 'v1', 'v2'];

export function normalizeName(str = '') {
  let s = String(str).toLowerCase();
  s = s.replace(/\.[a-z0-9]+$/, '');                 // extension
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); // accents
  s = s.replace(/[_\-.]+/g, ' ');                     // separators → space
  s = s.replace(/[^a-z0-9\s]/g, ' ');                 // punctuation
  const tokens = s.split(/\s+/).filter(Boolean).filter((t) => !COMMON_SUFFIXES.includes(t));
  return tokens.join(' ').trim();
}

function isInstrumental(name = '') {
  return /\b(instrumental|karaoke|playback)\b/i.test(name);
}

// Dice coefficient on token bigrams → 0..1 similarity.
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s) => {
    const arr = [];
    for (let i = 0; i < s.length - 1; i += 1) arr.push(s.slice(i, i + 2));
    return arr;
  };
  const A = bigrams(a), B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const map = new Map();
  for (const g of A) map.set(g, (map.get(g) || 0) + 1);
  let inter = 0;
  for (const g of B) { const c = map.get(g); if (c > 0) { inter += 1; map.set(g, c - 1); } }
  return (2 * inter) / (A.length + B.length);
}

/**
 * Suggest matches for a song among local files.
 * @returns array of { file, score (0..1), reasons[], confidence: 'exact'|'high'|'possible' }
 */
export function suggestMatchesForSong(song, files, existingAssocByHash = {}) {
  const songTitle = normalizeName(song.title || '');
  const songDur = Number(song.durationSeconds) || null;
  const out = [];

  for (const file of files) {
    const reasons = [];
    let score = 0;

    // Exact previous hash association
    if (file.fileHash && existingAssocByHash[file.fileHash] === String(song.id)) {
      reasons.push('Associação anterior (hash exato)');
      out.push({ file, score: 1, reasons, confidence: 'exact' });
      continue;
    }

    const fileNorm = normalizeName(file.fileName || '');
    if (!songTitle) { continue; }

    if (fileNorm === songTitle) { score = Math.max(score, 0.95); reasons.push('Nome do arquivo idêntico ao título'); }
    else if (fileNorm.includes(songTitle) || songTitle.includes(fileNorm)) { score = Math.max(score, 0.8); reasons.push('Título contido no nome do arquivo'); }
    else {
      const sim = similarity(fileNorm, songTitle);
      if (sim >= 0.55) { score = Math.max(score, sim * 0.85); reasons.push(`Título semelhante (${Math.round(sim * 100)}%)`); }
    }

    if (songDur && file.durationSeconds) {
      const diff = Math.abs(songDur - file.durationSeconds);
      if (diff <= 2) { score += 0.1; reasons.push('Duração semelhante'); }
      else if (diff > 6) { score -= 0.15; reasons.push('Duração divergente'); }
    }

    if (isInstrumental(file.fileName) && !isInstrumental(song.title || '')) {
      score -= 0.25; reasons.push('Parece instrumental/karaokê');
    }

    if (score >= 0.5 && reasons.length) {
      out.push({ file, score: Math.min(score, 0.94), reasons, confidence: score >= 0.8 ? 'high' : 'possible' });
    }
  }

  return out.sort((a, b) => b.score - a.score);
}

export { similarity, isInstrumental, fileExtension };
