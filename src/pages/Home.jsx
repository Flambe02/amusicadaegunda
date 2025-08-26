import React, { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import SongPlayer from '../components/SongPlayer';
import CountdownTimer from '../components/CountdownTimer';
import { AlertCircle, RefreshCw, Music, Calendar, ChevronLeft, Play } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Home() {
  const [currentSong, setCurrentSong] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    loadCurrentSong();
    loadRecentSongs();
  }, []);

  const loadCurrentSong = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Utiliser la nouvelle méthode getCurrent
      const song = await Song.getCurrent();
      setCurrentSong(song);
    } catch (err) {
      console.error('Erro ao carregar música atual:', err);
      setError('Erro ao carregar a música da semana. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentSongs = async () => {
    try {
      const allSongs = await Song.list();
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // Filtrer les musiques du mois en cours
      const monthSongs = allSongs.filter(song => {
        const songDate = parseISO(song.release_date);
        return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
      });
      
      setRecentSongs(monthSongs);
    } catch (err) {
      console.error('Erro ao carregar músicas recentes:', err);
    }
  };

  const handleRetry = () => {
    loadCurrentSong();
  };

  const handlePlayVideo = (song) => {
    setSelectedVideo(song);
    setShowVideoModal(true);
  };

  // Obtenir le nom du mois en cours
  const getCurrentMonthName = () => {
    return format(new Date(), 'MMMM yyyy', { locale: ptBR });
  };

  // Obtenir le mois précédent
  const getPreviousMonth = () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return format(currentDate, 'yyyy-MM');
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
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
          Música da Segunda
        </h1>
        <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
          Descubra música nova toda segunda-feira
        </p>
      </div>
      
      {currentSong ? (
        <div className="mb-6">
          <SongPlayer song={currentSong} />
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

      {/* ===== BLOC MÚSICAS RECENTES ===== */}
      <div className="mt-8">
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Músicas Recentes
            </h2>
            <span className="text-gray-600 text-sm font-medium">
              {getCurrentMonthName()}
            </span>
          </div>

          {recentSongs.length > 0 ? (
            <div className="space-y-4">
              {recentSongs.map((song) => (
                <div key={song.id} className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                      onClick={() => handlePlayVideo(song)}
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
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                Nenhuma música publicada este mês ainda
              </p>
            </div>
          )}

          {/* Lien discret vers le mois précédent */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <a
              href={`/Calendar?month=${getPreviousMonth()}`}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Ver músicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
            </a>
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
                    <iframe
                      src={`https://www.tiktok.com/embed/${selectedVideo.tiktok_video_id}`}
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowFullScreen
                      title={`TikTok Video - ${selectedVideo.title}`}
                      className="w-full"
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
    </div>
  );
}