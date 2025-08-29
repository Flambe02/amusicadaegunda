import React from 'react';
import { Music, ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Playlist() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-200 to-rose-200 p-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
              <img 
                src="images/Musica da segunda.jpg" 
                alt="Logo Música da Segunda"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="text-left">
              <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg mb-2">
                Playlist
              </h1>
              <p className="text-white/90 font-medium text-lg drop-shadow-md">
                Ouça todas as músicas da Música da Segunda
              </p>
            </div>
          </div>
        </div>

        {/* Spotify Playlist */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl">
          {/* Spotify Embed */}
          <div className="w-full">
            <iframe 
              data-testid="embed-iframe" 
              style={{borderRadius: '12px'}} 
              src="https://open.spotify.com/embed/playlist/5z7Jan9yS1KRzwWEPYs4sH?utm_source=generator" 
              width="100%" 
              height="800"
              frameBorder="0" 
              allowFullScreen="" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              className="shadow-lg md:h-[800px] h-[600px]"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
