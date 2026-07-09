import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mic, Search as SearchIcon, Music, Loader2, CalendarDays } from 'lucide-react';
import { Song } from '@/api/entities';
import { useSEO } from '../hooks/useSEO';
import KaraokePlayer from '@/components/karaoke/KaraokePlayer';
import { hasLrcContent } from '@/lib/lrc';
import '@/styles/karaoke.css';

const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};

function themeLabel(category) {
  if (!category) return '';
  return CATEGORY_LABELS[category] || category;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Résumé court : privilégie le subtitle (déjà court), sinon tronque la description.
function shortSummary(song, max = 130) {
  const raw = (song?.subtitle || song?.description || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Hub Karaokê « Palco da Segunda » — page publique /karaoke.
 *
 * Liste les chansons synchronisées (lrc_content) sous forme de cartes clean
 * (thème + data + titre + résumé, sans capa). CANTAR ouvre le lecteur plein écran.
 */
export default function KaraokePage() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(null); // chanson en lecture, ou null

  useSEO({
    title: 'Karaokê — Cante as Paródias | A Música da Segunda',
    description:
      'Modo karaokê oficial de A Música da Segunda: cante as paródias musicais da semana com letra sincronizada na tela. No celular, no computador ou na TV.',
    url: '/karaoke',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await Song.list('-release_date');
        if (cancelled) return;
        setSongs((all || []).filter((s) => hasLrcContent(s.lrc_content)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => s.title?.toLowerCase().includes(q) || s.subtitle?.toLowerCase().includes(q));
  }, [songs, query]);

  return (
    <>
      <Helmet><html lang="pt-BR" /></Helmet>

      <div className="relative min-h-screen overflow-hidden">
        <div className="karaoke-spotlights !inset-0" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-8 md:pt-12">
          {/* Hero néon */}
          <div className="mb-8 text-center md:mb-12">
            <p className="mb-2 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
              <Mic className="h-3.5 w-3.5 text-app-yellow" /> Palco da Segunda
            </p>
            <h1 className="karaoke-neon text-5xl font-black md:text-7xl">KARAOKÊ</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/55 md:text-base">
              Canta as paródias da semana com a letra sincronizada na tela.
            </p>
            {!isLoading && songs.length > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-app-yellow/25 bg-app-yellow/10 px-3 py-1 text-xs font-bold text-app-yellow">
                <Music className="h-3.5 w-3.5" /> {songs.length} música{songs.length > 1 ? 's' : ''} pronta{songs.length > 1 ? 's' : ''} para cantar
              </p>
            )}
          </div>

          {songs.length > 3 && (
            <div className="relative mx-auto mb-8 max-w-md">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar uma música…"
                className="h-12 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-app-yellow/40 focus:bg-white/8" />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" /> A montar o palco…
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
              <Mic className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <p className="font-bold text-white">{query ? 'Nenhuma música encontrada.' : 'Os karaokês chegam em breve!'}</p>
              <p className="mt-2 text-sm text-white/50">{query ? 'Tenta outro termo de pesquisa.' : 'As letras estão a ser sincronizadas — volta já já. 🎤'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((song) => {
                const theme = themeLabel(song.category);
                const date = formatDate(song.release_date);
                const summary = shortSummary(song);
                return (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => setCurrent(song)}
                    aria-label={`Cantar ${song.title}`}
                    className="karaoke-card group flex w-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-app-yellow/40 hover:bg-white/[0.06]"
                  >
                    {(theme || date) && (
                      <div className="mb-3 flex items-center justify-between gap-2">
                        {theme ? (
                          <span className="rounded-full border border-app-yellow/25 bg-app-yellow/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-app-yellow">
                            {theme}
                          </span>
                        ) : <span />}
                        {date && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-white/40">
                            <CalendarDays className="h-3.5 w-3.5" /> {date}
                          </span>
                        )}
                      </div>
                    )}
                    <h2 className="text-xl font-black leading-tight text-white">{song.title}</h2>
                    {summary && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">{summary}</p>
                    )}
                    <span className="mt-auto pt-5">
                      <span className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-app-yellow text-sm font-black text-black transition group-active:scale-[0.98]">
                        <Mic className="h-4 w-4" /> CANTAR
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {current && (
        <KaraokePlayer
          key={current.id}
          song={current}
          onEnded={() => setCurrent(null)}
          onClose={() => setCurrent(null)}
        />
      )}
    </>
  );
}
