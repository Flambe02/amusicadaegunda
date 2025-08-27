
import React, { useState, useEffect } from 'react';
import { AdventSong } from '@/api/entities';
import { Gift, Lock, Music, Play, Sparkles, Youtube, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componente Porta do Advento
const AdventDoor = ({ day, song, onOpen }) => {
  const today = new Date();
  // DEBUG: Para testar a abertura, descomente a linha abaixo
  // const today = new Date('2025-12-25');
  const doorDate = new Date(2025, 11, day);
  
  // Caso especial: Dia 1 é sempre acessível
  const isLocked = day === 1 ? false : today < doorDate;

  const handleClick = () => {
    if (!isLocked && song) {
      onOpen(song);
    }
  };

  const baseClasses = "relative aspect-square rounded-2xl flex items-center justify-center text-white font-black text-3xl transition-all duration-300 transform";
  const lockedClasses = "bg-gray-400/50 text-gray-300 cursor-not-allowed";
  const unlockedWithSongClasses = "bg-gradient-to-br from-red-500 to-rose-600 shadow-lg cursor-pointer hover:scale-105 hover:shadow-xl";
  const unlockedEmptyClasses = "bg-teal-500/80";

  let finalClasses = `${baseClasses} `;
  if (isLocked) {
    finalClasses += lockedClasses;
  } else if (song) {
    finalClasses += unlockedWithSongClasses;
  } else {
    finalClasses += unlockedEmptyClasses;
  }

  return (
    <div onClick={handleClick} className={finalClasses}>
      <span>{day}</span>
      {isLocked && <Lock className="absolute w-8 h-8 opacity-70" />}
      {!isLocked && song && (
        <>
          <Sparkles className="absolute top-2 right-2 w-5 h-5 text-yellow-300 animate-ping" />
          {/* Nom de la vidéo découverte */}
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <p className="text-xs font-bold text-white drop-shadow-lg truncate">
              {song.title}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// Página Principal do Calendário do Advento
export default function AdventCalendar() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const calendarDays = Array.from({ length: 24 }, (_, i) => i + 1);

  useEffect(() => {
    const fetchSongs = async () => {
      const allSongs = await AdventSong.list();
      setSongs(allSongs);
    };
    fetchSongs();
  }, []);

  // Fonction pour obtenir ou créer une chanson pour un jour spécifique
  const getSongForDay = (day) => {
    const storageKey = `advent_day_${day}`;
    const storedSong = localStorage.getItem(storageKey);
    
    if (storedSong) {
      // Retourner la chanson mémorisée
      return JSON.parse(storedSong);
    }
    
    // Si pas de chanson mémorisée, en choisir une aléatoirement
    if (songs.length === 0) return null;
    
    // Filtrer seulement les chansons avec un ID TikTok
    const songsWithTikTok = songs.filter(song => song.tiktok_video_id);
    
    if (songsWithTikTok.length === 0) return null;
    
    // Choisir une chanson aléatoire
    const randomIndex = Math.floor(Math.random() * songsWithTikTok.length);
    const randomSong = songsWithTikTok[randomIndex];
    
    // Créer la chanson pour ce jour
    const daySong = {
      ...randomSong,
      day_of_december: day
    };
    
    // Mémoriser dans le localStorage
    localStorage.setItem(storageKey, JSON.stringify(daySong));
    
    return daySong;
  };

  const songsByDay = songs.reduce((acc, song) => {
    acc[song.day_of_december] = song;
    return acc;
  }, {});

  // Ajouter une chanson pour le jour 1 (toujours disponible)
  const day1Song = getSongForDay(1);
  if (day1Song) {
    songsByDay[1] = day1Song;
  }

  const getSpotifyEmbedUrl = (url) => {
    if (!url) return '';
    try {
      const urlObject = new URL(url);
      const pathParts = urlObject.pathname.split('/');
      // pathParts will be ['', 'track', 'TRACK_ID'] or ['', 'album', 'ALBUM_ID']
      if (pathParts.length >= 3 && (pathParts[1] === 'track' || pathParts[1] === 'album')) {
        return `https://open.spotify.com/embed/${pathParts[1]}/${pathParts[2]}`;
      }
    } catch (e) {
      console.error("URL do Spotify inválida", e);
    }
    return '';
  };
  
  return (
    <>
      <div className="p-5 max-w-md mx-auto">
        {/* Header Mobile uniquement */}
        <div className="lg:hidden text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
              <img 
                src="images/Musica da segunda.jpg" 
                alt="Logo Música da Segunda"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">
                Calendário do Advento
              </h1>
              <p className="text-white/80 font-medium text-sm md:text-base drop-shadow-md">
                Dezembro 2025 - Uma surpresa a cada dia!
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-xl">
          <div className="grid grid-cols-4 gap-3">
            {calendarDays.map(day => (
              <AdventDoor 
                key={day}
                day={day}
                song={songsByDay[day]}
                onOpen={setSelectedSong}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Música Redesenhado */}
      <Dialog open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <DialogContent className="p-0 border-0 bg-transparent max-w-sm w-[90vw] max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl shadow-2xl overflow-hidden">
            {/* Cabeçalho com número do dia */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4 text-center relative">
              <div className="absolute top-2 left-4 bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                <span className="text-white font-black text-base">{selectedSong?.day_of_december}</span>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-black text-white">
                    {selectedSong?.release_date ? 
                      format(parseISO(selectedSong.release_date), 'MMMM', { locale: ptBR }) : 
                      'Dezembro'
                    }
                  </h2>
                  <span className="text-white/90 text-lg font-semibold">
                    {selectedSong?.release_date ? 
                      format(parseISO(selectedSong.release_date), 'd', { locale: ptBR }) : 
                      selectedSong?.day_of_december
                    }
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-white rounded-full p-2 shadow-lg">
                  <Music className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </div>

            {/* Conteúdo principal */}
            <div className="p-4 pt-8">
              {/* Nome da Vídeo */}
              <div className="mb-4 bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="font-bold text-gray-600 text-xs uppercase tracking-wide">Nome da Vídeo</span>
                </div>
                <p className="text-gray-800 leading-relaxed font-semibold text-base">
                  {selectedSong?.title || 'Vídeo Musical'}
                </p>
                {selectedSong?.artist && (
                  <p className="text-gray-600 text-xs mt-1">
                    {selectedSong.artist}
                  </p>
                )}
              </div>

              {/* Player do Spotify */}
              {selectedSong?.spotify_url && (
                <div className="mb-6">
                  <iframe 
                    style={{borderRadius: '16px'}} 
                    src={getSpotifyEmbedUrl(selectedSong.spotify_url)}
                    width="100%" 
                    height="352" 
                    frameBorder="0" 
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  ></iframe>
                </div>
              )}

              {/* Vídeo TikTok - Affichage comme sur la page Home */}
              {selectedSong?.tiktok_video_id && (
                <div className="mb-4">
                  <div className="bg-black rounded-2xl overflow-hidden shadow-lg" style={{ height: '500px' }}>
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <iframe
                        src={`https://www.tiktok.com/embed/${selectedSong.tiktok_video_id}`}
                        width="360"
                        height="450"
                        frameBorder="0"
                        allowFullScreen
                        title={`TikTok Video - ${selectedSong.title}`}
                        className="rounded-lg"
                        style={{ 
                          border: 'none',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-600 font-medium">🎬 Vídeo TikTok - {selectedSong.title}</p>
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              <div className="space-y-3">
                {selectedSong?.spotify_url && (
                  <a href={selectedSong.spotify_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200">
                      <Music className="w-5 h-5 mr-3" />
                      Ouvir no Spotify
                    </Button>
                  </a>
                )}
                
                {selectedSong?.youtube_url && (
                  <a href={selectedSong.youtube_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200">
                      <Youtube className="w-5 h-5 mr-3" />
                      Ver no YouTube
                    </Button>
                  </a>
                )}
              </div>

              {/* Rodapé decorativo */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Gift className="w-4 h-4" />
                  <span className="text-xs font-medium">Calendário do Advento Musical</span>
                  <Gift className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
