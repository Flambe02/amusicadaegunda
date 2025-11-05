import { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import { logger } from '@/lib/logger';
import CountdownTimer from '../components/CountdownTimer';
import { AlertCircle, RefreshCw, Music, Calendar, ChevronLeft, Play, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import LyricsDialog from '../components/LyricsDialog';
import YouTubePlayer from '../components/YouTubePlayer';
import YouTubePlaylist from '../components/YouTubePlaylist';
import OptimizedImage from '../components/OptimizedImage';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/tiktok-optimized.css';
import { localStorageService } from '@/lib/localStorage';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/components/ui/use-toast';

// Composant d'intégration YouTube générique (remplace l'embed TikTok)
// Props attendues: youtube_music_url, youtube_url, title
function YouTubeEmbed({ youtube_music_url, youtube_url, title }) {
  logger.debug('🎬 YouTubeEmbed appelé avec:', { youtube_music_url, youtube_url, title });
  
  // Prioriser youtube_music_url, sinon youtube_url
  const targetUrl = youtube_music_url || youtube_url || '';
  logger.debug('🎬 YouTubeEmbed targetUrl:', targetUrl);

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
  logger.debug('🎬 YouTubeEmbed info extraite:', info);
  
  if (!info) {
    logger.debug('🎬 YouTubeEmbed: Aucune info valide, affichage fallback');
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
  
  logger.debug('🎬 YouTubeEmbed embedSrc généré:', embedSrc);
  logger.debug('🎬 YouTubeEmbed isShort (9:16):', isShort);

  // Format vertical 9:16 pour Shorts, horizontal 16:9 pour vidéos normales
  if (isShort) {
    return (
      <div className="relative rounded-lg overflow-hidden shadow-2xl" style={{ width: '100%', aspectRatio: '9/16', minHeight: 'min(500px, 70vh)', maxHeight: '70vh' }}>
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

export default function Home() {
  logger.debug('🏠 Home component loaded');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSong, setCurrentSong] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, _setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPlatformsDialog, setShowPlatformsDialog] = useState(false);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [selectedSongForDialog, setSelectedSongForDialog] = useState(null);
  const [displayedSong, setDisplayedSong] = useState(null);

  useEffect(() => {
    logger.debug('🏠 Home useEffect triggered');
    localStorageService.initialize();
    loadCurrentSong();
    loadRecentSongs();
  }, []);

  const loadCurrentSong = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.debug('🔄 Tentative de chargement depuis Supabase...');
      const song = await Song.getCurrent();
      logger.debug('📊 Chanson actuelle chargée:', song);
      
      setCurrentSong(song);
      setDisplayedSong(song);
    } catch (err) {
      logger.error('❌ Erro ao carregar música atual:', err);
      setError('Erro ao carregar a música da semana. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentSongs = async () => {
    try {
      logger.debug('🔄 Chargement des musiques récentes depuis Supabase...');
      const allSongs = await Song.list('-release_date', null);
      logger.debug('📊 Toutes les musiques chargées:', allSongs);
      
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const monthSongs = allSongs.filter(song => {
        const songDate = parseISO(song.release_date);
        return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
      });
      
      logger.debug('📅 Musiques du mois en cours:', monthSongs);
      setRecentSongs(monthSongs);
    } catch (err) {
      logger.error('❌ Erro ao carregar músicas recentes:', err);
    }
  };

  const handleRetry = () => {
    loadCurrentSong();
  };

  const handleReplaceVideo = (song, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    logger.debug('🎵 handleReplaceVideo appelé avec:', song.title);
    setDisplayedSong(song);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShowPlatforms = (song) => {
    setSelectedSongForDialog(song);
    setShowPlatformsDialog(true);
  };

  const handleShowLyrics = (song) => {
    setSelectedSongForDialog(song);
    setShowLyricsDialog(true);
  };

  const handleShowDescription = (song) => {
    setSelectedSongForDialog(song);
    setShowDescriptionDialog(true);
  };

  const handleShareSong = async (song) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${song.title} - ${song.artist}`,
          text: `Confira esta música incrível da Música da Segunda!`,
          url: song.youtube_music_url || song.youtube_url || window.location.href,
        });
      } catch {}
    } else {
      // ✅ UX: Toast au lieu d'alert() bloquante
      const shareText = `${song.title} - ${song.artist}\nConfira esta música incrível da Música da Segunda!`;
      navigator.clipboard.writeText(shareText);
      toast({
        title: "✅ Copiado!",
        description: "Link copiado para a área de transferência",
        duration: 3000,
      });
    }
  };

  const getPreviousMonth = () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return format(currentDate, 'yyyy-MM');
  };

  const handleNavigateToPreviousMonth = () => {
    const previousMonth = getPreviousMonth();
    navigate(`/calendar?month=${previousMonth}`);
  };

  useSEO({
    title: 'A Música da Segunda: Paródias das Notícias do Brasil',
    description: 'A Música da Segunda: As Notícias do Brasil em Forma de Paródia. Site oficial de paródias musicais inteligentes e divertidas.',
    keywords: 'música da segunda, paródias musicais, notícias do brasil, música brasileira, descoberta musical, nova música toda segunda',
    image: currentSong?.cover_image,
    url: '/',
    type: 'website'
  });

  if (isLoading) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <Helmet>
          <title>A Música da Segunda: Paródias das Notícias do Brasil</title>
          <meta name="description" content="A Música da Segunda: As Notícias do Brasil em Forma de Paródia. Site oficial de paródias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            A Música da Segunda
          </h1>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra música nova toda segunda-feira
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Carregando música da semana...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <Helmet>
          <title>A Música da Segunda: Paródias das Notícias do Brasil</title>
          <meta name="description" content="A Música da Segunda: As Notícias do Brasil em Forma de Paródia. Site oficial de paródias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            Música da Segunda
          </h2>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra música nova toda segunda-feira
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
      {/* Header Mobile uniquement */}
      <div className="lg:hidden text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
            <OptimizedImage 
              src="images/Musica da segunda.jpg" 
              alt="Logo Música da Segunda"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          
          <div className="text-left">
            <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">
              A Música da Segunda
            </h1>
            <p className="text-white/80 font-medium text-sm md:text-base drop-shadow-md">
              Descubra música nova toda segunda-feira
            </p>
          </div>
        </div>
      </div>
    
      {/* ===== HEADER DESKTOP (H1 persistant pour SEO) ===== */}
      <div className="hidden lg:block text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
          A Música da Segunda
        </h1>
        <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
          Descubra música nova toda segunda-feira
        </p>
      </div>
    
      {/* ===== LAYOUT DESKTOP: VIDÉO YOUTUBE + MÚSICAS DO MÊS ===== */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:mt-8">
        {/* ===== COLONNE GAUCHE: VIDÉO YOUTUBE ===== */}
        <div className="space-y-6">
          {displayedSong ? (
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                <button
                  onClick={() => handleShowDescription(displayedSong)}
                  className="inline-flex items-center gap-2 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Ver descrição da música"
                >
                  <span className="text-2xl">ℹ️</span>
                  <span>{displayedSong.title}</span>
                </button>
              </h3>
              <p className="text-gray-600 text-center mb-4">
                {format(parseISO(displayedSong.release_date), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
              <YouTubeEmbed
                youtube_music_url={displayedSong.youtube_music_url}
                youtube_url={displayedSong.youtube_url}
                title={displayedSong.title}
              />
              <div className="mt-4 text-center">
                <h4 className="font-bold text-gray-800 text-lg mb-2">{displayedSong.title}</h4>
                <p className="text-gray-600">{displayedSong.artist}</p>
                <p className="text-gray-500 text-sm mt-1">
                  {format(parseISO(displayedSong.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              
              {/* 3 Ações Principais - Desktop */}
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShowPlatforms(displayedSong)}
                  >
                    Plataformas
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShowLyrics(displayedSong)}
                  >
                    Letras
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShareSong(displayedSong)}
                  >
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                ℹ️ Nenhuma música disponível
              </h3>
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center" style={{ height: 'min(70vh, 600px)', aspectRatio: '16/9' }}>
                <div className="text-center text-gray-500">
                  <Music className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhuma música disponível</p>
                  <p className="text-sm">Volte na segunda-feira!</p>
                </div>
              </div>
            </div>
          )}
          
          <CountdownTimer />
        </div>

        {/* ===== COLONNE DROITE: MÚSICAS DO MÊS ===== */}
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Músicas do Mês
            </h2>
          </div>

          {recentSongs.length > 0 ? (
            <div className="space-y-4">
              {recentSongs.map((song) => (
                <div key={song.id} className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                      onClick={(e) => handleReplaceVideo(song, e)}
                      title="Clique para ver esta música na coluna de vídeo"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-xl font-bold text-gray-800 truncate cursor-pointer hover:underline"
                        onClick={(e) => handleReplaceVideo(song, e)}
                        title="Clique para ver esta música na coluna de vídeo"
                      >
                        {song.title}
                      </h3>
                      <p className="text-gray-600 text-base font-medium mt-1">
                        {song.artist}
                      </p>
                      <p className="text-gray-500 text-sm font-medium mt-1">
                        {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Nenhuma música publicada este mês ainda
              </p>
            </div>
          )}

          {/* Lien discret vers le mois précédent */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleNavigateToPreviousMonth}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors group cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Ver músicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
            </button>
          </div>
        </div>
      </div>

      {/* ===== LAYOUT MOBILE: DISPOSITION VERTICALE TRADITIONNELLE ===== */}
      <div className="lg:hidden">
        {displayedSong ? (
          <div className="mb-6">
            {/* Version YouTube pour mobile */}
            <div className="space-y-4">
              {/* Header - mobile friendly, title + date */}
              <div className="bg-white rounded-2xl shadow-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-800 leading-tight line-clamp-2">{displayedSong.title}</h2>
                    <p className="text-sm text-blue-700 mt-1">{format(parseISO(displayedSong.release_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div>
                </div>
              </div>

              {/* YouTube Video Block - mobile */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
                <YouTubeEmbed
                  youtube_music_url={displayedSong.youtube_music_url}
                  youtube_url={displayedSong.youtube_url}
                  title={displayedSong.title}
                />
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors"
                    onClick={() => handleShowPlatforms(displayedSong)}
                  >
                    <Music className="w-5 h-5 inline mr-2" />
                    Plataformas
                  </Button>
                  
                  {displayedSong.lyrics && displayedSong.lyrics.trim() && (
                    <Button
                      variant="outline"
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors"
                      onClick={() => handleShowLyrics(displayedSong)}
                    >
                      <FileText className="w-5 h-5 inline mr-2" />
                      Letras
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors"
                    onClick={() => handleShareSong(displayedSong)}
                  >
                    <Play className="w-5 h-5 inline mr-2" />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/20 rounded-3xl p-8 text-center">
            <Music className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhuma música disponível</h3>
            <p className="text-white/80">
              A música da semana será publicada em breve. Volte na segunda-feira!
            </p>
          </div>
        )}
        
        <CountdownTimer />

        {/* ===== BLOC MÚSICAS DO MÊS (MOBILE) ===== */}
        <div className="mt-8">
          <div className="bg-white rounded-3xl p-6 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                Músicas do Mês
              </h2>
            </div>

            {recentSongs.length > 0 ? (
              <div className="space-y-4">
                {recentSongs.map((song) => (
                  <div key={song.id} className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                        onClick={(e) => handleReplaceVideo(song, e)}
                        title="Clique para ver esta música na coluna de vídeo"
                      >
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-bold text-gray-800 text-lg truncate cursor-pointer hover:underline"
                          onClick={(e) => handleReplaceVideo(song, e)}
                          title="Clique para ver esta música na coluna de vídeo"
                        >
                          {song.title}
                        </h3>
                        <p className="text-gray-600 text-base font-medium mt-1">
                          {song.artist}
                        </p>
                        <p className="text-gray-500 text-sm font-medium mt-1">
                          {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Nenhuma música publicada este mês ainda
                </p>
              </div>
            )}

            {/* Lien discret vers le mois précédent */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleNavigateToPreviousMonth}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Ver músicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== DIALOG PLATAFORMAS ===== */}
      <Dialog open={showPlatformsDialog} onOpenChange={setShowPlatformsDialog}>
        <DialogContent className="bg-[#f8f5f2] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🎵 Ouvir em outras plataformas
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-4">
              {/* Informations de la musique */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  {selectedSongForDialog.title}
                </h3>
                <p className="text-blue-700 font-medium">
                  {selectedSongForDialog.artist}
                </p>
              </div>

              {/* Liens des plateformes */}
              <div className="space-y-3">
                {selectedSongForDialog.spotify_url && (
                  <a 
                    href={selectedSongForDialog.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      🎧 Ouvir no Spotify
                    </Button>
                  </a>
                )}
                
                {selectedSongForDialog.apple_music_url && (
                  <a 
                    href={selectedSongForDialog.apple_music_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      🎵 Ouvir no Apple Music
                    </Button>
                  </a>
                )}
                
                {(selectedSongForDialog.youtube_music_url || selectedSongForDialog.youtube_url) && (
                  <a 
                    href={selectedSongForDialog.youtube_music_url || selectedSongForDialog.youtube_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      📺 Assistir no YouTube
                    </Button>
                  </a>
                )}

                {!selectedSongForDialog.spotify_url && !selectedSongForDialog.apple_music_url && !selectedSongForDialog.youtube_music_url && !selectedSongForDialog.youtube_url && (
                  <div className="text-center py-6">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Links de streaming em breve...</p>
                    <p className="text-gray-500 text-sm">Esta música será disponibilizada em breve nas principais plataformas.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG LETRAS ===== */}
      <LyricsDialog 
        open={showLyricsDialog} 
        onOpenChange={setShowLyricsDialog} 
        song={selectedSongForDialog}
        title="📝 Letras da Música"
        maxHeight="h-52"
        showIcon={false}
      />

      {/* ===== DIALOG DESCRIÇÃO ===== */}
      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent className="bg-[#f8f5f2] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              ℹ️ Descrição da Música
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-4">
              {/* Informations de la musique */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  {selectedSongForDialog.title}
                </h3>
                <p className="text-blue-700 font-medium">
                  {selectedSongForDialog.artist}
                </p>
                <p className="text-blue-600 text-sm">
                  📅 {format(parseISO(selectedSongForDialog.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>

              {/* Descrição */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                {selectedSongForDialog.description ? (
                  <ScrollArea className="h-60">
                    <div className="pr-4">
                      <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {selectedSongForDialog.description}
                      </pre>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Descrição não disponível</p>
                    <p className="text-gray-500 text-sm">A descrição desta música será adicionada em breve.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
