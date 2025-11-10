
import { useState, useEffect } from 'react';
import { AdventSong } from '@/api/entities';
import { Gift, Lock, Music, Play, Sparkles, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSEO } from '@/hooks/useSEO';

// Composant d'intégration YouTube générique (identique à Home.jsx)
function YouTubeEmbed({ youtube_music_url, youtube_url, title }) {
  // Prioriser youtube_music_url (vidéo), sinon youtube_url (streaming)
  const targetUrl = youtube_music_url || youtube_url || '';

  const getYouTubeEmbedInfo = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
      const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
      if (listMatch) {
        return { id: listMatch[1], type: 'playlist' };
      }

      const videoPatterns = [
        /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
        /^([A-Za-z0-9_-]{11})$/
      ];
      for (const re of videoPatterns) {
        const m = url.match(re);
        if (m) return { id: m[1], type: 'video' };
      }

      if (url.toLowerCase().includes('music.youtube.com')) {
        const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        if (m) return { id: m[1], type: 'video' };
      }

      return null;
    } catch {
      return null;
    }
  };

  const info = getYouTubeEmbedInfo(targetUrl);
  
  if (!info) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <p className="text-white text-sm">Vidéo non disponible</p>
      </div>
    );
  }

  const isShort = targetUrl.includes('/shorts/');
  const base = 'https://www.youtube-nocookie.com/embed';
  const embedSrc =
    info.type === 'video'
      ? `${base}/${info.id}?rel=0&modestbranding=1&playsinline=1&controls=1`
      : `${base}/videoseries?list=${info.id}&rel=0&modestbranding=1&playsinline=1&controls=1`;

  if (isShort) {
    // Format optimisé pour YouTube Shorts (9:16 vertical)
    return (
      <div className="w-full flex justify-center items-center py-4">
        <div 
          className="relative rounded-2xl overflow-hidden shadow-2xl bg-black"
          style={{ 
            width: '100%', 
            maxWidth: '360px', 
            aspectRatio: '9/16',
            margin: '0 auto'
          }}
        >
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={embedSrc}
            title={title || 'YouTube Short'}
            frameBorder="0"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
      <iframe
        className="w-full h-full"
        src={embedSrc}
        title={title || 'YouTube'}
        frameBorder="0"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}


// Componente Porta do Advento corrigido
const AdventDoor = ({ day, song, onOpen, hasBeenViewed = false }) => {
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
  const viewedSongClasses = "bg-white shadow-lg cursor-pointer hover:scale-105 hover:shadow-xl";

  let finalClasses = `${baseClasses} `;
  if (isLocked) {
    finalClasses += lockedClasses;
  } else if (hasBeenViewed) {
    finalClasses += viewedSongClasses; // Fond blanc après visualisation
  } else if (song) {
    finalClasses += unlockedWithSongClasses; // Fond rouge avant visualisation
  } else {
    finalClasses += unlockedEmptyClasses;
  }

  return (
    <div onClick={handleClick} className={finalClasses}>
      {hasBeenViewed ? (
        // Logo iOS APRÈS visualisation de la vidéo (fond blanc)
        <div className="w-full h-full flex items-center justify-center">
          <img 
            src="/images/IOS Logo.png" 
            alt={`Vídeo visualizado - Dia ${day}`}
            className="w-16 h-16 object-contain drop-shadow-lg"
          />
        </div>
      ) : (
        // Affichage normal pour les autres jours
        <>
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
        </>
      )}
    </div>
  );
};

// Página Principal do Calendário do Advento
export default function AdventCalendar() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showPlatformsDialog, setShowPlatformsDialog] = useState(false);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [selectedSongForDialog, setSelectedSongForDialog] = useState(null);
  const [viewedSongs, setViewedSongs] = useState(new Set()); // Nouvel état pour tracker toutes les vidéos visualisées
  const calendarDays = Array.from({ length: 24 }, (_, i) => i + 1);

  // SEO optimization
  useSEO({
    title: 'Calendário do Advento Musical',
    description: 'Calendário do Advento Musical 2025 - Uma surpresa musical a cada dia de dezembro. Descubra novas músicas e paródias inteligentes.',
    keywords: 'calendário do advento, advento musical, dezembro 2025, música da segunda, surpresas musicais, calendário musical',
    url: '/adventcalendar',
    type: 'website'
  });

  useEffect(() => {
    const fetchSongs = async () => {
      const allSongs = await AdventSong.list();
      setSongs(allSongs);
    };
    fetchSongs();
    
    // Vérifier quelles vidéos ont déjà été visualisées
    const viewedSongsData = localStorage.getItem('advent_viewed_songs');
    if (viewedSongsData) {
      try {
        const viewedArray = JSON.parse(viewedSongsData);
        setViewedSongs(new Set(viewedArray));
      } catch (error) {
        console.error('Erro ao carregar vídeos visualizados:', error);
      }
    }
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

  // Fonctions pour gérer les modals (copiées de Home.jsx)
  const handleShowPlatforms = (song) => {
    setSelectedSongForDialog(song);
    setShowPlatformsDialog(true);
  };

  const handleShowLyrics = (song) => {
    setSelectedSongForDialog(song);
    setShowLyricsDialog(true);
  };

  const handleShareSong = (song) => {
    if (navigator.share) {
      navigator.share({
        title: song.title,
        text: `Ouça ${song.title} por ${song.artist}`,
        url: song.tiktok_url || window.location.href
      });
    } else {
      // Fallback pour copier le lien
      navigator.clipboard.writeText(song.tiktok_url || window.location.href);
      alert('Link copiado para a área de transferência!');
    }
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
            {calendarDays.map(day => {
              const song = songsByDay[day] || getSongForDay(day);
              const hasBeenViewed = viewedSongs.has(day);
              
              return (
                <AdventDoor 
                  key={day}
                  day={day}
                  song={song}
                  onOpen={setSelectedSong}
                  hasBeenViewed={hasBeenViewed}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Música Redesenhado - Copié exactement de Home.jsx */}
      <Dialog open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <DialogContent className="p-0 border-0 bg-transparent max-w-md w-[95vw] max-h-[95vh] overflow-y-auto mx-auto my-4">
          <DialogTitle className="sr-only">
            {selectedSong?.title || 'Vídeo do Calendário do Advento'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Vídeo musical do dia {selectedSong?.day_of_december} de dezembro de 2025
          </DialogDescription>
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl shadow-2xl overflow-hidden">
            {/* Cabeçalho com número do dia */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4 text-center relative">
              <div className="absolute top-2 left-4 bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                <span className="text-white font-black text-base">{selectedSong?.day_of_december}</span>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-black text-white">
                    Dezembro
                  </h2>
                  <span className="text-white/90 text-lg font-semibold">
                    {selectedSong?.day_of_december}
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
            <div className="p-4 pt-2">
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

              {/* Vídeo YouTube */}
              <div className="mb-4">
                {(selectedSong?.youtube_music_url || selectedSong?.youtube_url) ? (
                  <>
                    <div className="bg-black rounded-2xl overflow-hidden shadow-xl">
                      <YouTubeEmbed
                        youtube_music_url={selectedSong.youtube_music_url}
                        youtube_url={selectedSong.youtube_url}
                        title={selectedSong.title}
                      />
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-xs text-gray-600 font-medium">🎬 Vídeo YouTube - {selectedSong.title}</p>
                    </div>
                    
                    {/* Bouton pour ouvrir YouTube */}
                    <div className="mt-3 text-center">
                      <Button 
                        onClick={() => {
                          const url = selectedSong.youtube_music_url || selectedSong.youtube_url;
                          if (url) window.open(url, '_blank');
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105"
                      >
                        📺 Ver no YouTube
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-100 rounded-2xl p-8 text-center">
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">Vídeo não disponível</p>
                        <p className="text-sm text-gray-400">{selectedSong?.title}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de ação - Copiés de Home.jsx */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                  onClick={() => handleShowPlatforms(selectedSong)}
                >
                  Plataformas
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                  onClick={() => handleShowLyrics(selectedSong)}
                >
                  Letras
                </Button>

                <Button
                  variant="outline"
                  className="w-full bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                  onClick={() => handleShareSong(selectedSong)}
                >
                  Compartilhar
                </Button>
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

      {/* Dialog Plataformas - Copié de Home.jsx */}
      <Dialog open={showPlatformsDialog} onOpenChange={setShowPlatformsDialog}>
        <DialogContent className="bg-[#f8f5f2] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🎵 Ouvir em outras plataformas
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-4">
              {/* Informations de la musique */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  {selectedSongForDialog.title}
                </h3>
                <p className="text-blue-700 font-medium">
                  {selectedSongForDialog.artist}
                </p>
              </div>

              {/* Liens des plateformes */}
              <div className="space-y-3">
                {selectedSongForDialog.spotify_url && (
                  <a 
                    href={selectedSongForDialog.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      🎧 Ouvir no Spotify
                    </Button>
                  </a>
                )}
                
                {selectedSongForDialog.apple_music_url && (
                  <a 
                    href={selectedSongForDialog.apple_music_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      🎵 Ouvir no Apple Music
                    </Button>
                  </a>
                )}
                
                {selectedSongForDialog.youtube_url && (
                  <a 
                    href={selectedSongForDialog.youtube_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      📺 Assistir no YouTube
                    </Button>
                  </a>
                )}

                {!selectedSongForDialog.spotify_url && !selectedSongForDialog.apple_music_url && !selectedSongForDialog.youtube_url && (
                  <div className="text-center py-6">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Links de streaming em breve...</p>
                    <p className="text-sm text-gray-500">Esta música será disponibilizada em breve nas principais plataformas.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Letras - Copié de Home.jsx */}
      <Dialog open={showLyricsDialog} onOpenChange={setShowLyricsDialog}>
        <DialogContent className="bg-[#f8f5f2] max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              📝 Letras da música
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-4">
              {/* Informations de la musique */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  {selectedSongForDialog.title}
                </h3>
                <p className="text-blue-700 font-medium">
                  {selectedSongForDialog.artist}
                </p>
              </div>

              {/* Letras */}
              {selectedSongForDialog.lyrics ? (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-gray-700 font-medium leading-relaxed">
                    {selectedSongForDialog.lyrics}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Letras não disponíveis</p>
                  <p className="text-sm text-gray-500">As letras desta música serão publicadas em breve.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
