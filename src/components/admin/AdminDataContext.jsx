// Shared admin data + UI-overlay state for every admin page (catalog, links,
// biblioteca, settings). One normalized source of songs and one set of global
// overlays (details drawer, song form, karaoke tool, delete dialog).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { notifyAllSubscribers } from '@/lib/pushNotifications';
import {
  loadCategories, persistCategories, toSongAdminView,
  describeWriteError, ensureWritableSession, normalizeSongPayload, persistSongWithSchemaFallback,
} from './adminData';

const AdminDataContext = createContext(null);

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
}

export function AdminDataProvider({ children }) {
  const { toast } = useToast();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [categories, setCategoriesState] = useState(loadCategories);
  const [adminEmail, setAdminEmail] = useState(null);

  // Overlay UI state
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [formSong, setFormSong] = useState(null); // null | 'new' | song
  const [isSaving, setIsSaving] = useState(false);
  const [karaokeSong, setKaraokeSong] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const lastFocusedRow = useRef(null);

  // ── Load ──
  const reload = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data, error: err } = await supabase.from('songs').select('*').order('release_date', { ascending: false });
      if (err) throw err;
      setSongs(data || []);
      setError(false);
    } catch (err) {
      if (import.meta.env?.DEV) console.error('[admin] load songs failed:', err);
      setError(true);
      toast({ title: 'Erro ao carregar músicas', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAdminEmail(data?.session?.user?.email ?? null));
  }, []);

  // ── Auto-publish scheduler (preserved) ──
  const checkScheduled = useCallback(async () => {
    const now = new Date().toISOString();
    const due = songs.filter((s) => s.status === 'draft' && s.publish_at && s.publish_at <= now);
    for (const song of due) {
      const { data, error: err } = await supabase.from('songs').update({ status: 'published', publish_at: null }).eq('id', song.id).select();
      if (!err && data && data.length > 0) {
        toast({ title: `✅ "${song.title}" publicada automaticamente!` });
        try { await notifyAllSubscribers({ title: '🎵 Nova Música da Segunda!', body: song.title, url: song.slug ? `/musica/${song.slug}` : '/' }); } catch { /* silent */ }
      } else if (err || !data || data.length === 0) {
        toast({ title: `⚠️ "${song.title}" não foi publicada automaticamente`, description: describeWriteError(err) || 'Sessão expirada ou direitos RLS.', variant: 'destructive' });
      }
    }
    if (due.length > 0) await reload({ isRefresh: true });
  }, [songs, toast, reload]);

  useEffect(() => {
    checkScheduled();
    const interval = setInterval(checkScheduled, 60_000);
    return () => clearInterval(interval);
  }, [checkScheduled]);

  // ── Derived ──
  const published = useMemo(() => songs.filter((s) => s.status === 'published').length, [songs]);
  const drafts = songs.length - published;
  const selectedSong = useMemo(() => songs.find((s) => s.id === selectedSongId) || null, [songs, selectedSongId]);
  const selectedView = useMemo(() => (selectedSong ? toSongAdminView(selectedSong, categories) : null), [selectedSong, categories]);

  const applySongPatch = useCallback((id, patch) => {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const setCategories = useCallback((cats) => { setCategoriesState(cats); persistCategories(cats); }, []);

  // ── Overlays ──
  const openDrawer = useCallback((id) => { lastFocusedRow.current = document.activeElement; setSelectedSongId(id); }, []);
  const closeDrawer = useCallback(() => {
    setSelectedSongId(null);
    if (lastFocusedRow.current instanceof HTMLElement) lastFocusedRow.current.focus();
  }, []);
  const openCreate = useCallback(() => setFormSong('new'), []);
  const openEdit = useCallback((song) => setFormSong(song), []);
  const closeForm = useCallback(() => setFormSong(null), []);
  const openKaraoke = useCallback((song) => setKaraokeSong(song), []);
  const closeKaraoke = useCallback(() => setKaraokeSong(null), []);
  const requestDelete = useCallback((song) => setConfirmDelete({ id: song.id, title: song.title }), []);
  const cancelDelete = useCallback(() => setConfirmDelete(null), []);

  // ── Mutations ──
  const saveSong = useCallback(async (formData) => {
    setIsSaving(true);
    try {
      await ensureWritableSession();
      const panel = formSong;
      const wasPublished = panel?.status === 'published';
      const becomesPublished = formData.status === 'published';
      const toSave = normalizeSongPayload(formData);
      const { removedColumns } = await persistSongWithSchemaFallback({ panel, payload: toSave });
      toast({
        title: panel === 'new' ? 'Música criada' : 'Música atualizada',
        description: removedColumns.length > 0 ? `Campos não registados no Supabase: ${removedColumns.join(', ')}.` : undefined,
      });
      if (!wasPublished && becomesPublished) {
        try { await notifyAllSubscribers({ title: '🎵 Nova Música da Segunda!', body: formData.title, url: formData.slug ? `/musica/${formData.slug}` : '/' }); } catch { /* silent */ }
      }
      setFormSong(null);
      await reload({ isRefresh: true });
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [formSong, toast, reload]);

  const publishSong = useCallback(async (song) => {
    try {
      await ensureWritableSession();
      const { data, error: err } = await supabase.from('songs').update({ status: 'published', publish_at: null }).eq('id', song.id).select();
      if (err) throw new Error(describeWriteError(err));
      if (!data || data.length === 0) throw new Error('Publicação não registada (0 linhas). Sessão expirada ou direitos RLS.');
      try { await notifyAllSubscribers({ title: '🎵 Nova Música da Segunda!', body: song.title, url: song.slug ? `/musica/${song.slug}` : '/' }); } catch { /* silent */ }
      toast({ title: `✅ "${song.title}" publicada!` });
      await reload({ isRefresh: true });
    } catch (err) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    }
  }, [toast, reload]);

  const performDelete = useCallback(async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      const { error: err } = await supabase.from('songs').delete().eq('id', confirmDelete.id);
      if (err) throw err;
      toast({ title: `🗑️ "${confirmDelete.title}" excluída.` });
      if (selectedSongId === confirmDelete.id) setSelectedSongId(null);
      setConfirmDelete(null);
      await reload({ isRefresh: true });
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: describeWriteError(err) || err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, deleting, selectedSongId, toast, reload]);

  // Update the 4 platform-link columns (from Links page / edit dialog).
  const updateSongLinks = useCallback((id, patch) => applySongPatch(id, patch), [applySongPatch]);

  const value = {
    // data
    songs, loading, refreshing, error, reload, categories, setCategories, adminEmail,
    published, drafts, applySongPatch,
    // selection / drawer
    selectedSongId, selectedSong, selectedView, openDrawer, closeDrawer,
    // form
    formSong, isSaving, openCreate, openEdit, closeForm, saveSong,
    // karaoke
    karaokeSong, openKaraoke, closeKaraoke,
    // delete
    confirmDelete, deleting, requestDelete, cancelDelete, performDelete,
    // mutations
    publishSong, updateSongLinks,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}
