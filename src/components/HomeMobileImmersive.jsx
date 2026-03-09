import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  MoreHorizontal,
  Music,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import YouTubeEmbed from '@/components/YouTubeEmbed';

const SWIPE_THRESHOLD = 72;

function MobileActionButton({ icon: Icon, label, onClick, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-11 w-11 items-center justify-center rounded-[18px] border backdrop-blur-2xl transition-all duration-200 active:scale-95 ${
        accent
          ? 'border-emerald-300/30 bg-emerald-400/18 text-white'
          : 'border-white/16 bg-black/24 text-white/92'
      }`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}

export default function HomeMobileImmersive({
  displayedSong,
  videoActivated,
  onVideoActivated,
  onPreviousSong,
  onNextSong,
  canNavigatePrevious,
  canNavigateNext,
  onShowPlatforms,
  onShowLyrics,
  onShareSong,
  onShowHistory,
  getYouTubeThumbnail,
  backgroundImageLoaded,
  setBackgroundImageLoaded,
}) {
  const playerStateRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showUtilityActions, setShowUtilityActions] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const reduceMotion = useReducedMotion();

  const heroArtwork = useMemo(
    () => getYouTubeThumbnail(displayedSong) || displayedSong?.cover_image || '/images/Caipivara_square.png',
    [displayedSong, getYouTubeThumbnail]
  );

  useEffect(() => {
    setShowUtilityActions(false);
  }, [displayedSong?.id]);

  const handleVideoActivatedChange = useCallback((activated) => {
    if (activated) {
      onVideoActivated();
    }
  }, [onVideoActivated]);

  if (!displayedSong) {
    return (
      <div className="relative flex h-full items-center justify-center overflow-hidden px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.14),_transparent_40%),linear-gradient(180deg,rgba(12,12,12,1)_0%,rgba(4,4,4,1)_100%)]" />
        <div className="relative z-10 w-full rounded-[30px] border border-white/12 bg-black/45 p-8 text-center backdrop-blur-2xl">
          <Music className="mx-auto mb-4 h-14 w-14 text-white/70" />
          <h2 className="text-xl font-semibold text-white">Nenhuma musica disponivel</h2>
          <p className="mt-2 text-sm leading-6 text-white/72">
            A musica da semana sera publicada em breve. Volte na segunda-feira.
          </p>
        </div>
      </div>
    );
  }

  const handleGestureNavigate = (deltaY) => {
    if (Math.abs(deltaY) < SWIPE_THRESHOLD) return;
    if (deltaY < 0 && canNavigatePrevious) {
      onPreviousSong();
      return;
    }
    if (deltaY > 0 && canNavigateNext) {
      onNextSong();
    }
  };

  const handleTouchStartCapture = (event) => {
    setTouchStartY(event.touches?.[0]?.clientY ?? null);
  };

  const handleTouchEndCapture = (event) => {
    if (touchStartY == null) return;
    const endY = event.changedTouches?.[0]?.clientY ?? touchStartY;
    handleGestureNavigate(endY - touchStartY);
    setTouchStartY(null);
  };

  const handleDragEnd = (_, info) => {
    handleGestureNavigate(info.offset.y);
  };

  const toggleMute = () => {
    playerStateRef.current?.toggleMute?.();
  };

  return (
    <div
      className="relative h-full overflow-hidden bg-black"
      onTouchStartCapture={handleTouchStartCapture}
      onTouchEndCapture={handleTouchEndCapture}
    >
      <div className="absolute inset-0">
        {!backgroundImageLoaded && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.16),_transparent_35%),linear-gradient(180deg,#151515_0%,#050505_100%)]" />
        )}
        <img
          src={heroArtwork}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover blur-[48px] saturate-125 transition-opacity duration-500 ${
            backgroundImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setBackgroundImageLoaded(true)}
          onError={() => setBackgroundImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.22)_0%,rgba(5,5,5,0.52)_30%,rgba(5,5,5,0.76)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/18 via-white/4 to-transparent" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={displayedSong.id}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -24 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: 'easeOut' }}
          className="relative z-10 flex h-full flex-col px-2 pb-2 pt-1.5"
        >
          <div className="relative flex flex-1 items-center justify-center px-1 pb-[82px] pt-1">
            <button
              type="button"
              onClick={canNavigatePrevious ? onPreviousSong : undefined}
              disabled={!canNavigatePrevious}
              className={`absolute left-0.5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-200 ${
                canNavigatePrevious
                  ? 'border-white/16 bg-black/22 text-white/86 active:scale-95'
                  : 'border-white/10 bg-black/10 text-white/25'
              }`}
              aria-label={canNavigatePrevious ? 'Musica anterior' : 'Sem musica anterior'}
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={canNavigateNext ? onNextSong : undefined}
              disabled={!canNavigateNext}
              className={`absolute right-0.5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-200 ${
                canNavigateNext
                  ? 'border-white/16 bg-black/22 text-white/86 active:scale-95'
                  : 'border-white/10 bg-black/10 text-white/25'
              }`}
              aria-label={canNavigateNext ? 'Musica seguinte' : 'Sem musica seguinte'}
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>

            <div className="relative mx-auto flex h-full w-full max-w-[420px] items-center justify-center">
              <div className="absolute inset-x-8 bottom-3 top-3 rounded-[40px] bg-white/8 blur-3xl" />
              <div className="relative h-full w-full max-w-[372px] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,5,5,0.96)_0%,rgba(8,8,8,0.98)_100%)] shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                <div className="h-full w-full">
                  <YouTubeEmbed
                    youtubeMusicUrl={displayedSong.youtube_music_url}
                    youtubeUrl={displayedSong.youtube_url}
                    title={displayedSong.title}
                    useFacade
                    autoplayOnActivate
                    thumbnailQuality="hqdefault"
                    forceActivated={videoActivated}
                    portraitMode
                    startMuted
                    playerStateRef={playerStateRef}
                    onActivatedChange={handleVideoActivatedChange}
                    onMuteChange={setIsMuted}
                  />
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/88 via-black/34 to-transparent" />

                <div className="absolute bottom-4 left-0 right-0 flex items-end justify-between gap-2 px-3 pt-5">
                  <div className="min-w-0 space-y-2">
                    <div className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-black/28 px-3 py-1.5 backdrop-blur-xl">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                        {displayedSong.release_date
                          ? format(parseISO(displayedSong.release_date), 'dd MMMM yyyy', { locale: ptBR }).toUpperCase()
                          : 'SEM DATA'}
                      </p>
                    </div>
                    <div className="max-w-[220px] rounded-[22px] border border-white/10 bg-black/22 px-3 py-3 backdrop-blur-xl">
                      <h2 className="line-clamp-2 text-base font-black leading-tight text-white">
                        {displayedSong.title}
                      </h2>
                      <p className="mt-1 truncate text-sm text-white/68">
                        {displayedSong.artist || 'A Musica da Segunda'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col items-end gap-1.5">
                  <AnimatePresence>
                    {showUtilityActions ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.94 }}
                        transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
                        className="rounded-[20px] border border-white/12 bg-black/20 p-1.5 backdrop-blur-2xl"
                      >
                        <div className="flex flex-col gap-1.5">
                          <MobileActionButton
                            icon={History}
                            label="Historico das musicas"
                            onClick={() => {
                              setShowUtilityActions(false);
                              onShowHistory();
                            }}
                          />
                          <MobileActionButton
                            icon={Share2}
                            label="Compartilhar"
                            onClick={() => {
                              setShowUtilityActions(false);
                              onShareSong();
                            }}
                          />
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div className="rounded-[20px] border border-white/12 bg-black/18 p-1.5 backdrop-blur-2xl">
                    <div className="flex flex-col gap-1.5">
                      <MobileActionButton
                        icon={Music}
                        label="Ouvir em outras plataformas"
                        onClick={onShowPlatforms}
                        accent
                      />
                      {displayedSong.lyrics?.trim() ? (
                        <MobileActionButton
                          icon={FileText}
                          label="Ver letras"
                          onClick={onShowLyrics}
                        />
                      ) : null}
                      {videoActivated ? (
                        <MobileActionButton
                          icon={isMuted ? VolumeX : Volume2}
                          label={isMuted ? 'Ativar som' : 'Silenciar video'}
                          onClick={toggleMute}
                        />
                      ) : null}
                      <MobileActionButton
                        icon={MoreHorizontal}
                        label={showUtilityActions ? 'Fechar atalhos' : 'Mais acoes'}
                        onClick={() => setShowUtilityActions((current) => !current)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
