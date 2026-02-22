import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Music, Play, Pause, FileText } from 'lucide-react';
import { Song } from '@/api/entities';
import { useSEO } from '@/hooks/useSEO';
import { extractYouTubeId, titleToSlug } from '@/lib/utils';
import LyricsDialog from '@/components/LyricsDialog';
import LyricsDrawer from '@/components/LyricsDrawer';

const MONTHS = [
  { label: 'Jan', full: 'Janeiro',   index: 0,  color: '#3B82F6' },
  { label: 'Fev', full: 'Fevereiro', index: 1,  color: '#6366F1' },
  { label: 'Mar', full: 'Março',     index: 2,  color: '#EC4899' },
  { label: 'Abr', full: 'Abril',     index: 3,  color: '#F97316' },
  { label: 'Mai', full: 'Maio',      index: 4,  color: '#10B981' },
  { label: 'Jun', full: 'Junho',     index: 5,  color: '#EAB308' },
  { label: 'Jul', full: 'Julho',     index: 6,  color: '#F59E0B' },
  { label: 'Ago', full: 'Agosto',    index: 7,  color: '#EF4444' },
  { label: 'Set', full: 'Setembro',  index: 8,  color: '#8B5CF6' },
  { label: 'Out', full: 'Outubro',   index: 9,  color: '#14B8A6' },
  { label: 'Nov', full: 'Novembro',  index: 10, color: '#06B6D4' },
  { label: 'Dez', full: 'Dezembro',  index: 11, color: '#F43F5E' },
];

function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T12:00:00' : dateStr;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function normalize(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
  const [selectedYears, setSelectedYears] = useState(new Set());   // multi-select
  const [selectedMonths, setSelectedMonths] = useState(new Set()); // multi-select
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState(new Set());
  const [selectedLyricsSong, setSelectedLyricsSong] = useState(null);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showLyricsDrawer, setShowLyricsDrawer] = useState(false);

  // Mini-player global
  const iframeRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [activeYtId, setActiveYtId] = useState(null);
  const [playerState, setPlayerState] = useState('stopped');

  useEffect(() => {
    Song.list('-release_date').then(data => {
      const loaded = data || [];
      setSongs(loaded);
      // Pré-sélectionner toutes les années disponibles
      const years = new Set();
      loaded.forEach(s => {
        const d = parseDate(s.release_date);
        if (d) years.add(d.getFullYear());
      });
      setSelectedYears(years);
      setLoading(false);
    });
  }, []);

  // Années disponibles (pour afficher les pills)
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

  const toggleYear = (yr) => {
    setSelectedYears(prev => {
      const next = new Set(prev);
      next.has(yr) ? next.delete(yr) : next.add(yr);
      return next;
    });
  };

  const toggleMonth = (idx) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleDescription = (songId) => {
    setExpandedDescriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  // Contrôles player
  const sendYTCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }), '*'
    );
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
      setPlayerState('playing');
    }
  };

  const handleOpenLyrics = (song) => {
    setSelectedLyricsSong(song);
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setShowLyricsDrawer(true);
    } else {
      setShowLyricsDialog(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50">
      {/* Iframe cachée — une seule pour toute la page */}
      {activeYtId && (
        <iframe
          key={activeYtId}
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${activeYtId}?enablejsapi=1&autoplay=1&rel=0`}
          title="player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Header */}
      <div className="text-center pt-6 pb-4 px-4">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Pesquisar</h1>
        <p className="text-gray-500 mt-1 text-sm">Encontre uma música do projeto</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Champ de recherche */}
        <div className="relative mb-5">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar música, artista, ano..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm text-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-[#32a2dc]/40 focus:border-[#32a2dc] transition-all"
          />
        </div>

        {/* Filtres par année — multi-select */}
        {availableYears.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2 px-1">Ano</p>
            <div className="flex flex-wrap gap-2">
              {availableYears.map(yr => {
                const active = selectedYears.has(yr);
                return (
                  <button key={yr} onClick={() => toggleYear(yr)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border-2"
                    style={active
                      ? { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e', color: '#fff' }
                      : { backgroundColor: '#fff', borderColor: '#1a1a2e33', color: '#1a1a2e' }
                    }>
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtres par mois — multi-select */}
        <div className="mb-5">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2 px-1">Mês</p>
          <div className="flex flex-wrap gap-2">
            {MONTHS.map(m => {
              const active = selectedMonths.has(m.index);
              return (
                <button key={m.index} onClick={() => toggleMonth(m.index)}
                  title={m.full}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border-2"
                  style={active
                    ? { backgroundColor: m.color, borderColor: m.color, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: m.color + '55', color: m.color }
                  }>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compteur */}
        {hasFilter && !loading && (
          <p className="text-xs text-gray-400 mb-4 px-1">
            {filtered.length === 0
              ? 'Nenhuma música encontrada'
              : `${filtered.length} música${filtered.length > 1 ? 's' : ''} encontrada${filtered.length > 1 ? 's' : ''}`}
          </p>
        )}

        {/* Chargement */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#32a2dc] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* État initial — aucun filtre actif */}
        {!loading && !hasFilter && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Music className="w-16 h-16 mb-4" />
            <p className="text-base font-medium text-center">
              Digite uma palavra ou escolha um mês
            </p>
          </div>
        )}

        {/* Résultats */}
        {!loading && hasFilter && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(song => {
              const slug = titleToSlug(song.title);
              const d = parseDate(song.release_date);
              const monthIdx = d ? d.getMonth() : null;
              const monthColor = monthIdx !== null ? MONTHS[monthIdx].color : '#32a2dc';
              const ytId = extractYouTubeId(song.youtube_url);
              const isActive = activeId === song.id;
              const isPlaying = isActive && playerState === 'playing';
              const isDescriptionExpanded = expandedDescriptionIds.has(song.id);
              const hasLongDescription = (song.description || '').trim().length > 160;

              return (
                <div key={song.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="h-1 w-full" style={{ backgroundColor: monthColor }} />
                  <div className="px-5 py-4">

                    {/* Ligne titre + bouton play */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: monthColor + '18' }}>
                        <Music className="w-4 h-4" style={{ color: monthColor }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {/* Titre */}
                          <div className="min-w-0 flex-1">
                            {slug ? (
                              <Link to={`/musica/${slug}/`}
                                className="text-base font-black text-gray-800 hover:text-[#32a2dc] transition-colors leading-tight block truncate">
                                {song.title}
                              </Link>
                            ) : (
                              <p className="text-base font-black text-gray-800 leading-tight truncate">{song.title}</p>
                            )}
                          </div>

                          {/* Bouton play/pause inline */}
                          {ytId && (
                            <button
                              onClick={() => handleTogglePlay(song)}
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm"
                              style={{ backgroundColor: isPlaying ? monthColor : monthColor + '22' }}
                              aria-label={isPlaying ? 'Pausar' : 'Tocar'}
                            >
                              {isPlaying
                                ? <Pause className="w-3.5 h-3.5 text-white" />
                                : <Play  className="w-3.5 h-3.5 ml-0.5" style={{ color: monthColor }} />
                              }
                            </button>
                          )}
                        </div>

                        <p className="text-sm text-gray-500 mt-0.5">
                          {song.artist}
                          {d && (
                            <span className="text-gray-400 ml-2">
                              · {d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {song.description && (
                      <div className="pl-12 mt-2">
                        <p className={`text-sm text-gray-600 leading-relaxed ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                          {song.description}
                        </p>
                        {hasLongDescription && (
                          <button
                            type="button"
                            onClick={() => toggleDescription(song.id)}
                            className="mt-1.5 text-xs font-semibold text-[#32a2dc] hover:text-[#2589b8] underline underline-offset-2"
                          >
                            {isDescriptionExpanded ? 'Ver menos' : 'Ler mais'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Boutons streaming */}
                    {(song.spotify_url || song.youtube_music_url || song.apple_music_url || song.lyrics) && (
                      <div className="mt-3 pl-12">
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        {song.spotify_url && (
                          <a href={song.spotify_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1DB954]/10 text-[#1DB954] text-xs font-bold hover:bg-[#1DB954]/20 transition-colors sm:w-auto sm:justify-start">
                            🎧 Spotify
                          </a>
                        )}
                        {song.apple_music_url && (
                          <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 text-pink-600 text-xs font-bold hover:bg-pink-100 transition-colors sm:w-auto sm:justify-start">
                            🎵 Apple Music
                          </a>
                        )}
                        {song.youtube_music_url && (
                          <a href={song.youtube_music_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors sm:w-auto sm:justify-start">
                            📱 Video
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenLyrics(song)}
                          disabled={!song.lyrics || !song.lyrics.trim()}
                          className={`inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors sm:w-auto sm:justify-start ${
                            song.lyrics && song.lyrics.trim()
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                          }`}
                          aria-label={song.lyrics && song.lyrics.trim() ? 'Ver letras' : 'Letras indisponíveis'}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Letras
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <LyricsDialog
          open={showLyricsDialog}
          onOpenChange={setShowLyricsDialog}
          song={selectedLyricsSong}
          title={selectedLyricsSong ? `Letras - ${selectedLyricsSong.title}` : 'Letras da Música'}
          maxHeight="h-[55vh]"
        />

        <LyricsDrawer
          open={showLyricsDrawer}
          onOpenChange={setShowLyricsDrawer}
          lyrics={selectedLyricsSong?.lyrics}
          songTitle={selectedLyricsSong?.title}
        />
      </div>
    </div>
  );
}
