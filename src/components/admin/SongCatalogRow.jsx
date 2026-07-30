// A single catalog row. Clicking the body opens the details drawer; the quick
// action icons stop propagation so they never trigger the row selection.
import { memo } from 'react';
import { Music, Mic, ExternalLink, Edit2, Trash2, AudioLines, MoreHorizontal, Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { StatusBadge, CategoryTag, KaraokeTag } from './badges';
import { formatDayMonth, publicSongUrl } from './adminData';
import { catalogPrepAction } from '@/lib/workshopUi';

function SongCatalogRow({ view, selected, onSelect, onKaraoke, onPitchMap, onEdit, onDelete }) {
  const openDrawer = () => onSelect(view);
  const prepAction = catalogPrepAction(view);

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

      {/* AÇÕES — l'action principale du karaokê porte un TEXTE visible : elle ne se
          devine plus dans une icône. Le reste passe dans « Mais ações ». */}
      <div className="flex w-[248px] flex-shrink-0 items-center justify-end gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (prepAction.action === 'editLyrics') onEdit(view); else onKaraoke(view); }}
          className="min-h-[32px] whitespace-nowrap rounded-lg bg-purple-600/90 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-purple-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-400"
        >
          {prepAction.label}
        </button>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button" onClick={(e) => e.stopPropagation()} aria-label={`Mais ações para ${view.title}`}
                  className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/60"
                >
                  <MoreHorizontal size={15} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Mais ações</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="min-w-[190px]">
            {view.hasLyrics && (
              <DropdownMenuItem onClick={() => onKaraoke(view)}>
                <Mic size={14} className="mr-2" /> Sincronizar karaokê
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(view)}>
              <Edit2 size={14} className="mr-2" /> Editar letra
            </DropdownMenuItem>
            {view.hasLyrics && onPitchMap && (
              <DropdownMenuItem onClick={() => onPitchMap(view)}>
                <AudioLines size={14} className="mr-2" />
                Guia de tom{view.hasPitchMap ? ` · ${view.pitchNoteCount} notas` : ''}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <a href={publicSongUrl(view)} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} className="mr-2" /> Pré-visualizar
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSelect(view)}>
              <Info size={14} className="mr-2" /> Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(view)} className="text-red-400 focus:text-red-300">
              <Trash2 size={14} className="mr-2" /> Excluir música
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default memo(SongCatalogRow);
