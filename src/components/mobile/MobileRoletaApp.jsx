import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Play, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';
import { extractYouTubeId, getYouTubeThumbnailUrl, titleToSlug } from '@/lib/utils';

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

  // Gold outer rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, outerR + 1, 0, 2 * Math.PI);
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#FDE047';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.restore();

  // Gold rim dots
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

  // Center hub
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

export default function MobileRoletaApp({ songs = [], loading = false }) {
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelSize, setWheelSize] = useState(304);
  const [activeYtId, setActiveYtId] = useState(null);
  const [playerState, setPlayerState] = useState('stopped');
  const [resultVisible, setResultVisible] = useState(false);
  const canvasRef = useRef(null);
  const iframeRef = useRef(null);
  const rotationRef = useRef(0);
  const animRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w > h) {
        setWheelSize(Math.max(160, Math.min(230, h - 160)));
      } else {
        setWheelSize(Math.max(260, Math.min(340, w - 32, Math.floor(h * 0.43))));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    drawPremiumWheel(canvasRef.current, wheelSize, rotationRef.current);
  }, [wheelSize]);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const sendYT = useCallback((fn) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: fn, args: [] }), '*'
    );
  }, []);

  useEffect(() => {
    if (!activeYtId) return;
    const t1 = setTimeout(() => sendYT('playVideo'), 300);
    const t2 = setTimeout(() => sendYT('playVideo'), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeYtId, sendYT]);

  const songsByMonth = useMemo(() => {
    const map = {};
    songs.forEach((s) => {
      if (s.release_date) {
        const m = new Date(s.release_date).getMonth();
        if (!map[m]) map[m] = [];
        map[m].push(s);
      }
    });
    return map;
  }, [songs]);

  const populatedMonths = useMemo(
    () => MONTHS.filter((m) => (songsByMonth[m.index] || []).length > 0),
    [songsByMonth]
  );

  const spin = () => {
    if (spinning || loading || populatedMonths.length === 0) return;
    if (navigator.vibrate) navigator.vibrate([15]);
    setWinner(null);
    setResultVisible(false);
    setActiveYtId(null);
    setPlayerState('stopped');
    setSpinning(true);

    const target = populatedMonths[Math.floor(Math.random() * populatedMonths.length)];
    const arc = (2 * Math.PI) / MONTHS.length;
    const targetBaseRot = -Math.PI / 2 - target.index * arc - arc / 2;
    const cur = rotationRef.current;
    const turns = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    let delta = targetBaseRot - (cur % (2 * Math.PI));
    if (delta <= 0) delta += 2 * Math.PI;
    const finalRot = cur + turns + delta;
    const dur = 3800;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);

    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      const rot = cur + (finalRot - cur) * ease(t);
      rotationRef.current = rot;
      drawPremiumWheel(canvasRef.current, wheelSize, rot);
      if (t < 1) { animRef.current = requestAnimationFrame(step); return; }

      rotationRef.current = finalRot;
      const pool = songsByMonth[target.index] || [];
      const song = pool[Math.floor(Math.random() * pool.length)];
      if (song) {
        setWinner({ month: target, song });
        setTimeout(() => {
          setResultVisible(true);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
        }, 250);
      } else {
        setWinner({ month: target, song: null });
        setTimeout(() => setResultVisible(true), 250);
      }
      setSpinning(false);
    };
    animRef.current = requestAnimationFrame(step);
  };

  const wc = winner?.month?.color ?? '#FACC15';
  const songYtId = winner?.song ? extractYouTubeId(winner.song.youtube_url) : null;
  const songSlug = winner?.song?.slug || (winner?.song?.title ? titleToSlug(winner.song.title) : null);
  const artwork = winner?.song
    ? (getYouTubeThumbnailUrl(winner.song.youtube_music_url || winner.song.youtube_url, 'maxresdefault') ||
       getYouTubeThumbnailUrl(winner.song.youtube_music_url || winner.song.youtube_url, 'hqdefault') ||
       winner.song.thumbnail_url || null)
    : null;
  const isPlaying = songYtId && activeYtId === songYtId && playerState === 'playing';
  const winnerYear = winner?.song?.release_date ? new Date(winner.song.release_date).getFullYear() : null;

  const togglePlay = () => {
    if (!songYtId) return;
    if (activeYtId === songYtId) {
      if (playerState === 'playing') { sendYT('pauseVideo'); setPlayerState('paused'); }
      else { sendYT('playVideo'); setPlayerState('playing'); }
    } else {
      setActiveYtId(songYtId);
      setPlayerState('paused');
    }
  };

  return (
    <div
      className="flex min-h-full flex-col overflow-x-hidden overflow-y-auto text-white"
      style={{ background: 'radial-gradient(ellipse 100% 55% at 50% -5%, rgba(109,40,217,0.22) 0%, transparent 60%), #060608' }}
    >
      {activeYtId && (
        <iframe
          key={activeYtId}
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${activeYtId}?enablejsapi=1&autoplay=1&rel=0`}
          title="player roleta"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media"
          className="fixed -left-[9999px] -top-[9999px] h-px w-px opacity-0"
        />
      )}

      {/* Hero — título + capybara */}
      <div className="relative z-10 flex-shrink-0 px-5 pt-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">
              A Música da Segunda
            </p>
            <h1 className="mt-0.5 font-black leading-[0.88] tracking-tight">
              <span className="block text-white" style={{ fontSize: 'clamp(1.9rem,9vw,2.5rem)' }}>
                Roda dos
              </span>
              <span className="block text-[#FACC15]" style={{ fontSize: 'clamp(2.3rem,11.5vw,3rem)' }}>
                Meses
              </span>
            </h1>
            <p className="mt-1.5 text-[11.5px] leading-snug text-white/45">
              Gire a roda e descubra uma{' '}
              <span className="font-semibold text-[#FACC15]/70">música</span> do acervo.
            </p>
          </div>

          {!winner && (
            <div className="relative w-[80px] flex-shrink-0 landscape:hidden">
              <div className="absolute right-[82px] top-2 z-10 w-[80px] rounded-[12px] rounded-br-none bg-[#FACC15] px-2 py-1.5 shadow-lg">
                <p className="text-[8px] font-black leading-tight text-black">
                  Gira aí. O mês escolhe a vergonha.
                </p>
              </div>
              <img
                src="/images/Caipivara_pied_transparent.png"
                alt=""
                width="80"
                className="relative z-20 drop-shadow-lg"
                loading="eager"
              />
            </div>
          )}
        </div>
      </div>

      {/* Wheel */}
      <div className="relative flex flex-shrink-0 flex-col items-center py-2 landscape:py-1">
        {/* Purple glow */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: wheelSize + 44,
            height: wheelSize + 44,
            background: 'radial-gradient(circle, rgba(109,40,217,0.3) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />

        {/* Pointer */}
        <div className="relative z-20" style={{ marginBottom: -3 }}>
          <svg width="22" height="18" viewBox="0 0 22 18">
            <polygon
              points="11,17 1,1 21,1"
              fill="#FACC15"
              style={{ filter: 'drop-shadow(0 0 6px #FACC15) drop-shadow(0 0 12px rgba(250,204,21,0.55))' }}
            />
          </svg>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onClick={!spinning ? spin : undefined}
          className="relative z-10 block rounded-full"
          style={{ width: wheelSize, height: wheelSize, cursor: spinning ? 'wait' : 'pointer' }}
        />
      </div>

      {/* Spin button */}
      <div className="flex-shrink-0 px-5 pb-3 pt-1">
        <button
          type="button"
          onClick={spin}
          disabled={spinning || loading || populatedMonths.length === 0}
          className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#FACC15] font-black text-black transition-all active:scale-[0.97] disabled:opacity-55 landscape:py-2.5"
          style={{
            minHeight: 52,
            fontSize: '0.97rem',
            letterSpacing: '0.04em',
            boxShadow: spinning ? 'none' : '0 6px 28px rgba(250,204,21,0.28), 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          <RefreshCw className={`h-[17px] w-[17px] ${spinning ? 'animate-spin' : ''}`} />
          {loading ? 'Carregando...' : spinning ? 'Girando…' : 'GIRAR A RODA'}
        </button>
      </div>

      {/* Result card */}
      {winner && (
        <div
          ref={resultRef}
          className="mx-4 mb-5 overflow-hidden rounded-[18px] border transition-all duration-500"
          style={{
            background: `linear-gradient(145deg, ${wc}18 0%, rgba(10,10,14,0.97) 55%)`,
            borderColor: `${wc}45`,
            opacity: resultVisible ? 1 : 0,
            transform: resultVisible ? 'translateY(0)' : 'translateY(14px)',
          }}
        >
          <div className="p-4">
            {/* Month badge */}
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                style={{ backgroundColor: `${wc}20`, color: wc, border: `1px solid ${wc}40` }}
              >
                {winner.month.name}
              </span>
              <span className="text-[11px] text-white/35">Mês sorteado</span>
            </div>

            {winner.song ? (
              <>
                <div className="flex items-start gap-3">
                  {/* Artwork / play */}
                  <div className="relative h-[68px] w-[68px] flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {artwork ? (
                      <img src={artwork} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl" style={{ color: wc }}>♪</div>
                    )}
                    {songYtId && (
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[2px] transition-colors hover:bg-black/40"
                        aria-label={isPlaying ? 'Pausar' : 'Tocar'}
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full text-black"
                          style={{ backgroundColor: wc }}
                        >
                          {isPlaying
                            ? <Pause className="h-3.5 w-3.5" />
                            : <Play className="ml-0.5 h-3.5 w-3.5" />}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-white/38">A música escolhida foi:</p>
                    <p className="mt-0.5 line-clamp-2 text-[15px] font-black leading-tight text-white">
                      {winner.song.title}
                    </p>
                    {winner.song.description && (
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-white/40">
                        {winner.song.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {(winner.song.youtube_url || winner.song.youtube_music_url) && (
                    <a
                      href={winner.song.youtube_url || winner.song.youtube_music_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 rounded-full px-3.5 text-[11px] font-black text-black"
                      style={{ backgroundColor: wc }}
                    >
                      Ouvir agora
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={spin}
                    disabled={spinning}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 text-[11px] font-black text-white/75 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" /> Girar de novo
                  </button>
                  {songSlug && (
                    <Link
                      to={`/musica/${songSlug}`}
                      className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-white/[0.05] px-3.5 text-[11px] font-black text-white/75"
                    >
                      Ver detalhes
                    </Link>
                  )}
                  {winnerYear && (
                    <Link
                      to={`/arquivo/${winnerYear}`}
                      className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-white/[0.05] px-3.5 text-[11px] font-black text-white/75"
                    >
                      Músicas de {winnerYear}
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <div className="py-2">
                <p className="text-sm text-white/45">
                  Nenhuma música encontrada para {winner.month.name}.
                </p>
                <button
                  type="button"
                  onClick={spin}
                  className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 text-[11px] font-black text-white/75"
                >
                  <RefreshCw className="h-3 w-3" /> Girar de novo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
