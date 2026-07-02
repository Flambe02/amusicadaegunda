import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe,
  Landmark,
  Tv,
  BarChart3,
  BookOpen,
  Shield,
  UtensilsCrossed,
  Zap,
  Image as ImageIcon,
  Shuffle,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AppButton from './AppButton';
import { getYouTubeThumbnailUrl, extractYouTubeId, titleToSlug } from '@/lib/utils';

function SoccerBallIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polygon points="12,7 15,9.5 14,13 10,13 9,9.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="3" x2="12" y2="7" />
      <line x1="14" y1="13" x2="17.5" y2="14.5" />
      <line x1="10" y1="13" x2="6.5" y2="14.5" />
      <line x1="9" y1="9.5" x2="5" y2="9" />
      <line x1="15" y1="9.5" x2="19" y2="9" />
    </svg>
  );
}

const CATEGORIES = [
  { key: 'politica',      label: 'Política',      color: '#6D28D9', Icon: Landmark },
  { key: 'esporte',       label: 'Esporte',        color: '#16A34A', Icon: SoccerBallIcon },
  { key: 'internacional', label: 'Internacional',  color: '#0EA5E9', Icon: Globe },
  { key: 'midia',         label: 'Mídia',          color: '#DC2626', Icon: Tv },
  { key: 'economia',      label: 'Economia',       color: '#0F766E', Icon: BarChart3 },
  { key: 'cultura',       label: 'Cultura',        color: '#EAB308', Icon: BookOpen },
  { key: 'policia',       label: 'Polícia',        color: '#9F1239', Icon: Shield },
  { key: 'gastronomia',   label: 'Gastronomia',    color: '#F97316', Icon: UtensilsCrossed },
  { key: 'energia',       label: 'Energia',        color: '#F59E0B', Icon: Zap },
];

const CATEGORY_ALIASES = {
  seguranca: 'policia',
  outros: 'cultura',
  brasil: 'politica',
  atualidade: 'politica',
};

function normalizeCategoryKey(raw) {
  if (!raw) return null;
  const lower = String(raw).toLowerCase().trim();
  if (CATEGORIES.find((c) => c.key === lower)) return lower;
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  return null;
}

function drawWheel(canvas, size) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const radius = cx - 4;
  const arc = (2 * Math.PI) / CATEGORIES.length;

  ctx.clearRect(0, 0, size, size);

  CATEGORIES.forEach(({ color }, index) => {
    const startAngle = -Math.PI / 2 - arc / 2 + index * arc;
    const endAngle = startAngle + arc;

    const gradient = ctx.createRadialGradient(cx, cx, radius * 0.18, cx, cx, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}d8`);

    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.arc(cx, cx, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function getMobileYouTubeId(song) {
  return extractYouTubeId(song?.youtube_url) || null;
}

function getArtworkYouTubeId(song) {
  return (
    extractYouTubeId(song?.youtube_music_url) ||
    extractYouTubeId(song?.youtube_url) ||
    null
  );
}

function getSongArtwork(song) {
  if (!song) return null;
  const artworkYtId = getArtworkYouTubeId(song);
  const videoThumb = artworkYtId ? `https://img.youtube.com/vi/${artworkYtId}/maxresdefault.jpg` : null;
  const genericCover = song.cover_image?.includes('/icons/') || song.cover_image?.includes('icon-512');
  return (
    videoThumb ||
    getYouTubeThumbnailUrl(song.youtube_music_url || song.youtube_url, 'maxresdefault') ||
    getYouTubeThumbnailUrl(song.youtube_music_url || song.youtube_url, 'hqdefault') ||
    (!genericCover && song.cover_image) ||
    song.thumbnail_url ||
    null
  );
}

function PlatformPill({ href, tone, children }) {
  const toneClass = {
    spotify: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    youtube: 'border-red-500/25 bg-red-500/10 text-red-300',
    apple: 'border-pink-500/25 bg-pink-500/10 text-pink-300',
  }[tone] || 'border-white/12 bg-white/[0.06] text-white/82';

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[11px] font-black ${toneClass}`}
    >
      {children}
    </a>
  );
}

export default function MobileRoletaApp({ songs = [], loading = false }) {
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [size, setSize] = useState(292);
  const [activeYtId, setActiveYtId] = useState(null);
  const [playerState, setPlayerState] = useState('stopped');
  const canvasRef = useRef(null);
  const iframeRef = useRef(null);
  const wheelInnerRef = useRef(null);
  const rotationRef = useRef(0);
  const animRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape = w > h;
      // In landscape on phones the vertical room is tiny, so allow the wheel
      // to shrink further than the portrait minimum of 246 to keep the
      // result card + spin button visible.
      const minSize = isLandscape ? 180 : 246;
      const heightBudget = isLandscape
        ? Math.floor(h - 200) // leave room for header + button + result
        : Math.floor(h * 0.39);
      setSize(Math.max(minSize, Math.min(306, w - 54, heightBudget)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    drawWheel(canvasRef.current, size);
  }, [size]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const sendYTCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  };

  const attemptPlayCurrent = () => {
    if (!activeYtId) return;
    sendYTCommand('playVideo');
    setPlayerState('playing');
  };

  useEffect(() => {
    if (!activeYtId) return undefined;
    const t1 = window.setTimeout(attemptPlayCurrent, 250);
    const t2 = window.setTimeout(attemptPlayCurrent, 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [activeYtId]);

  const songsByCategory = useMemo(() => {
    const map = {};
    songs.forEach((song) => {
      const key = normalizeCategoryKey(song.category);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(song);
    });
    return map;
  }, [songs]);

  const populatedCategories = useMemo(
    () => CATEGORIES.filter((c) => (songsByCategory[c.key] || []).length > 0),
    [songsByCategory]
  );

  const setWheelTransform = (rad) => {
    if (wheelInnerRef.current) {
      wheelInnerRef.current.style.setProperty('--wheel-rot', `${rad}rad`);
    }
  };

  const spin = () => {
    if (spinning || loading || populatedCategories.length === 0) return;
    if (navigator.vibrate) navigator.vibrate(30);
    setWinner(null);
    setSpinning(true);

    const target = populatedCategories[Math.floor(Math.random() * populatedCategories.length)];
    const targetIndex = CATEGORIES.findIndex((c) => c.key === target.key);
    const arc = (2 * Math.PI) / CATEGORIES.length;
    // Pointer at top (-π/2). Slice center is at -π/2 + index*arc (after our offset).
    // We want wheel rotation so that targetIndex's center ends up at the pointer angle.
    // Slice center (in wheel-local) = index * arc. Pointer angle (world) = -π/2.
    // We rotate wheel by R, so slice world angle = local + R = -π/2.
    // R = -π/2 - index*arc.
    const targetBaseRot = -targetIndex * arc;
    const current = rotationRef.current;
    const baseTurns = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    let delta = targetBaseRot - (current % (2 * Math.PI));
    if (delta <= 0) delta += 2 * Math.PI;
    const finalRot = current + baseTurns + delta;

    const duration = 4000;
    const startTime = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const rad = current + (finalRot - current) * easeOut(t);
      rotationRef.current = rad;
      setWheelTransform(rad);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      rotationRef.current = finalRot;
      const pool = songsByCategory[target.key] || [];
      const song = pool[Math.floor(Math.random() * pool.length)];
      if (song) {
        setWinner({ category: target, song });
        setActiveYtId(null);
        setPlayerState('stopped');
      }
      setSpinning(false);
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const winnerArtwork = getSongArtwork(winner?.song);
  const winnerYtId = getMobileYouTubeId(winner?.song);
  const isWinnerPlaying = winnerYtId && activeYtId === winnerYtId && playerState === 'playing';
  const winnerSongSlug = winner?.song?.slug || titleToSlug(winner?.song?.title);
  const winnerSongPath = winnerSongSlug ? `/musica/${winnerSongSlug}` : '/musica';
  const winnerYouTubeUrl = winner?.song?.youtube_url || winner?.song?.youtube_music_url;

  const toggleWinnerPlayback = () => {
    if (!winnerYtId) return;

    if (activeYtId === winnerYtId) {
      if (playerState === 'playing') {
        sendYTCommand('pauseVideo');
        setPlayerState('paused');
      } else {
        sendYTCommand('playVideo');
        setPlayerState('playing');
      }
      return;
    }

    setActiveYtId(winnerYtId);
    setPlayerState('paused');
  };

  const radius = size / 2;
  const iconRadius = radius * 0.62;
  const arcStep = 360 / CATEGORIES.length;

  return (
    <div className="flex h-full min-h-full flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(253,224,71,0.12),transparent_26%),linear-gradient(180deg,#050505_0%,#0b0b0b_46%,#050505_100%)] px-4 pb-4 pt-[max(env(safe-area-inset-top),0.75rem)] text-app-white">
      {activeYtId ? (
        <iframe
          key={activeYtId}
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${activeYtId}?enablejsapi=1&autoplay=1&rel=0`}
          title="player roleta"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={attemptPlayCurrent}
          className="fixed -left-[9999px] -top-[9999px] h-px w-px opacity-0"
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-[390px] flex-col gap-2 landscape:max-w-[760px] landscape:flex-row landscape:items-start landscape:gap-4">
      <header className="mb-2 flex min-h-10 items-center justify-center">
        <h1 className="text-[20px] font-black tracking-tight text-white">Roleta da Zoeira</h1>
      </header>

      <div className="relative mx-auto flex flex-col items-center landscape:mx-0 landscape:flex-shrink-0" style={{ width: size + 16 }}>
        <div className="relative" style={{ width: size, height: size }}>
          <div
            className="absolute z-20"
            style={{ top: -8, left: '50%', transform: 'translateX(-50%)' }}
            aria-hidden="true"
          >
            <svg width="22" height="20" viewBox="0 0 22 20">
              <polygon points="11,18 1,2 21,2" fill="#FACC15" stroke="#0a0a0a" strokeWidth="1.5" />
            </svg>
          </div>

          <div
            ref={wheelInnerRef}
            className="absolute inset-0"
            style={{
              transformOrigin: 'center',
              willChange: 'transform',
              transform: 'rotate(var(--wheel-rot, 0rad))',
              '--wheel-rot': '0rad',
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={spin}
              className="block cursor-pointer rounded-full"
              style={{ touchAction: 'manipulation' }}
              aria-label="Roleta de categorias"
            />
            {CATEGORIES.map(({ key, label, Icon }, index) => {
              const angle = (index * arcStep - 90) * (Math.PI / 180);
              const x = radius + Math.cos(angle) * iconRadius;
              const y = radius + Math.sin(angle) * iconRadius;
              return (
                <div
                  key={key}
                  className="pointer-events-none absolute flex flex-col items-center text-white"
                  style={{
                    left: x,
                    top: y,
                    transform:
                      'translate(-50%, -50%) rotate(calc(var(--wheel-rot, 0rad) * -1))',
                    width: 62,
                  }}
                >
                  <Icon className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
                  <span className="mt-1 text-center text-[9px] font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={spin}
            disabled={spinning || loading}
            aria-label="Girar"
            className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-app-yellow text-black shadow-app-soft ring-4 ring-black/40 transition active:scale-95 disabled:opacity-70"
          >
            <Shuffle className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">

      <div className="mt-3 overflow-hidden rounded-[16px] border border-violet-300/18 bg-[linear-gradient(135deg,rgba(88,28,135,0.92),rgba(46,16,101,0.86))] shadow-[0_18px_45px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] landscape:mt-0">
        {winner ? (
          <div className="grid min-h-[102px] grid-cols-[minmax(0,1fr)_92px] gap-3 p-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[11px] font-semibold text-white/62">
                Caiu em
              </p>
              <h2 className="mt-0.5 text-[21px] font-black leading-tight text-white">
                {winner.category.label}
              </h2>
              <p className="mt-2 text-[11px] font-semibold text-white/62">
                Nossa sugestão pra você:
              </p>
              <h3 className="mt-0.5 line-clamp-2 max-w-full text-left text-[19px] font-black leading-tight text-white">
                {winner.song?.title}
              </h3>

            </div>
            <button
              type="button"
              onClick={toggleWinnerPlayback}
              disabled={!winnerYtId}
              className="relative h-[92px] w-[92px] overflow-hidden rounded-[12px] bg-black/25 transition active:scale-95 disabled:opacity-85"
              aria-label={isWinnerPlaying ? 'Pausar musica sorteada' : 'Ouvir musica sorteada'}
            >
              {winnerArtwork ? (
                <img
                  src={winnerArtwork}
                  alt=""
                  className="h-full w-full object-cover"
                  width="92"
                  height="92"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/35">
                  <ImageIcon className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-app-yellow text-black shadow-[0_8px_24px_rgba(253,224,71,0.35)] backdrop-blur-sm">
                  {isWinnerPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="px-4 py-5 text-center text-sm text-app-muted">
            {loading ? 'Carregando músicas…' : 'Toca em "Girar a roleta" para sortear.'}
          </div>
        )}
      </div>

      <AppButton
        size="lg"
        onClick={spin}
        disabled={spinning || loading || populatedCategories.length === 0}
        className="mt-3 min-h-[52px] w-full gap-2 rounded-full text-base"
      >
        <RefreshCw className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
        {loading ? 'Carregando...' : spinning ? 'Girando…' : 'Girar a roleta'}
      </AppButton>

      {winner?.song ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-2 text-[11px] font-black text-white">
            Ouça também em
          </p>
          <div className="flex flex-wrap gap-2">
            <PlatformPill tone="spotify" href={winner.song.spotify_url}>
              Spotify
            </PlatformPill>
            <PlatformPill tone="youtube" href={winnerYouTubeUrl}>
              YouTube
            </PlatformPill>
            <PlatformPill tone="apple" href={winner.song.apple_music_url}>
              Apple Music
            </PlatformPill>
            <Link
              to={winnerSongPath}
              className="inline-flex min-h-9 items-center rounded-full border border-white/12 bg-white/[0.06] px-3 text-[11px] font-black text-white/86"
            >
              Detalhes
            </Link>
          </div>
        </div>
      ) : null}
      </div>
      </div>
    </div>
  );
}
