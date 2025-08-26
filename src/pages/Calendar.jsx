import React, { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Music, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SongPlayer from '../components/SongPlayer';

export default function Calendar() {
  const [songs, setSongs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 7, 1)); // 1er Août 2025
  const [selectedSong, setSelectedSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSongs();
    // Vérifier si un mois spécifique est passé dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const monthParam = urlParams.get('month');
    
    if (monthParam) {
      try {
        // Format attendu: "yyyy-MM"
        const [year, month] = monthParam.split('-').map(Number);
        if (year && month !== undefined) {
          setCurrentDate(new Date(year, month - 1, 1)); // month - 1 car les mois commencent à 0
        }
      } catch (error) {
        console.error('Erro ao parsear parâmetro month:', error);
      }
    }
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
    return songs.find(song => {
      // Créer la date de sortie en utilisant la date locale pour éviter les problèmes de fuseau horaire
      // Utiliser parseISO de date-fns pour une meilleure gestion des dates
      const songDate = parseISO(song.release_date);
      return isSameDay(songDate, date);
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Fonction simple pour vérifier si une date est un lundi
  const isDateMonday = (date) => {
    return getDay(date) === 1; // 0 = Dimanche, 1 = Lundi, 2 = Mardi, etc.
  };

  const getDayClass = (day) => {
    const song = getSongForDate(day);
    const isCurrentDay = isSameDay(day, new Date());
    const isMondayDay = isDateMonday(day);
    
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

  // Fonction pour obtenir le premier jour de la semaine du mois
  const getFirstDayOfWeek = (date) => {
    const firstDay = startOfMonth(date);
    const dayOfWeek = getDay(firstDay);
    return addDays(firstDay, -dayOfWeek);
  };

  // Générer tous les jours à afficher (y compris les jours du mois précédent)
  const getAllDaysToShow = () => {
    const firstDayToShow = getFirstDayOfWeek(currentDate);
    const lastDayToShow = endOfMonth(currentDate);
    const lastDayOfWeek = getDay(lastDayToShow);
    const daysToAdd = 6 - lastDayOfWeek;
    const lastDayToShowExtended = addDays(lastDayToShow, daysToAdd);
    
    return eachDayOfInterval({ start: firstDayToShow, end: lastDayToShowExtended });
  };

  if (isLoading) {
    return (
      <div className="p-5 max-w-md mx-auto animate-pulse">
        <div className="h-12 bg-white/30 rounded-2xl mb-6"></div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array(42).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-white/30 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const allDaysToShow = getAllDaysToShow();

  return (
    <>
      <div className="p-5 max-w-md mx-auto">
        {/* Header Mobile uniquement */}
        <div className="lg:hidden text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
              <img 
                src="/images/Musica da segunda.jpg" 
                alt="Logo Música da Segunda"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">
                Agenda Musical
              </h1>
              <p className="text-white/80 font-medium text-sm md:text-base drop-shadow-md">
                Acompanhe todas as músicas da segunda
              </p>
            </div>
          </div>
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
            {allDaysToShow.map(day => {
              const song = getSongForDate(day);
              const isMondayDay = isDateMonday(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              
              return (
                <div
                  key={day.toISOString()}
                  className={`${getDayClass(day)} ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  onClick={() => song && setSelectedSong(song)}
                >
                  <span className="text-xs">{format(day, 'd')}</span>
                  {song && <Music className="w-3 h-3 mt-1" />}
                  {isMondayDay && !song && isCurrentMonth && (
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-1 opacity-60"></div>
                  )}
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
            <div className="text-xs text-gray-500 mt-2 p-2 bg-white/40 rounded-lg">
              <p className="font-semibold">25 de Agosto de 2025 - Segunda-feira</p>
              <p>Confissões Bancárias - A Música da Segunda</p>
            </div>
          </div>
        </div>

        {/* Músicas do Mês */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-white drop-shadow-lg">Músicas do Mês</h3>
          {(() => {
            // Filtrer les musiques du mois actuel
            const monthSongs = songs.filter(song => {
              const songDate = parseISO(song.release_date);
              return songDate.getMonth() === currentDate.getMonth() && 
                     songDate.getFullYear() === currentDate.getFullYear();
            });
            
            if (monthSongs.length === 0) {
              return (
                <div className="bg-[#f8f5f2] rounded-2xl p-6 text-center shadow-lg">
                  <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Nenhuma música publicada em {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    As músicas aparecerão aqui quando forem publicadas
                  </p>
                </div>
              );
            }
            
            return monthSongs.map(song => (
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
                    {format(parseISO(song.release_date), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            ));
          })()}
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