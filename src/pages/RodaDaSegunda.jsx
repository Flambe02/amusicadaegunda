import { useEffect, useMemo, useRef, useState } from 'react';
import { Song } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Music, ExternalLink, Play, Pause, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { extractYouTubeId, titleToSlug } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_COLORS = [
  '#3B82F6',
  '#6366F1',
  '#EC4899',
  '#F97316',
  '#10B981',
  '#EAB308',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
  '#06B6D4',
  '#F43F5E',
];

function drawWheel(canvas, segments, rotation) {
  if (!canvas || segments.length === 0) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2;
  const radius = cx - 8;
  const arc = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cx, radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  segments.forEach(({ label, color }, index) => {
    const startAngle = rotation + index * arc;
    const endAngle = startAngle + arc;

    const gradient = ctx.createRadialGradient(cx, cx, radius * 0.25, cx, cx, radius);
    gradient.addColorStop(0, `${color}dd`);
    gradient.addColorStop(1, color);

    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate(startAngle + arc / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 4;
    ctx.fillText(label, radius * 0.65, 5);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cx, 30, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#32a2dc';
  ctx.font = '18px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎵', cx, cx);
}

function SpotifyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.419.34-.78.78-.66 4.56.96 7.8 1.44 10.98 2.34.42.12.66.54.54.96zm1.44-3.3c-.3.42-.84.6-1.32.42-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.2-1.26 9.6-.66 13.2 1.62.42.18.6.78.42 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.54-1.02.72-1.56.42z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function RodaDaSegunda() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playerState, setPlayerState] = useState('stopped');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));
  const canvasRef = useRef(null);
  const currentRotRef = useRef(0);
  const animRef = useRef(null);
  const iframeRef = useRef(null);
  const autoplayFallbackTimerRef = useRef(null);
  const playbackStartedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const CANVAS_SIZE = useMemo(() => {
    if (viewportSize.width < 640) return Math.max(260, Math.min(320, viewportSize.width - 40));
    if (viewportSize.width < 1024) return Math.max(280, Math.min(340, viewportSize.width - 72));

    const compactDesktop = viewportSize.width < 1500;
    const basedOnHeight = Math.floor(viewportSize.height * (compactDesktop ? 0.26 : 0.32));
    const basedOnWidth = Math.floor((viewportSize.width - 320) * (compactDesktop ? 0.18 : 0.16));

    return Math.max(240, Math.min(compactDesktop ? 310 : 360, basedOnHeight, basedOnWidth));
  }, [viewportSize.height, viewportSize.width]);

  const showDesktopMascot = viewportSize.width >= 1280 && viewportSize.height >= 700;

  const songsByMonth = useMemo(() => {
    const map = {};
    songs.forEach((song) => {
      if (song.release_date) {
        const month = new Date(song.release_date).getMonth();
        if (!map[month]) map[month] = [];
        map[month].push(song);
      }
    });
    return map;
  }, [songs]);

  const segments = useMemo(
    () =>
      MONTHS_PT.map((name, index) => ({
        label: name.slice(0, 3),
        fullName: name,
        color: MONTH_COLORS[index],
        monthIndex: index,
        count: (songsByMonth[index] || []).length,
      })),
    [songsByMonth]
  );

  useEffect(() => {
    Song.list('-release_date').then((data) => {
      setSongs(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (segments.length > 0) {
      drawWheel(canvasRef.current, segments, currentRotRef.current);
    }
  }, [segments]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const spin = () => {
    if (spinning || loading) return;

    setWinner(null);
    setSpinning(true);

    const available = segments.filter((segment) => segment.count > 0);
    if (available.length === 0) {
      setSpinning(false);
      return;
    }

    const target = available[Math.floor(Math.random() * available.length)];
    const arc = (2 * Math.PI) / 12;
    const targetBaseRot = -Math.PI / 2 - target.monthIndex * arc - arc / 2;
    let delta = targetBaseRot - (currentRotRef.current % (2 * Math.PI));
    if (delta <= 0) delta += 2 * Math.PI;

    const finalRot =
      currentRotRef.current + (6 + Math.floor(Math.random() * 4)) * 2 * Math.PI + delta;

    const duration = 4500;
    const startRot = currentRotRef.current;
    const startTime = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      currentRotRef.current = startRot + (finalRot - startRot) * easeOut(t);
      drawWheel(canvasRef.current, segments, currentRotRef.current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      currentRotRef.current = finalRot;
      const monthSongs = songsByMonth[target.monthIndex] || [];
      const song = monthSongs[Math.floor(Math.random() * monthSongs.length)];

      if (!song) {
        setWinner(null);
        setSpinning(false);
        return;
      }

      setWinner({ monthName: target.fullName, monthColor: target.color, song });
      setSpinning(false);
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const youtubeId = winner?.song ? extractYouTubeId(winner.song.youtube_url) : null;
  const songSlug = winner?.song?.slug || (winner?.song?.title ? titleToSlug(winner.song.title) : null);
  const description = winner?.song?.description?.trim() || '';
  const hasDescription = Boolean(description);
  const hasLongDescription = description.length > 220;
  const rodaMascot = '/images/Caipivara_pied_transparent.png';

  const streamingButtons = [
    winner?.song?.spotify_url
      ? {
          key: 'spotify',
          href: winner.song.spotify_url,
          label: 'Spotify',
          className: 'bg-[#1DB954] hover:bg-[#1ed760]',
          icon: <SpotifyIcon />,
        }
      : null,
    winner?.song?.youtube_url
      ? {
          key: 'youtube',
          href: winner.song.youtube_url,
          label: 'YouTube',
          className: 'bg-[#FF0000] hover:bg-[#cc0000]',
          icon: <YoutubeIcon />,
        }
      : null,
    winner?.song?.apple_music_url
      ? {
          key: 'apple',
          href: winner.song.apple_music_url,
          label: 'Apple Music',
          className: 'bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90',
          icon: <Music className="h-4 w-4" aria-hidden="true" />,
        }
      : null,
  ].filter(Boolean);

  const sendYTCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  };

  const attemptAutoplay = () => {
    if (!youtubeId) return;
    sendYTCommand('playVideo');
  };

  useEffect(() => {
    if (!youtubeId) {
      setPlayerState('stopped');
      playbackStartedRef.current = false;
      if (autoplayFallbackTimerRef.current) {
        clearTimeout(autoplayFallbackTimerRef.current);
        autoplayFallbackTimerRef.current = null;
      }
      return;
    }

    setPlayerState('playing');
    playbackStartedRef.current = false;

    autoplayFallbackTimerRef.current = setTimeout(() => {
      if (!playbackStartedRef.current) {
        setPlayerState('paused');
      }
    }, 1500);

    return () => {
      if (autoplayFallbackTimerRef.current) {
        clearTimeout(autoplayFallbackTimerRef.current);
        autoplayFallbackTimerRef.current = null;
      }
    };
  }, [youtubeId]);

  useEffect(() => {
    setIsDescriptionExpanded(false);
    setIsDescriptionDialogOpen(false);
  }, [winner?.song?.id]);

  useEffect(() => {
    if (!youtubeId) return undefined;

    const handlePlayerMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (!payload || typeof payload !== 'object') return;

      let state = null;
      if (payload.event === 'onStateChange') {
        state = payload.info;
      } else if (
        payload.event === 'infoDelivery' &&
        payload.info &&
        typeof payload.info.playerState === 'number'
      ) {
        state = payload.info.playerState;
      }

      if (typeof state !== 'number') return;

      if (state === 1) {
        playbackStartedRef.current = true;
        setPlayerState('playing');
      } else if (state === 2) {
        setPlayerState('paused');
      } else if (state === 0) {
        setPlayerState('stopped');
      }
    };

    window.addEventListener('message', handlePlayerMessage);
    return () => window.removeEventListener('message', handlePlayerMessage);
  }, [youtubeId]);

  const handlePlay = () => {
    sendYTCommand('playVideo');
    setPlayerState('playing');
  };

  const handlePause = () => {
    sendYTCommand('pauseVideo');
    setPlayerState('paused');
  };

  const handleStop = () => {
    sendYTCommand('stopVideo');
    setPlayerState('stopped');
  };

  return (
    <div className="min-h-screen text-white lg:flex lg:min-h-[calc(100vh-2rem)] lg:flex-col">
      <div className="px-4 pb-3 pt-4 text-center lg:hidden">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/65">
          <Music className="h-3.5 w-3.5 text-[#FDE047]" />
          A Roda de Segunda
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-white lg:text-[3.25rem] lg:leading-none">
          Descubra um mês ao acaso
        </h1>
        <p className="mt-2 text-sm text-white/58 lg:text-[15px]">
          Gire a roda e revele uma música do acervo no mesmo universo visual da home.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-12 lg:flex-1 lg:pb-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(400px,500px)]">
        <div className="flex min-w-0 flex-col items-center lg:justify-center lg:items-start">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-white/65">
              <Music className="h-3.5 w-3.5 text-[#FDE047]" />
              A Roda de Segunda
            </div>
            <h1 className="mt-5 max-w-[11ch] text-[clamp(2.4rem,3.9vw,4.6rem)] font-black leading-[0.92] tracking-tight text-white">
              Descubra um mês ao acaso
            </h1>
            <p className="mt-3 max-w-xl text-[clamp(0.95rem,1.2vw,1.0625rem)] leading-7 text-white/60">
              Gire a roda e revele uma música do acervo no mesmo universo visual da home.
            </p>

          </div>

          <div className="mt-0 flex w-full max-w-[680px] flex-col items-center flex-shrink-0 lg:mt-6 lg:glass-panel lg:rounded-[32px] lg:p-5">
            <div className="flex w-full flex-col items-center gap-4 xl:flex-row xl:items-center xl:justify-center xl:gap-6">
              <div className="relative shrink-0" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
                <div className="absolute z-10" style={{ top: -14, left: '50%', transform: 'translateX(-50%)' }}>
                  <svg width="28" height="22" viewBox="0 0 28 22">
                    <polygon points="14,20 2,0 26,0" fill="#1a1a2e" stroke="white" strokeWidth="2" />
                  </svg>
                </div>
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="block cursor-pointer rounded-full"
                  style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, touchAction: 'manipulation' }}
                  onClick={spin}
                />
              </div>

              <Button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(50);
                  spin();
                }}
                disabled={spinning || loading}
                className="hidden rounded-full bg-[#FDE047] px-8 py-4 text-base font-black text-black shadow-lg transition-all hover:scale-105 hover:bg-[#fde047]/90 disabled:scale-100 disabled:opacity-60 xl:inline-flex"
              >
                {loading ? 'Carregando...' : spinning ? '⏳ Girando...' : 'Girar a Roda!'}
              </Button>
            </div>

            <Button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(50);
                spin();
              }}
              disabled={spinning || loading}
              className="mt-4 rounded-full bg-[#FDE047] px-7 py-4 text-sm font-black text-black shadow-lg transition-all hover:scale-105 hover:bg-[#fde047]/90 disabled:scale-100 disabled:opacity-60 xl:hidden"
            >
              {loading ? 'Carregando...' : spinning ? '⏳ Girando...' : 'Girar a Roda!'}
            </Button>
          </div>
        </div>

        <div className="relative mt-8 w-full xl:mt-0 xl:min-h-[560px] xl:self-stretch">
          <div className="flex h-full flex-col gap-6 overflow-visible xl:sticky xl:top-4">
            {!winner && !spinning && showDesktopMascot && (
              <div className="pointer-events-none hidden min-h-[420px] xl:flex items-end justify-center px-6 pb-2 pt-6">
                <img
                  src={rodaMascot}
                  alt="Capivara A Música da Segunda"
                  className="max-h-[460px] w-auto object-contain drop-shadow-[0_28px_70px_rgba(0,0,0,0.38)] 2xl:max-h-[520px]"
                  loading="lazy"
                />
              </div>
            )}

            {winner && !spinning && (
              <div className="space-y-5 xl:pt-1">
                <div
                  className="glass-panel overflow-hidden rounded-[32px] border border-white/10 px-5 py-5"
                  style={{
                    boxShadow: `0 0 0 1px ${winner.monthColor}66 inset`,
                  }}
                >
                <div
                  className="mb-5 rounded-[24px] border px-5 py-4 text-white"
                  style={{
                    borderColor: `${winner.monthColor}40`,
                    backgroundColor: `${winner.monthColor}18`,
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest opacity-75">Mês sorteado</p>
                  <h2 className="mt-1 text-2xl font-black" style={{ color: winner.monthColor }}>{winner.monthName}</h2>
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${winner.monthColor}22` }}
                    >
                      <Music className="h-6 w-6" style={{ color: winner.monthColor }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                        Música sorteada
                      </p>
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-xl font-black text-white">{winner.song?.title}</h3>
                        {songSlug && (
                          <Link
                            to={`/musica/${songSlug}`}
                            title="Ver página da música"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white transition-all hover:scale-110"
                            style={{ borderColor: winner.monthColor, color: winner.monthColor }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                      {winner.song?.artist && <p className="text-sm text-white/55">{winner.song.artist}</p>}
                      {winner.song?.release_date && (
                        <p className="mt-0.5 text-xs font-medium" style={{ color: `${winner.monthColor}bb` }}>
                          📅{' '}
                          {new Date(`${winner.song.release_date}T12:00:00`).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {!youtubeId && winner.song?.youtube_url && (
                    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/55">
                      <span>⚠️</span>
                      <span>Player indisponível para esta música. Use o atalho YouTube abaixo.</span>
                    </div>
                  )}

                  {youtubeId && (
                    <>
                      <iframe
                        ref={iframeRef}
                        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&autoplay=1&rel=0`}
                        title={winner.song?.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        onLoad={attemptAutoplay}
                        style={{
                          position: 'fixed',
                          top: '-9999px',
                          left: '-9999px',
                          width: '1px',
                          height: '1px',
                          opacity: 0,
                          pointerEvents: 'none',
                        }}
                      />

                      <div
                        className="mb-4 flex items-center gap-3 rounded-2xl border border-white/8 px-4 py-3"
                        style={{ backgroundColor: `${winner.monthColor}12` }}
                      >
                        <button
                          onClick={playerState === 'playing' ? handlePause : handlePlay}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md transition-all hover:scale-110"
                          style={{ backgroundColor: winner.monthColor }}
                          aria-label={playerState === 'playing' ? 'Pausar' : 'Tocar'}
                        >
                          {playerState === 'playing' ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="ml-0.5 h-4 w-4" />
                          )}
                        </button>

                        <button
                          onClick={handleStop}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white transition-all hover:scale-110"
                          style={{ borderColor: winner.monthColor, color: winner.monthColor }}
                          aria-label="Parar"
                        >
                          <Square className="h-3 w-3" />
                        </button>

                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {playerState === 'playing' && (
                            <span className="flex flex-shrink-0 items-end gap-[3px]" aria-hidden="true">
                              {[1, 2, 3, 4].map((index) => (
                                <span
                                  key={index}
                                  className="block w-[3px] rounded-full"
                                  style={{
                                    backgroundColor: winner.monthColor,
                                    height: `${8 + index * 4}px`,
                                    animation: `bounce ${0.6 + index * 0.1}s ease-in-out infinite alternate`,
                                    animationDelay: `${index * 0.1}s`,
                                  }}
                                />
                              ))}
                            </span>
                          )}
                          <span className="truncate text-sm font-semibold" style={{ color: winner.monthColor }}>
                            {playerState === 'playing'
                              ? 'A tocar...'
                              : playerState === 'paused'
                                ? '⏸ Pausado'
                                : '⏹ Parado'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {hasDescription && (
                    <div
                      className="mb-4 rounded-2xl border px-4 py-4"
                      style={{
                        borderColor: `${winner.monthColor}33`,
                        backgroundColor: `${winner.monthColor}0d`,
                      }}
                    >
                      <p
                        className="mb-2 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: winner.monthColor }}
                      >
                        Sobre esta música
                      </p>
                      <p
                        className={`text-sm leading-7 text-white/72 ${
                          !isDescriptionExpanded ? 'line-clamp-3' : ''
                        }`}
                      >
                        {description}
                      </p>
                      {hasLongDescription && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                            className="text-sm font-semibold underline underline-offset-2"
                            style={{ color: winner.monthColor }}
                          >
                            {isDescriptionExpanded ? 'Ver menos' : 'Ler mais'}
                          </button>
                          {winner?.song?.lyrics?.trim() && (
                            <button
                              type="button"
                              onClick={() => setIsDescriptionDialogOpen(true)}
                              className="hidden text-sm font-semibold underline underline-offset-2 md:inline-block"
                              style={{ color: winner.monthColor }}
                            >
                              Ver letras
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {streamingButtons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {streamingButtons.map((button) => (
                        <a
                          key={button.key}
                          href={button.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={button.label}
                          title={button.label}
                          className={`inline-flex h-11 min-w-[46px] items-center justify-center rounded-2xl px-3 text-white shadow-lg transition-all hover:scale-105 ${button.className}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {button.icon}
                            <span className="hidden text-xs font-bold sm:inline">{button.label}</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
        <DialogContent className="glass-panel border-white/10 bg-[#111111]/95 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">
              {winner?.song?.lyrics?.trim() ? 'Letras da música' : 'Sobre esta música'}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <p className="whitespace-pre-wrap text-sm leading-7 text-white/72">
              {winner?.song?.lyrics?.trim()
                ? winner.song.lyrics
                : description || 'Sem descrição disponível para esta música.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
