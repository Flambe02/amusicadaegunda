// Catalog page content (toolbar + tabs + grouped list). Overlays live in AdminLayout.
import { useMemo, useState } from 'react';
import SongCatalogToolbar from './SongCatalogToolbar';
import SongCatalogTabs from './SongCatalogTabs';
import SongCatalogList from './SongCatalogList';
import { toSongAdminView } from './adminData';
import { useAdminData } from './AdminDataContext';

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function CatalogPage() {
  const {
    songs, loading, error, refreshing, reload, categories, published, drafts,
    openDrawer, selectedSongId, openCreate, openEdit, openKaraoke, requestDelete,
  } = useAdminData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredViews = useMemo(() => {
    let result = songs;
    if (statusFilter === 'published') result = result.filter((s) => s.status === 'published');
    else if (statusFilter === 'draft') result = result.filter((s) => s.status !== 'published');
    if (search.trim()) {
      const q = norm(search);
      result = result.filter((s) => norm(s.title).includes(q) || norm(s.description).includes(q) || norm(s.category).includes(q));
    }
    return result.map((s) => toSongAdminView(s, categories));
  }, [songs, statusFilter, search, categories]);

  return (
    <>
      <SongCatalogToolbar
        search={search}
        onSearch={setSearch}
        onRefresh={() => reload({ isRefresh: true })}
        refreshing={refreshing || loading}
        onCreate={openCreate}
      />
      <SongCatalogTabs value={statusFilter} onChange={setStatusFilter} counts={{ all: songs.length, published, draft: drafts }} />
      <SongCatalogList
        loading={loading}
        error={error}
        onRetry={() => reload()}
        views={filteredViews}
        totalSongs={songs.length}
        searchActive={Boolean(search.trim())}
        selectedId={selectedSongId}
        onSelect={(v) => openDrawer(v.id)}
        onKaraoke={(v) => openKaraoke(v.raw)}
        onEdit={(v) => openEdit(v.raw)}
        onDelete={requestDelete}
        onCreate={openCreate}
        onClearSearch={() => setSearch('')}
      />
    </>
  );
}
