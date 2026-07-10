import { useCallback, useEffect, useRef, useState } from 'react';
import { listFestaQueue, subscribeFestaSession } from '@/lib/festa';
import { gradeFor, SING_THRESHOLD, LOUDNESS_TARGET } from '@/lib/energyGrade';

/**
 * État + Realtime partagés d'une session Modo Festa — utilisé côté TV (juste
 * observateur, pas de `guestName`) et côté téléphone (`guestName` → présence
 * trackée, apparaît dans la liste des invités connectés côté TV).
 *
 * `connectionState` : 'idle' (pas de session) | 'connecting' | 'connected' |
 * 'reconnecting' — pour dégrader proprement l'UI en cas de coupure réseau
 * plutôt que de planter ou d'afficher un écran blanc.
 *
 * Énergie à distance (téléphone → TV, la TV n'a pas de micro) : `liveEnergyByEntry`
 * (dernière lecture RMS 0..1 par `queueId`, pour une jauge live) et
 * `getEnergyGrade(queueId)` (note finale, même formule que le medidor de energia
 * local de KaraokePlayer — coverage/loudness accumulés sur TOUTE la durée reçue,
 * faute de connaître le timing des lignes de letra côté téléphone).
 */
export function useFestaSession(sessionId, { guestName = null } = {}) {
  const [queue, setQueue] = useState([]);
  const [presentNames, setPresentNames] = useState([]);
  const [connectionState, setConnectionState] = useState('idle');
  const [liveEnergyByEntry, setLiveEnergyByEntry] = useState({});
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const channelRef = useRef(null);
  const energyStatsRef = useRef({}); // queueId -> { sum, sungCount, count }

  useEffect(() => {
    if (!sessionId) {
      setQueue([]);
      setPresentNames([]);
      setConnectionState('idle');
      setLiveEnergyByEntry({});
      energyStatsRef.current = {};
      channelRef.current = null;
      return undefined;
    }

    let cancelled = false;
    setConnectionState('connecting');
    energyStatsRef.current = {};
    setLiveEnergyByEntry({});

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

    const { channel, unsubscribe } = subscribeFestaSession(sessionId, {
      guestName,
      onQueueChange: applyChange,
      onPresenceSync: (state) => {
        const names = Object.values(state)
          .flat()
          .map((entry) => entry?.name)
          .filter(Boolean);
        setPresentNames(names);
      },
      onEnergy: ({ queueId, rms }) => {
        if (!queueId || typeof rms !== 'number') return;
        const st = energyStatsRef.current[queueId] || { sum: 0, sungCount: 0, count: 0 };
        st.sum += rms;
        st.count += 1;
        if (rms > SING_THRESHOLD) st.sungCount += 1;
        energyStatsRef.current[queueId] = st;
        setLiveEnergyByEntry((prev) => ({ ...prev, [queueId]: rms }));
      },
      onStatusChange: (status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') setConnectionState('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionState('reconnecting');
        else if (status === 'CLOSED') setConnectionState('reconnecting');
      },
    });
    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      unsubscribe();
    };
  }, [sessionId, guestName]);

  const sendEnergyReading = useCallback((queueId, rms) => {
    channelRef.current?.send({ type: 'broadcast', event: 'energy', payload: { queueId, rms } });
  }, []);

  // Même formule que le medidor de energia local (70% coverage + 30% loudness) —
  // seule différence : ici "coverage" porte sur TOUTE la durée des lectures reçues
  // (le téléphone ne connaît pas le timing des lignes de letra, contrairement au
  // lecteur karaoké lui-même), donc légèrement moins précis mais du même ordre.
  const getEnergyGrade = useCallback((queueId) => {
    const st = energyStatsRef.current[queueId];
    if (!st || st.count < 5) return null;
    const coverage = st.sungCount / st.count;
    const loudness = Math.min(1, (st.sum / st.count) / LOUDNESS_TARGET);
    const score = Math.round(Math.min(100, (0.7 * coverage + 0.3 * loudness) * 100));
    return { score, ...gradeFor(score) };
  }, []);

  return { queue, presentNames, connectionState, liveEnergyByEntry, sendEnergyReading, getEnergyGrade };
}
