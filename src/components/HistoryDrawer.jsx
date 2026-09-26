import React, { useState, useMemo } from 'react';
import { Clock, Play, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from './ui/button';

export default function HistoryDrawer({ 
  open, 
  onOpenChange,
  songs, // Toutes les chansons (pas seulement le mois en cours)
  onSelectSong
}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Filtrer les chansons pour le mois sélectionné
  const monthSongs = useMemo(() => {
    if (!songs || songs.length === 0) return [];
    
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    return songs.filter(song => {
      const songDate = parseISO(song.release_date);
      return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
    });
  }, [songs, selectedMonth]);

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  // Vérifier si on peut naviguer vers le mois précédent/suivant
  const canNavigatePrevious = useMemo(() => {
    if (!songs || songs.length === 0) return false;
    const prevMonth = addMonths(selectedMonth, -1);
    const prevMonthStart = startOfMonth(prevMonth);
    const prevMonthEnd = endOfMonth(prevMonth);
    return songs.some(song => {
      const songDate = parseISO(song.release_date);
      return isWithinInterval(songDate, { start: prevMonthStart, end: prevMonthEnd });
    });
  }, [songs, selectedMonth]);

  const canNavigateNext = useMemo(() => {
    if (!songs || songs.length === 0) return false;
    const nextMonth = addMonths(selectedMonth, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    const nextMonthEnd = endOfMonth(nextMonth);
    return songs.some(song => {
      const songDate = parseISO(song.release_date);
      return isWithinInterval(songDate, { start: nextMonthStart, end: nextMonthEnd });
    });
  }, [songs, selectedMonth]);

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
              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
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
          ) : (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/90 font-medium text-lg mb-2 drop-shadow-sm">
                Nenhuma música disponível
              </p>
              <p className="text-white/70 text-sm drop-shadow-sm">
                Nenhuma música foi publicada em {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}.
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

