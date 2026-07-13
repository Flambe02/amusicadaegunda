// Links management page (/admin/links). Manages only the 4 platform URLs.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, Download, CheckCircle2, Circle, AlertTriangle, ExternalLink, Music, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminData } from './AdminDataContext';
import { formatDayMonth } from './adminData';
import { LINK_PLATFORMS, toSongLinks, linkState, linksComplete, linksToCsv } from '@/lib/adminSongLinks';
import EditSongLinksDialog from './EditSongLinksDialog';

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'incomplete', label: 'Links incompletos' },
  { key: 'spotifyUrl', label: 'Sem Spotify' },
  { key: 'appleMusicUrl', label: 'Sem Apple Music' },
  { key: 'youtubeMusicUrl', label: 'Sem YouTube Music' },
  { key: 'youtubeVideoUrl', label: 'Sem vídeo YouTube' },
  { key: 'complete', label: 'Links completos' },
];

function LinkCell({ platformKey, value, onEdit }) {
  const st = linkState(platformKey, value);
  if (st === 'empty') {
    return <button onClick={onEdit} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"><Circle size={13} /> Adicionar</button>;
  }
  if (st === 'invalid') {
    return <button onClick={onEdit} className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"><AlertTriangle size={13} /> Corrigir</button>;
  }
  return (
    <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
      <CheckCircle2 size={13} /> Disponível <ExternalLink size={11} className="text-gray-500" />
    </a>
  );
}

export default function LinksPage() {
  const { songs, loading, refreshing, reload, applySongPatch, openDrawer } = useAdminData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [params, setParams] = useSearchParams();

  // Deep link: /admin/links?song=ID opens the edit dialog for that song.
  useEffect(() => {
    const id = params.get('song');
    if (id && songs.length) {
      const s = songs.find((x) => String(x.id) === String(id));
      if (s) { setEditing(s); setParams({}, { replace: true }); }
    }
  }, [params, songs, setParams]);

  const rows = useMemo(() => {
    let list = songs;
    if (search.trim()) {
      const q = norm(search);
      list = list.filter((s) => norm(s.title).includes(q));
    }
    list = list.filter((s) => {
      const links = toSongLinks(s);
      if (filter === 'all') return true;
      if (filter === 'complete') return linksComplete(links);
      if (filter === 'incomplete') return !linksComplete(links);
      return !links[filter]; // "Sem X"
    });
    return list;
  }, [songs, search, filter]);

  const incompleteTotal = useMemo(() => songs.filter((s) => !linksComplete(toSongLinks(s))).length, [songs]);

  const exportCsv = () => {
    const csv = linksToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'links-musicas.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Links</h1>
        <p className="text-sm text-gray-500">Gerencie os links de distribuição e vídeo do catálogo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar música…" className="pl-9" aria-label="Pesquisar música" />
        </div>
        <Button variant="outline" size="icon" onClick={() => reload({ isRefresh: true })} disabled={refreshing || loading} title="Recarregar">
          <RefreshCw size={16} className={refreshing || loading ? 'animate-spin' : ''} />
        </Button>
        <Button variant="outline" onClick={exportCsv} className="gap-2" disabled={!rows.length}>
          <Download size={15} /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              filter === f.key ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">{songs.length} músicas · {incompleteTotal} com links incompletos</p>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-500">A carregar…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 py-14 text-center text-sm text-gray-400">
          {filter === 'complete' || filter === 'all' ? 'Nenhuma música encontrada.' : 'Todos os links deste filtro estão preenchidos.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2 font-semibold">Música</th>
                <th className="px-3 py-2 font-semibold">Spotify</th>
                <th className="px-3 py-2 font-semibold">Apple Music</th>
                <th className="px-3 py-2 font-semibold">YouTube Music</th>
                <th className="px-3 py-2 font-semibold">Vídeo YouTube</th>
                <th className="px-3 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const links = toSongLinks(s);
                return (
                  <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
                          {s.cover_image ? <img src={s.cover_image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Music size={14} className="text-gray-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{s.title}</p>
                          <p className="text-xs text-gray-500">{formatDayMonth(s.release_date)}</p>
                        </div>
                      </div>
                    </td>
                    {LINK_PLATFORMS.map((p) => (
                      <td key={p.key} className="px-3 py-2.5"><LinkCell platformKey={p.key} value={links[p.key]} onEdit={() => setEditing(s)} /></td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => setEditing(s)} aria-label="Editar links" className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><Pencil size={14} /></button>
                          </TooltipTrigger>
                          <TooltipContent>Editar links</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => openDrawer(s.id)} aria-label="Abrir detalhes" className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><ExternalLink size={14} /></button>
                          </TooltipTrigger>
                          <TooltipContent>Abrir detalhes</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EditSongLinksDialog
        song={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={(id, patch) => applySongPatch(id, patch)}
      />
    </>
  );
}
