import React from 'react';
import { Music, ExternalLink } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { Button } from './ui/button';

export default function PlatformsDrawer({ 
  open, 
  onOpenChange,
  song
}) {
  if (!song) return null;

  const platforms = [
    {
      name: 'Spotify',
      url: song.spotify_url,
      icon: '🎧',
      color: 'bg-[#1DB954] hover:bg-[#1ed760]',
      available: !!song.spotify_url
    },
    {
      name: 'Apple Music',
      url: song.apple_music_url,
      icon: '🎵',
      color: 'bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90',
      available: !!song.apple_music_url
    },
    {
      name: 'YouTube Music',
      url: song.youtube_music_url || song.youtube_url,
      icon: '📺',
      color: 'bg-[#FF0000] hover:bg-[#cc0000]',
      available: !!(song.youtube_music_url || song.youtube_url)
    },
  ].filter(platform => platform.available);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="bg-black/95 backdrop-blur-xl border-t border-white/20 max-h-[85vh]">
        {/* Handle bar */}
        <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-white/30" />
        
        {/* Header avec titre */}
        <DrawerHeader className="px-6 pt-4 pb-2">
          <DrawerTitle className="text-xl font-bold text-white flex items-center gap-3">
            <Music className="w-6 h-6 text-white" />
            Ouvir
          </DrawerTitle>
          {song.title && (
            <p className="text-white/80 text-sm mt-2 drop-shadow-sm">
              {song.title}
            </p>
          )}
        </DrawerHeader>
        
        {/* Liste des plateformes */}
        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          {platforms.length > 0 ? (
            <div className="space-y-3">
              {platforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    size="lg"
                    className={`w-full ${platform.color} text-white font-bold py-4 px-6 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 touch-manipulation`}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span>Abrir no {platform.name}</span>
                    <ExternalLink className="w-5 h-5" />
                  </Button>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/90 font-medium text-lg mb-2 drop-shadow-sm">
                Nenhuma plataforma disponível
              </p>
              <p className="text-white/70 text-sm drop-shadow-sm">
                Os links de streaming serão adicionados em breve.
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

