// A single catalog row. Clicking the body opens the details drawer; the quick
// action icons stop propagation so they never trigger the row selection.
import { memo } from 'react';
import { Music, Mic, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { StatusBadge, CategoryTag, KaraokeTag } from './badges';
import { formatDayMonth, publicSongUrl } from './adminData';

function IconAction({ label, onClick, href, children, danger }) {
  const cls = `rounded p-1.5 text-gray-400 transition-colors ${
    danger ? 'hover:bg-red-500/15 hover:text-red-400' : 'hover:bg-white/10 hover:text-white'
  }`;
  const stop = (e) => e.stopPropagation();
  const inner = (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={stop} aria-label={label} className={cls}>
            {children}
          </a>
        ) : (
          <button onClick={(e) => { stop(e); onClick(); }} aria-label={label} className={cls}>
            {children}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
  return inner;
}

function SongCatalogRow({ view, selected, onSelect, onKaraoke, onEdit, onDelete }) {
  const openDrawer = () => onSelect(view);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Detalhes de ${view.title}`}
      onClick={openDrawer}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(); }
      }}
      className={`flex cursor-pointer items-center gap-3 border-b border-white/5 px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/60 ${
        selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.035]'
      }`}
    >
      {/* MÚSICA */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
          {view.coverImage
            ? <img src={view.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <Music size={16} className="text-gray-500" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{view.title}</p>
          <p className="text-xs text-gray-500">{formatDayMonth(view.releaseDate)}</p>
          {/* Category shown here as secondary info on narrow screens */}
          <div className="mt-1 sm:hidden"><CategoryTag label={view.categoryLabel} /></div>
        </div>
      </div>

      {/* CATEGORIA */}
      <div className="hidden w-[130px] flex-shrink-0 sm:block"><CategoryTag label={view.categoryLabel} /></div>

      {/* KARAOKÊ — the label itself opens the karaoke workflow when available */}
      <div className="hidden w-[115px] flex-shrink-0 md:block">
        {view.hasLyrics ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={(e) => { e.stopPropagation(); onKaraoke(view); }} className="text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/60 rounded">
                <KaraokeTag state={view.karaokeState} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Abrir karaokê</TooltipContent>
          </Tooltip>
        ) : (
          <KaraokeTag state="unconfigured" />
        )}
      </div>

      {/* STATUS */}
      <div className="hidden w-[120px] flex-shrink-0 sm:block">
        <StatusBadge status={view.status} scheduled={Boolean(view.publishAt) && view.status !== 'published'} />
      </div>

      {/* AÇÕES */}
      <div className="flex w-[168px] flex-shrink-0 items-center justify-end gap-0.5">
        {view.hasLyrics && (
          <IconAction label="Abrir karaokê" onClick={() => onKaraoke(view)}><Mic size={14} /></IconAction>
        )}
        <IconAction label="Ver no site" href={publicSongUrl(view)}><ExternalLink size={14} /></IconAction>
        <IconAction label="Editar música" onClick={() => onEdit(view)}><Edit2 size={14} /></IconAction>
        <IconAction label="Excluir música" onClick={() => onDelete(view)} danger><Trash2 size={14} /></IconAction>
      </div>
    </div>
  );
}

export default memo(SongCatalogRow);
