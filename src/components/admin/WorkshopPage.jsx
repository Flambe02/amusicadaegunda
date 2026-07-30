// « Ateliê de karaokê » — page d'ENTRÉE de l'atelier.
//
// L'atelier lui-même n'est pas une route : c'est l'overlay `KaraokeSyncTool` monté par
// AdminLayout dès que `karaokeSong` est posé dans AdminDataContext. Comme une chanson est
// nécessaire pour l'ouvrir, cette page est l'« état d'atterrissage léger » : elle réutilise
// les données catálogo DÉJÀ chargées (`useAdminData`) et appelle le MÊME `openKaraoke`.
// Aucun second éditeur, aucune seconde source de vérité, aucun état persisté en base.
import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Music } from 'lucide-react';
import { useAdminData } from './AdminDataContext';
import { catalogPrepAction, songPrepStatus } from '@/lib/workshopUi';
import { formatDayMonth, toSongAdminView } from './adminData';

const STATUS_TONE = {
  'Não iniciado': 'bg-white/10 text-gray-400',
  'Letra adicionada': 'bg-app-yellow/20 text-app-yellow',
  'Sincronização em andamento': 'bg-app-yellow/20 text-app-yellow',
  'Pronto para revisar': 'bg-violet-500/20 text-violet-200',
  Pronto: 'bg-emerald-500/20 text-emerald-200',
};

export default function WorkshopPage() {
  // Mêmes données et même transformation que le catálogo — pas de second chargement.
  const { songs, categories, openKaraoke, openEdit, loading } = useAdminData();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (Array.isArray(songs) ? songs : []).map((s) => toSongAdminView(s, categories));
    return (q ? list.filter((v) => (v.title || '').toLowerCase().includes(q)) : list).slice(0, 60);
  }, [songs, categories, query]);

  return (
    <section aria-labelledby="atelie-title" className="space-y-4">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300">
          <SlidersHorizontal size={19} />
        </div>
        <div>
          <h1 id="atelie-title" className="text-lg font-bold text-white">Ateliê de karaokê</h1>
          <p className="text-xs text-gray-500">Prepare a letra, os áudios e a sincronização das músicas.</p>
        </div>
      </header>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar música..." aria-label="Pesquisar música"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-purple-500/60"
        />
      </div>

      {loading && <p className="text-xs text-gray-500">A carregar músicas…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-xs text-gray-500">Nenhuma música encontrada.</p>
      )}

      <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
        {rows.map((view) => {
          const status = songPrepStatus(view);
          const action = catalogPrepAction(view);
          return (
            <li key={view.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
                {view.coverImage
                  ? <img src={view.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                  : <Music size={15} className="text-gray-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{view.title}</p>
                <p className="text-[11px] text-gray-500">{formatDayMonth(view.releaseDate)}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[status] || 'bg-white/10 text-gray-400'}`}>
                {status}
              </span>
              <button
                type="button"
                onClick={() => (action.action === 'editLyrics' ? openEdit(view) : openKaraoke(view.raw))}
                className="karaoke-focusable min-h-[36px] rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 focus-visible:ring-1 focus-visible:ring-purple-400"
              >
                {action.label}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
