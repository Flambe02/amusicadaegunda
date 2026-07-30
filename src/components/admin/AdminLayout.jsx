// Full-screen admin shell: header + sidebar + routed content (Outlet) + the
// shared overlays (details drawer, song form, karaoke tool, delete dialog).
import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { useLocalAudioSession } from '@/hooks/useLocalAudioSession';
import KaraokeSyncTool from '@/components/karaoke/KaraokeSyncTool';
import PitchMapModal from './pitch/PitchMapModal';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import SongDetailsDrawer from './SongDetailsDrawer';
import SongFormModal from './SongFormModal';
import DeleteSongDialog from './DeleteSongDialog';
import { useAdminData } from './AdminDataContext';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const {
    published, drafts, adminEmail, selectedView, closeDrawer,
    openEdit, openKaraoke, publishSong, requestDelete, applySongPatch,
    karaokeSong, karaokeMode, closeKaraoke, confirmDelete, deleting, cancelDelete, performDelete,
    pitchMapSong, openPitchMap, closePitchMap,
  } = useAdminData();

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };
  const manageLinks = (view) => navigate(`/admin/links?song=${view.id}`);

  // Sessão de áudio local PARTILHADA entre « Sincronizar karaokê » e « Guia de tom »
  // (mesma música): evita pedir o mesmo ficheiro vocal duas vezes ao saltar de um
  // para o outro pelo link cruzado. A persistência entre sessões (IndexedDB) fica
  // como reforço opcional em cada componente; isto garante que funciona SEMPRE
  // dentro da mesma sessão do admin, sem depender da API File System Access.
  const sharedVocalAudio = useLocalAudioSession();
  const sharedVocalSongIdRef = useRef(null);
  useEffect(() => {
    const activeId = karaokeSong?.id ?? pitchMapSong?.id ?? null;
    if (activeId == null) { sharedVocalSongIdRef.current = null; return; }
    if (sharedVocalSongIdRef.current != null && sharedVocalSongIdRef.current !== activeId) {
      sharedVocalAudio.clear(); // trocou de música: não arrastar o áudio da anterior
    }
    sharedVocalSongIdRef.current = activeId;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sharedVocalAudio é estável (refs internos)
  }, [karaokeSong?.id, pitchMapSong?.id]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gray-950 text-white">
        <AdminHeader published={published} drafts={drafts} onLogout={handleLogout} />

        <div className="flex">
          <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} adminEmail={adminEmail} />

          <main className="min-w-0 flex-1">
            <div className="w-full space-y-5 px-5 py-6 lg:px-6">
              <Outlet />
            </div>
          </main>

          <SongDetailsDrawer
            view={selectedView}
            onClose={closeDrawer}
            onEdit={openEdit}
            onKaraoke={(v) => openKaraoke(v.raw)}
            onQuickSync={(v) => openKaraoke(v.raw, { mode: 'quick' })}
            onPitchMap={(v) => openPitchMap(v.raw)}
            onPublish={publishSong}
            onManageLinks={manageLinks}
            onDelete={requestDelete}
          />
        </div>

        {/* Global overlays */}
        <SongFormModal />

        {karaokeSong && (
          <KaraokeSyncTool
            key={karaokeSong.id}
            song={karaokeSong}
            onClose={closeKaraoke}
            onSaved={(updated) => applySongPatch(updated.id, updated)}
            onOpenPitchMap={() => openPitchMap(karaokeSong)}
            sharedAudio={sharedVocalAudio}
            initialPresentation={karaokeMode}
          />
        )}

        {pitchMapSong && (
          <PitchMapModal
            key={pitchMapSong.id}
            song={pitchMapSong}
            onClose={closePitchMap}
            onSaved={(id, patch) => applySongPatch(id, patch)}
            sharedAudio={sharedVocalAudio}
          />
        )}

        <DeleteSongDialog song={confirmDelete} deleting={deleting} onCancel={cancelDelete} onConfirm={performDelete} />
      </div>
    </TooltipProvider>
  );
}
