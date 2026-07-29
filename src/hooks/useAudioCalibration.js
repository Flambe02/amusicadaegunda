import { useCallback, useMemo, useState } from 'react';
import {
  CALIBRATION_VERSION, fileIdentity, makeCalibration, parseCalibrationRecord,
  calibrationStatus, canCaptureWords, activeOffsetSeconds,
} from '@/lib/audioClock';

/**
 * useAudioCalibration — persistance LOCALE de la calibration audio local ↔ horloge
 * canonique, par chanson, par piste (« completo » / « voz ») et PAR FICHIER.
 *
 * Ce n'est PAS de la donnée karaokê : rien ne part en base, rien n'entre dans
 * `timing_data`. C'est de l'état d'édition propre à cet appareil, comme le brouillon de
 * `useTimingDraft`. Les timings enregistrés restent canoniques et n'en dépendent jamais.
 *
 * Le stockage garde un enregistrement PAR IDENTITÉ DE FICHIER : changer de MP3 ne
 * réutilise donc jamais l'ancienne calibration (l'ancien enregistrement reste disponible
 * si l'utilisateur revient au fichier d'origine), et « pas encore calibré » ne peut plus
 * être confondu avec « calibré à zéro ».
 *
 * @param {string|number} songId
 * @param {'full'|'vocals'} track
 * @param {{ fileName?: string|null, fileSize?: number|null, lastModified?: number|null }} fileMeta
 */
const MAX_RECORDS_PER_TRACK = 5;

export function useAudioCalibration(songId, track, fileMeta) {
  const key = `karaoke-audio-cal-${songId}-${track}`;
  const [store, setStore] = useState(() => readStore(key));

  const hasFile = Boolean(fileMeta?.fileName);
  const identity = useMemo(
    () => (hasFile ? fileIdentity({ songId, ...fileMeta }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasFile, songId, fileMeta?.fileName, fileMeta?.fileSize, fileMeta?.lastModified],
  );

  // Enregistrement de CE fichier s'il existe ; sinon le plus récent d'un AUTRE fichier,
  // pour pouvoir distinguer « jamais calibré » de « le fichier a changé ».
  const record = useMemo(() => {
    if (!identity) return null;
    const exact = store.records[identity];
    if (exact) return exact;
    const others = Object.values(store.records);
    if (others.length === 0) return null;
    return others.reduce((a, b) => ((a?.calibratedAt || '') >= (b?.calibratedAt || '') ? a : b), others[0]);
  }, [store, identity]);

  const status = calibrationStatus(record, identity);
  const offsetSeconds = activeOffsetSeconds(record, identity);
  const canCapture = canCaptureWords(record, identity);

  /** Enregistre une calibration pour le fichier ACTUELLEMENT sélectionné. */
  const saveCalibration = useCallback(({ offsetSeconds: offset, method, localDuration, canonicalDuration }) => {
    if (!hasFile) return null;
    const rec = makeCalibration({
      songId, ...fileMeta, offsetSeconds: offset, method,
      localDuration, canonicalDuration, calibratedAt: new Date().toISOString(),
    });
    if (!rec) return null;
    setStore((prev) => {
      const records = { ...prev.records, [rec.fileIdentity]: rec };
      // Purge les plus anciens au-delà du plafond (le stockage local n'est pas un journal).
      const keys = Object.keys(records);
      if (keys.length > MAX_RECORDS_PER_TRACK) {
        keys
          .sort((a, b) => (records[a].calibratedAt || '').localeCompare(records[b].calibratedAt || ''))
          .slice(0, keys.length - MAX_RECORDS_PER_TRACK)
          .forEach((k) => { delete records[k]; });
      }
      const next = { version: CALIBRATION_VERSION, records };
      writeStore(key, next);
      return next;
    });
    return rec;
  }, [hasFile, songId, fileMeta, key]);

  /** Retire la calibration du fichier courant (« Refazer calibração »). */
  const clearCalibration = useCallback(() => {
    if (!identity) return;
    setStore((prev) => {
      if (!prev.records[identity]) return prev;
      const records = { ...prev.records };
      delete records[identity];
      const next = { version: CALIBRATION_VERSION, records };
      writeStore(key, next);
      return next;
    });
  }, [identity, key]);

  return { identity, record, status, offsetSeconds, canCapture, saveCalibration, clearCalibration };
}

function readStore(key) {
  const empty = { version: CALIBRATION_VERSION, records: {} };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CALIBRATION_VERSION || !parsed.records) return empty;
    // Chaque enregistrement est revalidé : un stockage corrompu ou d'une autre version
    // est ignoré plutôt que d'aboutir à un offset fantaisiste.
    const records = {};
    for (const [id, rec] of Object.entries(parsed.records)) {
      const ok = parseCalibrationRecord(rec);
      if (ok && ok.fileIdentity === id) records[id] = ok;
    }
    return { version: CALIBRATION_VERSION, records };
  } catch {
    return empty;
  }
}

function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota plein → sans effet */ }
}
