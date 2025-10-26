import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Song } from '@/api/entities';
import { useSEO } from '../hooks/useSEO';
import { 
  musicRecordingJsonLd, 
  breadcrumbsJsonLd, 
  injectJsonLd 
} from '../lib/seo-jsonld';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Music, Calendar, User } from 'lucide-react';
import TikTokEmbedOptimized from '../components/TikTokEmbedOptimized';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        // Try to get song by slug (this would need to be implemented in the Song entity)
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
    title: song ? song.title : slug,
    description: song ? song.description || `Listen to "${song.title}" by ${song.artist || 'A Música da Segunda'}` : `Song: ${slug}`,
    keywords: song ? `${song.title}, ${song.artist || 'A Música da Segunda'}, música da segunda, nova música` : `música da segunda, ${slug}`,
    url: `/chansons/${slug}`,
    type: 'article'
  });

  // Inject JSON-LD schemas
  useEffect(() => {
    if (song) {
      // MusicRecording schema
      const musicSchema = musicRecordingJsonLd({
        title: song.title,
        slug: slug,
        datePublished: song.release_date,
        image: song.cover_image,
        byArtist: song.artist || 'A Música da Segunda'
      });
      injectJsonLd(musicSchema, 'song-music-schema');

      // Breadcrumbs schema
      const breadcrumbSchema = breadcrumbsJsonLd({
        title: song.title,
        slug: slug
      });
      injectJsonLd(breadcrumbSchema, 'song-breadcrumb-schema');

      // Cleanup on unmount
      return () => {
        const musicScript = document.getElementById('song-music-schema');
        const breadcrumbScript = document.getElementById('song-breadcrumb-schema');
        if (musicScript) musicScript.remove();
        if (breadcrumbScript) breadcrumbScript.remove();
      };
    }
  }, [song, slug]);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Song Not Found'}
          </h1>
          <p className="text-gray-600">
            The song &quot;{slug}&quot; could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
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

        {/* TikTok Video */}
        {song.tiktok_video_id && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Vídeo TikTok
            </h2>
            <div className="w-full max-w-md mx-auto">
              <TikTokEmbedOptimized 
                postId={song.tiktok_video_id}
                className="w-full"
                song={song}
              />
            </div>
          </div>
        )}

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
