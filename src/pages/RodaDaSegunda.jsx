import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Song } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Music, RotateCcw, ExternalLink } from 'lucide-react';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_COLORS = [
  '#3B82F6', // Jan — bleu électrique
  '#6366F1', // Fev — indigo vif
  '#EC4899', // Mar — rose fuchsia
  '#F97316', // Abr — orange vif
  '#10B981', // Mai — vert émeraude
  '#EAB308', // Jun — jaune soleil
  '#F59E0B', // Jul — ambre
  '#EF4444', // Ago — rouge cerise
  '#8B5CF6', // Set — violet
  '#14B8A6', // Out — teal
  '#06B6D4', // Nov — cyan
  '#F43F5E', // Dez — rose rouge fêtes
];

function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function drawWheel(canvas, segments, rotation) {
  if (!canvas || segments.length === 0) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2;
  const radius = cx - 8;
  const arc = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, size, size);

  // Ombre
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cx, radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  segments.forEach(({ label, color }, i) => {
    const startAngle = rotation + i * arc;
    const endAngle = startAngle + arc;

    // Segment avec dégradé radial
    const grad = ctx.createRadialGradient(cx, cx, radius * 0.25, cx, cx, radius);
    grad.addColorStop(0, color + 'dd');
    grad.addColorStop(1, color);
    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label (mois abrégé uniquement)
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

  // Cercle central
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

export default function RodaDaSegunda() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null); // { monthName, monthColor, song }
  const canvasRef = useRef(null);
  const currentRotRef = useRef(0);
  const animRef = useRef(null);
  const CANVAS_SIZE = 360;

  // Grouper les chansons par mois (indépendamment de l'année)
  const songsByMonth = useMemo(() => {
    const map = {};
    songs.forEach(song => {
      if (song.release_date) {
        const month = new Date(song.release_date).getMonth(); // 0-11
        if (!map[month]) map[month] = [];
        map[month].push(song);
      }
    });
    return map;
  }, [songs]);

  const segments = useMemo(() =>
    MONTHS_PT.map((name, i) => ({
      label: name.slice(0, 3),
      fullName: name,
      color: MONTH_COLORS[i],
      monthIndex: i,
      count: (songsByMonth[i] || []).length,
    })),
    [songsByMonth]
  );

  useEffect(() => {
    Song.list('-release_date').then(data => {
      setSongs(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (segments.length > 0) {
      drawWheel(canvasRef.current, segments, currentRotRef.current);
    }
  }, [segments]);

  const spin = () => {
    if (spinning || loading) return;
    setWinner(null);
    setSpinning(true);

    // Choisir uniquement parmi les mois qui ont des chansons
    const available = segments.filter(s => s.count > 0);
    if (available.length === 0) { setSpinning(false); return; }

    const target = available[Math.floor(Math.random() * available.length)];
    const arc = (2 * Math.PI) / 12;
    const targetBaseRot = -Math.PI / 2 - target.monthIndex * arc - arc / 2;
    let delta = targetBaseRot - (currentRotRef.current % (2 * Math.PI));
    if (delta <= 0) delta += 2 * Math.PI;
    const finalRot = currentRotRef.current + (6 + Math.floor(Math.random() * 4)) * 2 * Math.PI + delta;

    const duration = 4500;
    const startRot = currentRotRef.current;
    const startTime = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 4);

    const animate = now => {
      const t = Math.min((now - startTime) / duration, 1);
      currentRotRef.current = startRot + (finalRot - startRot) * easeOut(t);
      drawWheel(canvasRef.current, segments, currentRotRef.current);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        currentRotRef.current = finalRot;
        const monthSongs = songsByMonth[target.monthIndex] || [];
        const song = monthSongs[Math.floor(Math.random() * monthSongs.length)];
        setWinner({ monthName: target.fullName, monthColor: target.color, song });
        setSpinning(false);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  const youtubeId = winner?.song ? extractYouTubeId(winner.song.youtube_url) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50">
      {/* Titre */}
      <div className="text-center pt-6 pb-4 px-4">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">A Roda de Segunda</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gire a roda — cada mês esconde uma música!
        </p>
      </div>

      {/* Layout : colonne sur mobile, côte-à-côte sur desktop */}
      <div className="max-w-5xl mx-auto px-4 pb-16 flex flex-col lg:flex-row lg:items-start lg:gap-12">

        {/* ── Roue ── */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative" style={{ width: CANVAS_SIZE }}>
            {/* Pointeur */}
            <div className="absolute z-10" style={{ top: -14, left: '50%', transform: 'translateX(-50%)' }}>
              <svg width="28" height="22" viewBox="0 0 28 22">
                <polygon points="14,20 2,0 26,0" fill="#1a1a2e" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="cursor-pointer rounded-full"
              style={{ touchAction: 'manipulation' }}
              onClick={spin}
            />
          </div>

          <Button
            onClick={spin}
            disabled={spinning || loading}
            className="mt-5 px-10 py-3 bg-[#32a2dc] hover:bg-[#2891c8] text-white font-black rounded-2xl text-lg shadow-lg transition-all hover:scale-105 disabled:opacity-60 disabled:scale-100"
          >
            {loading ? 'Carregando...' : spinning ? '⏳ Girando...' : 'Girar a Roda!'}
          </Button>
        </div>

        {/* ── Résultat ── */}
        <div className="flex-1 mt-8 lg:mt-0">

          {/* Placeholder desktop (avant le premier spin) */}
          {!winner && !spinning && (
            <div className="hidden lg:flex flex-col items-center justify-center h-72 rounded-3xl border-2 border-dashed border-gray-200 text-gray-300">
              <div className="text-5xl mb-3">🎡</div>
              <p className="text-base font-medium">Gire a roda para descobrir uma música!</p>
            </div>
          )}

          {/* Carte résultat */}
          {winner && !spinning && (
            <div
              className="bg-white rounded-3xl shadow-xl overflow-hidden border-t-4"
              style={{ borderColor: winner.monthColor }}
            >
              {/* Header mois */}
              <div className="px-6 py-4 text-white" style={{ backgroundColor: winner.monthColor }}>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Mês sorteado</p>
                <h2 className="text-2xl font-black">{winner.monthName}</h2>
              </div>

              <div className="px-6 py-5">
                {/* Infos chanson */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: winner.monthColor + '22' }}
                  >
                    <Music className="w-6 h-6" style={{ color: winner.monthColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Música sorteada</p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-gray-800 truncate">{winner.song?.title}</h3>
                      {winner.song?.slug && (
                        <a
                          href={`/musica/${winner.song.slug}/`}
                          title="Ver página da música"
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                          style={{ backgroundColor: winner.monthColor + '22', color: winner.monthColor }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {winner.song?.artist && (
                      <p className="text-gray-500 text-sm">{winner.song.artist}</p>
                    )}
                  </div>
                </div>

                {/* ── Lecteur YouTube embarqué ── */}
                {youtubeId && (
                  <div className="rounded-2xl overflow-hidden mb-4 shadow-md" style={{ aspectRatio: '16/9' }}>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                      title={winner.song?.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                      style={{ border: 'none', display: 'block', height: '100%', width: '100%' }}
                    />
                  </div>
                )}

                {/* Boutons streaming */}
                <div className="flex flex-col gap-2">
                  {winner.song?.spotify_url && (
                    <a href={winner.song.spotify_url} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-2xl text-sm transition-all hover:scale-105">
                        🎧 Ouvir no Spotify
                      </Button>
                    </a>
                  )}
                  {winner.song?.youtube_url && (
                    <a href={winner.song.youtube_url} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-2xl text-sm transition-all hover:scale-105">
                        📺 Ouvir no YouTube
                      </Button>
                    </a>
                  )}
                  {winner.song?.apple_music_url && (
                    <a href={winner.song.apple_music_url} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90 text-white font-bold py-3 rounded-2xl text-sm transition-all hover:scale-105">
                        🎵 Ouvir no Apple Music
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => { setWinner(null); spin(); }}
                    className="w-full font-bold py-3 rounded-2xl text-sm gap-2 mt-1 border-2"
                    style={{ borderColor: winner.monthColor, color: winner.monthColor }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Girar de novo!
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
