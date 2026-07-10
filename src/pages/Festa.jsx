import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Song } from '@/api/entities';
import { useSEO } from '@/hooks/useSEO';
import { hasLrcContent } from '@/lib/lrc';
import { useFestaSession } from '@/hooks/useFestaSession';
import {
  getFestaSessionByCode, addToFestaQueue, skipFestaQueueEntry, incrementApplause, incrementTomato,
} from '@/lib/festa';
import FestaJoinForm from '@/components/festa/FestaJoinForm';
import FestaCatalogTab from '@/components/festa/FestaCatalogTab';
import FestaQueueTab from '@/components/festa/FestaQueueTab';
import '@/styles/festa.css';

const GUEST_NAME_KEY = 'festa_guest_name';
const MY_ENTRIES_KEY = 'festa_my_entries';

function loadGuestName() {
  try { return localStorage.getItem(GUEST_NAME_KEY) || ''; } catch { return ''; }
}
function saveGuestName(name) {
  try { localStorage.setItem(GUEST_NAME_KEY, name); } catch { /* stockage indisponible (navigation privée) — pas bloquant */ }
}
function loadMyEntries(sessionId) {
  try {
    const all = JSON.parse(localStorage.getItem(MY_ENTRIES_KEY) || '{}');
    return new Set(all[sessionId] || []);
  } catch { return new Set(); }
}
function rememberMyEntry(sessionId, entryId) {
  try {
    const all = JSON.parse(localStorage.getItem(MY_ENTRIES_KEY) || '{}');
    const list = new Set(all[sessionId] || []);
    list.add(entryId);
    all[sessionId] = Array.from(list).slice(-50);
    localStorage.setItem(MY_ENTRIES_KEY, JSON.stringify(all));
  } catch { /* pas bloquant */ }
}

/**
 * /festa — télécommande téléphone du Modo Festa. Publique, sans compte,
 * accessible seulement via un code/QR partagé en direct par la TV (noindex).
 */
export default function Festa() {
  useSEO({
    title: 'Festa — A Música da Segunda',
    description: 'Entre na festa, escolha músicas para a fila do karaokê e aplauda ao vivo.',
    robots: 'noindex, nofollow',
    url: '/festa',
  });

  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(null); // { id, code }
  const [guestName, setGuestName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState('catalogo');
  const [songs, setSongs] = useState([]);
  const [addingSongId, setAddingSongId] = useState(null);
  const [myEntryIds, setMyEntryIds] = useState(new Set());

  const { queue, connectionState } = useFestaSession(session?.id || null, { guestName });

  useEffect(() => {
    Song.list('-release_date').then((all) => setSongs(all || [])).catch(() => setSongs([]));
  }, []);

  const handleJoin = useCallback(async (code, name) => {
    setJoining(true);
    setJoinError('');
    try {
      const found = await getFestaSessionByCode(code);
      if (!found) {
        setJoinError('Sessão não encontrada ou encerrada. Confira o código na TV.');
        return;
      }
      saveGuestName(name);
      setGuestName(name);
      setSession(found);
      setMyEntryIds(loadMyEntries(found.id));
    } catch {
      setJoinError('Não foi possível conectar agora. Tenta novamente em instantes.');
    } finally {
      setJoining(false);
    }
  }, []);

  const karaokeSongs = useMemo(
    () => songs.filter((s) => hasLrcContent(s.lrc_content) && (s.youtube_url || s.youtube_music_url)),
    [songs],
  );
  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);
  const queuedSongIds = useMemo(
    () => new Set(queue.filter((q) => q.status === 'waiting' || q.status === 'playing').map((q) => q.song_id)),
    [queue],
  );

  const handleAdd = useCallback(async (song) => {
    if (!session) return;
    setAddingSongId(song.id);
    try {
      const entry = await addToFestaQueue(session.id, song.id, guestName);
      rememberMyEntry(session.id, entry.id);
      setMyEntryIds((prev) => new Set(prev).add(entry.id));
    } catch { /* dégradation silencieuse — la personne peut retenter */ } finally {
      setAddingSongId(null);
    }
  }, [session, guestName]);

  const handleRemove = useCallback((entryId) => { skipFestaQueueEntry(entryId).catch(() => {}); }, []);
  const handleApplaud = useCallback((entryId) => { incrementApplause(entryId).catch(() => {}); }, []);
  const handleTomato = useCallback((entryId) => { incrementTomato(entryId).catch(() => {}); }, []);

  if (!session) {
    return (
      <div className="festa-page festa-page-join">
        <FestaJoinForm
          defaultCode={searchParams.get('c') || ''}
          defaultName={loadGuestName()}
          onJoin={handleJoin}
          error={joinError}
          joining={joining}
        />
      </div>
    );
  }

  return (
    <div className="festa-page">
      <header className="festa-header">
        <div>
          <p className="festa-header-eyebrow">Festa</p>
          <p className="festa-header-code">{session.code} · {guestName}</p>
        </div>
        {connectionState === 'reconnecting' && <span className="festa-reconnecting">Reconectando…</span>}
      </header>

      <nav className="festa-tabs">
        <button type="button" className={tab === 'catalogo' ? 'is-active' : ''} onClick={() => setTab('catalogo')}>Catálogo</button>
        <button type="button" className={tab === 'fila' ? 'is-active' : ''} onClick={() => setTab('fila')}>
          Fila{queue.filter((q) => q.status !== 'skipped').length > 0 ? ` (${queue.filter((q) => q.status !== 'skipped').length})` : ''}
        </button>
      </nav>

      <main className="festa-main">
        {tab === 'catalogo' ? (
          <FestaCatalogTab songs={karaokeSongs} queuedSongIds={queuedSongIds} onAdd={handleAdd} adding={addingSongId} />
        ) : (
          <FestaQueueTab
            songsById={songsById}
            queue={queue}
            myEntryIds={myEntryIds}
            guestName={guestName}
            onRemove={handleRemove}
            onApplaud={handleApplaud}
            onTomato={handleTomato}
          />
        )}
      </main>
    </div>
  );
}
