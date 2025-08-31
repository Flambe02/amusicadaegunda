import React, { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import SongPlayer from '../components/SongPlayer';
import CountdownTimer from '../components/CountdownTimer';
import { AlertCircle, RefreshCw, Music, Calendar, ChevronLeft, Play, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import LyricsDialog from '../components/LyricsDialog';
import TikTokEmbedOptimized from '../components/TikTokEmbedOptimized';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/tiktok-optimized.css';
import { localStorageService } from '@/lib/localStorage';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [currentSong, setCurrentSong] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPlatformsDialog, setShowPlatformsDialog] = useState(false);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [selectedSongForDialog, setSelectedSongForDialog] = useState(null);
  const [displayedSong, setDisplayedSong] = useState(null); // Nouvelle variable pour la chanson affichée

  useEffect(() => {
    // S'assurer que le localStorage est initialisé
    localStorageService.initialize();
    
    // Charger directement depuis Supabase - pas de fallback localStorage
    loadCurrentSong();
    loadRecentSongs();
  }, []);

  const loadCurrentSong = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Tentative de chargement depuis Supabase...');
      
      // Utiliser la nouvelle méthode getCurrent
      const song = await Song.getCurrent();
      console.log('📊 Chanson actuelle chargée:', song);
      
      setCurrentSong(song);
      setDisplayedSong(song); // Initialiser la chanson affichée
    } catch (err) {
      console.error('❌ Erro ao carregar música atual:', err);
      setError('Erro ao carregar a música da semana. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentSongs = async () => {
    try {
      console.log('🔄 Chargement des musiques récentes depuis Supabase...');
      
      const allSongs = await Song.list();
      console.log('📊 Toutes les musiques chargées:', allSongs);
      
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // Filtrer les musiques du mois en cours
      const monthSongs = allSongs.filter(song => {
        const songDate = parseISO(song.release_date);
        return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
      });
      
      console.log('📅 Musiques du mois en cours:', monthSongs);
      setRecentSongs(monthSongs);
    } catch (err) {
      console.error('❌ Erro ao carregar músicas recentes:', err);
    }
  };

  const handleRetry = () => {
    loadCurrentSong();
  };

  // Nouvelle fonction pour remplacer la vidéo principale
  const handleReplaceVideo = (song) => {
    setDisplayedSong(song);
    // Scroll vers le haut pour voir la nouvelle vidéo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayVideo = (song) => {
    setSelectedVideo(song);
    setShowVideoModal(true);
  };

  const handleShowPlatforms = (song) => {
    setSelectedSongForDialog(song);
    setShowPlatformsDialog(true);
  };

  const handleShowLyrics = (song) => {
    setSelectedSongForDialog(song);
    setShowLyricsDialog(true);
  };

  const handleShowDescription = (song) => {
    setSelectedSongForDialog(song);
    setShowDescriptionDialog(true);
  };

  const handleShareSong = async (song) => {
    // Utiliser l'API de partage natif si disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${song.title} - ${song.artist}`,
          text: `Confira esta música incrível da Música da Segunda!`,
          url: song.tiktok_url || window.location.href,
        });
      } catch {}
    } else {
      // Fallback : copier le lien
      const shareText = `${song.title} - ${song.artist}\nConfira esta música incrível da Música da Segunda!`;
      navigator.clipboard.writeText(shareText);
      alert('Link copiado para a área de transferência!');
    }
  };

  // Obtenir le mois précédent
  const getPreviousMonth = () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return format(currentDate, 'yyyy-MM');
  };

  // Naviguer vers le calendrier du mois précédent
  const handleNavigateToPreviousMonth = () => {
    const previousMonth = getPreviousMonth();
    navigate(`/calendar?month=${previousMonth}`);
  };

  if (isLoading) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            Música da Segunda
          </h1>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra música nova toda segunda-feira
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Carregando música da semana...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            Música da Segunda
          </h1>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra música nova toda segunda-feira
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
          <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
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
                Música da Segunda
              </h1>
              <p className="text-white/80 font-medium text-sm md:text-base drop-shadow-md">
                Descubra música nova toda segunda-feira
              </p>
            </div>
          </div>
        </div>
      
      {/* ===== LAYOUT DESKTOP: VIDÉO TIKTOK + MÚSICAS DO MÊS ===== */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:mt-8">
        {/* ===== COLONNE GAUCHE: VIDÉO TIKTOK ===== */}
        <div className="space-y-6">
          {displayedSong ? (
            <div className="bg-white rounded-3xl p-6 shadow-lg">
                             <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                 <button
                   onClick={() => handleShowDescription(displayedSong)}
                   className="inline-flex items-center gap-2 hover:text-blue-600 transition-colors cursor-pointer"
                   title="Ver descrição da música"
                 >
                   <span className="text-2xl">ℹ️</span>
                   <span>{displayedSong.title}</span>
                 </button>
               </h3>
               <p className="text-gray-600 text-center mb-4">
                 {format(parseISO(displayedSong.release_date), 'dd/MM/yyyy', { locale: ptBR })}
               </p>
              <div className="bg-black rounded-2xl overflow-hidden shadow-xl">
                {displayedSong.tiktok_video_id ? (
                  <div className="w-full" style={{ aspectRatio: '9/16' }}>
                    {/* Toutes les chansons utilisent le même composant TikTokEmbedOptimized */}
                    <TikTokEmbedOptimized
                      postId={displayedSong.tiktok_video_id}
                      className="w-full"
                      song={displayedSong}
                    />
                  </div>
                ) : displayedSong.tiktok_url ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900" style={{ aspectRatio: '9/16' }}>
                    <div className="text-center text-white">
                      <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">Vídeo TikTok</p>
                      <p className="text-sm text-gray-400 mb-4">{displayedSong.title}</p>
                      <a 
                        href={displayedSong.tiktok_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Ver no TikTok
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900" style={{ aspectRatio: '9/16' }}>
                    <div className="text-center text-white">
                      <Music className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">Vídeo não disponível</p>
                      <p className="text-sm text-gray-400">{displayedSong.title}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <h4 className="font-bold text-gray-800 text-lg mb-2">{displayedSong.title}</h4>
                <p className="text-gray-600">{displayedSong.artist}</p>
                <p className="text-gray-500 text-sm mt-1">
                  {format(parseISO(displayedSong.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>

              </div>
              
              {/* 3 Ações Principais - Desktop */}
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShowPlatforms(displayedSong)}
                  >
                    Plataformas
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShowLyrics(displayedSong)}
                  >
                    Letras
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShareSong(displayedSong)}
                  >
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
                         <div className="bg-white rounded-3xl p-6 shadow-lg">
               <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                 ℹ️ Nenhuma música disponível
               </h3>
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center" style={{ height: 'min(70vh, 600px)', aspectRatio: '9/16' }}>
                <div className="text-center text-gray-500">
                  <Music className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhuma música disponível</p>
                  <p className="text-sm">Volte na segunda-feira!</p>
                </div>
              </div>
            </div>
          )}
          
          <CountdownTimer />
        </div>

        {/* ===== COLONNE DROITE: MÚSICAS DO MÊS ===== */}
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Músicas do Mês
            </h2>
          </div>

          {recentSongs.length > 0 ? (
            <div className="space-y-4">
              {recentSongs.map((song) => (
                <div key={song.id} className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                      onClick={() => handleReplaceVideo(song)}
                      title="Clique para ver esta música na coluna de vídeo"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-800 truncate">
                        {song.title}
                      </h3>
                      <p className="text-gray-600 text-base font-medium mt-1">
                        {song.artist}
                      </p>
                      <p className="text-gray-500 text-sm font-medium mt-1">
                        {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Nenhuma música publicada este mês ainda
              </p>
            </div>
          )}

          {/* Lien discret vers le mois précédent */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleNavigateToPreviousMonth}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors group cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Ver músicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
            </button>
          </div>
        </div>
      </div>

      {/* ===== LAYOUT MOBILE: DISPOSITION VERTICALE TRADITIONNELLE ===== */}
      <div className="lg:hidden">
        {displayedSong ? (
          <div className="mb-6">
            {/* Composant SongPlayer para as ações */}
            <SongPlayer song={displayedSong} onShowDescription={handleShowDescription} />
          </div>
        ) : (
          <div className="bg-white/20 rounded-3xl p-8 text-center">
            <Music className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhuma música disponível</h3>
            <p className="text-white/80">
              A música da semana será publicada em breve. Volte na segunda-feira!
            </p>
          </div>
        )}
        
        <CountdownTimer />

        {/* ===== BLOC MÚSICAS DO MÊS (MOBILE) ===== */}
        <div className="mt-8">
          <div className="bg-white rounded-3xl p-6 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                Músicas do Mês
              </h2>
            </div>

            {recentSongs.length > 0 ? (
              <div className="space-y-4">
                {recentSongs.map((song) => (
                  <div key={song.id} className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                        onClick={() => handleReplaceVideo(song)}
                        title="Clique para ver esta música na coluna de vídeo"
                      >
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-lg truncate">
                          {song.title}
                        </h3>
                        <p className="text-gray-600 text-base font-medium mt-1">
                          {song.artist}
                        </p>
                        <p className="text-gray-500 text-sm font-medium mt-1">
                          {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Nenhuma música publicada este mês ainda
                </p>
              </div>
            )}

            {/* Lien discret vers le mois précédent */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleNavigateToPreviousMonth}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Ver músicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL VIDÉO TIKTOK ===== */}
      {showVideoModal && selectedVideo && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-blue-900">
                  🎬 {selectedVideo.title}
                </h2>
                <button 
                  onClick={() => setShowVideoModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Informations de la musique */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">
                    {selectedVideo.title}
                  </h3>
                  <p className="text-blue-700 font-medium">
                    {selectedVideo.artist}
                  </p>
                  <p className="text-blue-600 text-sm">
                    📅 Lançamento: {format(parseISO(selectedVideo.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>

                {/* Lecteur TikTok intégré */}
                {selectedVideo.tiktok_video_id && (
                  <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                    <TikTokEmbedOptimized
                      postId={selectedVideo.tiktok_video_id}
                      className="w-full"
                      song={selectedVideo}
                    />
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => window.open(selectedVideo.tiktok_url, '_blank')}
                    className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    🎬 Ver no TikTok
                  </button>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DIALOG PLATAFORMAS ===== */}
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
                    <p className="text-gray-500 text-sm">Esta música será disponibilizada em breve nas principais plataformas.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG LETRAS ===== */}
      <LyricsDialog 
        open={showLyricsDialog} 
        onOpenChange={setShowLyricsDialog} 
        song={selectedSongForDialog}
        title="📝 Letras da Música"
        maxHeight="h-52"
        showIcon={false}
      />

      {/* ===== DIALOG DESCRIÇÃO ===== */}
      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent className="bg-[#f8f5f2] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              ℹ️ Descrição da Música
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
                <p className="text-blue-600 text-sm">
                  📅 {format(parseISO(selectedSongForDialog.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>

              {/* Descrição */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                {selectedSongForDialog.description ? (
                  <ScrollArea className="h-60">
                    <div className="pr-4">
                      <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {selectedSongForDialog.description}
                      </pre>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Descrição não disponível</p>
                    <p className="text-gray-500 text-sm">A descrição desta música será adicionada em breve.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}