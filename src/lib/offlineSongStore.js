const DB_NAME = 'musica-da-segunda-offline';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';
const LAST_SONG_KEY = 'last-song';

function isBrowser() {
  return typeof window !== 'undefined';
}

function openDatabase() {
  if (!isBrowser() || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLastSongSnapshot(snapshot) {
  if (!snapshot?.title) return;

  const normalized = {
    title: snapshot.title,
    artist: snapshot.artist || 'A Música da Segunda',
    slug: snapshot.slug || null,
    thumbnail: snapshot.thumbnail || null,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem('last-song-cache', JSON.stringify(normalized));
  } catch {
    // Ignore localStorage failures.
  }

  try {
    const db = await openDatabase();
    if (!db) return;

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(normalized, LAST_SONG_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  } catch {
    // Ignore IndexedDB failures and keep localStorage fallback.
  }
}
