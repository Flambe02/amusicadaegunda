import { useCallback, useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

const SWIPE_THRESHOLD = 72;

const vibrate = () => navigator.vibrate?.(8);

function ActionBtn({ icon: Icon, label, onClick, accent = false, dim = false }) {
  const handleClick = () => {
    vibrate();
    onClick?.();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={dim}
      className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-2xl transition-all duration-200 active:scale-90 ${
        dim
          ? 'border-white/8 bg-black/20 text-white/30 shadow-none cursor-default'
          : accent
          ? 'border-emerald-300/30 bg-emerald-500/22 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
          : 'border-white/14 bg-black/30 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
      }`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
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
  heroArtwork,
  backgroundImageLoaded,
  setBackgroundImageLoaded,
}) {
  const playerStateRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showUtilityActions, setShowUtilityActions] = useState(false);
  const [shouldRenderBackdrop, setShouldRenderBackdrop] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const resolvedHeroArtwork = heroArtwork || displayedSong?.cover_image || BRAND_SQUARE_MEDIUM;

  useEffect(() => {
    setShowUtilityActions(false);
  }, [displayedSong?.id]);

  useEffect(() => {
    setShouldRenderBackdrop(false);
    setBackgroundImageLoaded(false);

    const revealBackdrop = () => setShouldRenderBackdrop(true);
    let idleHandle;
    let timeoutHandle;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(revealBackdrop, { timeout: 1400 });
      return () => window.cancelIdleCallback(idleHandle);
    }

    timeoutHandle = window.setTimeout(revealBackdrop, 700);
    return () => window.clearTimeout(timeoutHandle);
  }, [displayedSong?.id, setBackgroundImageLoaded]);

  const handleVideoActivatedChange = useCallback((activated) => {
    if (activated) onVideoActivated();
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

  const handleGestureNavigate = (deltaX) => {
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX > 0 && canNavigatePrevious) { vibrate(); onPreviousSong(); return; }
    if (deltaX < 0 && canNavigateNext) { vibrate(); onNextSong(); }
  };

  const handleTouchStartCapture = (e) => setTouchStartX(e.touches?.[0]?.clientX ?? null);
  const handleTouchEndCapture = (e) => {
    if (touchStartX == null) return;
    handleGestureNavigate((e.changedTouches?.[0]?.clientX ?? touchStartX) - touchStartX);
    setTouchStartX(null);
  };
  const toggleMute = () => playerStateRef.current?.toggleMute?.();

  const releaseDate = displayedSong.release_date
    ? format(parseISO(displayedSong.release_date), 'dd MMMM yyyy', { locale: ptBR }).toUpperCase()
    : 'SEM DATA';

  return (
    <div
      className="relative h-full overflow-hidden bg-black"
      onTouchStartCapture={handleTouchStartCapture}
      onTouchEndCapture={handleTouchEndCapture}
    >
      {/* ── Fond blur artistique ── */}
      <div className="absolute inset-0">
        {!backgroundImageLoaded && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.16),_transparent_35%),linear-gradient(180deg,#151515_0%,#050505_100%)]" />
        )}
        {shouldRenderBackdrop ? (
          <img
            src={resolvedHeroArtwork}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            width="720"
            height="1280"
            className={`absolute inset-0 h-full w-full object-cover blur-[56px] saturate-150 scale-110 transition-opacity duration-500 ${
              backgroundImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setBackgroundImageLoaded(true)}
            onError={() => setBackgroundImageLoaded(true)}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/38" />
      </div>

      {/* ── Layout fixe : cadre + boutons toujours visibles ── */}
      <div className="relative z-10 flex h-full items-center justify-center py-2">
        <div className="flex h-full max-w-full items-center gap-2 overflow-hidden pl-1">

          {/* ══ Cadre de la carte 9:16 — statique ══ */}
          <div
            className="relative h-full overflow-hidden rounded-[28px] bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_32px_80px_rgba(0,0,0,0.65)]"
            style={{ aspectRatio: '9/16', maxWidth: 'calc(100vw - 60px)' }}
          >
            {/* Contenu animé — seule la vidéo + infos transitionnent */}
            <div key={displayedSong.id} className="absolute inset-0 bg-black">
                <YouTubeEmbed
                  youtubeMusicUrl={displayedSong.youtube_music_url}
                  youtubeUrl={displayedSong.youtube_url}
                  title={displayedSong.title}
                  useFacade
                  autoplayOnActivate
                  thumbnailQuality="hqdefault"
                  forceActivated={videoActivated}
                  startMuted
                  shortMaxWidth={800}
                  playButtonStyle="minimal"
                  playerStateRef={playerStateRef}
                  onActivatedChange={handleVideoActivatedChange}
                  onMuteChange={setIsMuted}
                />

                {/* Gradient bas */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                {/* Infos chanson — bas gauche */}
                <div className="absolute bottom-5 left-4 right-4 z-10 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                    {releaseDate}
                  </p>
                  <h2 className="line-clamp-2 text-[17px] font-black leading-tight text-white drop-shadow-lg">
                    {displayedSong.title}
                  </h2>
                  <p className="truncate text-sm text-white/60">
                    {displayedSong.artist || 'A Musica da Segunda'}
                  </p>
                </div>
            </div>
          </div>

          {/* ══ Boutons d'action — colonne droite, statique ══ */}
          <div className="flex flex-col items-center gap-3 pb-4">

            {/* Navigation < > */}
            {(canNavigatePrevious || canNavigateNext) && (
              <>
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { vibrate(); onPreviousSong(); }}
                    disabled={!canNavigatePrevious}
                    aria-label="Video precedente"
                    className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-150 ${
                      canNavigatePrevious
                        ? 'border-white/20 bg-black/40 text-white active:scale-90'
                        : 'border-white/8 bg-black/20 text-white/25 cursor-default'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { vibrate(); onNextSong(); }}
                    disabled={!canNavigateNext}
                    aria-label="Proxima video"
                    className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-150 ${
                      canNavigateNext
                        ? 'border-white/20 bg-black/40 text-white active:scale-90'
                        : 'border-white/8 bg-black/20 text-white/25 cursor-default'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Séparateur */}
                <div className="h-px w-6 rounded-full bg-white/15" />
              </>
            )}

            {/* Actions utilitaires (History + Share) */}
            {showUtilityActions ? (
              <div className="flex flex-col gap-3">
                <ActionBtn
                  icon={History}
                  label="Historico das musicas"
                  onClick={() => { setShowUtilityActions(false); onShowHistory(); }}
                />
                <ActionBtn
                  icon={Share2}
                  label="Compartilhar"
                  onClick={() => { setShowUtilityActions(false); onShareSong(); }}
                />
              </div>
            ) : null}

            <ActionBtn icon={Music} label="Ouvir em outras plataformas" onClick={onShowPlatforms} accent />
            {displayedSong.lyrics?.trim() ? (
              <ActionBtn icon={FileText} label="Ver letras" onClick={onShowLyrics} />
            ) : null}
            {/* Mute — toujours visible, grisé avant activation */}
            <ActionBtn
              icon={isMuted ? VolumeX : Volume2}
              label={isMuted ? 'Ativar som' : 'Silenciar video'}
              onClick={videoActivated ? toggleMute : undefined}
              dim={!videoActivated}
            />
            <ActionBtn
              icon={MoreHorizontal}
              label={showUtilityActions ? 'Fechar atalhos' : 'Mais acoes'}
              onClick={() => setShowUtilityActions((c) => !c)}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
