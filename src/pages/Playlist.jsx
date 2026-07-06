import { useState, useEffect, useRef } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { Song } from '@/api/entities';
import { musicPlaylistJsonLd, injectJsonLd, removeJsonLd } from '../lib/seo-jsonld';
import DesktopPageShell, { DesktopMetric, DesktopSurface } from '@/components/DesktopPageShell';
import { CalendarDays, Disc3, ExternalLink, Headphones, MoreHorizontal, Pause, Play, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getYouTubeEmbedInfo, getYouTubeThumbnailUrl, titleToSlug } from '@/lib/utils';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

const CATEGORY_LABELS = {
  politica: 'Politica',
  bbb: 'BBB',
  economia: 'Economia',
  cultura: 'Cultura',
  futebol: 'Futebol',
  trabalho: 'Trabalho',
  celebridades: 'Celebridades',
  nostalgia: 'Nostalgia',
  'caos nacional': 'Caos nacional',
};

function getCatalogDateParts(dateValue) {
  if (!dateValue) {
    return { day: '--', month: '---', year: '' };
  }

  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { day: '--', month: '---', year: '' };
  }

  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(parsed)
    .replace('.', '')
    .toUpperCase();

  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(parsed),
    month,
    year: new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(parsed),
  };
}

function getSongYouTubeUrl(song) {
  return song?.youtube_music_url || song?.youtube_url || '';
}

function getSongPlayUrl(song) {
  return song?.youtube_url || song?.youtube_music_url || '';
}

function getSongKey(song) {
  return String(song?.id || song?.slug || song?.title || getSongPlayUrl(song));
}

// Résout un ID de vidéo YouTube JOUABLE pour une chanson.
// On teste youtube_url puis youtube_music_url et on ne garde qu'un embed de type
// `video` (une playlist music.youtube n'expose pas d'ID lisible via l'API).
function getSongVideoId(song) {
  for (const url of [getSongPlayUrl(song), song?.youtube_music_url]) {
    const info = getYouTubeEmbedInfo(url || '');
    if (info?.type === 'video' && info.id) return info.id;
  }
  return null;
}

function getSongThumb(song) {
  const youtubeThumb = getYouTubeThumbnailUrl(getSongYouTubeUrl(song), 'hqdefault');
  return youtubeThumb || song?.cover_image_url || song?.image_url || BRAND_SQUARE_MEDIUM;
}

function getSongCategory(song) {
  const raw = song?.category || song?.theme || '';
  const key = String(raw).toLowerCase();
  return CATEGORY_LABELS[key] || raw || 'Música';
}

function getSongPath(song) {
  const slug = song?.slug || titleToSlug(song?.title);
  return slug ? `/musica/${slug}` : '/musica';
}

export default function Playlist() {
  const [songs, setSongs] = useState([]);
  const [playingSongKey, setPlayingSongKey] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const playerRef = useRef(null);

  const sendPlayerCommand = (func, args = []) => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  };

  // IMPORTANT (iOS/PWA) : la lecture doit partir d'un geste utilisateur sur un
  // player DÉJÀ chargé. On garde donc un unique iframe persistant (préchargé) et
  // on lui envoie loadVideoById/playVideo directement dans le onClick du tap.
  // Un iframe créé au moment du tap avec autoplay=1 est bloqué par iOS.
  const handleTogglePlay = (song, songKey) => {
    const videoId = getSongVideoId(song);
    if (!videoId) return;
    if (playingSongKey === songKey) {
      if (isPaused) {
        sendPlayerCommand('playVideo');
        setIsPaused(false);
      } else {
        sendPlayerCommand('pauseVideo');
        setIsPaused(true);
      }
      return;
    }
    sendPlayerCommand('loadVideoById', [videoId]);
    setPlayingSongKey(songKey);
    setIsPaused(false);
  };

  // Premier ID jouable du catalogue : sert à initialiser le player persistant
  // (l'API JS de l'iframe devient prête bien avant le premier tap utilisateur).
  const firstPlayableId = songs.map(getSongVideoId).find(Boolean) || null;
  const playerOrigin = typeof window !== 'undefined'
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';

  const handleShareSong = async (song) => {
    const songUrl = getSongPlayUrl(song);
    const pageUrl = `${window.location.origin}${getSongPath(song)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: song?.title || 'A Música da Segunda',
          text: song?.description || 'Ouça essa zoeira da segunda.',
          url: songUrl || pageUrl,
        });
        return;
      }

      await navigator.clipboard?.writeText(songUrl || pageUrl);
    } catch (error) {
      console.warn('Share canceled or unavailable:', error);
    }
  };

  // Charger toutes les chansons pour le JSON-LD
  useEffect(() => {
    const loadSongs = async () => {
      try {
        const allSongs = await Song.list('-release_date');
        setSongs(allSongs || []);
      } catch (error) {
        console.error('Error loading songs for playlist:', error);
        setSongs([]);
      }
    };
    loadSongs();
  }, []);

  // Inject JSON-LD MusicPlaylist
  useEffect(() => {
    if (songs.length > 0) {
      const tracks = songs.map(song => ({
        title: song.title,
        slug: song.slug,
        artist: song.artist || 'A Música da Segunda',
        datePublished: song.release_date
      }));

      const playlistSchema = musicPlaylistJsonLd({ tracks });
      injectJsonLd(playlistSchema, 'playlist-music-schema');

      return () => {
        removeJsonLd('playlist-music-schema');
      };
    }
  }, [songs]);

  // SEO pour la playlist
  useSEO({
    title: 'Playlist Completa - Todas as Descobertas Musicais',
    description: 'Playlist completa com todas as descobertas musicais do Música da Segunda. Ouça no Spotify, Apple Music e YouTube Music.',
    keywords: 'playlist música da segunda, descobertas musicais, spotify playlist, apple music, youtube music, todas as músicas',
    url: '/musica',
    type: 'website'
  });

  return (
    <>
      <Helmet>
        <html lang="pt-BR" />
        <meta name="robots" content="index, follow, max-video-preview:0" />
      </Helmet>

      {/* Layout Desktop - Inchangé */}
      <DesktopPageShell
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5 text-[#FDE047]" />
            Playlist Oficial
          </>
        }
        title="Todas as músicas em uma fila contínua"
        description="A playlist desktop mantém o shell streaming da home, com acesso direto ao catálogo completo no Spotify e atalhos rápidos para o ecossistema do projeto."
        actions={
          <>
            <a
              href="https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH?si=c32b67518b2a4817"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="rounded-full bg-[#FDE047] px-6 py-6 text-sm font-bold text-black hover:bg-[#fde047]/90">
                <Headphones className="mr-2 h-4 w-4" />
                Abrir no Spotify
              </Button>
            </a>
            <a
              href="https://music.youtube.com/playlist?list=PLmoOyuQg7Y2QZKbcj20s7dcadsVx7WuWH"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/5 px-5 py-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                YouTube Music
              </Button>
            </a>
          </>
        }
        stats={
          <>
            <DesktopMetric label="Faixas publicadas" value={songs.length} accent />
            <DesktopMetric label="Atualização" value="Semanal" />
            <DesktopMetric label="Player" value="Spotify" />
          </>
        }
        sideContent={
          <>
            <div className="glass-panel rounded-[28px] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Curadoria</p>
              <h2 className="mt-3 text-xl font-bold text-white">A sequência completa das segundas</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Todas as músicas já lançadas, em ordem contínua, sem sair do shell desktop.
              </p>
            </div>
            <div className="glass-panel rounded-[28px] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE047]/14 text-[#FDE047]">
                  <Disc3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Playlist ativa</p>
                  <p className="text-sm text-white/55">Embed otimizado com lazy load</p>
                </div>
              </div>
            </div>
          </>
        }
      >
        <DesktopSurface className="overflow-hidden p-4">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <iframe
              data-testid="embed-iframe"
              src="https://open.spotify.com/embed/playlist/5z7Jan9yS1KRzwWEPYs4sH?utm_source=generator"
              width="100%"
              height="720"
              frameBorder="0"
              allowFullScreen=""
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              fetchPriority="low"
              title="Playlist Spotify - MÃºsica da Segunda"
              className="min-h-[720px] w-full"
            />
          </div>
        </DesktopSurface>
      </DesktopPageShell>

      <div className="hidden">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
                <img 
                  src="/images/Musica da segunda.jpg" 
                  alt="Logo A Música da Segunda - Paródias Musicais do Brasil"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="text-left">
                <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg mb-2">
                  Playlist
                </h1>
                <p className="text-white/90 font-medium text-lg drop-shadow-md">
                  Ouça todas as músicas da Música da Segunda
                </p>
              </div>
            </div>
          </div>

          {/* Spotify Playlist */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl">
            <div className="w-full">
              <iframe 
                data-testid="embed-iframe" 
                style={{borderRadius: '12px'}} 
                src="https://open.spotify.com/embed/playlist/5z7Jan9yS1KRzwWEPYs4sH?utm_source=generator" 
                width="100%" 
                height="600"
                frameBorder="0" 
                allowFullScreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                title="Playlist Spotify - Música da Segunda"
                className="shadow-lg md:h-[600px] h-[500px]"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Mobile */}
      <div className="lg:hidden min-h-[calc(100dvh-72px)] bg-black px-4 pb-7 pt-4 text-white">
        <section className="mx-auto flex w-full max-w-[390px] flex-col landscape:max-w-[860px]">
          <header className="mb-3 flex items-center justify-between">
            <h1 className="text-[22px] font-black leading-none tracking-[-0.01em] text-white">
              Últimas Segundas
            </h1>
            <button
              type="button"
              aria-label="Calendário"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/85"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </header>

          <div className="space-y-2.5 landscape:grid landscape:grid-cols-2 landscape:gap-2.5 landscape:space-y-0">
            {songs.length === 0 ? (
              <div className="rounded-[14px] border border-white/10 bg-[#111111] p-5 text-center text-sm font-semibold text-white/60">
                Carregando catálogo...
              </div>
            ) : (
              songs.map((song) => {
                const dateParts = getCatalogDateParts(song.release_date);
                const videoId = getSongVideoId(song);
                const songKey = getSongKey(song);
                const songPath = getSongPath(song);
                const isActive = playingSongKey === songKey;
                const isPlaying = isActive && !isPaused;

                return (
                  <article
                    key={songKey}
                    className="relative grid min-h-[118px] grid-cols-[36px_88px_minmax(0,1fr)] gap-2 rounded-[14px] border border-white/10 bg-[#121212] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.32)]"
                  >
                    <div className="flex flex-col items-center justify-center rounded-[10px] bg-white/[0.035] px-1 text-center">
                      <span className="text-[20px] font-black leading-none text-white">
                        {dateParts.day}
                      </span>
                      <span className="mt-1 text-[9px] font-black uppercase leading-none text-white/72">
                        {dateParts.month}
                      </span>
                      <span className="mt-1 text-[9px] font-bold leading-none text-white/42">
                        {dateParts.year}
                      </span>
                    </div>

                    <Link
                      to={songPath}
                      aria-label={`Abrir ${song.title}`}
                      className="relative overflow-hidden rounded-[10px] bg-white/5"
                    >
                      <img
                        src={getSongThumb(song)}
                        alt={song.title || 'Música da Segunda'}
                        className="h-full min-h-[102px] w-full object-cover"
                        loading="lazy"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-col py-0.5">
                      <Link
                        to={songPath}
                        className="truncate text-[13px] font-black leading-tight text-white hover:text-[#FDE047]"
                      >
                        {song.title}
                      </Link>
                      <span className="mt-1 w-fit rounded-[5px] border border-[#FDE047]/35 bg-[#FDE047]/10 px-1.5 py-0.5 text-[9px] font-black leading-none text-[#FDE047]">
                        {getSongCategory(song)}
                      </span>
                      <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-[1.25] text-white/66">
                        {song.description || song.excerpt || 'A zoeira da semana em formato de musica.'}
                      </p>

                      <div className="mt-auto flex items-center gap-2 pt-2">
                        {videoId ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePlay(song, songKey)}
                            aria-label={isPlaying ? `Pausar ${song.title}` : `Tocar video de ${song.title}`}
                            className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                              isPlaying
                                ? 'bg-white text-black'
                                : 'bg-[#FDE047] text-black hover:bg-[#FDE047]/90'
                            }`}
                          >
                            {isPlaying ? (
                              <Pause className="h-4.5 w-4.5 fill-current" />
                            ) : (
                              <Play className="h-4.5 w-4.5 fill-current" />
                            )}
                          </button>
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-white/30">
                            <Play className="h-4.5 w-4.5" />
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleShareSong(song)}
                          aria-label={`Compartilhar ${song.title}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white transition hover:bg-white/15"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>

                        <Link
                          to={songPath}
                          aria-label={`Mais detalhes de ${song.title}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white transition hover:bg-white/15"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Player audio persistant (unique). Préchargé et caché : la lecture est
              déclenchée dans le geste du tap (loadVideoById/playVideo) — seul moyen
              fiable de jouer le son sur iOS/PWA. */}
          {firstPlayableId && (
            <iframe
              ref={playerRef}
              title="Player de áudio"
              src={`https://www.youtube-nocookie.com/embed/${firstPlayableId}?enablejsapi=1&playsinline=1&controls=0&rel=0${playerOrigin}`}
              allow="autoplay; encrypted-media"
              className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
        </section>
      </div>
    </>
  );
}
