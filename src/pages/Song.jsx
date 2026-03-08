import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Song } from '@/api/entities';
import { useSEO } from '../hooks/useSEO';
import { musicRecordingJsonLd, breadcrumbsJsonLd, injectJsonLd } from '../lib/seo-jsonld';
import { Helmet } from 'react-helmet-async';
import {
  Music,
  Calendar,
  User,
  Disc3,
  FileText,
  Sparkles,
  Play,
  Pause,
  Square,
  Search as SearchIcon,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import LyricsDialog from '@/components/LyricsDialog';
import { extractYouTubeId, getYouTubeThumbnailUrl, titleToSlug } from '@/lib/utils';

export default function SongPage() {
  const { slug: rawSlug } = useParams();
  const navigate = useNavigate();
  const rawNormalized = rawSlug ? rawSlug.replace(/\/$/, '').trim() : null;
  const slug = rawNormalized && /^[a-z0-9-]+$/.test(rawNormalized) ? rawNormalized : null;

  const [song, setSong] = useState(null);
  const [allSongs, setAllSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);

  // UI state
  const [videoActivated, setVideoActivated] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Mini player bar
  const playerIframeRef = useRef(null);
  const [playerBarActive, setPlayerBarActive] = useState(false);
  const [playerBarPlaying, setPlayerBarPlaying] = useState(false);

  useEffect(() => {
    if (rawSlug && rawSlug.endsWith('/')) {
      navigate(`/musica/${slug}`, { replace: true });
    }
  }, [rawSlug, slug, navigate]);

  useEffect(() => {
    const loadSongData = async () => {
      if (!slug) {
        setIsLoading(false);
        setErrorType('invalid_slug');
        setError('Slug inválido');
        return;
      }
      setIsLoading(true);
      setError(null);
      setErrorType(null);
      try {
        const songData = await Song.getBySlug(slug);
        if (!songData) {
          setErrorType('not_found');
          setError('Música não encontrada');
          setSong(null);
          return;
        }
        setSong(songData);
      } catch (err) {
        if (import.meta.env?.DEV) console.error('Error loading song:', err);
        setErrorType('fetch_error');
        setError('Erro temporário ao carregar a música');
        setSong(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadSongData();
  }, [slug]);

  // Reset player state on song change
  useEffect(() => {
    setVideoActivated(false);
    setShowFullDescription(false);
    setPlayerBarActive(false);
    setPlayerBarPlaying(false);
  }, [slug]);

  useEffect(() => {
    Song.list('-release_date').then((data) => setAllSongs(data || []));
  }, []);

  const normalizedUrl = slug ? `/musica/${slug.replace(/\/$/, '')}/` : '/musica/';
  const shouldNoindex = !isLoading && errorType === 'invalid_slug';

  useSEO({
    title: song ? song.title : slug ? slug.replace(/-/g, ' ') : 'A Música da Segunda',
    description: song
      ? `Letra, áudio e história de "${song.title}" — nova música da segunda.`
      : 'Paródias musicais inteligentes e divertidas sobre as notícias do Brasil.',
    keywords: song ? `${song.title}, música da segunda, paródias musicais` : 'música da segunda, paródias musicais',
    image: song?.cover_image,
    url: normalizedUrl,
    type: 'music.song',
    robots: shouldNoindex ? 'noindex, follow' : 'index, follow, max-video-preview:0',
  });

  useEffect(() => {
    if (slug) injectJsonLd(breadcrumbsJsonLd({ title: null, slug }), 'song-breadcrumb-schema');
    if (song && slug) {
      const streamingUrls = [song.spotify_url, song.apple_music_url, song.youtube_url, song.youtube_music_url].filter(Boolean);
      injectJsonLd(musicRecordingJsonLd({
        title: song.title, slug, datePublished: song.release_date,
        image: song.cover_image, byArtist: song.artist || 'A Música da Segunda',
        description: song.description || `Paródia musical de ${song.title} por A Música da Segunda.`,
        streamingUrls,
      }), 'song-music-schema');
      injectJsonLd(breadcrumbsJsonLd({ title: song.title, slug }), 'song-breadcrumb-schema');
    }
    return () => {
      document.getElementById('song-music-schema')?.remove();
      document.getElementById('song-breadcrumb-schema')?.remove();
    };
  }, [song, slug]);

  // Player bar controls
  const youtubeIdForPlayer = song ? extractYouTubeId(song.youtube_url || song.youtube_music_url) : null;
  const sendPlayerCommand = (func) => {
    playerIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }), '*'
    );
  };
  const handlePlayerPlay = () => {
    if (!youtubeIdForPlayer) return;
    if (!playerBarActive) { setPlayerBarActive(true); setPlayerBarPlaying(true); }
    else if (playerBarPlaying) { sendPlayerCommand('pauseVideo'); setPlayerBarPlaying(false); }
    else { sendPlayerCommand('playVideo'); setPlayerBarPlaying(true); }
  };
  const handlePlayerStop = () => {
    sendPlayerCommand('stopVideo');
    setPlayerBarActive(false);
    setPlayerBarPlaying(false);
  };

  // Search
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchSuggestions = normalizedSearch
    ? allSongs.filter((item) => {
        const itemSlug = item.slug || titleToSlug(item.title);
        if (itemSlug === slug) return false;
        return item.title?.toLowerCase().includes(normalizedSearch) || item.artist?.toLowerCase().includes(normalizedSearch);
      }).slice(0, 5)
    : allSongs.filter((item) => (item.slug || titleToSlug(item.title)) !== slug).slice(0, 4);

  const handleSearchNavigate = (targetSong) => {
    const targetSlug = targetSong.slug || titleToSlug(targetSong.title);
    if (!targetSlug) return;
    setIsSearchFocused(false);
    setSearchQuery('');
    navigate(`/musica/${targetSlug}`);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Helmet><html lang="pt-BR" /></Helmet>
        <div className="h-12 w-64 rounded-full bg-white/8" />
        <div className="glass-panel relative overflow-hidden rounded-[36px] p-6 xl:p-8">
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_minmax(0,260px)] xl:grid-cols-[1fr_minmax(0,330px)] 2xl:grid-cols-[1fr_minmax(0,410px)]">
            <div className="space-y-5">
              <div className="h-5 w-32 rounded-full bg-white/8" />
              <div className="space-y-3">
                <div className="h-14 w-4/5 rounded-2xl bg-white/10" />
                <div className="h-14 w-3/5 rounded-2xl bg-white/10" />
              </div>
              <div className="h-5 w-48 rounded-full bg-white/6" />
              <div className="space-y-2"><div className="h-4 w-full rounded bg-white/6" /><div className="h-4 w-4/5 rounded bg-white/6" /></div>
              <div className="flex gap-3">
                <div className="h-12 w-36 rounded-full bg-white/10" />
                <div className="h-12 w-32 rounded-full bg-white/8" />
              </div>
            </div>
            <div className="aspect-[9/16] rounded-[34px] bg-white/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="glass-panel rounded-[30px] p-8 text-center max-w-sm">
          <Music className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <h1 className="text-lg font-bold text-white mb-2">{error || 'Música não encontrada'}</h1>
          <p className="text-sm text-white/50 mb-6">
            {errorType === 'fetch_error'
              ? 'Problema temporário ao carregar. Tente novamente.'
              : `A música "${slug}" não foi encontrada.`}
          </p>
          <button onClick={() => navigate('/')}
            className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const artwork = song.cover_image ||
    getYouTubeThumbnailUrl(song.youtube_url || song.youtube_music_url, 'hqdefault') ||
    '/images/Caipivara_square.png';

  const isShort = Boolean(
    song.youtube_music_url?.includes('/shorts/') || song.youtube_url?.includes('/shorts/')
  );

  const hasVideo = Boolean(
    (song.youtube_url?.trim()) || (song.youtube_music_url?.trim())
  );

  const descriptionPreview = song.description
    ? song.description.split(/\n{2,}/)[0]?.trim() || song.description
    : '';

  return (
    <>
      <Helmet>
        <html lang="pt-BR" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); if (searchSuggestions[0]) handleSearchNavigate(searchSuggestions[0]); else navigate('/search'); }}>
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder="Pesquisar outra música…"
              className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#FDE047]/40 focus:bg-white/8"
            />
          </form>
          {isSearchFocused && searchSuggestions.length > 0 && (
            <div className="glass-panel absolute left-0 top-13 z-20 w-full overflow-hidden rounded-[24px] mt-1">
              <div className="p-2">
                {searchSuggestions.map((item) => {
                  const itemSlug = item.slug || titleToSlug(item.title);
                  const thumb = item.cover_image || getYouTubeThumbnailUrl(item.youtube_url || item.youtube_music_url, 'hqdefault') || '/images/Caipivara_square.png';
                  return (
                    <button key={itemSlug} type="button" onClick={() => handleSearchNavigate(item)}
                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition hover:bg-white/6">
                      <img src={thumb} alt="" className="h-10 w-10 rounded-xl border border-white/10 object-cover" loading="lazy" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        <p className="truncate text-xs text-white/50">{item.artist || 'A Música da Segunda'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hero section */}
        <section className="glass-panel desktop-shell-gradient relative overflow-hidden rounded-[36px] p-6 xl:p-8">
          {/* Background artwork blur */}
          <div className="absolute inset-0 overflow-hidden">
            <img src={artwork} alt="" aria-hidden="true"
              className="h-full w-full scale-110 object-cover opacity-20 blur-3xl" loading="eager" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,10,10,0.82),rgba(10,10,10,0.48)_45%,rgba(10,10,10,0.94))]" />
          </div>

          <div className="relative grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,260px)] xl:grid-cols-[1fr_minmax(0,330px)] 2xl:grid-cols-[1fr_minmax(0,410px)]">
            {/* ── Left column ── */}
            <div className="flex flex-col gap-5">
              {/* Badge */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
                  <Sparkles className="h-3.5 w-3.5 text-[#FDE047]" />
                  Paródia musical
                </span>
              </div>

              {/* Title + artist + date */}
              <div className="space-y-3">
                <h1 className="text-4xl font-black leading-[0.93] tracking-tight text-white xl:text-5xl 2xl:text-6xl">
                  {song.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-base text-white/68">
                  <span className="inline-flex items-center gap-2">
                    <Disc3 className="h-4 w-4 text-[#FDE047]" />
                    {song.artist || 'A Música da Segunda'}
                  </span>
                  {song.release_date && (
                    <span className="inline-flex items-center gap-2 text-white/45">
                      <Calendar className="h-4 w-4 text-[#FDE047]" />
                      {format(parseISO(song.release_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>

              {/* Description inline */}
              {song.description?.trim() && (
                <div className="max-w-xl">
                  <p className={`text-sm leading-7 text-white/62 xl:text-base transition-all ${showFullDescription ? '' : 'line-clamp-3'}`}>
                    {song.description.trim()}
                  </p>
                  <div className="mt-2 flex items-center gap-5">
                    <button type="button"
                      onClick={() => setShowFullDescription(v => !v)}
                      className="text-sm font-semibold text-[#FDE047] transition hover:text-[#fde047]/80">
                      {showFullDescription ? 'Ver menos' : 'Ver descrição completa'}
                    </button>
                    {song.lyrics?.trim() && (
                      <button type="button" onClick={() => setIsLyricsOpen(true)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-white/45 transition hover:text-white/70">
                        <FileText className="h-4 w-4" />
                        Letras
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {/* Spotify */}
                {song.spotify_url && (
                  <a href={song.spotify_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1ed760]">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Spotify
                  </a>
                )}

                {/* Apple Music */}
                {song.apple_music_url && (
                  <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Apple Music
                  </a>
                )}

                {/* YouTube Music */}
                {song.youtube_url && (
                  <a href={song.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#FF0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#cc0000]">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                    </svg>
                    YouTube Music
                  </a>
                )}
              </div>

              {/* Nav: lançamento date display */}
              {song.release_date && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/38">Lançamento</p>
                  <p className="text-base font-bold text-white">
                    {format(parseISO(song.release_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}

              {/* Play button */}
              {hasVideo && (
                <div className="pt-1">
                  <button
                    onClick={handlePlayerPlay}
                    className="inline-flex items-center gap-2.5 rounded-full bg-[#FDE047] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#fde047]/90"
                    aria-label={playerBarPlaying ? 'Pausar' : 'Ouvir agora'}
                  >
                    {playerBarPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                    {playerBarPlaying ? 'Pausar' : 'Ouvir agora'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Right column: Video ── */}
            <div id="song-video-panel" className="relative">
              <div className="absolute -inset-8 rounded-[40px] bg-[#FDE047]/10 blur-3xl" />
              <div className="glass-panel relative overflow-hidden rounded-[34px] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                {/* Video */}
                <div className={`relative overflow-hidden rounded-t-[34px] bg-black ${isShort ? 'aspect-[9/16]' : 'aspect-video'}`}>
                  {isShort && (
                    <>
                      <img src={artwork} alt="" aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover blur-3xl scale-110 opacity-25" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(253,224,71,0.14),transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.5))]" />
                    </>
                  )}
                  <div className="relative h-full">
                    {hasVideo ? (
                      <YouTubeEmbed
                        youtubeMusicUrl={song.youtube_music_url}
                        youtubeUrl={song.youtube_url}
                        title={song.title}
                        useFacade
                        autoplayOnActivate
                        thumbnailQuality="hqdefault"
                        forceActivated={videoActivated}
                        shortMaxWidth={520}
                      />
                    ) : (
                      <div className="flex h-full min-h-[16rem] items-center justify-center">
                        <div className="text-center text-white/50">
                          <Music className="mx-auto mb-3 h-12 w-12" />
                          <p className="font-medium">Vídeo não disponível</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Em destaque strip */}
                <div className="grid grid-cols-[auto,1fr] gap-4 px-4 py-3">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <img src={artwork} alt="" aria-hidden="true" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">Em destaque</p>
                    <h2 className="truncate text-lg font-bold text-white">{song.title}</h2>
                    <p className="truncate text-sm text-white/58">{song.artist || 'A Música da Segunda'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sticky bottom player bar (desktop) */}
        <div className="sticky bottom-4 z-30 hidden lg:block">
          <div className="glass-panel rounded-[30px] px-6 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-6">
              {/* Cover + hidden iframe + info */}
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {playerBarActive && youtubeIdForPlayer ? (
                    <iframe
                      ref={playerIframeRef}
                      src={`https://www.youtube-nocookie.com/embed/${youtubeIdForPlayer}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`}
                      className="absolute inset-0 h-full w-full"
                      allow="autoplay; encrypted-media"
                      title={song.title}
                    />
                  ) : (
                    <img src={artwork} alt="" aria-hidden="true" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{song.title}</p>
                  <p className="truncate text-xs text-white/50">{song.artist || 'A Música da Segunda'}</p>
                </div>
              </div>

              {/* Play controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handlePlayerPlay}
                  disabled={!youtubeIdForPlayer}
                  className="h-12 w-12 inline-flex items-center justify-center rounded-full bg-[#FDE047] text-black shadow-lg transition hover:scale-105 disabled:opacity-40"
                  aria-label={playerBarPlaying ? 'Pausar' : 'Tocar'}
                >
                  {playerBarPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                </button>
                {playerBarActive && (
                  <button
                    onClick={handlePlayerStop}
                    className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                    aria-label="Parar"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Lyrics dialog */}
      <LyricsDialog
        open={isLyricsOpen}
        onOpenChange={setIsLyricsOpen}
        song={song}
        title={`Letras — ${song.title}`}
      />
    </>
  );
}
