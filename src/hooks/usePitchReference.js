import { useEffect, useState } from 'react';
import { parsePitchReference, resolveSongPitchReference } from '@/lib/pitchReference';

/**
 * Carrega a melodia de referência (pitch-map) de uma música, se existir (§11).
 *
 * Prefere o jsonb inline (`songs.pitch_map`, sem rede) ; senão faz fetch do
 * `songs.pitch_reference_url`. Falha silenciosa → `notes = null` (guia
 * indisponível, karaokê normal continua a funcionar).
 *
 * @param {object} song
 * @returns {{ notes: Array|null, loading: boolean, available: boolean }}
 */
export function usePitchReference(song) {
  const [state, setState] = useState({ notes: null, loading: false });

  const inlineRaw = song?.pitch_map;
  const url = song?.pitch_reference_url;

  useEffect(() => {
    const resolved = resolveSongPitchReference({ pitch_map: inlineRaw, pitch_reference_url: url });
    if (!resolved) { setState({ notes: null, loading: false }); return undefined; }
    if (resolved.notes) { setState({ notes: resolved.notes, loading: false }); return undefined; }

    // Carregamento remoto.
    let cancelled = false;
    setState({ notes: null, loading: true });
    fetch(resolved.url, { cache: 'force-cache' })
      .then((r) => { if (!r.ok) throw new Error(`pitch-map ${r.status}`); return r.json(); })
      .then((json) => {
        if (cancelled) return;
        const parsed = parsePitchReference(json);
        setState({ notes: parsed?.notes ?? null, loading: false });
      })
      .catch(() => { if (!cancelled) setState({ notes: null, loading: false }); });
    return () => { cancelled = true; };
  }, [inlineRaw, url]);

  return { notes: state.notes, loading: state.loading, available: Array.isArray(state.notes) && state.notes.length > 0 };
}
