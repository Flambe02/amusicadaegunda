import { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import YouTubePlayer from '../components/YouTubePlayer';

export default function YoutubeSimple() {
  console.warn('🎬 YoutubeSimple component loaded');
  const [currentSong, setCurrentSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.warn('🎬 YoutubeSimple useEffect triggered');
    loadCurrentSong();
  }, []);

  const loadCurrentSong = async () => {
    setIsLoading(true);
    try {
      const song = await Song.getCurrent();
      console.warn('📊 Chanson actuelle chargée:', song);
      setCurrentSong(song);
    } catch (err) {
      console.error('❌ Erro ao carregar música atual:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  if (isLoading) {
    return (
      <div className="p-5 max-w-md mx-auto">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className="p-5 max-w-md mx-auto">
        <div className="text-center text-white">
          <p className="text-lg">Nenhuma música disponível</p>
        </div>
      </div>
    );
  }

  const ytId = extractYouTubeId(currentSong.youtube_url);

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-4xl font-bold text-white mb-4">{currentSong.title}</h1>
      {ytId ? (
        <div className="bg-black rounded-2xl overflow-hidden shadow-xl">
          <YouTubePlayer videoId={ytId} className="w-full" title={currentSong.title} />
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-8 text-center text-white">
          <p>YouTube URL non disponible pour cette chanson</p>
          <p className="text-sm text-gray-400 mt-2">URL: {currentSong.youtube_url || 'Aucune'}</p>
        </div>
      )}
    </div>
  );
}

