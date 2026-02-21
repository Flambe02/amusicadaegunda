import { useState, useEffect } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { Song } from '@/api/entities';
import { musicPlaylistJsonLd, injectJsonLd, removeJsonLd } from '../lib/seo-jsonld';

export default function Playlist() {
  const [songs, setSongs] = useState([]);

  // Charger toutes les chansons pour le JSON-LD
  useEffect(() => {
    const loadSongs = async () => {
      try {
        const allSongs = await Song.list('-release_date', 'published');
        setSongs(allSongs || []);
      } catch (error) {
        console.error('Error loading songs for playlist:', error);
        setSongs([]);
      }
    };
    loadSongs();
  }, []);

  // Inject JSON-LD MusicPlaylist
  useEffect(() => {
    if (songs.length > 0) {
      const tracks = songs.map(song => ({
        title: song.title,
        slug: song.slug,
        artist: song.artist || 'A Música da Segunda',
        datePublished: song.release_date
      }));

      const playlistSchema = musicPlaylistJsonLd({ tracks });
      injectJsonLd(playlistSchema, 'playlist-music-schema');

      return () => {
        removeJsonLd('playlist-music-schema');
      };
    }
  }, [songs]);

  // SEO pour la playlist
  useSEO({
    title: 'Playlist Completa - Todas as Descobertas Musicais',
    description: 'Playlist completa com todas as descobertas musicais do Música da Segunda. Ouça no Spotify, Apple Music e YouTube Music.',
    keywords: 'playlist música da segunda, descobertas musicais, spotify playlist, apple music, youtube music, todas as músicas',
    url: '/musica',
    type: 'website'
  });

  return (
    <>
      <Helmet>
        <html lang="pt-BR" />
        <meta name="robots" content="index,follow" />
      </Helmet>

      {/* Layout Desktop - Inchangé */}
      <div className="hidden lg:block min-h-screen bg-gradient-to-b from-teal-200 to-rose-200 p-5">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
                <img 
                  src="/images/Musica da segunda.jpg" 
                  alt="Logo A Música da Segunda - Paródias Musicais do Brasil"
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
            <div className="w-full">
              <iframe 
                data-testid="embed-iframe" 
                style={{borderRadius: '12px'}} 
                src="https://open.spotify.com/embed/playlist/5z7Jan9yS1KRzwWEPYs4sH?utm_source=generator" 
                width="100%" 
                height="600"
                frameBorder="0" 
                allowFullScreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                title="Playlist Spotify - Música da Segunda"
                className="shadow-lg md:h-[600px] h-[500px]"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Mobile */}
      <div className="lg:hidden px-4 py-4">
        <iframe
          data-testid="embed-iframe"
          src="https://open.spotify.com/embed/playlist/5z7Jan9yS1KRzwWEPYs4sH?utm_source=generator"
          style={{
            borderRadius: '16px',
            width: '100%',
            height: 'calc(100dvh - 160px)',
          }}
          frameBorder="0"
          allowFullScreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Playlist Spotify - Música da Segunda"
        />
      </div>
    </>
  );
}
