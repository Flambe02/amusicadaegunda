import { useState, useEffect } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { Song } from '@/api/entities';
import { musicPlaylistJsonLd, injectJsonLd, removeJsonLd } from '../lib/seo-jsonld';
import DesktopPageShell, { DesktopMetric, DesktopSurface } from '@/components/DesktopPageShell';
import { Disc3, ExternalLink, Headphones, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <meta name="robots" content="index, follow, max-video-preview:0" />
      </Helmet>

      {/* Layout Desktop - Inchangé */}
      <DesktopPageShell
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5 text-[#FDE047]" />
            Playlist Oficial
          </>
        }
        title="Todas as músicas em uma fila contínua"
        description="A playlist desktop mantém o shell streaming da home, com acesso direto ao catálogo completo no Spotify e atalhos rápidos para o ecossistema do projeto."
        actions={
          <>
            <a
              href="https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH?si=c32b67518b2a4817"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="rounded-full bg-[#FDE047] px-6 py-6 text-sm font-bold text-black hover:bg-[#fde047]/90">
                <Headphones className="mr-2 h-4 w-4" />
                Abrir no Spotify
              </Button>
            </a>
            <a
              href="https://music.youtube.com/playlist?list=PLmoOyuQg7Y2QZKbcj20s7dcadsVx7WuWH"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/5 px-5 py-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                YouTube Music
              </Button>
            </a>
          </>
        }
        stats={
          <>
            <DesktopMetric label="Faixas publicadas" value={songs.length} accent />
            <DesktopMetric label="Atualização" value="Semanal" />
            <DesktopMetric label="Player" value="Spotify" />
          </>
        }
        sideContent={
          <>
            <div className="glass-panel rounded-[28px] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Curadoria</p>
              <h2 className="mt-3 text-xl font-bold text-white">A sequência completa das segundas</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Todas as músicas já lançadas, em ordem contínua, sem sair do shell desktop.
              </p>
            </div>
            <div className="glass-panel rounded-[28px] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE047]/14 text-[#FDE047]">
                  <Disc3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Playlist ativa</p>
                  <p className="text-sm text-white/55">Embed otimizado com lazy load</p>
                </div>
              </div>
            </div>
          </>
        }
      >
        <DesktopSurface className="overflow-hidden p-4">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <iframe
              data-testid="embed-iframe"
              src="https://open.spotify.com/embed/playlist/5z7Jan9yS1KRzwWEPYs4sH?utm_source=generator"
              width="100%"
              height="720"
              frameBorder="0"
              allowFullScreen=""
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              fetchPriority="low"
              title="Playlist Spotify - MÃºsica da Segunda"
              className="min-h-[720px] w-full"
            />
          </div>
        </DesktopSurface>
      </DesktopPageShell>

      <div className="hidden">
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
