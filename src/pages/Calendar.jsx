import { useState, useEffect, useCallback } from 'react';
import { Song } from '@/api/entities';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Music, Play, Sparkles, CalendarDays, Disc3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import VisuallyHidden from "@/components/ui/VisuallyHidden";
import SongPlayer from '../components/SongPlayer';
import '../styles/tiktok-optimized.css';
import { useSEO } from '../hooks/useSEO';
import DesktopPageShell, { DesktopMetric, DesktopSurface } from '@/components/DesktopPageShell';

export default function Calendar() {
  const [songs, setSongs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date()); // Mois en cours
  const [selectedSong, setSelectedSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si un mois spécifique est passé dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    let monthParam = urlParams.get('month');
    
    // Gérer la redirection SPA de GitHub Pages
    if (!monthParam) {
      // Vérifier si l'URL contient le format SPA redirigé
      const fullUrl = window.location.search;
      if (fullUrl.includes('?/')) {
        const pathPart = fullUrl.split('?/')[1];
        if (pathPart.includes('?')) {
          const queryPart = pathPart.split('?')[1];
          const queryParams = new URLSearchParams(queryPart);
          monthParam = queryParams.get('month');
        }
      }
    }
    
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

  const loadSongsForMonth = useCallback(async () => {
    try {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 1-12
      
      // Charger TOUTES les chansons du mois (comme la page Home)
      // au lieu de seulement les chansons publiées
              const allSongs = await Song.list('-release_date', null);
      const monthData = (Array.isArray(allSongs) ? allSongs : []).filter(s => {
        const d = parseISO(s.release_date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
      });
      
      // Trier desc par date
      monthData.sort((a, b) => parseISO(b.release_date) - parseISO(a.release_date));
      setSongs(monthData);
    } catch (error) {
      console.error('Error loading monthly songs:', error);
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  // Recharger les chansons à chaque changement de mois
  useEffect(() => {
    loadSongsForMonth();
  }, [loadSongsForMonth]);

  const getSongForDate = (date) => {
    return songs.find(song => {
      const songDate = parseISO(song.release_date);
      return isSameDay(songDate, date);
    });
  };

  // Fonction pour trouver la dernière musique publiée
  const getLatestPublishedSong = () => {
    const publishedSongs = songs.filter(song => song.status === 'published');
    if (publishedSongs.length === 0) return null;
    
    // Trier par date de publication (la plus récente en premier)
    const sorted = [...publishedSongs].sort((a, b) => {
      const dateA = parseISO(a.release_date);
      const dateB = parseISO(b.release_date);
      return dateB - dateA; // Ordre décroissant
    });
    
    return sorted[0]; // La plus récente
  };

  const navigateMonth = (direction) => {
    setIsLoading(true);
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
    const latestPublishedSong = getLatestPublishedSong();
    const isLatestPublished = latestPublishedSong && song && 
                              isSameDay(parseISO(latestPublishedSong.release_date), day) &&
                              song.status === 'published';
    
    let classes = "aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all duration-300 ";
    
    if (song) {
      // Différencier les chansons selon leur statut
      if (song.status === 'published') {
        // Si c'est la dernière musique publiée, utiliser orange
        if (isLatestPublished) {
          classes += "bg-orange-500 text-white shadow-lg cursor-pointer hover:shadow-xl transform hover:scale-105 ";
        } else {
          classes += "bg-[#32a2dc] text-white shadow-lg cursor-pointer hover:shadow-xl transform hover:scale-105 ";
        }
      } else if (song.status === 'draft') {
        classes += "bg-orange-500 text-white shadow-lg cursor-pointer hover:shadow-xl transform hover:scale-105 ";
      } else {
        classes += "bg-gray-500 text-white shadow-lg cursor-pointer hover:shadow-xl transform hover:scale-105 ";
      }
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

  // SEO dynamique pour le calendrier - DOIT être avant tous les return
  const monthYear = format(currentDate, 'MMMM yyyy', { locale: ptBR });
  const songsCount = songs.length;
  
  // SEO optimization - canonical sans query string pour stabilité
  useSEO({
    title: `Calendário Musical ${monthYear}`,
    description: `Explore ${songsCount} descobertas musicais de ${monthYear}. Calendário completo das músicas da segunda no Música da Segunda.`,
    keywords: `calendário musical, ${monthYear}, descobertas musicais, ${songsCount} músicas, música da segunda, playlist mensal`,
    url: '/calendar', // Canonical stable sans query string
    type: 'website'
  });

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
  const monthSongs = songs.filter(song => {
    const songDate = parseISO(song.release_date);
    return songDate.getMonth() === currentDate.getMonth() &&
      songDate.getFullYear() === currentDate.getFullYear();
  });

  const handleSongClick = (song) => {
    if (song && song.id && song.title) {
      setSelectedSong(song);
    } else {
      console.error('Chanson invalide:', song);
    }
  };

  return (
    <>
      <DesktopPageShell
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5 text-[#FDE047]" />
            Calendário Musical
          </>
        }
        title={format(currentDate, "MMMM yyyy", { locale: ptBR })}
        description="Navegação mensal no mesmo shell desktop da home, com o calendário completo das segundas-feiras e acesso direto às músicas publicadas."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigateMonth(-1)}
              className="rounded-full border-white/12 bg-white/5 px-5 py-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Mês anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => navigateMonth(1)}
              className="rounded-full border-white/12 bg-white/5 px-5 py-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              Próximo mês
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        }
        stats={
          <>
            <DesktopMetric label="Faixas no mês" value={monthSongs.length} accent />
            <DesktopMetric label="Segundas no grid" value={allDaysToShow.filter(isDateMonday).length} />
            <DesktopMetric label="Última publicada" value={getLatestPublishedSong() ? 'Ativa' : 'Aguardando'} />
          </>
        }
        sideContent={
          <div className="glass-panel rounded-[28px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE047]/14 text-[#FDE047]">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Legenda rápida</p>
                <p className="text-sm text-white/55">Publicada, prevista e arquivos no mesmo plano.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-white/60">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#FDE047]" />
                Música publicada
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full border border-dashed border-white/40" />
                Segunda-feira aguardando música
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-white/25" />
                Dias sem lançamento
              </div>
            </div>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <DesktopSurface className="overflow-hidden">
            <div className="mb-5 grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.22em] text-white/38">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {allDaysToShow.map(day => {
                const song = getSongForDate(day);
                const isMondayDay = isDateMonday(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => song && handleSongClick(song)}
                    className={`min-h-[104px] rounded-[24px] border p-3 text-left transition-all duration-300 ${
                      song
                        ? 'border-[#FDE047]/25 bg-[#FDE047]/10 hover:-translate-y-1 hover:bg-[#FDE047]/14'
                        : isMondayDay
                          ? 'border-dashed border-white/20 bg-white/[0.04]'
                          : 'border-white/8 bg-white/[0.03]'
                    } ${!isCurrentMonth ? 'opacity-35' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{format(day, 'd')}</span>
                      {song ? (
                        <Disc3 className="h-4 w-4 text-[#FDE047]" />
                      ) : isMondayDay && isCurrentMonth ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-white/45" />
                      ) : null}
                    </div>
                    <div className="mt-4">
                      {song ? (
                        <>
                          <p className="line-clamp-2 text-sm font-semibold text-white">{song.title}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-white/55">{song.artist}</p>
                        </>
                      ) : (
                        <p className="text-xs uppercase tracking-[0.18em] text-white/32">
                          {isMondayDay && isCurrentMonth ? 'Segunda' : 'Sem lançamento'}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </DesktopSurface>

          <DesktopSurface>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Músicas do mês</p>
            <div className="mt-4 space-y-3">
              {monthSongs.length > 0 ? monthSongs.map(song => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => handleSongClick(song)}
                  className="flex w-full items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.07]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE047]/14 text-[#FDE047]">
                    <Play className="h-5 w-5 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{song.title}</p>
                    <p className="truncate text-xs text-white/55">{song.artist}</p>
                  </div>
                  <p className="text-xs text-white/38">{format(parseISO(song.release_date), 'dd/MM')}</p>
                </button>
              )) : (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center">
                  <Music className="mx-auto mb-3 h-8 w-8 text-white/35" />
                  <p className="text-sm text-white/60">
                    Nenhuma música publicada em {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </DesktopSurface>
        </div>
      </DesktopPageShell>
      {/* Layout Desktop - Inchangé */}
      <div className="hidden p-5 max-w-md mx-auto">
        {/* Header Mobile uniquement */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
              <img 
                src="images/Musica da segunda.jpg" 
                alt="Logo A Música da Segunda - Paródias Musicais do Brasil"
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
                  onClick={() => song && handleSongClick(song)}
                >
                  <span className="text-xs">{format(day, 'd')}</span>
                  {song && (
                    <div className="flex flex-col items-center mt-1">
                      <Music className="w-3 h-3" />
                      {song.status === 'draft' && (
                        <div className="w-1 h-1 bg-white rounded-full mt-1 opacity-80"></div>
                      )}
                    </div>
                  )}
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
              <span className="text-gray-600 font-medium">Música publicada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white/40 border-2 border-dashed border-gray-400 rounded-lg"></div>
              <span className="text-gray-600 font-medium">Segunda-feira (aguardando)</span>
            </div>
            {selectedSong && (
              <div className="text-xs text-gray-500 mt-2 p-2 bg-white/40 rounded-lg">
                <p className="font-semibold">
                  {format(parseISO(selectedSong.release_date), "dd 'de' MMMM 'de' yyyy - EEEE", { locale: ptBR })}
                </p>
                <p>{selectedSong.title} - {selectedSong.artist}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Status: {selectedSong.status === 'published' ? 'Publicada' : 
                           selectedSong.status === 'draft' ? 'Rascunho' : 'Arquivada'}
                </p>
              </div>
            )}
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
                onClick={() => handleSongClick(song)}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  song.status === 'published' ? 'bg-[#32a2dc]' :
                  song.status === 'draft' ? 'bg-orange-500' : 'bg-gray-500'
                }`}>
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-800">{song.title}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      song.status === 'published' ? 'bg-green-100 text-green-800' :
                      song.status === 'draft' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {song.status === 'published' ? 'Publicada' :
                       song.status === 'draft' ? 'Rascunho' : 'Arquivada'}
                    </span>
                  </div>
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

      {/* Layout Mobile - Version originale avec scroll interne */}
      <div className="lg:hidden h-full overflow-y-auto pb-24">
        <div className="p-5 max-w-md mx-auto">
          {/* Header Mobile - Compact */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <img 
                  src="images/Musica da segunda.jpg" 
                  alt="Logo A Música da Segunda - Paródias Musicais do Brasil"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="text-left">
                <h1 className="text-xl font-black text-white drop-shadow-lg">
                  Agenda Musical
                </h1>
              </div>
            </div>
          </div>

          {/* Calendar Header - Compact */}
          <div className="bg-[#f8f5f2] rounded-2xl p-4 shadow-xl mb-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth(-1)}
                className="text-gray-600 hover:text-gray-800 hover:bg-white/60 h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="text-lg font-black text-gray-800 capitalize">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </h2>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth(1)}
                className="text-gray-600 hover:text-gray-800 hover:bg-white/60 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {allDaysToShow.map(day => {
                const song = getSongForDate(day);
                const isMondayDay = isDateMonday(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`${getDayClass(day)} ${!isCurrentMonth ? 'opacity-40' : ''}`}
                    onClick={() => song && handleSongClick(song)}
                  >
                    <span className="text-xs">{format(day, 'd')}</span>
                    {song && (
                      <div className="flex flex-col items-center mt-0.5">
                        <Music className="w-2.5 h-2.5" />
                        {song.status === 'draft' && (
                          <div className="w-0.5 h-0.5 bg-white rounded-full mt-0.5 opacity-80"></div>
                        )}
                      </div>
                    )}
                    {isMondayDay && !song && isCurrentMonth && (
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-0.5 opacity-60"></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend - Compact */}
            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#32a2dc] rounded-lg"></div>
                <span className="text-gray-600 font-medium">Música publicada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white/40 border-2 border-dashed border-gray-400 rounded-lg"></div>
                <span className="text-gray-600 font-medium">Segunda-feira (aguardando)</span>
              </div>
              {selectedSong && (
                <div className="text-xs text-gray-500 mt-2 p-2 bg-white/40 rounded-lg">
                  <p className="font-semibold">
                    {format(parseISO(selectedSong.release_date), "dd 'de' MMMM 'de' yyyy - EEEE", { locale: ptBR })}
                  </p>
                  <p>{selectedSong.title} - {selectedSong.artist}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Status: {selectedSong.status === 'published' ? 'Publicada' : 
                             selectedSong.status === 'draft' ? 'Rascunho' : 'Arquivada'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Músicas do Mês - Version compacte */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/90 drop-shadow-sm mb-2">Músicas do Mês</h3>
            {(() => {
              // Filtrer les musiques du mois actuel
              const monthSongs = songs.filter(song => {
                const songDate = parseISO(song.release_date);
                return songDate.getMonth() === currentDate.getMonth() && 
                       songDate.getFullYear() === currentDate.getFullYear();
              });
              
              if (monthSongs.length === 0) {
                return (
                  <div className="bg-[#f8f5f2] rounded-xl p-4 text-center shadow-lg">
                    <Music className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm font-medium">
                      Nenhuma música publicada em {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                );
              }
              
              return monthSongs.map(song => (
                <button
                  key={song.id}
                  onClick={() => handleSongClick(song)}
                  className="w-full bg-[#f8f5f2] rounded-xl p-3 shadow-md flex items-center gap-3 cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-95 touch-manipulation text-left"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    song.status === 'published' ? 'bg-[#32a2dc]' :
                    song.status === 'draft' ? 'bg-orange-500' : 'bg-gray-500'
                  }`}>
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate mb-0.5">{song.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(song.release_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Song Dialog - Optimisé pour YouTube Shorts (format vertical 9:16) */}
      <Dialog open={!!selectedSong} onOpenChange={(open) => !open && setSelectedSong(null)}>
        <DialogContent className="max-w-[min(95vw,420px)] p-0 gap-0 border-0 bg-transparent max-h-[95vh] overflow-y-auto [&>button]:hidden">
          <DialogTitle asChild>
            <VisuallyHidden>
              {selectedSong ? `${selectedSong.title} - ${selectedSong.artist}` : 'Détails de la musique'}
            </VisuallyHidden>
          </DialogTitle>
          <DialogDescription asChild>
            <VisuallyHidden>
              {selectedSong ? `Détails de la musique ${selectedSong.title} par ${selectedSong.artist}` : 'Détails de la musique'}
            </VisuallyHidden>
          </DialogDescription>
          <SongPlayer 
            song={selectedSong} 
            onClose={() => setSelectedSong(null)}
            onShowDescription={(song) => {
              // Pour Calendar, on peut ouvrir un dialog de description
              // ou rediriger vers la page Home
              console.warn('Descrição solicitada para:', song.title);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
