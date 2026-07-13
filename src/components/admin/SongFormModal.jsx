// Global create/edit form overlay, driven by AdminDataContext so "Nova música"
// and "Editar música" work from any admin page.
import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import SongForm from './SongForm';
import { describeWriteError } from './adminData';
import { useAdminData } from './AdminDataContext';

export default function SongFormModal() {
  const { toast } = useToast();
  const { formSong, isSaving, categories, closeForm, saveSong, openKaraoke, applySongPatch } = useAdminData();

  const onAutoSaveHashtags = useCallback(async ({ hashtags, category, subtitle }) => {
    if (!formSong || formSong === 'new') return;
    const update = { hashtags, category };
    if (subtitle && subtitle !== formSong.subtitle) update.subtitle = subtitle;
    const { data, error } = await supabase.from('songs').update(update).eq('id', formSong.id).select();
    if (error || !data || data.length === 0) {
      toast({ title: 'Erro ao guardar', description: describeWriteError(error) || 'Nenhuma linha alterada.', variant: 'destructive' });
    } else {
      toast({ title: '✅ Guardado!' });
      applySongPatch(formSong.id, update);
    }
  }, [formSong, toast, applySongPatch]);

  if (formSong === null) return null;
  const isNew = formSong === 'new';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8" role="dialog" aria-modal="true" aria-label={isNew ? 'Nova música' : 'Editar música'}>
      <div className="w-full max-w-3xl rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold">{isNew ? '➕ Nova música' : `✏️ Editar — ${formSong.title}`}</h2>
          <div className="flex items-center gap-2">
            {!isNew && formSong?.lyrics?.trim() && (
              <button
                type="button"
                onClick={() => openKaraoke(formSong)}
                className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-500/20"
              >
                <Mic size={13} /> Sincronizar karaokê
              </button>
            )}
            <button onClick={closeForm} aria-label="Fechar" className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
        </div>
        <SongForm
          initial={isNew ? null : formSong}
          onSave={saveSong}
          onCancel={closeForm}
          isSaving={isSaving}
          categories={categories}
          songId={isNew ? null : formSong?.id}
          onAutoSaveHashtags={isNew ? undefined : onAutoSaveHashtags}
        />
      </div>
    </div>,
    document.body,
  );
}
