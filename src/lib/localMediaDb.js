/**
 * localMediaDb — métadonnées LOCALES (IndexedDB, sur cet appareil) de la bibliothèque
 * de masters audio de l'administrateur. Rien n'est envoyé au réseau ni à Supabase.
 *
 * CONFIDENTIALITÉ : on ne stocke JAMAIS les octets audio ni de chemin absolu. On garde
 * seulement des *handles* File System Access (structured-cloneable) et des métadonnées
 * de navigateur (nom, taille, durée, hash). Voir aussi `src/lib/audioHandleStore.js`,
 * qui reste la source du handle chargé par l'éditeur de karaoké (clé = song.id).
 *
 * Stores :
 *   libraryRoots     — le(s) dossier(s) racine connecté(s)  { id, name, handle, createdAt, lastPermissionCheckAt }
 *   localFiles       — fichiers audio indexés               { id, rootId, fileName, relativePath, mimeType, sizeBytes, durationSeconds, lastModified, fileHash, lastScannedAt, handle }
 *   songAssociations — association chanson ↔ fichier local   { songId, localFileId, fileHash, fileName, mimeType, sizeBytes, durationSeconds, relativePath, handle, linkedAt, lastResolvedAt }
 */
const DB_NAME = 'amds-local-media';
const VERSION = 1;
const ROOTS = 'libraryRoots';
const FILES = 'localFiles';
const ASSOC = 'songAssociations';

export const ROOT_ID = 'root'; // une seule pasta de músicas gérée pour l'instant

// Lightweight change notifications so the drawer / library / settings stay in
// sync without a global store. Fired after any mutation below.
const listeners = new Set();
export function onLocalMediaChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emitChange() { listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } }); }

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROOTS)) db.createObjectStore(ROOTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(FILES)) {
        const s = db.createObjectStore(FILES, { keyPath: 'id', autoIncrement: true });
        s.createIndex('rootId', 'rootId', { unique: false });
        s.createIndex('fileHash', 'fileHash', { unique: false });
      }
      if (!db.objectStoreNames.contains(ASSOC)) db.createObjectStore(ASSOC, { keyPath: 'songId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, run) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let result;
    Promise.resolve(run(os)).then((r) => { result = r; }).catch(reject);
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
  });
}

const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// ── Roots ──
export async function getRoot() {
  const db = await openDb();
  return tx(db, ROOTS, 'readonly', (os) => reqP(os.get(ROOT_ID)));
}
export async function setRoot(root) {
  const db = await openDb();
  const r = await tx(db, ROOTS, 'readwrite', (os) => os.put({ id: ROOT_ID, createdAt: Date.now(), ...root }));
  emitChange();
  return r;
}
export async function updateRoot(patch) {
  const db = await openDb();
  return tx(db, ROOTS, 'readwrite', async (os) => {
    const cur = await reqP(os.get(ROOT_ID));
    if (cur) os.put({ ...cur, ...patch });
  });
}
export async function deleteRoot() {
  const db = await openDb();
  const r = await tx(db, ROOTS, 'readwrite', (os) => os.delete(ROOT_ID));
  emitChange();
  return r;
}

// ── Files ──
export async function replaceFiles(files) {
  const db = await openDb();
  const r = await tx(db, FILES, 'readwrite', (os) => {
    os.clear();
    for (const f of files) os.add(f);
  });
  emitChange();
  return r;
}
export async function getAllFiles() {
  const db = await openDb();
  return tx(db, FILES, 'readonly', (os) => reqP(os.getAll()));
}
export async function updateFile(id, patch) {
  const db = await openDb();
  return tx(db, FILES, 'readwrite', async (os) => {
    const cur = await reqP(os.get(id));
    if (cur) os.put({ ...cur, ...patch });
  });
}
export async function clearFiles() {
  const db = await openDb();
  const r = await tx(db, FILES, 'readwrite', (os) => os.clear());
  emitChange();
  return r;
}

// ── Associations ──
export async function getAssociation(songId) {
  const db = await openDb();
  return tx(db, ASSOC, 'readonly', (os) => reqP(os.get(String(songId))));
}
export async function getAllAssociations() {
  const db = await openDb();
  return tx(db, ASSOC, 'readonly', (os) => reqP(os.getAll()));
}
export async function putAssociation(assoc) {
  const db = await openDb();
  const record = { linkedAt: Date.now(), ...assoc, songId: String(assoc.songId), lastResolvedAt: Date.now() };
  await tx(db, ASSOC, 'readwrite', (os) => os.put(record));
  emitChange();
  return record;
}
export async function deleteAssociation(songId) {
  const db = await openDb();
  const r = await tx(db, ASSOC, 'readwrite', (os) => os.delete(String(songId)));
  emitChange();
  return r;
}
export async function clearAssociations() {
  const db = await openDb();
  const r = await tx(db, ASSOC, 'readwrite', (os) => os.clear());
  emitChange();
  return r;
}

// ── Storage usage estimate (best-effort) ──
export async function estimateLocalUsage() {
  try {
    if (navigator?.storage?.estimate) {
      const { usage } = await navigator.storage.estimate();
      return usage ?? null;
    }
  } catch { /* ignore */ }
  return null;
}
