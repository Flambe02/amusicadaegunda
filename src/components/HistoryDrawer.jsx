import React, { useState, useMemo } from 'react';
import { Clock, Play, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from './ui/button';

export default function HistoryDrawer({ 
  open, 
  onOpenChange,
  songs, // Toutes les chansons (pas seulement le mois en cours)
  onSelectSong
}) {
  // Mois (début de mois) contenant au moins une chanson, du plus récent au plus
  // ancien. Le tiroir s'ouvre depuis la homepage : il applique donc la même règle
  // qu'elle et ne peut jamais afficher un mois sans publication (cf. spec §4).
  const monthsWithSongs = useMemo(() => {
    if (!Array.isArray(songs) || songs.length === 0) return [];

    const byTime = new Map();
    for (const song of songs) {
      if (!song?.release_date) continue;
      const parsed = parseISO(song.release_date);
      if (Number.isNaN(parsed.getTime())) continue;
      const monthStart = startOfMonth(parsed);
      byTime.set(monthStart.getTime(), monthStart);
    }

    return [...byTime.values()].sort((a, b) => b.getTime() - a.getTime());
  }, [songs]);

  // `null` tant que l'utilisateur n'a pas navigué : on retombe alors sur le mois
  // publié le plus récent, et non sur le mois calendaire courant qui peut être vide.
  const [pickedMonthTime, setPickedMonthTime] = useState(null);

  const selectedMonth = useMemo(() => {
    if (monthsWithSongs.length === 0) return null;
    return monthsWithSongs.find((month) => month.getTime() === pickedMonthTime) || monthsWithSongs[0];
  }, [monthsWithSongs, pickedMonthTime]);

  const selectedIndex = selectedMonth
    ? monthsWithSongs.findIndex((month) => month.getTime() === selectedMonth.getTime())
    : -1;

  // Filtrer les chansons pour le mois sélectionné
  const monthSongs = useMemo(() => {
    if (!selectedMonth || !songs || songs.length === 0) return [];

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    return songs.filter(song => {
      const songDate = parseISO(song.release_date);
      return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
    });
  }, [songs, selectedMonth]);

  // Les flèches se déplacent dans `monthsWithSongs`, donc sautent les mois sans
  // publication : la liste affichée n'est jamais vide.
  const canNavigatePrevious = selectedIndex >= 0 && selectedIndex < monthsWithSongs.length - 1;
  const canNavigateNext = selectedIndex > 0;

  const handlePreviousMonth = () => {
    const target = monthsWithSongs[selectedIndex + 1];
    if (target) setPickedMonthTime(target.getTime());
  };

  const handleNextMonth = () => {
    const target = monthsWithSongs[selectedIndex - 1];
    if (target) setPickedMonthTime(target.getTime());
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="bg-black/95 backdrop-blur-xl border-t border-white/20 max-h-[85vh]">
        {/* Handle bar */}
        <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-white/30" />
        
        {/* Header avec titre et navigation */}
        <DrawerHeader className="px-6 pt-4 pb-2">
          <DrawerTitle className="text-xl font-bold text-white flex items-center gap-3">
            <Clock className="w-6 h-6 text-white" />
            Histórico
          </DrawerTitle>
          
          {/* Navigation entre les mois */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              disabled={!canNavigatePrevious}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <p className="text-white/90 text-sm font-medium drop-shadow-sm">
              {selectedMonth ? format(selectedMonth, 'MMMM yyyy', { locale: ptBR }) : ''}
            </p>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              disabled={!canNavigateNext}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>
        
        {/* Liste des chansons */}
        <div className="px-6 pb-6 flex-1 overflow-hidden">
          {/* Pas d'état vide : `monthsWithSongs` garantit qu'un mois affiché contient
              toujours des chansons. Liste vide = catalogue entier vide, cas où l'on
              n'affiche rien plutôt qu'un message d'absence de publication. */}
          {monthSongs && monthSongs.length > 0 ? (
            <ScrollArea className="h-[calc(85vh-180px)]">
              <div className="space-y-2 pr-4">
                {monthSongs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => {
                      if (onSelectSong) {
                        onSelectSong(song);
                      }
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 active:scale-95 touch-manipulation group text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base mb-1 truncate drop-shadow-sm">
                        {song.title}
                      </h3>
                      <p className="text-white/70 text-sm truncate drop-shadow-sm">
                        {song.artist || 'A Música da Segunda'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-white/60" />
                        <p className="text-white/60 text-xs drop-shadow-sm">
                          {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

