// "Ações rápidas" for the selected song in the drawer.
import { Edit2, Mic, ExternalLink, Trash2, CheckCircle2, Link2, AudioLines, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicSongUrl } from './adminData';
import { splitLyricsLines, parseLrc } from '@/lib/lrc';
import { parseTimingModel, timingModelToEditorLines } from '@/lib/timingModel';
import { quickSyncEntry } from '@/lib/quickSync';

// Mêmes règles de chargement que l'éditeur : timing structuré > LRC > paroles brutes.
function draftLinesOf(song) {
  const model = parseTimingModel(song?.timing_data);
  if (model) return timingModelToEditorLines(model);
  const parsed = parseLrc(song?.lrc_content);
  if (parsed.length > 0) return parsed.map((l) => ({ text: l.text, time: l.time, endTime: l.endTime ?? null }));
  return splitLyricsLines(song?.lyrics_karaoke || song?.lyrics || '').map((text) => ({ text, time: null, endTime: null }));
}

export default function SongQuickActions({ view, onEdit, onKaraoke, onQuickSync, onPitchMap, onPublish, onManageLinks, onDelete }) {
  const quickEntry = quickSyncEntry({ hasLyrics: view.hasLyrics, lines: draftLinesOf(view.raw) });

  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Ações rápidas</h3>
      <div className="space-y-2">
        <Button onClick={() => onEdit(view.raw)} className="w-full justify-center gap-2 bg-purple-600 hover:bg-purple-700">
          <Edit2 size={15} /> Editar música
        </Button>

        {view.status === 'draft' && onPublish && (
          <Button onClick={() => onPublish(view)} variant="outline" className="w-full justify-center gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300">
            <CheckCircle2 size={15} /> Publicar agora
          </Button>
        )}

        {/* QUICK SYNC — capture simplifiée des frases. Ouvre le MÊME éditeur en mode de
            présentation « quick » : même brouillon, même horloge, même moteur. */}
        <Button
          onClick={() => onQuickSync?.(view)}
          disabled={quickEntry.disabled}
          title={quickEntry.disabled ? quickEntry.reason : quickEntry.hint}
          className="w-full justify-center gap-2 bg-app-yellow font-black text-black hover:brightness-110 disabled:opacity-40"
        >
          <Zap size={15} /> {quickEntry.label}
        </Button>
        {quickEntry.disabled
          ? <p className="px-1 text-[11px] text-amber-300/90">{quickEntry.reason}</p>
          : <p className="px-1 text-[11px] text-gray-500">{quickEntry.hint}</p>}

        {view.hasLyrics && (
          <Button onClick={() => onKaraoke(view)} variant="outline" className="w-full justify-center gap-2">
            <Mic size={15} /> Abrir ateliê
          </Button>
        )}

        {view.hasLyrics && onPitchMap && (
          <Button onClick={() => onPitchMap(view)} variant="outline"
            className={`w-full justify-center gap-2 ${view.hasPitchMap ? 'border-app-yellow/30 text-app-yellow hover:bg-app-yellow/10' : ''}`}>
            <AudioLines size={15} /> Guia de tom {view.hasPitchMap ? `(${view.pitchNoteCount})` : ''}
          </Button>
        )}

        <Button asChild variant="outline" className="w-full justify-center gap-2">
          <a href={publicSongUrl(view)} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} /> Ver no site
          </a>
        </Button>

        <Button onClick={() => onManageLinks(view)} variant="outline" className="w-full justify-center gap-2">
          <Link2 size={15} /> Gerenciar links
        </Button>

        <Button onClick={() => onDelete(view)} variant="outline" className="w-full justify-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <Trash2 size={15} /> Excluir música
        </Button>
      </div>
    </div>
  );
}
