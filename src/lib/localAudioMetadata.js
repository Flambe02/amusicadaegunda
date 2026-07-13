/**
 * localAudioMetadata — lecture LOCALE de métadonnées audio (aucun upload).
 * Durée et hash sont calculés à la demande (coûteux) ; le scan de base reste léger.
 */

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'];

export function fileExtension(name = '') {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function isAudioFileName(name = '') {
  return AUDIO_EXTENSIONS.includes(fileExtension(name));
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// FileSystemHandle permission helpers (no-op-safe on unsupported browsers).
export async function queryHandlePermission(handle, mode = 'read') {
  if (!handle?.queryPermission) return 'granted'; // File fallback, no handle → treat as usable
  try { return await handle.queryPermission({ mode }); } catch { return 'prompt'; }
}
export async function requestHandlePermission(handle, mode = 'read') {
  if (!handle?.requestPermission) return 'granted';
  try { return await handle.requestPermission({ mode }); } catch { return 'denied'; }
}

// Get a File from a handle, requesting permission if needed.
export async function fileFromHandle(handle, { request = false } = {}) {
  if (!handle) return null;
  let perm = await queryHandlePermission(handle, 'read');
  if (perm !== 'granted' && request) perm = await requestHandlePermission(handle, 'read');
  if (perm !== 'granted') { const e = new Error('permission-required'); e.code = 'permission'; throw e; }
  return handle.getFile();
}

// Decode duration in seconds (best-effort). Returns null if it cannot decode.
export async function computeDuration(file) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const buf = await file.arrayBuffer();
    const ctx = new AC();
    try {
      const decoded = await ctx.decodeAudioData(buf.slice(0));
      return decoded.duration;
    } finally {
      try { await ctx.close(); } catch { /* noop */ }
    }
  } catch {
    return null;
  }
}

// SHA-256 hex of the file bytes (for exact-restore matching). Local only.
export async function computeHash(file) {
  try {
    if (!crypto?.subtle) return null;
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export const supportsFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
export const supportsFilePicker = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
