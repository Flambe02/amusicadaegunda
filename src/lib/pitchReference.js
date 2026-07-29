/**
 * Melodia de referência precomputada (pitch-map) por música — §11.
 *
 * O microfone só dá o pitch da voz do cantor. Para saber se está afinado é
 * preciso saber a nota ESPERADA no instante atual. Esse dado vem de um ficheiro
 * pré-calculado offline (ver `scripts/generate-pitch-map.cjs`) e guardado em
 * Supabase de forma OPCIONAL:
 *   - `songs.pitch_map`          (jsonb inline — preferido, sem fetch/CORS extra)
 *   - `songs.pitch_reference_url` (URL para um .json — alternativa)
 *
 * Se a música não tiver referência, o guia fica indisponível e o karaokê normal
 * funciona na mesma. NUNCA obrigatório.
 *
 * Formato do ficheiro (PitchReferenceFile):
 *   {
 *     "version": 1,
 *     "source": "vocals.wav",
 *     "generatedAt": "...",
 *     "notes": [{ "startMs": 35200, "endMs": 35750, "midi": 62, "confidence": 0.94 }]
 *   }
 *
 * Tudo aqui é PURO (sem React) → fácil de testar.
 */

/**
 * Normaliza um pitch-map bruto (objeto JS ou string JSON). Devolve null se
 * ausente/inválido — sinal para esconder o guia. Nunca lança.
 * @param {unknown} raw
 * @returns {null | { version:number, source?:string, notes: Array<{startMs:number,endMs:number,midi:number,confidence:number,phraseIndex?:number,lyricWordIndex?:number}> }}
 */
export function parsePitchReference(raw) {
  if (raw == null) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.notes)) return null;

  const notes = [];
  for (const n of obj.notes) {
    if (!n || !Number.isFinite(n.startMs) || !Number.isFinite(n.endMs) || !Number.isFinite(n.midi)) continue;
    if (n.endMs <= n.startMs) continue;
    notes.push({
      startMs: n.startMs,
      endMs: n.endMs,
      midi: n.midi,
      confidence: Number.isFinite(n.confidence) ? n.confidence : 1,
      ...(Number.isFinite(n.phraseIndex) ? { phraseIndex: n.phraseIndex } : {}),
      ...(Number.isFinite(n.lyricWordIndex) ? { lyricWordIndex: n.lyricWordIndex } : {}),
    });
  }
  if (notes.length === 0) return null;
  notes.sort((a, b) => a.startMs - b.startMs);

  return {
    version: Number.isFinite(obj.version) ? obj.version : 1,
    source: typeof obj.source === 'string' ? obj.source : undefined,
    notes,
  };
}

/**
 * Resolve a referência de pitch de uma música a partir das suas colunas.
 * Prefere o jsonb inline; devolve `{ notes }` ou `{ url }` para carregamento
 * assíncrono; ou null.
 * @param {{ pitch_map?: unknown, pitch_reference_url?: string|null }} song
 * @returns {null | { notes: Array } | { url: string }}
 */
export function resolveSongPitchReference(song) {
  const inline = parsePitchReference(song?.pitch_map);
  if (inline) return { notes: inline.notes };
  const url = song?.pitch_reference_url;
  if (typeof url === 'string' && url.trim()) return { url: url.trim() };
  return null;
}

/**
 * Nota esperada num dado instante (ms). Devolve a nota cujo intervalo contém t,
 * senão null (silêncio / intervalo instrumental).
 * Procura binária (notas ordenadas).
 * @param {Array} notes
 * @param {number} ms
 */
export function activeNoteAt(notes, ms) {
  if (!notes || notes.length === 0) return null;
  let lo = 0;
  let hi = notes.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const n = notes[mid];
    if (ms < n.startMs) hi = mid - 1;
    else if (ms >= n.endMs) lo = mid + 1;
    else return n;
  }
  return null;
}

/**
 * Notas visíveis numa janela [startMs, endMs] (para o timeline). Inclui notas
 * que apenas se sobrepõem parcialmente à janela.
 * @param {Array} notes
 * @param {number} startMs
 * @param {number} endMs
 */
export function visibleNotes(notes, startMs, endMs) {
  if (!notes || notes.length === 0) return [];
  const out = [];
  for (let i = 0; i < notes.length; i += 1) {
    const n = notes[i];
    if (n.endMs < startMs) continue;
    if (n.startMs > endMs) break;
    out.push(n);
  }
  return out;
}

/**
 * Amplitude MIDI [min, max] a mostrar, dado um conjunto de notas visíveis e uma
 * nota detetada opcional, respeitando a amplitude mínima e o padding (§24).
 * @param {Array} visible
 * @param {number|null} detectedMidi
 * @param {{ minRange:number, padding:number }} cfg
 */
export function verticalRange(visible, detectedMidi, cfg) {
  let min = Infinity;
  let max = -Infinity;
  for (const n of visible) {
    if (n.midi < min) min = n.midi;
    if (n.midi > max) max = n.midi;
  }
  if (Number.isFinite(detectedMidi)) {
    if (detectedMidi < min) min = detectedMidi;
    if (detectedMidi > max) max = detectedMidi;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    // Sem notas: centra numa amplitude neutra (voz média ≈ MIDI 60).
    min = 60 - cfg.minRange / 2;
    max = 60 + cfg.minRange / 2;
  }
  // Garante amplitude mínima.
  const center = (min + max) / 2;
  let half = Math.max((max - min) / 2, cfg.minRange / 2);
  half += cfg.padding;
  return [center - half, center + half];
}
