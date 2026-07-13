// "Distribuição e links" — availability derived purely from existing Supabase
// fields (no external calls). Only Spotify, Apple Music, YouTube Music, and
// YouTube vídeo are shown.
import { CheckCircle2, Circle, ExternalLink, AlertTriangle } from 'lucide-react';
import { isValidHttpUrl } from './adminData';

const PLATFORMS = [
  { key: 'spotifyUrl', label: 'Spotify' },
  { key: 'appleMusicUrl', label: 'Apple Music' },
  { key: 'youtubeMusicUrl', label: 'YouTube Music' },
  { key: 'youtubeVideoUrl', label: 'YouTube vídeo' },
];

function Row({ label, url, onEdit }) {
  const present = Boolean(url);
  const valid = present && isValidHttpUrl(url);

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-300">{label}</span>
      {!present && (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <Circle size={13} /> Não disponível
        </span>
      )}
      {present && !valid && (
        <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
          <AlertTriangle size={13} /> Link inválido
        </button>
      )}
      {present && valid && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300"
        >
          <CheckCircle2 size={13} /> Disponível <ExternalLink size={12} className="text-gray-500" />
        </a>
      )}
    </div>
  );
}

export default function SongPlatformLinks({ platforms, onEdit }) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Distribuição e links</h3>
      <div className="divide-y divide-white/5">
        {PLATFORMS.map((p) => (
          <Row key={p.key} label={p.label} url={platforms[p.key]} onEdit={onEdit} />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-600">Distribuição via DistroKid</p>
    </div>
  );
}
