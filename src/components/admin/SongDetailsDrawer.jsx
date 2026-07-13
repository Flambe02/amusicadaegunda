// Right-side details drawer. In-flow sticky column on large screens; overlay
// panel on smaller screens. Esc closes; close button is focused on open.
import { useEffect, useRef, useState } from 'react';
import { Music, X } from 'lucide-react';
import { StatusBadge, CategoryTag, KaraokeTag } from './badges';
import { formatShortDate } from './adminData';
import SongPlatformLinks from './SongPlatformLinks';
import SongQuickActions from './SongQuickActions';
import SongLocalAudioStatus from './SongLocalAudioStatus';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function SummaryRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function DrawerBody({ view, closeRef, onClose, onEdit, onKaraoke, onPublish, onManageLinks, onDelete }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Detalhes da música</h2>
        <button ref={closeRef} onClick={onClose} aria-label="Fechar detalhes" className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Summary */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
            {view.coverImage
              ? <img src={view.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
              : <Music size={20} className="text-gray-500" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{view.title}</p>
            <p className="text-xs text-gray-500">{formatShortDate(view.releaseDate)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3">
          <SummaryRow label="Categoria"><CategoryTag label={view.categoryLabel} /></SummaryRow>
          <SummaryRow label="Karaokê"><KaraokeTag state={view.karaokeState} /></SummaryRow>
          <SummaryRow label="Status">
            <StatusBadge status={view.status} scheduled={Boolean(view.publishAt) && view.status !== 'published'} />
          </SummaryRow>
        </div>

        <SongPlatformLinks platforms={view.platforms} onEdit={() => onManageLinks(view)} />
        <SongLocalAudioStatus view={view} />
        <SongQuickActions view={view} onEdit={onEdit} onKaraoke={onKaraoke} onPublish={onPublish} onManageLinks={onManageLinks} onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function SongDetailsDrawer({ view, onClose, onEdit, onKaraoke, onPublish, onManageLinks, onDelete }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const closeRef = useRef(null);

  // Focus the close button when a song is selected / changed.
  useEffect(() => {
    if (view) closeRef.current?.focus();
  }, [view?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes.
  useEffect(() => {
    if (!view) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view, onClose]);

  if (!view) return null;

  const body = (
    <DrawerBody view={view} closeRef={closeRef} onClose={onClose} onEdit={onEdit} onKaraoke={onKaraoke} onPublish={onPublish} onManageLinks={onManageLinks} onDelete={onDelete} />
  );

  if (isDesktop) {
    return (
      <aside
        role="complementary"
        aria-label="Detalhes da música"
        className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[360px] shrink-0 border-l border-white/10 bg-gray-950 lg:block"
      >
        {body}
      </aside>
    );
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Detalhes da música">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[360px] max-w-[92vw] border-l border-white/10 bg-gray-950 shadow-2xl">
        {body}
      </div>
    </div>
  );
}
