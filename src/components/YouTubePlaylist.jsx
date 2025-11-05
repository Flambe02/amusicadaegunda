import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function YouTubePlaylist({ playlistUrl, className = "", title = "YouTube Playlist" }) {
  if (!playlistUrl) return null;

  // Extraire l'ID de playlist depuis l'URL
  const extractPlaylistId = (url) => {
    const playlistMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    return playlistMatch ? playlistMatch[1] : null;
  };

  const playlistId = extractPlaylistId(playlistUrl);

  // Si c'est une playlist YouTube Music, on ne peut pas l'embedd (limitation YouTube)
  // On affiche un lien vers la playlist
  if (playlistUrl.includes('music.youtube.com')) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 text-center text-white`}>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Playlist YouTube Music</h3>
            <p className="text-gray-300 text-sm mb-4">
              Cette musique est disponible dans une playlist YouTube Music
            </p>
            <a
              href={playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Ouvrir la playlist sur YouTube Music
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Si c'est une playlist YouTube normale, on peut l'embedd
  if (playlistId) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const src = `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0&modestbranding=1&playsinline=1&controls=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`;

    return (
      <div className={`${className}`} style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
        <iframe
          title={title}
          src={src}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </div>
    );
  }

  return null;
}

