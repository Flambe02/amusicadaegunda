import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Music, Play, Pause, FileText, X } from 'lucide-react';
import { Song } from '@/api/entities';
import { useSEO } from '@/hooks/useSEO';
import { extractYouTubeId, getYouTubeThumbnailUrl, titleToSlug } from '@/lib/utils';
import LyricsDialog from '@/components/LyricsDialog';
import LyricsDrawer from '@/components/LyricsDrawer';

const MONTHS = [
  { label: 'Jan', full: 'Janeiro',   index: 0  },
  { label: 'Fev', full: 'Fevereiro', index: 1  },
  { label: 'Mar', full: 'Março',     index: 2  },
  { label: 'Abr', full: 'Abril',     index: 3  },
  { label: 'Mai', full: 'Maio',      index: 4  },
  { label: 'Jun', full: 'Junho',     index: 5  },
  { label: 'Jul', full: 'Julho',     index: 6  },
  { label: 'Ago', full: 'Agosto',    index: 7  },
  { label: 'Set', full: 'Setembro',  index: 8  },
  { label: 'Out', full: 'Outubro',   index: 9  },
  { label: 'Nov', full: 'Novembro',  index: 10 },
  { label: 'Dez', full: 'Dezembro',  index: 11 },
];

function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T12:00:00' : dateStr;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function SongCard({ song, isActive, isPlaying, onTogglePlay, onOpenLyrics, isDescriptionExpanded, onToggleDescription }) {
  const slug = titleToSlug(song.title);
  const d = parseDate(song.release_date);
  const ytId = extractYouTubeId(song.youtube_url || song.youtube_music_url);
  const thumbnail = song.thumbnail_url ||
    (song.youtube_music_url ? getYouTubeThumbnailUrl(song.youtube_music_url, 'hqdefault') : null) ||
    (song.youtube_url ? getYouTubeThumbnailUrl(song.youtube_url, 'hqdefault') : null);
  const hasLongDescription = (song.description || '').trim().length > 140;

  return (
    <div className="glass-panel desktop-shell-gradient overflow-hidden rounded-[28px] transition-all duration-200 hover:bg-white/[0.07]">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <Link
          to={slug ? `/musica/${slug}/` : '#'}
          className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-white/5"
          tabIndex={-1}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-8 w-8 text-white/20" />
            </div>
          )}
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex gap-[3px] items-end h-4">
                {[1,2,3].map(i => (
                  <span key={i} className="w-[3px] rounded-sm bg-[#FDE047]"
                    style={{ height: isPlaying ? `${50 + i * 20}%` : '40%',
                      animation: isPlaying ? `bounce 0.${6+i}s ease-in-out infinite alternate` : 'none' }} />
                ))}
              </div>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {slug ? (
                <Link to={`/musica/${slug}/`}
                  className="block truncate text-base font-bold text-white hover:text-[#FDE047] transition-colors">
                  {song.title}
                </Link>
              ) : (
                <p className="truncate text-base font-bold text-white">{song.title}</p>
              )}
              <p className="mt-0.5 text-sm text-white/50">
                {song.artist}
                {d && (
                  <span className="ml-2 text-white/30">
                    · {d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </p>
            </div>

            {/* Play button */}
            {ytId && (
              <button
                onClick={() => onTogglePlay(song)}
                className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  isPlaying
                    ? 'bg-[#FDE047] text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-label={isPlaying ? 'Pausar' : 'Tocar'}
              >
                {isPlaying
                  ? <Pause className="h-3.5 w-3.5" />
                  : <Play  className="h-3.5 w-3.5 ml-0.5" />
                }
              </button>
            )}
          </div>

          {/* Description */}
          {song.description?.trim() && (
            <div className="mt-2">
              <p className={`text-sm leading-6 text-white/48 ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
                {song.description.trim()}
              </p>
              {hasLongDescription && (
                <button
                  type="button"
                  onClick={() => onToggleDescription(song.id)}
                  className="mt-1 text-xs font-semibold text-[#FDE047]/70 hover:text-[#FDE047] transition-colors"
                >
                  {isDescriptionExpanded ? 'Ver menos' : 'Ler mais'}
                </button>
              )}
            </div>
          )}

          {/* Streaming links + lyrics */}
          {(song.spotify_url || song.apple_music_url || song.youtube_url || song.lyrics) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {song.spotify_url && (
                <a href={song.spotify_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1DB954]/15 px-3 py-1 text-xs font-bold text-[#1DB954] transition hover:bg-[#1DB954]/25">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Spotify
                </a>
              )}
              {song.apple_music_url && (
                <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FA233B]/15 px-3 py-1 text-xs font-bold text-[#FA233B] transition hover:bg-[#FA233B]/25">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Apple Music
                </a>
              )}
              {song.youtube_url && (
                <a href={song.youtube_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FF0000]/15 px-3 py-1 text-xs font-bold text-[#FF4444] transition hover:bg-[#FF0000]/25">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                  YouTube
                </a>
              )}
              {song.lyrics?.trim() && (
                <button
                  type="button"
                  onClick={() => onOpenLyrics(song)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/14 hover:text-white"
                >
                  <FileText className="h-3 w-3" />
                  Letras
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  useSEO({
    title: 'Pesquisar músicas - A Música da Segunda',
    description: 'Encontre qualquer música do projeto A Música da Segunda.',
    url: '/search',
    type: 'website',
    robots: 'noindex, follow',
  });

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedYears, setSelectedYears] = useState(new Set());
  const [selectedMonths, setSelectedMonths] = useState(new Set());
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState(new Set());
  const [selectedLyricsSong, setSelectedLyricsSong] = useState(null);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showLyricsDrawer, setShowLyricsDrawer] = useState(false);

  const iframeRef = useRef(null);
  const playbackRetryRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [activeYtId, setActiveYtId] = useState(null);
  const [playerState, setPlayerState] = useState('stopped');

  useEffect(() => {
    Song.list('-release_date').then(data => {
      const loaded = data || [];
      setSongs(loaded);
      const years = new Set();
      loaded.forEach(s => {
        const d = parseDate(s.release_date);
        if (d) years.add(d.getFullYear());
      });
      setSelectedYears(years);
      setLoading(false);
    });
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set();
    songs.forEach(s => {
      const d = parseDate(s.release_date);
      if (d) years.add(d.getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [songs]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const hasText = q.length > 0;
    const hasYearFilter = selectedYears.size > 0;
    const hasMonthFilter = selectedMonths.size > 0;
    if (!hasText && !hasYearFilter && !hasMonthFilter) return [];
    return songs.filter(s => {
      const d = parseDate(s.release_date);
      const matchText = !hasText || (
        normalize(s.title).includes(q) ||
        normalize(s.artist).includes(q) ||
        normalize(s.description).includes(q) ||
        (d && String(d.getFullYear()).includes(q))
      );
      const matchYear  = !hasYearFilter  || (d && selectedYears.has(d.getFullYear()));
      const matchMonth = !hasMonthFilter || (d && selectedMonths.has(d.getMonth()));
      return matchText && matchYear && matchMonth;
    });
  }, [query, selectedYears, selectedMonths, songs]);

  const hasFilter = query.trim().length > 0 || selectedYears.size > 0 || selectedMonths.size > 0;

  const toggleYear = (yr) => setSelectedYears(prev => {
    const next = new Set(prev);
    next.has(yr) ? next.delete(yr) : next.add(yr);
    return next;
  });

  const toggleMonth = (idx) => setSelectedMonths(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });

  const toggleDescription = (id) => setExpandedDescriptionIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const sendYTCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }), '*'
    );
  };

  const attemptPlayCurrent = () => {
    if (!activeYtId) return;
    sendYTCommand('playVideo');
    setPlayerState('playing');
  };

  const handleTogglePlay = (song) => {
    const ytId = extractYouTubeId(song.youtube_url);
    if (!ytId) return;
    if (activeId === song.id) {
      if (playerState === 'playing') {
        sendYTCommand('pauseVideo');
        setPlayerState('paused');
      } else {
        sendYTCommand('playVideo');
        setPlayerState('playing');
      }
    } else {
      setActiveId(song.id);
      setActiveYtId(ytId);
      setPlayerState('paused');
    }
  };

  useEffect(() => {
    if (!activeYtId) return undefined;
    const t1 = setTimeout(() => attemptPlayCurrent(), 250);
    const t2 = setTimeout(() => attemptPlayCurrent(), 900);
    playbackRetryRef.current = t2;
    return () => { clearTimeout(t1); clearTimeout(t2); playbackRetryRef.current = null; };
  }, [activeYtId]);

  const handleOpenLyrics = (song) => {
    setSelectedLyricsSong(song);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setShowLyricsDrawer(true);
    } else {
      setShowLyricsDialog(true);
    }
  };

  const clearQuery = () => setQuery('');

  return (
    <div className="space-y-6">
      {/* Hidden audio player */}
      {activeYtId && (
        <iframe
          key={activeYtId}
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${activeYtId}?enablejsapi=1&autoplay=1&rel=0`}
          title="player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={attemptPlayCurrent}
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Header + search */}
      <section className="glass-panel desktop-shell-gradient relative overflow-hidden rounded-[32px] p-6 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(253,224,71,0.12),_transparent_55%)]" />
        <div className="relative space-y-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
              Catálogo
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white xl:text-5xl">
              Pesquisar
            </h1>
            <p className="mt-1 text-base text-white/50">
              Encontre qualquer paródia do projeto
            </p>
          </div>

          {/* Search input */}
          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/38 pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Título, artista, descrição, ano…"
              className="w-full rounded-[20px] border border-white/10 bg-white/6 py-4 pl-12 pr-12 text-base text-white placeholder:text-white/28 focus:outline-none focus:border-[#FDE047]/40 focus:bg-white/8 transition-all"
            />
            {query && (
              <button
                onClick={clearQuery}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white transition-colors"
                aria-label="Limpar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="space-y-3">
            {/* Year pills */}
            {availableYears.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-white/30 mr-1">Ano</span>
                {availableYears.map(yr => {
                  const active = selectedYears.has(yr);
                  return (
                    <button key={yr} onClick={() => toggleYear(yr)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                        active
                          ? 'bg-[#FDE047] text-black'
                          : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}>
                      {yr}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Month pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.24em] text-white/30 mr-1">Mês</span>
              {MONTHS.map(m => {
                const active = selectedMonths.has(m.index);
                return (
                  <button key={m.index} onClick={() => toggleMonth(m.index)} title={m.full}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? 'bg-[#FDE047] text-black'
                        : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Results area */}
      <section>
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          </div>
        )}

        {/* Empty state — no filter */}
        {!loading && !hasFilter && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <SearchIcon className="h-7 w-7 text-white/30" />
            </div>
            <p className="text-base font-semibold text-white/50">
              Digite uma palavra ou filtre por mês
            </p>
            <p className="mt-1 text-sm text-white/28">
              {songs.length > 0 ? `${songs.length} músicas no catálogo` : ''}
            </p>
          </div>
        )}

        {/* No results */}
        {!loading && hasFilter && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Music className="h-7 w-7 text-white/30" />
            </div>
            <p className="text-base font-semibold text-white/50">Nenhuma música encontrada</p>
            <p className="mt-1 text-sm text-white/28">Tente outro termo ou filtro</p>
          </div>
        )}

        {/* Results */}
        {!loading && hasFilter && filtered.length > 0 && (
          <>
            <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-white/38">
              {filtered.length} música{filtered.length > 1 ? 's' : ''} encontrada{filtered.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {filtered.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  isActive={activeId === song.id}
                  isPlaying={activeId === song.id && playerState === 'playing'}
                  onTogglePlay={handleTogglePlay}
                  onOpenLyrics={handleOpenLyrics}
                  isDescriptionExpanded={expandedDescriptionIds.has(song.id)}
                  onToggleDescription={toggleDescription}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <LyricsDialog
        open={showLyricsDialog}
        onOpenChange={setShowLyricsDialog}
        song={selectedLyricsSong}
        title={selectedLyricsSong ? `Letras — ${selectedLyricsSong.title}` : 'Letras da Música'}
      />

      <LyricsDrawer
        open={showLyricsDrawer}
        onOpenChange={setShowLyricsDrawer}
        lyrics={selectedLyricsSong?.lyrics}
        songTitle={selectedLyricsSong?.title}
      />
    </div>
  );
}
