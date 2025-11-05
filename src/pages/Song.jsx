import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Song } from '@/api/entities';
import { useSEO } from '../hooks/useSEO';
import { 
  musicRecordingJsonLd, 
  breadcrumbsJsonLd, 
  injectJsonLd 
} from '../lib/seo-jsonld';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Music, Calendar, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Composant d'intégration YouTube générique (identique à Home.jsx)
// Props attendues: youtube_music_url, youtube_url, title
function YouTubeEmbed({ youtube_music_url, youtube_url, title }) {
  console.warn('🎬 [Song.jsx] YouTubeEmbed appelé avec:', { youtube_music_url, youtube_url, title });
  
  // Prioriser youtube_music_url, sinon youtube_url
  const targetUrl = youtube_music_url || youtube_url || '';
  console.warn('🎬 [Song.jsx] targetUrl:', targetUrl);

  // Analyse l'URL et retourne { id, type }
  const getYouTubeEmbedInfo = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
      const lower = url.toLowerCase();

      // Cas playlist explicite (youtube normal ou music)
      const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
      if (listMatch) {
        return { id: listMatch[1], type: 'playlist' };
      }

      // Formats vidéo (inclut Shorts, watch, youtu.be)
      const videoPatterns = [
        /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
        /^([A-Za-z0-9_-]{11})$/
      ];
      for (const re of videoPatterns) {
        const m = url.match(re);
        if (m) return { id: m[1], type: 'video' };
      }

      // music.youtube.com/watch?v=VIDEO_ID (sans list)
      if (lower.includes('music.youtube.com')) {
        const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        if (m) return { id: m[1], type: 'video' };
      }

      return null;
    } catch {
      return null;
    }
  };

  const info = getYouTubeEmbedInfo(targetUrl);
  console.warn('🎬 [Song.jsx] info extraite:', info);
  
  if (!info) {
    console.warn('🎬 [Song.jsx] Aucune info valide, affichage fallback');
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <p className="text-white text-sm">Vidéo non disponible</p>
      </div>
    );
  }

  // Détecter si c'est un Short (format vertical 9:16)
  const isShort = targetUrl.includes('/shorts/');
  
  const base = 'https://www.youtube-nocookie.com/embed';
  const embedSrc =
    info.type === 'video'
      ? `${base}/${info.id}?rel=0&modestbranding=1&playsinline=1&controls=1`
      : `${base}/videoseries?list=${info.id}&rel=0&modestbranding=1&playsinline=1&controls=1`;
  
  console.warn('🎬 [Song.jsx] embedSrc généré:', embedSrc);
  console.warn('🎬 [Song.jsx] isShort (9:16):', isShort);

  // Format vertical 9:16 pour Shorts, horizontal 16:9 pour vidéos normales
  if (isShort) {
    return (
      <div className="w-full flex justify-center">
        <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ width: '100%', maxWidth: '400px', aspectRatio: '9/16' }}>
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

export default function SongPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSongData = async () => {
      if (!slug) return;
      setIsLoading(true);
      setError(null);
      try {
        const songData = await Song.getBySlug(slug);
        setSong(songData);
      } catch (err) {
        console.error('Error loading song:', err);
        setError('Song not found');
      } finally {
        setIsLoading(false);
      }
    };
    loadSongData();
  }, [slug]);

  // SEO optimization for the song page
  useSEO({
    title: song ? `${song.title} — A Música da Segunda` : 'A Música da Segunda',
    description: song ? `Letra, áudio e história de "${song.title}" — nova música da segunda.` : 'Paródias musicais inteligentes e divertidas sobre as notícias do Brasil.',
    keywords: song ? `${song.title}, A Música da Segunda, música da segunda, nova música, paródias musicais` : `música da segunda, paródias musicais, notícias do brasil`,
    url: `/chansons/${slug}`,
    type: 'article'
  });

  // Inject JSON-LD schemas
  useEffect(() => {
    if (song) {
      const musicSchema = musicRecordingJsonLd({
        title: song.title,
        slug: slug,
        datePublished: song.release_date,
        image: song.cover_image,
        byArtist: song.artist || 'A Música da Segunda'
      });
      injectJsonLd(musicSchema, 'song-music-schema');

      const breadcrumbSchema = breadcrumbsJsonLd({
        title: song.title,
        slug: slug
      });
      injectJsonLd(breadcrumbSchema, 'song-breadcrumb-schema');

      return () => {
        const musicScript = document.getElementById('song-music-schema');
        const breadcrumbScript = document.getElementById('song-breadcrumb-schema');
        if (musicScript) musicScript.remove();
        if (breadcrumbScript) breadcrumbScript.remove();
      };
    }
  }, [song, slug]);

  const canonical = `https://www.amusicadasegunda.com/#/chansons/${slug}`;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Helmet>
          <link rel="canonical" href={canonical} />
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Song Not Found'}
          </h2>
          <p className="text-gray-600">
            The song &quot;{slug}&quot; could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <html lang="pt-BR" />
        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>

        {/* Song Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {song.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{song.artist || 'A Música da Segunda'}</span>
            </div>
            {song.release_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(parseISO(song.release_date), 'dd MMMM yyyy', { locale: ptBR })}</span>
              </div>
            )}
          </div>
          {song.description && (
            <p className="text-gray-700 leading-relaxed">
              {song.description}
            </p>
          )}
        </div>

        {/* Video Section - YouTube */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Music className="w-5 h-5" />
            Vídeo
          </h2>
          <div className="w-full max-w-2xl mx-auto">
            {(song.youtube_music_url || song.youtube_url) ? (
              <YouTubeEmbed
                youtube_music_url={song.youtube_music_url}
                youtube_url={song.youtube_url}
                title={song.title}
              />
            ) : (
              <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="text-center text-gray-500">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Vidéo non disponible</p>
                  <p className="text-sm">Cette musique n&apos;a pas encore de vidéo</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Song Details */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detalhes da Música
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Título:</span>
              <span className="ml-2 text-gray-900">{song.title}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Artista:</span>
              <span className="ml-2 text-gray-900">{song.artist || 'A Música da Segunda'}</span>
            </div>
            {song.release_date && (
              <div>
                <span className="font-medium text-gray-700">Data de Lançamento:</span>
                <span className="ml-2 text-gray-900">
                  {format(parseISO(song.release_date), 'dd/MM/yyyy')}
                </span>
              </div>
            )}
            {song.status && (
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className="ml-2 text-gray-900">{song.status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
