import { useEffect, useMemo, useRef, useState } from 'react';
import { Song } from '@/api/entities';
import { Music, ExternalLink, Play, Pause, Square, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { extractYouTubeId, titleToSlug } from '@/lib/utils';
import { MobileRoletaApp } from '@/components/mobile';

const MONTHS = [
  { index: 0,  abbr: 'JAN', name: 'Janeiro',    color: '#DC2626' },
  { index: 1,  abbr: 'FEV', name: 'Fevereiro',   color: '#7C3AED' },
  { index: 2,  abbr: 'MAR', name: 'Março',       color: '#EA580C' },
  { index: 3,  abbr: 'ABR', name: 'Abril',       color: '#059669' },
  { index: 4,  abbr: 'MAI', name: 'Maio',        color: '#2563EB' },
  { index: 5,  abbr: 'JUN', name: 'Junho',       color: '#B45309' },
  { index: 6,  abbr: 'JUL', name: 'Julho',       color: '#6D28D9' },
  { index: 7,  abbr: 'AGO', name: 'Agosto',      color: '#15803D' },
  { index: 8,  abbr: 'SET', name: 'Setembro',    color: '#0369A1' },
  { index: 9,  abbr: 'OUT', name: 'Outubro',     color: '#D97706' },
  { index: 10, abbr: 'NOV', name: 'Novembro',    color: '#0D9488' },
  { index: 11, abbr: 'DEZ', name: 'Dezembro',    color: '#E11D48' },
];

function drawPremiumWheel(canvas, size, rotation) {
  if (!canvas || size <= 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const n = MONTHS.length;
  const arc = (2 * Math.PI) / n;
  const outerR = cx - 14;

  MONTHS.forEach(({ abbr, color }, i) => {
    const start = rotation + i * arc;
    const end = start + arc;
    const mid = start + arc / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, outerR, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.38)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate(mid);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(size * 0.057)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(abbr, outerR * 0.67, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, outerR + 1, 0, 2 * Math.PI);
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#FDE047';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.restore();

  const dotCount = 24;
  const dotRingR = outerR + 10;
  for (let i = 0; i < dotCount; i++) {
    const ang = (i / dotCount) * 2 * Math.PI - Math.PI / 2;
    const dx = cx + Math.cos(ang) * dotRingR;
    const dy = cx + Math.sin(ang) * dotRingR;
    ctx.save();
    ctx.beginPath();
    ctx.arc(dx, dy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#FDE047';
    ctx.shadowColor = '#FACC15';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  const hubR = Math.round(outerR * 0.215);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, hubR + 5, 0, 2 * Math.PI);
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#FDE047';
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cx, hubR, 0, 2 * Math.PI);
  ctx.fillStyle = '#0A0A0A';
  ctx.fill();

  ctx.save();
  ctx.fillStyle = '#FACC15';
  ctx.shadowColor = '#FDE047';
  ctx.shadowBlur = 6;
  ctx.font = `bold ${Math.round(hubR * 0.82)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', cx, cx - Math.round(hubR * 0.12));
  ctx.restore();

  ctx.fillStyle = '#FACC15';
  ctx.font = `700 ${Math.round(hubR * 0.32)}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SEGUNDA', cx, cx + Math.round(hubR * 0.55));
}

function SpotifyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.419.34-.78.78-.66 4.56.96 7.8 1.44 10.98 2.34.42.12.66.54.54.96zm1.44-3.3c-.3.42-.84.6-1.32.42-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.2-1.26 9.6-.66 13.2 1.62.42.18.6.78.42 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.54-1.02.72-1.56.42z" />
    </svg>
  );
}

export default function RodaDaSegunda() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playerState, setPlayerState] = useState('stopped');
  const [resultVisible, setResultVisible] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));
  const canvasRef = useRef(null);
  const currentRotRef = useRef(0);
  const animRef = useRef(null);
  const iframeRef = useRef(null);
  const playbackStartedRef = useRef(false);
  const autoplayFallbackRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const CANVAS_SIZE = useMemo(() => {
    const { width, height } = viewportSize;
    if (width < 640) return Math.max(260, Math.min(320, width - 40));
    if (width < 1024) return Math.max(280, Math.min(340, width - 72));
    const rightCol = width < 1400 ? 400 : width < 1800 ? 460 : 520;
    const leftCol = width - 260 - 64 - rightCol - 48;
    const byHeight = Math.floor(height * 0.54);
    return Math.max(300, Math.min(500, leftCol - 40, byHeight));
  }, [viewportSize]);

  useEffect(() => {
    Song.list('-release_date').then((data) => { setSongs(data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    drawPremiumWheel(canvasRef.current, CANVAS_SIZE, currentRotRef.current);
  }, [CANVAS_SIZE]);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const songsByMonth = useMemo(() => {
    const map = {};
    songs.forEach((song) => {
      if (song.release_date) {
        const m = new Date(song.release_date).getMonth();
        if (!map[m]) map[m] = [];
        map[m].push(song);
      }
    });
    return map;
  }, [songs]);

  const youtubeId = winner?.song ? extractYouTubeId(winner.song.youtube_url) : null;
  // Use slug from DB directly; fall back to titleToSlug only if absent
  const songSlug = winner?.song?.slug || (winner?.song?.title ? titleToSlug(winner.song.title) : null);
  const winnerYear = winner?.song?.release_date ? new Date(winner.song.release_date).getFullYear() : null;
  const wc = winner?.monthColor ?? '#FACC15';

  const sendYTCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }), '*'
    );
  };

  useEffect(() => {
    if (!youtubeId) {
      setPlayerState('stopped');
      playbackStartedRef.current = false;
      if (autoplayFallbackRef.current) { clearTimeout(autoplayFallbackRef.current); autoplayFallbackRef.current = null; }
      return;
    }
    setPlayerState('playing');
    playbackStartedRef.current = false;
    autoplayFallbackRef.current = setTimeout(() => {
      if (!playbackStartedRef.current) setPlayerState('paused');
    }, 1500);
    return () => { if (autoplayFallbackRef.current) { clearTimeout(autoplayFallbackRef.current); autoplayFallbackRef.current = null; } };
  }, [youtubeId]);

  useEffect(() => {
    if (!youtubeId) return;
    const handle = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      let p = event.data;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch { return; } }
      if (!p || typeof p !== 'object') return;
      let state = null;
      if (p.event === 'onStateChange') state = p.info;
      else if (p.event === 'infoDelivery' && typeof p.info?.playerState === 'number') state = p.info.playerState;
      if (typeof state !== 'number') return;
      if (state === 1) { playbackStartedRef.current = true; setPlayerState('playing'); }
      else if (state === 2) setPlayerState('paused');
      else if (state === 0) setPlayerState('stopped');
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [youtubeId]);

  const spin = () => {
    if (spinning || loading) return;
    setWinner(null);
    setResultVisible(false);
    setSpinning(true);

    const available = MONTHS.filter((m) => (songsByMonth[m.index] || []).length > 0);
    if (available.length === 0) { setSpinning(false); return; }

    const target = available[Math.floor(Math.random() * available.length)];
    const arc = (2 * Math.PI) / MONTHS.length;
    const targetBaseRot = -Math.PI / 2 - target.index * arc - arc / 2;
    let delta = targetBaseRot - (currentRotRef.current % (2 * Math.PI));
    if (delta <= 0) delta += 2 * Math.PI;
    const finalRot = currentRotRef.current + (6 + Math.floor(Math.random() * 4)) * 2 * Math.PI + delta;

    const duration = 4200;
    const startRot = currentRotRef.current;
    const startTime = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      currentRotRef.current = startRot + (finalRot - startRot) * easeOut(t);
      drawPremiumWheel(canvasRef.current, CANVAS_SIZE, currentRotRef.current);
      if (t < 1) { animRef.current = requestAnimationFrame(animate); return; }

      currentRotRef.current = finalRot;
      const pool = songsByMonth[target.index] || [];
      const song = pool[Math.floor(Math.random() * pool.length)];
      if (song) {
        setWinner({ month: target, monthName: target.name, monthColor: target.color, song });
        setTimeout(() => setResultVisible(true), 250);
      }
      setSpinning(false);
    };
    animRef.current = requestAnimationFrame(animate);
  };

  const rodaMascot = '/images/Caipivara_pied_transparent.png';
  const description = winner?.song?.description?.trim() || '';

  const streamingButtons = [
    winner?.song?.spotify_url ? { key: 'spotify', href: winner.song.spotify_url, label: 'Spotify', bg: '#1DB954', icon: <SpotifyIcon /> } : null,
    winner?.song?.youtube_url ? { key: 'youtube', href: winner.song.youtube_url, label: 'YouTube Music', bg: '#FF0000', icon: <Music className="h-4 w-4" aria-hidden="true" /> } : null,
    winner?.song?.apple_music_url ? { key: 'apple', href: winner.song.apple_music_url, label: 'Apple Music', bg: '#FC3C44', icon: <Music className="h-4 w-4" aria-hidden="true" /> } : null,
  ].filter(Boolean);

  return (
    <div className="min-h-full text-white">
      {/* Mobile */}
      <div className="lg:hidden h-full min-h-full">
        <MobileRoletaApp songs={songs} loading={loading} />
      </div>

      {/* Desktop */}
      <div
        className="hidden lg:flex min-h-screen"
        style={{ background: 'radial-gradient(ellipse 90% 60% at 15% 20%, rgba(109,40,217,0.14) 0%, transparent 55%)' }}
      >
        <div
          className="w-full max-w-7xl mx-auto px-8 pb-10 pt-8 grid items-start gap-8 xl:gap-12"
          style={{
            gridTemplateColumns: `1fr ${
              viewportSize.width < 1400 ? '400px' : viewportSize.width < 1800 ? '460px' : '520px'
            }`,
          }}
        >
          {/* LEFT — title + wheel + button */}
          <div className="flex flex-col">
            <h1 className="font-black leading-[0.88] tracking-tight">
              <span className="block text-white" style={{ fontSize: 'clamp(2.8rem,3.8vw,5rem)' }}>
                Roda dos
              </span>
              <span className="block text-[#FACC15]" style={{ fontSize: 'clamp(3.5rem,4.8vw,6.5rem)' }}>
                Meses
              </span>
            </h1>
            <p className="mt-2 text-sm xl:text-base text-white/45">
              Gire a roda e descubra uma música do acervo.
            </p>

            {/* Wheel + button */}
            <div className="mt-8 flex flex-col items-center">
              <div className="relative flex flex-col items-center">
                {/* Purple glow ring */}
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: 26,
                    width: CANVAS_SIZE + 36,
                    height: CANVAS_SIZE + 36,
                    borderRadius: '50%',
                    boxShadow:
                      '0 0 0 3px rgba(167,139,250,0.5), 0 0 55px 20px rgba(139,92,246,0.45), 0 0 110px 45px rgba(109,40,217,0.22)',
                  }}
                />
                {/* Pointer triangle */}
                <div className="relative z-10" style={{ marginBottom: -6 }}>
                  <svg width="34" height="30" viewBox="0 0 34 30">
                    <polygon
                      points="17,28 1,1 33,1"
                      fill="#FACC15"
                      style={{ filter: 'drop-shadow(0 0 10px #FACC15) drop-shadow(0 0 22px rgba(250,204,21,0.7))' }}
                    />
                  </svg>
                </div>
                {/* Canvas */}
                <canvas
                  ref={canvasRef}
                  onClick={!spinning ? spin : undefined}
                  className="relative z-10 block rounded-full"
                  style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, cursor: spinning ? 'wait' : 'pointer' }}
                />
              </div>

              {/* Spin button */}
              <button
                type="button"
                onClick={spin}
                disabled={spinning || loading}
                className="mt-7 flex items-center justify-center gap-3 rounded-full bg-[#FACC15] font-black text-black text-lg transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 disabled:scale-100"
                style={{
                  width: CANVAS_SIZE,
                  paddingTop: '1rem',
                  paddingBottom: '1rem',
                  boxShadow: spinning ? 'none' : '0 8px 32px rgba(250,204,21,0.35)',
                }}
              >
                <RefreshCw className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
                {loading ? 'Carregando...' : spinning ? 'Girando…' : 'GIRAR A RODA'}
              </button>
            </div>
          </div>

          {/* RIGHT — capybara (before spin) or full result card (after spin) */}
          <div className="flex flex-col items-center gap-5 xl:sticky xl:top-6 pt-2 xl:pt-4">

            {/* Capybara — always visible before spin, hidden after */}
            {!winner && (
              <div className="relative w-full flex flex-col items-center">
                <div
                  className="absolute z-10 top-2 left-2 xl:left-4 rounded-2xl rounded-bl-none bg-[#FACC15] px-4 py-3 shadow-xl"
                  style={{ maxWidth: 180 }}
                >
                  <p className="text-sm font-black leading-snug text-black">
                    Gira aí. o mês escolhe a vergonha.
                  </p>
                </div>
                <img
                  src={rodaMascot}
                  alt="Capivara A Música da Segunda"
                  className="w-full max-w-[300px] xl:max-w-[370px] 2xl:max-w-[430px] mt-2 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  loading="lazy"
                />
              </div>
            )}

            {/* Full result card — visible after spin */}
            {winner && (
              <div
                className="w-full overflow-hidden rounded-[28px] border transition-all duration-500"
                style={{
                  background: `linear-gradient(145deg, ${wc}18 0%, rgba(10,10,16,0.97) 55%)`,
                  borderColor: `${wc}40`,
                  boxShadow: `0 0 0 1px ${wc}22 inset, 0 24px 60px rgba(0,0,0,0.4)`,
                  opacity: resultVisible ? 1 : 0,
                  transform: resultVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
                }}
              >
                {/* Month header */}
                <div
                  className="px-6 pt-5 pb-4 border-b border-white/[0.06]"
                  style={{ background: `linear-gradient(135deg, ${wc}18, ${wc}08)` }}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">
                    Mês sorteado
                  </p>
                  <h2 className="mt-1 text-3xl font-black" style={{ color: wc }}>
                    {winner.monthName}
                  </h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Song info */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${wc}20` }}
                    >
                      <Music className="h-6 w-6" style={{ color: wc }} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/38">
                        Música sorteada
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <h3 className="truncate text-xl font-black text-white">
                          {winner.song?.title}
                        </h3>
                        {songSlug && (
                          <Link
                            to={`/musica/${songSlug}`}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white transition-all hover:scale-110"
                            style={{ borderColor: wc, color: wc }}
                            aria-label="Ver página da música"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                      {winner.song?.release_date && (
                        <p className="mt-0.5 text-xs font-medium" style={{ color: `${wc}aa` }}>
                          {new Date(`${winner.song.release_date}T12:00:00`).toLocaleDateString('pt-BR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* YT player */}
                  {!youtubeId && winner.song?.youtube_url && (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
                      <span>⚠️</span>
                      <span>Player indisponível — use o botão YouTube abaixo.</span>
                    </div>
                  )}
                  {youtubeId && (
                    <>
                      <iframe
                        ref={iframeRef}
                        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&autoplay=1&rel=0`}
                        title={winner.song?.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        onLoad={() => sendYTCommand('playVideo')}
                        style={{
                          position: 'fixed', top: '-9999px', left: '-9999px',
                          width: '1px', height: '1px', opacity: 0, pointerEvents: 'none',
                        }}
                      />
                      <div
                        className="flex items-center gap-3 rounded-2xl border border-white/8 px-4 py-3"
                        style={{ backgroundColor: `${wc}10` }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            sendYTCommand(playerState === 'playing' ? 'pauseVideo' : 'playVideo');
                            setPlayerState(playerState === 'playing' ? 'paused' : 'playing');
                          }}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md transition-all hover:scale-110"
                          style={{ backgroundColor: wc }}
                          aria-label={playerState === 'playing' ? 'Pausar' : 'Tocar'}
                        >
                          {playerState === 'playing'
                            ? <Pause className="h-4 w-4" />
                            : <Play className="ml-0.5 h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => { sendYTCommand('stopVideo'); setPlayerState('stopped'); }}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white transition-all hover:scale-110"
                          style={{ borderColor: wc, color: wc }}
                          aria-label="Parar"
                        >
                          <Square className="h-3 w-3" />
                        </button>
                        <span className="truncate text-sm font-semibold" style={{ color: wc }}>
                          {playerState === 'playing' ? 'A tocar…' : playerState === 'paused' ? '⏸ Pausado' : '⏹ Parado'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Description */}
                  {description && (
                    <div
                      className="rounded-2xl border px-4 py-3"
                      style={{ borderColor: `${wc}28`, backgroundColor: `${wc}0a` }}
                    >
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: wc }}>
                        Sobre esta música
                      </p>
                      <p className="line-clamp-4 text-sm leading-6 text-white/65">{description}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {streamingButtons.map((btn) => (
                      <a
                        key={btn.key}
                        href={btn.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={btn.label}
                        title={btn.label}
                        className="inline-flex h-10 min-w-[44px] items-center justify-center gap-2 rounded-2xl px-4 text-xs font-bold text-white shadow-lg transition-all hover:scale-105"
                        style={{ backgroundColor: btn.bg }}
                      >
                        {btn.icon}
                        <span className="hidden sm:inline">{btn.label}</span>
                      </a>
                    ))}
                    {songSlug && (
                      <Link
                        to={`/musica/${songSlug}`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-xs font-bold text-white/70 transition-all hover:bg-white/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver ficha
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={spin}
                      disabled={spinning}
                      className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-xs font-bold text-white/70 transition-all hover:bg-white/10 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
                      Girar de novo
                    </button>
                    {winnerYear && (
                      <Link
                        to={`/arquivo/${winnerYear}`}
                        className="inline-flex h-10 items-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-xs font-bold text-white/70 transition-all hover:bg-white/10"
                      >
                        Músicas de {winnerYear}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
