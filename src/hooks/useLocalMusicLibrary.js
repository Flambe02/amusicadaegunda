import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as db from '@/lib/localMediaDb';
import { saveAudioHandle, deleteAudioHandle } from '@/lib/audioHandleStore';
import { setSessionAudioFile, deleteSessionAudioFile } from '@/lib/localAudioSessionCache';
import {
  isAudioFileName, fileExtension, computeDuration, computeHash, fileFromHandle,
  queryHandlePermission, requestHandlePermission, supportsFileSystemAccess, supportsFilePicker,
} from '@/lib/localAudioMetadata';

// Recursively enumerate audio files under a directory handle.
async function* walkDirectory(dirHandle, prefix = '') {
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file') {
      if (isAudioFileName(name)) yield { handle, name, relativePath: prefix ? `${prefix}/${name}` : name };
    } else if (handle.kind === 'directory') {
      yield* walkDirectory(handle, prefix ? `${prefix}/${name}` : name);
    }
  }
}

/**
 * useLocalMusicLibrary — état + actions de la bibliothèque locale (IndexedDB).
 * Aucun octet audio n'est envoyé au réseau.
 */
export function useLocalMusicLibrary() {
  const [root, setRootState] = useState(null);
  const [permission, setPermission] = useState('unknown'); // 'granted'|'prompt'|'denied'|'unknown'|'unsupported'
  const [files, setFiles] = useState([]);
  const [associations, setAssociations] = useState({}); // songId -> assoc
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const cancelRef = useRef(false);
  // Fallback (no File System Access): keep the session's File objects in memory,
  // keyed by relativePath|size|lastModified, and re-attach them after each refresh
  // (IndexedDB records intentionally never store the bytes/handle in this mode).
  const fallbackFilesRef = useRef(new Map());

  const browserSupport = supportsFileSystemAccess ? 'full' : (typeof window !== 'undefined' && 'FileReader' in window ? 'fallback' : 'none');

  const refresh = useCallback(async () => {
    try {
      const [r, f, a] = await Promise.all([db.getRoot(), db.getAllFiles(), db.getAllAssociations()]);
      setRootState(r || null);
      const fbMap = fallbackFilesRef.current;
      const withFiles = fbMap.size
        ? (f || []).map((rec) => {
            const file = fbMap.get(`${rec.relativePath}|${rec.sizeBytes}|${rec.lastModified}`);
            return file ? { ...rec, _file: file } : rec;
          })
        : (f || []);
      setFiles(withFiles);
      setAssociations(Object.fromEntries((a || []).map((x) => [x.songId, x])));
      if (r?.handle) {
        setPermission(await queryHandlePermission(r.handle, 'read'));
      } else {
        setPermission(supportsFileSystemAccess ? 'unknown' : 'unsupported');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); return db.onLocalMediaChange(refresh); }, [refresh]);

  // Enumerate + persist files from a directory handle.
  const scanHandle = useCallback(async (dirHandle) => {
    cancelRef.current = false;
    setScanning(true);
    setScanProgress(0);
    try {
      const collected = [];
      for await (const entry of walkDirectory(dirHandle)) {
        if (cancelRef.current) break;
        let size = 0, lastModified = 0, mime = '';
        try {
          const file = await entry.handle.getFile();
          size = file.size; lastModified = file.lastModified; mime = file.type;
        } catch { /* skip unreadable */ }
        collected.push({
          rootId: db.ROOT_ID,
          fileName: entry.name,
          relativePath: entry.relativePath,
          mimeType: mime || `audio/${fileExtension(entry.name)}`,
          sizeBytes: size,
          durationSeconds: null,
          lastModified,
          fileHash: null,
          lastScannedAt: Date.now(),
          handle: entry.handle,
        });
        setScanProgress(collected.length);
      }
      if (!cancelRef.current) {
        await db.replaceFiles(collected);
        await db.updateRoot({ lastPermissionCheckAt: Date.now() });
      }
      return collected.length;
    } finally {
      setScanning(false);
    }
  }, []);

  const connectFolder = useCallback(async () => {
    if (!supportsFileSystemAccess) throw new Error('unsupported');
    const dirHandle = await window.showDirectoryPicker({ id: 'amds-music', mode: 'read' });
    const perm = await requestHandlePermission(dirHandle, 'read');
    await db.setRoot({ name: dirHandle.name, handle: dirHandle, lastPermissionCheckAt: Date.now() });
    setPermission(perm);
    await scanHandle(dirHandle);
    await refresh();
  }, [scanHandle, refresh]);

  const reconnect = useCallback(async () => {
    const r = await db.getRoot();
    if (!r?.handle) throw new Error('no-root');
    const perm = await requestHandlePermission(r.handle, 'read');
    setPermission(perm);
    if (perm === 'granted') { await scanHandle(r.handle); await refresh(); }
    return perm;
  }, [scanHandle, refresh]);

  const rescan = useCallback(async () => {
    const r = await db.getRoot();
    if (!r?.handle) throw new Error('no-root');
    const perm = await queryHandlePermission(r.handle, 'read');
    if (perm !== 'granted') { const g = await requestHandlePermission(r.handle, 'read'); setPermission(g); if (g !== 'granted') return; }
    await scanHandle(r.handle);
    await refresh();
  }, [scanHandle, refresh]);

  const cancelScan = useCallback(() => { cancelRef.current = true; }, []);

  // Fallback: <input webkitdirectory> gives File objects (no persistent handle).
  const importFallbackFiles = useCallback(async (fileList) => {
    const arr = Array.from(fileList).filter((f) => isAudioFileName(f.name));
    const fbMap = fallbackFilesRef.current;
    fbMap.clear();
    const collected = arr.map((file) => {
      const relativePath = file.webkitRelativePath || file.name;
      const rec = {
        rootId: db.ROOT_ID,
        fileName: file.name,
        relativePath,
        mimeType: file.type || `audio/${fileExtension(file.name)}`,
        sizeBytes: file.size,
        durationSeconds: null,
        lastModified: file.lastModified,
        fileHash: null,
        lastScannedAt: Date.now(),
        handle: null,
      };
      // Retain the actual File in memory for this session so association works.
      fbMap.set(`${rec.relativePath}|${rec.sizeBytes}|${rec.lastModified}`, file);
      return rec;
    });
    await db.setRoot({ name: 'Seleção manual', handle: null, fallback: true, lastPermissionCheckAt: Date.now() });
    await db.replaceFiles(collected); // triggers refresh() which re-attaches _file
    setPermission('unsupported');
    await refresh();
  }, [refresh]);

  // Resolve a File object for a stored localFile record (from handle, or in-memory fallback).
  const resolveFile = useCallback(async (localFile, { request = false } = {}) => {
    if (localFile?._file) return localFile._file;
    if (localFile?.handle) return fileFromHandle(localFile.handle, { request });
    return null;
  }, []);

  // Associate a local file with a song. Persists metadata + mirrors the handle to
  // the karaoke editor's per-song handle store so sync reuses it automatically.
  const associate = useCallback(async (songId, localFile) => {
    const file = await resolveFile(localFile, { request: true });
    if (!file) throw new Error('file-unavailable');
    // Make the file instantly reusable by the sync editor this session (works even
    // in manual mode, where there is no persistent handle to hand off).
    setSessionAudioFile(songId, file);
    const [duration, hash] = await Promise.all([
      localFile.durationSeconds ? Promise.resolve(localFile.durationSeconds) : computeDuration(file),
      localFile.fileHash ? Promise.resolve(localFile.fileHash) : computeHash(file),
    ]);
    if (localFile.id != null) await db.updateFile(localFile.id, { durationSeconds: duration, fileHash: hash });
    const assoc = await db.putAssociation({
      songId,
      localFileId: localFile.id ?? null,
      fileHash: hash,
      fileName: localFile.fileName,
      mimeType: localFile.mimeType,
      sizeBytes: localFile.sizeBytes,
      durationSeconds: duration,
      relativePath: localFile.relativePath,
      handle: localFile.handle || null,
    });
    // Integration: the karaoke editor loads audio by song.id from this store.
    if (localFile.handle) { try { await saveAudioHandle(songId, localFile.handle); } catch { /* noop */ } }
    return assoc;
  }, [resolveFile]);

  const removeAssociation = useCallback(async (songId) => {
    await db.deleteAssociation(songId);
    deleteSessionAudioFile(songId);
    try { await deleteAudioHandle(songId); } catch { /* noop */ }
  }, []);

  const clearLibrary = useCallback(async () => {
    await db.clearFiles();
    await db.deleteRoot();
    setFiles([]);
    setPermission(supportsFileSystemAccess ? 'unknown' : 'unsupported');
  }, []);

  const clearAllAssociations = useCallback(async () => {
    const all = await db.getAllAssociations();
    await db.clearAssociations();
    for (const a of all) { try { await deleteAudioHandle(a.songId); } catch { /* noop */ } }
  }, []);

  const stats = useMemo(() => ({
    filesCount: files.length,
    associationsCount: Object.keys(associations).length,
    lastScan: files.reduce((m, f) => Math.max(m, f.lastScannedAt || 0), 0) || null,
  }), [files, associations]);

  return {
    root, permission, files, associations, loading, scanning, scanProgress, browserSupport, stats,
    supportsFileSystemAccess, supportsFilePicker,
    refresh, connectFolder, reconnect, rescan, cancelScan, importFallbackFiles,
    resolveFile, associate, removeAssociation, clearLibrary, clearAllAssociations,
  };
}
