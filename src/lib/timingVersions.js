/**
 * Historique persistant des versions de timing (table song_timing_versions).
 *
 * DÉGRADATION GRACIEUSE : si la migration 20260712170000_add_hybrid_timing n'a pas
 * encore été appliquée, la table/les colonnes n'existent pas. Toutes les fonctions
 * détectent ce cas (`unavailable: true`) au lieu de planter → l'éditeur continue de
 * fonctionner exactement comme avant (autosave local + Guardar), sans historique.
 */
import { supabase } from '@/lib/supabase';

const MISSING_TABLE = '42P01';   // undefined_table
const MISSING_COLUMN = '42703';  // undefined_column

export function isMissingTimingSchema(error) {
  if (!error) return false;
  if (error.code === MISSING_TABLE || error.code === MISSING_COLUMN) return true;
  return /song_timing_versions|timing_data|timing_mode|timing_version/i.test(error.message || '');
}

/** Liste les versions (métadonnées seulement) d'une chanson, plus récente d'abord. */
export async function listTimingVersions(songId) {
  const { data, error } = await supabase
    .from('song_timing_versions')
    .select('id, version_number, timing_mode, source, note, created_at, created_by')
    .eq('song_id', songId)
    .order('version_number', { ascending: false });
  if (error) {
    if (isMissingTimingSchema(error)) return { versions: [], unavailable: true };
    throw error;
  }
  return { versions: data || [], unavailable: false };
}

/** Charge une version complète (avec lrc_content + timing_data) pour restauration. */
export async function getTimingVersion(id) {
  const { data, error } = await supabase
    .from('song_timing_versions')
    .select('id, song_id, version_number, lrc_content, timing_data, timing_mode, source, note, created_at')
    .eq('id', id)
    .single();
  if (error) {
    if (isMissingTimingSchema(error)) return { version: null, unavailable: true };
    throw error;
  }
  return { version: data, unavailable: false };
}

/**
 * Crée une nouvelle version durable (append-only). Numéro = max + 1 pour la chanson.
 * source: manual_save | publish | restore | migration.
 */
export async function createTimingVersion(songId, {
  lrc_content, timing_data = null, timing_mode = 'line', source = 'manual_save', note = null,
}) {
  const { data: last, error: qErr } = await supabase
    .from('song_timing_versions')
    .select('version_number')
    .eq('song_id', songId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (qErr) {
    if (isMissingTimingSchema(qErr)) return { version: null, unavailable: true };
    throw qErr;
  }
  const nextNumber = (last?.version_number || 0) + 1;

  let created_by = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    created_by = session?.user?.id ?? null;
  } catch { /* session facultative */ }

  const { data, error } = await supabase
    .from('song_timing_versions')
    .insert({
      song_id: songId, version_number: nextNumber,
      lrc_content, timing_data, timing_mode, source, note, created_by,
    })
    .select('id, version_number, timing_mode, source, note, created_at, created_by')
    .single();
  if (error) {
    if (isMissingTimingSchema(error)) return { version: null, unavailable: true };
    throw error;
  }
  return { version: data, unavailable: false };
}
