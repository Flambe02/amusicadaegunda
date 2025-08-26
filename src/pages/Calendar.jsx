import React, { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isMonday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Music, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SongPlayer from '../components/SongPlayer';

export default function Calendar() {
  const [songs, setSongs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSong, setSelectedSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const data = await Song.list('-release_date');
      setSongs(data);
    } catch (error) {
      console.error('Error loading songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSongForDate = (date) => {
    return songs.find(song => 
      isSameDay(new Date(song.release_date), date)
    );
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getDayClass = (day) => {
    const song = getSongForDate(day);
    const isCurrentDay = isSameDay(day, new Date());
    const isMondayDay = isMonday(day);
    
    let classes = "aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all duration-300 ";
    
    if (song) {
      classes += "bg-[#32a2dc] text-white shadow-lg cursor-pointer hover:shadow-xl transform hover:scale-105 ";
    } else if (isMondayDay) {
      classes += "bg-white/40 text-gray-600 border-2 border-dashed border-gray-400 ";
    } else {
      classes += "bg-white/20 text-gray-500 ";
    }
    
    if (isCurrentDay) {
      classes += "ring-2 ring-white ring-opacity-60 ";
    }
    
    return classes;
  };

  if (isLoading) {
    return (
      <div className="p-5 max-w-md mx-auto animate-pulse">
        <div className="h-12 bg-white/30 rounded-2xl mb-6"></div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array(35).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-white/30 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-5 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white drop-shadow-lg mb-2">
            Agenda Musical
          </h1>
          <p className="text-white/80 font-medium drop-shadow-md">
            Acompanhe todas as músicas da segunda
          </p>
        </div>

        {/* Calendar Header */}
        <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth(-1)}
              className="text-gray-600 hover:text-gray-800 hover:bg-white/60"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <h2 className="text-2xl font-black text-gray-800 capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth(1)}
              className="text-gray-600 hover:text-gray-800 hover:bg-white/60"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map(day => {
              const song = getSongForDate(day);
              return (
                <div
                  key={day.toISOString()}
                  className={getDayClass(day)}
                  onClick={() => song && setSelectedSong(song)}
                >
                  <span className="text-xs">{format(day, 'd')}</span>
                  {song && <Music className="w-3 h-3 mt-1" />}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#32a2dc] rounded-lg"></div>
              <span className="text-gray-600 font-medium">Música disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white/40 border-2 border-dashed border-gray-400 rounded-lg"></div>
              <span className="text-gray-600 font-medium">Segunda-feira (aguardando)</span>
            </div>
          </div>
        </div>

        {/* Recent Songs */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-white drop-shadow-lg">Músicas Recentes</h3>
          {songs.slice(0, 5).map(song => (
            <div
              key={song.id}
              className="bg-[#f8f5f2] rounded-2xl p-4 shadow-lg flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all duration-300"
              onClick={() => setSelectedSong(song)}
            >
              <div className="w-12 h-12 bg-[#32a2dc] rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <p className="font-bold text-gray-800">{song.title}</p>
                <p className="text-sm text-gray-600">{song.artist}</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(song.release_date), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Song Dialog */}
      <Dialog open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <DialogContent className="max-w-md p-0 border-0 bg-transparent max-h-[90vh] overflow-y-auto">
          <SongPlayer song={selectedSong} />
        </DialogContent>
      </Dialog>
    </>
  );
}