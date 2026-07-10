import { useEffect, useRef, useState } from 'react';
import { listFestaQueue, subscribeFestaSession } from '@/lib/festa';

/**
 * État + Realtime partagés d'une session Modo Festa — utilisé côté TV (juste
 * observateur, pas de `guestName`) et côté téléphone (`guestName` → présence
 * trackée, apparaît dans la liste des invités connectés côté TV).
 *
 * `connectionState` : 'idle' (pas de session) | 'connecting' | 'connected' |
 * 'reconnecting' — pour dégrader proprement l'UI en cas de coupure réseau
 * plutôt que de planter ou d'afficher un écran blanc.
 */
export function useFestaSession(sessionId, { guestName = null } = {}) {
  const [queue, setQueue] = useState([]);
  const [presentNames, setPresentNames] = useState([]);
  const [connectionState, setConnectionState] = useState('idle');
  const queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(() => {
    if (!sessionId) {
      setQueue([]);
      setPresentNames([]);
      setConnectionState('idle');
      return undefined;
    }

    let cancelled = false;
    setConnectionState('connecting');

    listFestaQueue(sessionId)
      .then((rows) => { if (!cancelled) setQueue(rows); })
      .catch(() => { /* la souscription realtime ci-dessous complètera l'état */ });

    const applyChange = (payload) => {
      setQueue((current) => {
        if (payload.eventType === 'INSERT') {
          if (current.some((r) => r.id === payload.new.id)) return current;
          return [...current, payload.new];
        }
        if (payload.eventType === 'UPDATE') {
          return current.map((r) => (r.id === payload.new.id ? payload.new : r));
        }
        if (payload.eventType === 'DELETE') {
          return current.filter((r) => r.id !== payload.old.id);
        }
        return current;
      });
    };

    const unsubscribe = subscribeFestaSession(sessionId, {
      guestName,
      onQueueChange: applyChange,
      onPresenceSync: (state) => {
        const names = Object.values(state)
          .flat()
          .map((entry) => entry?.name)
          .filter(Boolean);
        setPresentNames(names);
      },
      onStatusChange: (status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') setConnectionState('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionState('reconnecting');
        else if (status === 'CLOSED') setConnectionState('reconnecting');
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sessionId, guestName]);

  return { queue, presentNames, connectionState };
}
