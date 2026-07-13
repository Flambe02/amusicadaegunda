/**
 * audioHandleStore — mémorise LOCALEMENT (IndexedDB, sur cet appareil) le *handle* du
 * fichier audio choisi, par chanson, pour éviter de re-naviguer le sélecteur à chaque
 * session. Un FileSystemFileHandle est structured-cloneable → stockable tel quel.
 *
 * IMPORTANT — confidentialité : on ne stocke JAMAIS les octets audio, seulement une
 * référence locale. Rien n'est envoyé à Supabase ni au réseau. Le navigateur peut
 * demander une permission (« Reabrir áudio ») après un redémarrage — c'est voulu.
 *
 * Ne fonctionne qu'avec l'API File System Access (Chromium desktop). Ailleurs, les
 * fonctions échouent silencieusement (Promise rejetée) et l'appelant retombe sur
 * l'ancien <input type=file> sans persistance.
 */
const DB_NAME = 'karaoke-audio';
const STORE = 'handles';
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioHandle(key, handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, String(key));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getAudioHandle(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const rq = tx.objectStore(STORE).get(String(key));
    rq.onsuccess = () => { db.close(); resolve(rq.result || null); };
    rq.onerror = () => { db.close(); reject(rq.error); };
  });
}

export async function deleteAudioHandle(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(String(key));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
