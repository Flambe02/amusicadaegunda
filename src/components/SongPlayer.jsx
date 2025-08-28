import React, { useState, useEffect, useRef } from 'react';
import { Share2, Music, ExternalLink, AlertCircle, X, Play, Globe, Video } from 'lucide-react';
import TikTokDirect from './TikTokDirect';
import { cleanTikTokId, parseTikTokId } from '@/lib/parseTikTokId';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export default function SongPlayer({ song, onClose }) {
  const [showDescription, setShowDescription] = useState(false);
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
    <div className="space-y-4">
      {/* Header - mobile friendly, date only */}
      <div className="bg-white rounded-2xl shadow-lg p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-base font-semibold text-blue-700">
              {new Date(song.release_date).toLocaleDateString('pt-BR')}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main TikTok Video Block - no inner padding to avoid scroll */}
      {(() => {
        // Normaliser l'ID TikTok à partir de la base (id direct ou URL)
        const normalizedId = cleanTikTokId(song.tiktok_video_id) || cleanTikTokId(song.tiktok_url);
        if (!normalizedId) return null;
        return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="">
            <TikTokDirect
              postId={normalizedId}
              className="mb-4"
            />
          </div>
        </div>
        );
      })()}

      {/* Independent Action Buttons Block */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="space-y-3">
          {/* Plataformas Button with Dropdown */}
          <div className="relative" ref={platformsRef}>
            <button 
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              onClick={() => setShowPlatforms(!showPlatforms)}
            >
              <Music className="w-5 h-5" />
              <span>Plataformas</span>
              {availablePlatforms.length > 0 && (
                <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                  {availablePlatforms.length}
                </span>
              )}
            </button>
            
            {/* Platforms Dropdown */}
            {showPlatforms && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10">
                {availablePlatforms.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium mb-2">Disponível em:</p>
                    {availablePlatforms.map((platform, index) => (
                      <button
                        key={index}
                        onClick={() => handlePlatformClick(platform.url)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg ${platform.color} flex items-center justify-center`}>
                          <platform.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <Music className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhuma plataforma disponível</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2">
            <ExternalLink className="w-5 h-5" />
            <span>Letras</span>
          </button>
          
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2">
            <Share2 className="w-5 h-5" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Description Dialog */}
      <Dialog open={showDescription} onOpenChange={setShowDescription}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              <span>Descrição da Música</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-gray-700 leading-relaxed">
              {song.description || 'Nenhuma descrição disponível para esta música.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}