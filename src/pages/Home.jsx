import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import MobileFeed from '@/components/mobile/feed/MobileFeed';
import LyricsDialog from '../components/LyricsDialog';
import HomeDesktop from './home/HomeDesktop';
import { useShell } from '@/components/mobile/ShellContext';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { getDocumentTitle } from '@/lib/documentTitle';
import { CURRENT_SONG_ARTWORK } from '@/generated/currentSongArtwork';
import { useHomeSongs } from '@/hooks/useHomeSongs';
import { markFirstScreenSettled } from '@/lib/firstScreen';

const MOBILE_QUERY = '(max-width: 767px)';

function matchesMobile() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
}

// VideoObject JSON-LD removed from all pages (GSC: "Video isn't on a watch page")
// No page in this app is a dedicated watch page for a single video.

function DesktopSkeleton() {
  return (
    <div className="hidden md:block space-y-8 animate-pulse">
      <div className="glass-panel desktop-shell-gradient relative overflow-hidden rounded-[36px] p-6 xl:p-8 min-h-[460px] xl:min-h-[500px]">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,260px)] xl:grid-cols-[1fr_minmax(0,330px)] 2xl:grid-cols-[1fr_minmax(0,410px)]">
          {/* Left column skeleton */}
          <div className="flex flex-col justify-between gap-6 min-h-[408px] xl:min-h-[444px]">
            <div className="space-y-5">
              <div className="h-5 w-32 rounded-full bg-white/10" />
              <div className="space-y-3">
                <div className="h-10 w-3/4 rounded-2xl bg-white/12" />
                <div className="h-10 w-1/2 rounded-2xl bg-white/12" />
              </div>
              <div className="h-5 w-40 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-white/8" />
                <div className="h-4 w-5/6 rounded bg-white/8" />
                <div className="h-4 w-2/3 rounded bg-white/8" />
              </div>
              <div className="space-y-1 pt-1">
                <div className="h-3 w-24 rounded bg-white/8" />
                <div className="h-5 w-44 rounded bg-white/10" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-24 rounded-full bg-white/12" />
              <div className="h-11 w-24 rounded-full bg-white/10" />
              <div className="h-11 w-28 rounded-full bg-white/10" />
            </div>
          </div>
          {/* Right column skeleton — aspect ratio mirrors real video */}
          <div className="rounded-[34px] bg-white/6 aspect-video" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // Layout rend cette page deux fois (coquille mobile + coquille desktop masquée) : le
  // feed, qui crée une iframe YouTube, ne doit exister que dans la copie mobile.
  const shell = useShell();
  const [isMobileViewport, setIsMobileViewport] = useState(matchesMobile);
  const [lyricsSong, setLyricsSong] = useState(null);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);

  const { currentSong, allSongs, isLoading, error, reload } = useHomeSongs({
    deferDescriptions: isMobileViewport,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener?.('change', updateViewport);
    return () => mediaQuery.removeEventListener?.('change', updateViewport);
  }, []);

  // « Ouvir » depuis Catálogo : /?musica=<slug> ouvre le feed sur cette chanson.
  const [searchParams, setSearchParams] = useSearchParams();
  const startSlug = searchParams.get('musica');
  // Feed mobile : la chanson de la semaine d'abord, puis le reste du catalogue du plus
  // récent au plus ancien (allSongs est déjà trié par release_date décroissante).
  const mobileFeedSongs = useMemo(() => {
    if (!currentSong) return allSongs;
    const sameSong = (song) =>
      (song?.id != null && song.id === currentSong.id) || (song?.slug && song.slug === currentSong.slug);
    return [currentSong, ...allSongs.filter((song) => !sameSong(song))];
  }, [currentSong, allSongs]);

  const showMobile = isMobileViewport && shell !== 'desktop';

  useSEO({
    title: 'A Musica da Segunda | Parodias Musicais e Humor Inteligente',
    description: 'A Musica da Segunda - Nova musica toda segunda-feira! Parodias musicais inteligentes sobre as noticias do Brasil. Descubra humor e musica para sua semana.',
    keywords: 'musica da segunda, parodias musicais, noticias do brasil, musica brasileira, descoberta musical, nova musica toda segunda, parodias inteligentes',
    image: currentSong?.cover_image || 'https://www.amusicadasegunda.com/images/og-caipivara-1200x630.jpg',
    url: '/',
    type: 'website',
    // SEO fix: disable video indexing on homepage.
    // Homepage is not a dedicated watch page for a single stable video.
    // Keep max-video-preview:0 here.
    robots: 'index, follow, max-video-preview:0'
  });

  // VideoObject JSON-LD intentionally removed from homepage.
  // Google expects a dedicated watch page with a single canonical video.
  // Song pages are the appropriate pages for video context.
  // Les pages /musica/{slug} sont les vraies "watch pages" avec VideoObject.

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{getDocumentTitle('A Musica da Segunda: Parodias das Noticias do Brasil')}</title>
          <meta name="description" content="A Musica da Segunda: As Noticias do Brasil em Forma de Parodia. Site oficial de parodias musicais inteligentes e divertidas." />
        </Helmet>

        {/* Mobile skeleton */}
        <div className="md:hidden flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60" />
        </div>

        {/* Desktop skeleton — mirrors the real hero layout */}
        <DesktopSkeleton />
      </>
    );
  }

  if (error && !currentSong) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Helmet>
          <title>{getDocumentTitle('A Musica da Segunda: Parodias das Noticias do Brasil')}</title>
          <meta name="description" content="A Musica da Segunda: As Noticias do Brasil em Forma de Parodia. Site oficial de parodias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="glass-panel rounded-[30px] p-8 text-center max-w-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h3 className="text-lg font-bold text-white mb-2">Erro ao carregar</h3>
          <p className="text-sm text-white/58 mb-6">{error}</p>
          <button
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-md md:max-w-2xl lg:max-w-none lg:p-5">
      {/* Desktop app shell: hero + grid + player */}
      <HomeDesktop currentSong={currentSong} allSongs={allSongs} isMobileViewport={isMobileViewport} />

      {/* ===== MOBILE (< 768 px) : feed plein écran autour du Short de la semaine =====
          Monté UNIQUEMENT quand le viewport est mobile (pas seulement masqué en CSS) :
          l'arbre desktop ne doit jamais coexister avec une iframe YouTube du feed. On
          passe la chanson de la SEMAINE (currentSong), pas celle affichée par
          l'historique desktop. */}
      <div className="md:hidden h-full">
        {showMobile ? (
          <MobileFeed
            songs={mobileFeedSongs}
            startSlug={startSlug}
            // Calque « Ouvir » : /?ouvir=<slug>, une entrée d'historique (Retour le ferme).
            ouvirSlug={searchParams.get('ouvir')}
            onOpenOuvir={(slug) => setSearchParams({ ouvir: slug })}
            onStartApplied={() =>
              setSearchParams(
                (params) => {
                  params.delete('musica');
                  return params;
                },
                { replace: true }
              )
            }
            buildArtwork={CURRENT_SONG_ARTWORK}
            onFirstScreenSettled={markFirstScreenSettled}
            onShowLyrics={(song) => {
              // Spec §4.1 : « Letra » ouvre le LyricsDialog existant (avec le mode
              // Aprender pour les chansons qui ont une fiche), pas le drawer.
              setLyricsSong(song);
              setShowLyricsDialog(true);
            }}
          />
        ) : null}
      </div>

      {/* ===== DIALOG LETRAS (feed mobile) — la letra elle-même arrive à l'ouverture ===== */}
      <LyricsDialog
        open={showLyricsDialog}
        onOpenChange={setShowLyricsDialog}
        song={lyricsSong}
        title="Letras da Musica"
        maxHeight="h-96"
        showIcon={false}
      />
    </div>
  );
}
