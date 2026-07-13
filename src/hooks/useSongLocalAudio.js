import { useCallback, useEffect, useState } from 'react';
import { getAssociation, onLocalMediaChange } from '@/lib/localMediaDb';
import { queryHandlePermission } from '@/lib/localAudioMetadata';

/**
 * useSongLocalAudio — état de l'association audio LOCAL d'une chanson, pour le drawer.
 * Ne charge aucun octet ; lit seulement les métadonnées IndexedDB + la permission du handle.
 *
 * states:
 *   'none'      — não associado
 *   'ready'     — disponível neste dispositivo (permission granted)
 *   'permission'— arquivo associado, permissão necessária
 *   'missing'   — arquivo conhecido, não localizado (association sans handle résoluble)
 */
export function useSongLocalAudio(songId) {
  const [assoc, setAssoc] = useState(null);
  const [state, setState] = useState('none');
  const [loading, setLoading] = useState(true);

  const read = useCallback(async () => {
    if (!songId) { setAssoc(null); setState('none'); setLoading(false); return; }
    setLoading(true);
    try {
      const a = await getAssociation(songId);
      if (!a) { setAssoc(null); setState('none'); return; }
      setAssoc(a);
      if (a.handle) {
        const perm = await queryHandlePermission(a.handle, 'read');
        setState(perm === 'granted' ? 'ready' : 'permission');
      } else {
        // Fallback (no persistent handle) — known but not resolvable across reloads.
        setState('missing');
      }
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => { read(); return onLocalMediaChange(read); }, [read]);

  return { assoc, state, loading, refresh: read };
}
