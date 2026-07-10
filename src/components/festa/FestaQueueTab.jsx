import { useEffect, useRef, useState } from 'react';
import { X, Mic2 } from 'lucide-react';

const APPLAUSE_WINDOW_MS = 20000; // fenêtre de vote après la fin d'une chanson

/**
 * Étape 3 (fila) + étape 4 (aplaudir/tomate) de /festa. Pas de timestamp de fin
 * en base : la fenêtre de vote après la fin d'une chanson est suivie côté client
 * (première fois qu'une entrée est vue "done" → 20s pendant lesquelles les
 * boutons restent visibles), suffisant pour ce cas d'usage familial.
 */
export default function FestaQueueTab({ songsById, queue, myEntryIds, guestName, onRemove, onApplaud, onTomato }) {
  const doneSeenAtRef = useRef({});
  const [, setTick] = useState(0);

  useEffect(() => {
    let changed = false;
    queue.forEach((q) => {
      if (q.status === 'done' && !(q.id in doneSeenAtRef.current)) {
        doneSeenAtRef.current[q.id] = Date.now();
        changed = true;
      }
    });
    if (changed) setTick((n) => n + 1);
  }, [queue]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const visible = queue.filter((q) => q.status !== 'skipped');

  if (visible.length === 0) {
    return <p className="festa-empty">A fila está vazia — adiciona uma música na aba Catálogo.</p>;
  }

  const now = Date.now();
  const canVoteFor = (entry) => {
    if (entry.status === 'playing') return true;
    if (entry.status === 'done') {
      const seenAt = doneSeenAtRef.current[entry.id];
      return seenAt != null && now - seenAt < APPLAUSE_WINDOW_MS;
    }
    return false;
  };

  return (
    <ul className="festa-queue-list">
      {visible.map((entry) => {
        const song = songsById.get(entry.song_id);
        const isMine = myEntryIds.has(entry.id);
        const canRemove = isMine && entry.status === 'waiting';
        const isSelf = guestName && entry.singer_name === guestName;
        const votable = canVoteFor(entry) && !isSelf;
        return (
          <li key={entry.id} className={`festa-queue-item status-${entry.status}`}>
            <div className="festa-queue-item-main">
              {entry.status === 'playing' && <Mic2 size={16} className="festa-queue-playing-icon" />}
              <div className="festa-queue-item-text">
                <p className="festa-queue-song">{song?.title || 'Música'}</p>
                <p className="festa-queue-singer">{entry.singer_name}</p>
              </div>
              {canRemove && (
                <button type="button" className="festa-queue-remove" aria-label="Remover da fila" onClick={() => onRemove(entry.id)}>
                  <X size={16} />
                </button>
              )}
            </div>

            {votable && (
              <div className="festa-vote-row">
                <button type="button" className="festa-vote-btn festa-vote-applause" onClick={() => onApplaud(entry.id)}>
                  👏 Aplaudir{entry.applause_score > 0 ? ` (${entry.applause_score})` : ''}
                </button>
                <button type="button" className="festa-vote-btn festa-vote-tomato" onClick={() => onTomato(entry.id)}>
                  🍅 Tomate{entry.tomato_score > 0 ? ` (${entry.tomato_score})` : ''}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
