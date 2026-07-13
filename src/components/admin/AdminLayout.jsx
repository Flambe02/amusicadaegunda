// Full-screen admin shell: header + sidebar + routed content (Outlet) + the
// shared overlays (details drawer, song form, karaoke tool, delete dialog).
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import KaraokeSyncTool from '@/components/karaoke/KaraokeSyncTool';
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
    karaokeSong, closeKaraoke, confirmDelete, deleting, cancelDelete, performDelete,
  } = useAdminData();

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };
  const manageLinks = (view) => navigate(`/admin/links?song=${view.id}`);

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
          />
        )}

        <DeleteSongDialog song={confirmDelete} deleting={deleting} onCancel={cancelDelete} onConfirm={performDelete} />
      </div>
    </TooltipProvider>
  );
}
