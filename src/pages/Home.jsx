import React, { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import SongPlayer from '../components/SongPlayer';
import CountdownTimer from '../components/CountdownTimer';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Home() {
  const [currentSong, setCurrentSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCurrentSong();
  }, []);

  const loadCurrentSong = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const songs = await Song.list('-release_date', 1);
      if (songs.length > 0) {
        setCurrentSong(songs[0]);
      } else {
        setError('Nenhuma música encontrada no momento.');
      }
    } catch (error) {
      console.error('Error loading current song:', error);
      setError('Erro ao carregar a música. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    loadCurrentSong();
  };

  if (isLoading) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl animate-pulse">
        <div className="h-12 bg-white/30 rounded-2xl mb-6"></div>
        <div className="h-96 bg-white/30 rounded-3xl mb-6"></div>
        <div className="h-48 bg-white/30 rounded-3xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            Música da Segunda
          </h1>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra música nova toda segunda-feira
          </p>
        </div>

        {/* Error State */}
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center mb-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Ops! Algo deu errado</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-2xl flex items-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
        </div>

        {/* Countdown Timer */}
        <CountdownTimer />
      </div>
    );
  }

  return (
    <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
          Música da Segunda
        </h1>
        <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
          Descubra música nova toda segunda-feira
        </p>
      </div>

      {/* Main Song Player with TikTok Video */}
      <div className="mb-6">
        <SongPlayer song={currentSong} />
      </div>

      {/* Countdown Timer */}
      <CountdownTimer />
    </div>
  );
}