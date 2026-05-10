import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Song } from '@/api/entities';
import { useSEO } from '../hooks/useSEO';
import { musicRecordingJsonLd, breadcrumbsJsonLd, injectJsonLd } from '../lib/seo-jsonld';
import { Helmet } from 'react-helmet-async';
import {
  Music,
  Calendar,
  Disc3,
  FileText,
  Sparkles,
  Star,
  Play,
  Pause,
  Square,
  Search as SearchIcon,
  ArrowLeft,
  Share2,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import LyricsDialog from '@/components/LyricsDialog';
import { extractYouTubeId, getYouTubeEmbedInfo, getYouTubeThumbnailUrl, titleToSlug } from '@/lib/utils';
import { saveLastSongSnapshot } from '@/lib/offlineSongStore';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

const CATEGORY_LABELS = {
  internacional: 'Internacional',
  midia: 'Mídia',
  energia: 'Energia',
  esporte: 'Esporte',
  cultura: 'Cultura',
  outros: 'Outros',
  saude: 'Saúde',
  policia: 'Polícia',
  politica: 'Política',
  seguranca: 'Segurança',
  tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia',
};

function getYouTubeEmbedSrc(info, params = '') {
  if (!info?.id) return null;
  const base = 'https://www.youtube-nocookie.com/embed';
  const query = params ? `?${params}` : '';
  return info.type === 'playlist'
    ? `${base}/videoseries?list=${info.id}${params ? `&${params}` : ''}`
    : `${base}/${info.id}${query}`;
}

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
  const [openMobilePanel, setOpenMobilePanel] = useState('contexto');
  const [mobileVideoActive, setMobileVideoActive] = useState(false);

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
    setMobileVideoActive(false);
    setShowFullDescription(false);
    setPlayerBarActive(false);
    setPlayerBarPlaying(false);
  }, [slug]);

  useEffect(() => {
    Song.list('-release_date').then((data) => setAllSongs(data || []));
  }, []);

  const normalizedUrl = slug ? `/musica/${slug.replace(/\/$/, '')}/` : '/musica/';
  const shouldNoindex = !isLoading && errorType === 'invalid_slug';

  const seoTitle = song
    ? (song.subtitle ? `${song.title} — ${song.subtitle} | A Música da Segunda` : `${song.title} — A Música da Segunda`)
    : slug ? slug.replace(/-/g, ' ') : 'A Música da Segunda';
  const seoDescription = song?.description
    ? (song.description.length > 155 ? song.description.slice(0, 152).trimEnd() + '...' : song.description)
    : 'Paródias musicais inteligentes e divertidas sobre as notícias do Brasil.';

  useSEO({
    title: seoTitle,
    description: seoDescription,
    image: song?.cover_image,
    url: normalizedUrl,
    type: 'music.song',
    robots: shouldNoindex ? 'noindex, follow' : 'index, follow, max-video-preview:0',
    publishedTime: song?.release_date || null,
    articleSection: song?.category ? (CATEGORY_LABELS[song.category] || song.category) : null,
  });

  useEffect(() => {
    if (slug) injectJsonLd(breadcrumbsJsonLd({ title: null, slug }), 'song-breadcrumb-schema');
    if (song && slug) {
      const streamingUrls = [song.spotify_url, song.apple_music_url, song.youtube_url, song.youtube_music_url].filter(Boolean);
      const songKeywords = [
        song.title,
        song.subtitle ? song.subtitle.replace(/—.*$/, '').trim() : null,
        song.category ? CATEGORY_LABELS[song.category] || song.category : null,
        'paródia musical', 'música da segunda', 'brasil', 'sátira musical',
      ].filter(Boolean);
      injectJsonLd(musicRecordingJsonLd({
        title: song.title, slug, datePublished: song.release_date,
        image: song.cover_image, byArtist: song.artist || 'A Música da Segunda',
        description: song.description || `Paródia musical de ${song.title} por A Música da Segunda.`,
        streamingUrls,
        keywords: songKeywords,
      }), 'song-music-schema');
      injectJsonLd(breadcrumbsJsonLd({ title: song.title, slug }), 'song-breadcrumb-schema');
    }
    return () => {
      document.getElementById('song-music-schema')?.remove();
      document.getElementById('song-breadcrumb-schema')?.remove();
    };
  }, [song, slug]);

  // Player controls:
  // - yellow button/audio uses youtube_url first (YouTube Music audio/playlist)
  // - video cover uses youtube_music_url first (short/video)
  const youtubeAudioInfo = song
    ? (getYouTubeEmbedInfo(song.youtube_url) || getYouTubeEmbedInfo(song.youtube_music_url))
    : null;
  const youtubeVideoInfo = song
    ? (getYouTubeEmbedInfo(song.youtube_music_url) || getYouTubeEmbedInfo(song.youtube_url))
    : null;
  const youtubeAudioSrc = getYouTubeEmbedSrc(youtubeAudioInfo, 'enablejsapi=1&autoplay=1&rel=0&modestbranding=1');
  const youtubeVideoSrc = getYouTubeEmbedSrc(youtubeVideoInfo, 'autoplay=1&rel=0&modestbranding=1&playsinline=1&controls=1');
  const sendPlayerCommand = (func) => {
    playerIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }), '*'
    );
  };
  const stopPlayerBar = useCallback(() => {
    sendPlayerCommand('stopVideo');
    setPlayerBarActive(false);
    setPlayerBarPlaying(false);
  }, []);
  const handlePlayerPlay = () => {
    if (!youtubeAudioSrc) return;
    setMobileVideoActive(false);
    if (!playerBarActive) { setPlayerBarActive(true); setPlayerBarPlaying(true); }
    else if (playerBarPlaying) { sendPlayerCommand('pauseVideo'); setPlayerBarPlaying(false); }
    else { sendPlayerCommand('playVideo'); setPlayerBarPlaying(true); }
  };
  const handlePlayerStop = () => {
    stopPlayerBar();
  };
  const handleMobileVideoPlay = () => {
    if (!youtubeVideoSrc) return;
    stopPlayerBar();
    setMobileVideoActive(true);
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

  // Related songs: same category, excluding current, max 4
  const relatedSongs = song?.category
    ? allSongs.filter(item => {
        const itemSlug = item.slug || titleToSlug(item.title);
        return item.category === song.category && itemSlug !== slug;
      }).slice(0, 4)
    : [];

  const handleSearchNavigate = (targetSong) => {
    const targetSlug = targetSong.slug || titleToSlug(targetSong.title);
    if (!targetSlug) return;
    setIsSearchFocused(false);
    setSearchQuery('');
    navigate(`/musica/${targetSlug}`);
  };

  const hasGenericCover = song?.cover_image?.includes('/icons/') || song?.cover_image?.includes('icon-512');
  const artwork = (!hasGenericCover && song?.cover_image) ||
    song?.thumbnail_url ||
    (youtubeVideoInfo?.type === 'video' ? `https://img.youtube.com/vi/${youtubeVideoInfo.id}/hqdefault.jpg` : null) ||
    getYouTubeThumbnailUrl(song?.youtube_url || song?.youtube_music_url, 'hqdefault') ||
    BRAND_SQUARE_MEDIUM;

  const isShort = Boolean(
    song?.youtube_music_url?.includes('/shorts/') || song?.youtube_url?.includes('/shorts/')
  );

  const hasVideo = Boolean(
    youtubeVideoInfo || youtubeAudioInfo
  );

  const descriptionPreview = song?.description
    ? song.description.split(/\n{2,}/)[0]?.trim() || song.description
    : '';
  const formattedReleaseDate = song?.release_date
    ? format(parseISO(song.release_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://www.amusicadasegunda.com${normalizedUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${song?.title || 'A Musica da Segunda'} - ${shareUrl}`)}`;
  const mobilePanels = [
    {
      key: 'contexto',
      icon: FileText,
      title: 'Contexto',
      subtitle: 'Entenda o assunto da semana',
      content: descriptionPreview || song?.description || 'Sem contexto disponivel para esta musica.',
    },
    {
      key: 'piada',
      icon: Sparkles,
      title: 'A piada da semana',
      subtitle: 'O humor por tras da musica',
      content: song?.subtitle || descriptionPreview || 'Uma parodia musical sobre a atualidade do Brasil.',
    },
    {
      key: 'letra',
      icon: Music,
      title: 'Letra',
      subtitle: 'Cante junto e compartilhe',
      content: song?.lyrics?.trim() || 'Letra indisponivel para esta musica.',
      action: song?.lyrics?.trim() ? () => setIsLyricsOpen(true) : null,
    },
  ];

  useEffect(() => {
    if (!song) return;

    saveLastSongSnapshot({
      title: song.title,
      artist: song.artist,
      slug: song.slug || slug,
      thumbnail: artwork,
    });
  }, [artwork, slug, song]);

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

  return (
    <>
      <Helmet>
        <html lang="pt-BR" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {playerBarActive && youtubeAudioSrc ? (
        <iframe
          ref={playerIframeRef}
          src={youtubeAudioSrc}
          className="fixed -left-[9999px] -top-[9999px] h-px w-px opacity-0"
          allow="autoplay; encrypted-media"
          title={`${song.title} audio`}
          onLoad={() => sendPlayerCommand('playVideo')}
        />
      ) : null}

      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative hidden max-w-md lg:block">
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
                  const thumb = item.cover_image || getYouTubeThumbnailUrl(item.youtube_url || item.youtube_music_url, 'hqdefault') || BRAND_SQUARE_MEDIUM;
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

        {/* Mobile detail redesign */}
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#050505_0%,#0b0b0b_48%,#050505_100%)] px-4 pb-4 pt-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/78" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/78" aria-label="Compartilhar">
              <Share2 className="h-5 w-5" />
            </a>
          </div>

          <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-black shadow-[0_22px_60px_rgba(0,0,0,0.48)]">
            <div className="aspect-video overflow-hidden">
              {mobileVideoActive && youtubeVideoSrc ? (
                <iframe
                  src={youtubeVideoSrc}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${song.title} video`}
                />
              ) : (
                <img src={artwork} alt={song.subtitle ? `Capa de "${song.title}" - ${song.subtitle}` : `Capa de "${song.title}"`} className="h-full w-full object-cover" loading="eager" />
              )}
            </div>
            {!mobileVideoActive ? (
              <button type="button" onClick={handleMobileVideoPlay} disabled={!youtubeVideoSrc} className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/62 text-white backdrop-blur-sm transition active:scale-95 disabled:opacity-50" aria-label="Tocar video">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </button>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="flex items-end gap-2">
              <h1 className="text-[2rem] font-black leading-none text-white">{song.title}</h1>
              {song.category && CATEGORY_LABELS[song.category] ? (
                <Link to={`/categoria/${song.category}`} className="mb-1 rounded-md border border-app-yellow/35 bg-app-yellow/10 px-1.5 py-0.5 text-[10px] font-black text-app-yellow">
                  {CATEGORY_LABELS[song.category]}
                </Link>
              ) : null}
            </div>
            {song.subtitle ? <p className="mt-2 text-sm font-medium leading-5 text-white/68">{song.subtitle}</p> : null}
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-app-yellow">Audio da musica</p>
                <p className="mt-0.5 text-xs font-medium text-white/48">Controles do link YouTube Music</p>
              </div>
              {playerBarPlaying ? <span className="rounded-full bg-app-yellow/12 px-2.5 py-1 text-[10px] font-black text-app-yellow">Tocando</span> : null}
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <button type="button" onClick={handlePlayerPlay} disabled={!youtubeAudioSrc} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-app-yellow px-5 text-sm font-black text-black shadow-[0_0_32px_rgba(253,224,71,0.28)] transition active:scale-[0.98] disabled:opacity-50" aria-label={playerBarPlaying ? 'Pausar audio' : 'Tocar audio'}>
                {playerBarPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                {playerBarPlaying ? 'Pausar audio' : 'Tocar audio'}
              </button>
              <button type="button" onClick={handlePlayerStop} disabled={!playerBarActive} className="inline-flex h-[54px] w-[54px] items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/72 transition active:scale-95 disabled:opacity-35" aria-label="Parar audio">
                <Square className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-white/42">Ouvir em</p>
            <div className="flex flex-wrap gap-2">
              {song.spotify_url ? (
                <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-3 text-xs font-black text-emerald-400">
                  <Disc3 className="h-3.5 w-3.5" /> Spotify
                </a>
              ) : null}
              {song.youtube_url || song.youtube_music_url ? (
                <a href={song.youtube_url || song.youtube_music_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/12 px-3 text-xs font-black text-red-400">
                  <Play className="h-3.5 w-3.5" /> YouTube
                </a>
              ) : null}
              {song.apple_music_url ? (
                <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-pink-500/25 bg-pink-500/12 px-3 text-xs font-black text-pink-400">
                  <Star className="h-3.5 w-3.5" /> Apple Music
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.045]">
            {mobilePanels.map(({ key, icon: Icon, title, subtitle, content, action }) => {
              const open = openMobilePanel === key;
              return (
                <article key={key} className="border-b border-white/8 last:border-b-0">
                  <button type="button" onClick={() => { if (action) action(); setOpenMobilePanel(open ? null : key); }} className="flex w-full items-center gap-3 px-3.5 py-3 text-left" aria-expanded={open}>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${key === 'piada' ? 'bg-app-yellow/12 text-app-yellow' : 'bg-white/8 text-white/72'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-white">{title}</span>
                      <span className="block truncate text-xs font-medium text-white/52">{subtitle}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-white/42 transition ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open ? <div className="px-4 pb-3 text-sm leading-6 text-white/64"><p className="line-clamp-5 whitespace-pre-line">{content}</p></div> : null}
                </article>
              );
            })}
          </div>

          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-[52px] w-full items-center justify-between rounded-[14px] bg-app-yellow px-4 text-sm font-black text-black shadow-[0_16px_38px_rgba(253,224,71,0.24)]">
            <span className="inline-flex items-center gap-2"><MessageCircle className="h-5 w-5" />Mandar no grupo</span>
            <ChevronDown className="-rotate-90 h-5 w-5" />
          </a>
        </section>

        {/* Mobile-first song experience */}
        <section className="hidden">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={artwork}
              alt=""
              aria-hidden="true"
              className="h-full w-full scale-110 object-cover opacity-[0.18] blur-3xl"
              loading="eager"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.92),rgba(10,10,10,0.74)_35%,rgba(8,8,8,0.96))]" />
          </div>

          <div className="relative space-y-5">
            <div className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-black/24 p-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
                <img
                  src={artwork}
                  alt={song.subtitle ? `Capa de "${song.title}" — ${song.subtitle}` : `Capa de "${song.title}" — A Música da Segunda`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/42">
                  Faixa da semana
                </p>
                <p className="line-clamp-2 text-lg font-bold leading-tight text-white">
                  {song.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/56">
                  <span className="inline-flex items-center gap-1.5">
                    <Disc3 className="h-3.5 w-3.5 text-[#FDE047]" />
                    {song.artist || 'A Musica da Segunda'}
                  </span>
                  {formattedReleaseDate ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#FDE047]" />
                      {formattedReleaseDate}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
                  <Sparkles className="h-3.5 w-3.5 text-[#FDE047]" />
                  Parodia musical
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-[2.55rem] font-black leading-[0.92] tracking-tight text-white">
                  {song.title}
                </h1>
                {song.subtitle && (
                  <p className="text-sm font-medium italic text-white/55 leading-snug">
                    {song.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-white/68">
                  <span className="inline-flex items-center gap-2">
                    <Disc3 className="h-4 w-4 text-[#FDE047]" />
                    {song.artist || 'A Música da Segunda'}
                  </span>
                  {formattedReleaseDate && (
                    <span className="inline-flex items-center gap-2 text-white/45">
                      <Calendar className="h-4 w-4 text-[#FDE047]" />
                      {formattedReleaseDate}
                    </span>
                  )}
                  {song.category && CATEGORY_LABELS[song.category] && (
                    <Link
                      to={`/categoria/${song.category}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-xs font-medium text-white/60 hover:text-white hover:border-white/30 transition"
                    >
                      {CATEGORY_LABELS[song.category]}
                    </Link>
                  )}
                </div>
              </div>

              {song.description?.trim() ? (
                <div className="space-y-3">
                  <p className={`text-sm leading-7 text-white/66 transition-all ${showFullDescription ? '' : 'line-clamp-4'}`}>
                    {showFullDescription ? song.description.trim() : descriptionPreview}
                  </p>
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((value) => !value)}
                      className="text-sm font-semibold text-[#FDE047] transition hover:text-[#fde047]/80"
                    >
                      {showFullDescription ? 'Ver menos' : 'Ver descrição completa'}
                    </button>
                    {song.lyrics?.trim() ? (
                      <button
                        type="button"
                        onClick={() => setIsLyricsOpen(true)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-white/45 transition hover:text-white/70"
                      >
                        <FileText className="h-4 w-4" />
                        Letras
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {song.spotify_url && (
                  <a
                    href={song.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1ed760]"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Spotify
                  </a>
                )}

                {song.apple_music_url && (
                  <a
                    href={song.apple_music_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    Apple Music
                  </a>
                )}

                {song.youtube_url && (
                  <a
                    href={song.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#FF0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#cc0000]"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                    </svg>
                    YouTube Music
                  </a>
                )}
              </div>

              {formattedReleaseDate && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/38">Lançamento</p>
                  <p className="text-base font-bold text-white">
                    {formattedReleaseDate}
                  </p>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* Related songs — mobile */}
        {relatedSongs.length > 0 && (
          <section className="lg:hidden glass-panel rounded-[24px] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                Mais sobre{' '}
                <Link to={`/categoria/${song.category}`} className="text-[#FDE047]">
                  {CATEGORY_LABELS[song.category]}
                </Link>
              </p>
              <Link to={`/categoria/${song.category}`} className="text-[10px] text-white/30 hover:text-white/60 transition">
                Ver todas →
              </Link>
            </div>
            <div className="space-y-2">
              {relatedSongs.map(item => {
                const itemSlug = item.slug || titleToSlug(item.title);
                return (
                  <Link
                    key={item.id || itemSlug}
                    to={`/musica/${itemSlug}`}
                    className="flex flex-col gap-0.5 rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5 transition hover:bg-white/8"
                  >
                    <p className="font-bold text-white text-sm line-clamp-1">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-white/40 italic line-clamp-1">{item.subtitle}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Hero section */}
        <section className="glass-panel desktop-shell-gradient relative hidden overflow-hidden rounded-[36px] p-6 xl:p-8 lg:block">
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

              {/* Title + subtitle + artist + date */}
              <div className="space-y-3">
                <h1 className="text-4xl font-black leading-[0.93] tracking-tight text-white xl:text-5xl 2xl:text-6xl">
                  {song.title}
                </h1>
                {song.subtitle && (
                  <p className="text-base font-medium italic text-white/55 leading-snug">
                    {song.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-base text-white/68">
                  <span className="inline-flex items-center gap-2">
                    <Disc3 className="h-4 w-4 text-[#FDE047]" />
                    {song.artist || 'A Música da Segunda'}
                  </span>
                  {formattedReleaseDate && (
                    <span className="inline-flex items-center gap-2 text-white/45">
                      <Calendar className="h-4 w-4 text-[#FDE047]" />
                      {formattedReleaseDate}
                    </span>
                  )}
                  {song.category && CATEGORY_LABELS[song.category] && (
                    <Link
                      to={`/categoria/${song.category}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-xs font-medium text-white/60 hover:text-white hover:border-white/30 transition"
                    >
                      {CATEGORY_LABELS[song.category]}
                    </Link>
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
              {formattedReleaseDate && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/38">Lançamento</p>
                  <p className="text-base font-bold text-white">
                    {formattedReleaseDate}
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

        {/* Related songs section (desktop) — same category cluster */}
        {relatedSongs.length > 0 && (
          <section className="hidden lg:block glass-panel rounded-[28px] p-6 xl:p-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">
                Outras músicas sobre{' '}
                <Link to={`/categoria/${song.category}`} className="text-[#FDE047] hover:underline">
                  {CATEGORY_LABELS[song.category]}
                </Link>
              </h2>
              <Link
                to={`/categoria/${song.category}`}
                className="text-xs font-medium text-white/40 hover:text-white/70 transition"
              >
                Ver todas →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {relatedSongs.map(item => {
                const itemSlug = item.slug || titleToSlug(item.title);
                return (
                  <Link
                    key={item.id || itemSlug}
                    to={`/musica/${itemSlug}`}
                    className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/4 px-4 py-3 transition hover:bg-white/8 hover:border-white/15"
                  >
                    <p className="font-bold text-white text-sm leading-snug line-clamp-2">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-white/40 italic line-clamp-1">{item.subtitle}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Sticky bottom player bar (desktop) */}
        <div className="sticky bottom-4 z-30 hidden lg:block">
          <div className="glass-panel rounded-[30px] px-6 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-6">
              {/* Cover + hidden iframe + info */}
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img src={artwork} alt="" aria-hidden="true" className="h-full w-full object-cover" loading="lazy" />
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
                  disabled={!youtubeAudioSrc}
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

      <LyricsDialog
        open={isLyricsOpen}
        onOpenChange={setIsLyricsOpen}
        song={song}
        title={`Letras — ${song.title}`}
      />
    </>
  );
}
