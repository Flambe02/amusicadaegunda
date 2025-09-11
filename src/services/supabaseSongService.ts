import { supabase } from '../lib/supabaseClient';

const toISO = (d?: string|null) => {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(+x) ? null : x.toISOString().slice(0,10);
};

export async function listPublished() {
  return supabase
    .from('songs')
    .select('*')
    .eq('status', 'published')
    .order('tiktok_publication_date', { ascending: false, nullsFirst: false })
    .order('release_date', { ascending: false, nullsFirst: false });
}

export async function updateSong(id: number, updates: any) {
  const { id: _i, created_at: _c, updated_at: _u, ...rest } = updates || {};
  const clean = {
    ...rest,
    hashtags: Array.isArray(rest?.hashtags) ? rest.hashtags : null,
    release_date: toISO(rest?.release_date),
    tiktok_publication_date: toISO(rest?.tiktok_publication_date),
  };

  const { data, error } = await supabase
    .from('songs')
    .update(clean)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSong(id: number) {
  const { data, error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createSong(songData: any) {
  const clean = {
    ...songData,
    hashtags: Array.isArray(songData?.hashtags) ? songData.hashtags : null,
    release_date: toISO(songData?.release_date),
    tiktok_publication_date: toISO(songData?.tiktok_publication_date),
  };

  const { data, error } = await supabase
    .from('songs')
    .insert([clean])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
