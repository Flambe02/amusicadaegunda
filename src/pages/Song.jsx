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
  // Logs de debug supprimés pour production
  
  // Prioriser youtube_music_url (vidéo), sinon youtube_url (streaming)
  const targetUrl = youtube_music_url || youtube_url || '';

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
  
  if (!info) {
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
            loading="lazy"
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
        loading="lazy"
      />
    </div>
  );
}

export default function SongPage() {
  const { slug: rawSlug } = useParams();
  const navigate = useNavigate();
  // Normaliser le slug (supprimer trailing slash et espaces)
  const slug = rawSlug ? rawSlug.replace(/\/$/, '').trim() : null;
  const [song, setSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rediriger si l'URL a un trailing slash pour éviter les doublons
  useEffect(() => {
    if (rawSlug && rawSlug.endsWith('/')) {
      navigate(`/musica/${slug}`, { replace: true });
    }
  }, [rawSlug, slug, navigate]);

  useEffect(() => {
    const loadSongData = async () => {
      if (!slug) {
        setIsLoading(false);
        setError('Slug inválido');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const songData = await Song.getBySlug(slug);
        if (!songData) {
          // Si la chanson n'existe pas, définir explicitement l'erreur
          setError('Song not found');
          setSong(null);
        } else {
          setSong(songData);
          setError(null);
        }
      } catch (err) {
        // Logger seulement en dev pour éviter les logs excessifs en production
        if (import.meta.env?.DEV) {
          console.error('Error loading song:', err);
        }
        setError('Song not found');
        setSong(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadSongData();
  }, [slug]);

  // SEO optimization for the song page
  // useSEO ajoute automatiquement "| Música da Segunda" au titre, donc on ne le met pas ici
  // Normaliser l'URL (sans trailing slash) pour éviter les doublons
  const normalizedUrl = slug ? `/musica/${slug.replace(/\/$/, '')}` : '/musica';
  useSEO({
    title: song ? song.title : (slug ? slug.replace(/-/g, ' ') : 'A Música da Segunda'),
    description: song ? `Letra, áudio e história de "${song.title}" — nova música da segunda.` : `Paródias musicais inteligentes e divertidas sobre as notícias do Brasil.`,
    keywords: song ? `${song.title}, música da segunda, paródias musicais` : `música da segunda, paródias musicais`,
    image: song?.cover_image, // Image de couverture pour OG
    url: normalizedUrl,
    type: 'article'
  });

  // Inject JSON-LD schemas
  useEffect(() => {
    if (song) {
      const streamingUrls = [
        song.spotify_url,
        song.apple_music_url,
        song.youtube_url,
        song.youtube_music_url
      ].filter(Boolean); // Filtre les valeurs null/undefined

      const musicSchema = musicRecordingJsonLd({
        title: song.title,
        slug: slug,
        datePublished: song.release_date,
        image: song.cover_image,
        byArtist: song.artist || 'A Música da Segunda',
        description: song.description || `Paródia musical de ${song.title} por A Música da Segunda. Nova música toda segunda-feira.`,
        streamingUrls: streamingUrls
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

  // Note: canonical géré par useSEO (sans hash), pas besoin de le définir ici

  if (isLoading) {
    // Contenu de fallback visible pour les crawlers même pendant le chargement
    return (
      <div className="container mx-auto px-4 py-8">
        <Helmet>
          <html lang="pt-BR" />
          <meta name="robots" content="index, follow" />
        </Helmet>
        <div className="max-w-4xl mx-auto">
          {/* Contenu visible pour les crawlers */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'A Música da Segunda'}
          </h1>
          <p className="text-gray-600 mb-8">
            Carregando informações da música...
          </p>
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
          {/* Canonical géré par useSEO, pas besoin de le redéfinir ici */}
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
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-blue-500 to-rose-500">
      <Helmet>
        <html lang="pt-BR" />
        {/* Canonical et og:url gérés par useSEO, pas besoin de les redéfinir ici */}
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="mb-6">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="bg-white/90 hover:bg-white border-white/20 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>

          {/* Video Card - Style Home Page */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl mb-6">
            {/* Song Title Inside Card */}
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              {song.title}
            </h1>

            {/* Info compacte */}
            <div className="flex items-center gap-4 text-gray-600 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{song.artist || 'A Música da Segunda'}</span>
              </div>
              {song.release_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{format(parseISO(song.release_date), 'dd MMMM yyyy', { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Video */}
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
                  <p className="font-medium">Vídeo não disponível</p>
                  <p className="text-sm">Esta música ainda não tem vídeo</p>
                </div>
              </div>
            )}

            {/* Description si présente */}
            {song.description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  {song.description}
                </p>
              </div>
            )}
          </div>

          {/* ✅ SEO: Paroles dans le DOM de manière sémantique pour indexation Google */}
          {song.lyrics && song.lyrics.trim() && (
            <article className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Music className="w-7 h-7 text-rose-500" />
                Letras da Música
              </h2>
              <section className="lyrics-content">
                <pre className="whitespace-pre-wrap text-gray-800 font-sans text-base md:text-lg leading-relaxed">
                  {song.lyrics}
                </pre>
              </section>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
