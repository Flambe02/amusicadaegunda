// Private local audio preview (play/pause/seek/volume). No autoplay, one at a
// time. Object URLs are revoked on unmount / source change.
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, X, Volume2 } from 'lucide-react';
import { formatDuration } from '@/lib/localAudioMetadata';

export default function LocalAudioPreview({ file, fileName, onClose }) {
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !file) return undefined;
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    el.src = url;
    el.volume = volume;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
      try { el.pause(); } catch { /* noop */ }
      el.removeAttribute('src');
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <audio ref={audioRef} preload="metadata" />
      <button onClick={toggle} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700" aria-label={playing ? 'Pausar' : 'Reproduzir'}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white" title={fileName}>{fileName}</p>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="range" min={0} max={duration || 0} step={0.1} value={time}
            onChange={(e) => { const v = Number(e.target.value); if (audioRef.current) audioRef.current.currentTime = v; setTime(v); }}
            className="h-1 flex-1 accent-purple-500"
            aria-label="Posição"
          />
          <span className="w-20 text-right text-[11px] tabular-nums text-gray-500">{formatDuration(time)} / {formatDuration(duration)}</span>
        </div>
      </div>
      <div className="hidden items-center gap-1 sm:flex">
        <Volume2 size={14} className="text-gray-500" />
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }} className="h-1 w-16 accent-purple-500" aria-label="Volume" />
      </div>
      <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Fechar prévia"><X size={16} /></button>
    </div>
  );
}
