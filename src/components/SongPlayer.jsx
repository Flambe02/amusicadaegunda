import React, { useState, useEffect, useRef } from 'react';
import { Share2, Music, ExternalLink, AlertCircle, X, Play, Globe, Video, FileText, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import LyricsDialog from './LyricsDialog';

// Composant d'intégration YouTube (identique à Home.jsx)
function YouTubeEmbed({ youtube_music_url, youtube_url, title }) {
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
    return (
      <div className="relative rounded-lg overflow-hidden shadow-2xl" style={{ width: '100%', aspectRatio: '9/16', minHeight: 'min(500px, 70vh)', maxHeight: '70vh' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={embedSrc}
          title={title || 'YouTube Short'}
          frameBorder="0"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
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

export default function SongPlayer({ song, onClose, onShowDescription }) {
  const [showDescription, setShowDescription] = useState(false);
  const [showSongDescription, setShowSongDescription] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const platformsRef = useRef(null);

  // Fermer le dropdown des plateformes quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (platformsRef.current && !platformsRef.current.contains(event.target)) {
        setShowPlatforms(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Vérification robuste des données de la chanson
  if (!song || !song.id || !song.title) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center text-gray-500">
        <div className="mb-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        </div>
        <p className="text-lg font-medium mb-2">Erro ao carregar música</p>
        <p className="text-sm text-gray-400">Dados da música inválidos ou incompletos</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Fechar
          </button>
        )}
      </div>
    );
  }

  // Vérifier quelles plateformes sont disponibles
  const availablePlatforms = [];
  if (song.spotify_url) availablePlatforms.push({ name: 'Spotify', url: song.spotify_url, icon: Play, color: 'bg-green-500' });
  if (song.apple_music_url) availablePlatforms.push({ name: 'Apple Music', url: song.apple_music_url, icon: Play, color: 'bg-pink-500' });
  if (song.youtube_url) availablePlatforms.push({ name: 'YouTube', url: song.youtube_url, icon: Video, color: 'bg-red-500' });

  const handlePlatformClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative w-full">
      {/* ✅ Bouton fermer en overlay - position fixe en haut à droite */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-50 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
          aria-label="Fermer"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      )}

      {/* ✅ Container principal - espacement optimisé mobile */}
      <div className="space-y-3">
        {/* Vidéo YouTube - sans padding superflu */}
        {(song.youtube_music_url || song.youtube_url) && (
          <div className="relative">
            <YouTubeEmbed
              youtube_music_url={song.youtube_music_url}
              youtube_url={song.youtube_url}
              title={song.title}
            />
            
            {/* ✅ Titre en overlay en bas de la vidéo - plus élégant */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8">
              <h2 className="text-white font-bold text-lg leading-tight drop-shadow-lg mb-1">
                {song.title}
              </h2>
              <p className="text-white/90 text-sm font-medium drop-shadow-md">
                {new Date(song.release_date).toLocaleDateString('pt-BR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
        )}

        {/* ✅ Boutons d'action - design compact et moderne */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Plataformas Button avec badge */}
            <div className="relative" ref={platformsRef}>
              <button 
                className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-2 rounded-xl font-bold transition-all duration-200 flex flex-col items-center justify-center space-y-1 shadow-lg hover:shadow-xl transform hover:scale-105"
                onClick={() => setShowPlatforms(!showPlatforms)}
              >
                <Music className="w-5 h-5" />
                <span className="text-xs">Ouvir</span>
                {availablePlatforms.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md">
                    {availablePlatforms.length}
                  </span>
                )}
              </button>
              
              {/* Platforms Dropdown */}
              {showPlatforms && (
                <div className="absolute bottom-full left-0 right-auto mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50">
                  {availablePlatforms.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Disponível em:</p>
                      {availablePlatforms.map((platform, index) => (
                        <button
                          key={index}
                          onClick={() => handlePlatformClick(platform.url)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left group"
                        >
                          <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                            <platform.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm font-bold text-gray-800 flex-1">{platform.name}</span>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <Music className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhuma plataforma</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Letras Button - conditionnel */}
            {song.lyrics && song.lyrics.trim() ? (
              <button 
                onClick={() => setShowDescription(true)}
                className="w-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-2 rounded-xl font-bold transition-all duration-200 flex flex-col items-center justify-center space-y-1 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs">Letras</span>
              </button>
            ) : (
              <button 
                disabled
                className="w-full bg-gray-200 text-gray-400 py-3 px-2 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 opacity-50 cursor-not-allowed"
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs">Letras</span>
              </button>
            )}
            
            {/* Compartilhar Button */}
            <button 
              className="w-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-2 rounded-xl font-bold transition-all duration-200 flex flex-col items-center justify-center space-y-1 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-xs">Partager</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lyrics Dialog */}
      <LyricsDialog 
        open={showDescription} 
        onOpenChange={setShowDescription} 
        song={song}
        title="Letras da Música"
        maxHeight="h-64"
      />

      {/* Song Description Dialog */}
      <Dialog open={showSongDescription} onOpenChange={setShowSongDescription}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-blue-500" />
                <span>Descrição da Música</span>
              </DialogTitle>
              <button
                onClick={() => setShowSongDescription(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-gray-700 leading-relaxed font-sans text-sm">
              {song.description || 'Nenhuma descrição disponível para esta música.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}