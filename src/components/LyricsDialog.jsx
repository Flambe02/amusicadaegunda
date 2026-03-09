import React from 'react';
import { FileText, X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

export default function LyricsDialog({
  open,
  onOpenChange,
  song,
  title = "Letras da Música",
  showIcon = true
}) {
  if (!song) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-xl overflow-hidden border-white/10 bg-[#111111]/95 p-0 text-white [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            {showIcon && <FileText className="h-5 w-5 text-[#FDE047]" />}
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Song info strip */}
        {song.title && (
          <div className="border-b border-white/8 px-6 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">Música</p>
            <p className="mt-0.5 font-semibold text-white">{song.title}</p>
          </div>
        )}

        {/* Lyrics */}
        <div className="px-6 pb-6 pt-4">
          {song.lyrics ? (
            <ScrollArea className="h-[55vh]">
              <div className="pr-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">
                  {song.lyrics}
                </pre>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-white/20" />
              <p className="font-semibold text-white/60">Letras não disponíveis</p>
              <p className="mt-1 text-sm text-white/38">
                As letras desta música serão adicionadas em breve.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
