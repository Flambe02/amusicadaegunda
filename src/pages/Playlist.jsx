import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';

export default function Playlist() {
  // SEO pour la playlist
  useSEO({
    title: 'Playlist Completa - Todas as Descobertas Musicais',
    description: 'Playlist completa com todas as descobertas musicais do Música da Segunda. Ouça no Spotify, Apple Music e YouTube Music.',
    keywords: 'playlist música da segunda, descobertas musicais, spotify playlist, apple music, youtube music, todas as músicas',
    url: '/playlist',
    type: 'website'
  });

  return (
    <>
      <Helmet>
        <html lang="pt-BR" />
        <meta name="robots" content="index,follow" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Playlist A Música da Segunda"
        })}</script>
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

      {/* Layout Mobile - Compact et Immersif */}
      <div className="lg:hidden fixed inset-0 flex flex-col bg-black text-white overflow-hidden">
        {/* Header Compact */}
        <header className="flex-shrink-0 h-[80px] bg-black/90 backdrop-blur-lg border-b border-white/10 z-40 flex items-center px-4">
          <h1 className="text-2xl font-black text-white drop-shadow-sm">
            Playlist
          </h1>
        </header>

        {/* Spotify Playlist Container - Prend tout l'espace restant */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full px-4 py-4 pb-24">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/20 h-full flex flex-col">
              <div className="w-full flex-1 min-h-0">
                <iframe 
                  data-testid="embed-iframe" 
                  style={{
                    borderRadius: '12px',
                    width: '100%',
                    height: '100%',
                    minHeight: '500px'
                  }} 
                  src="https://open.spotify.com/embed/playlist/5z7Jan9yS1KRzwWEPYs4sH?utm_source=generator" 
                  frameBorder="0" 
                  allowFullScreen="" 
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                  loading="lazy"
                  title="Playlist Spotify - Música da Segunda"
                  className="shadow-lg"
                ></iframe>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
