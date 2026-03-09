/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Music, Calendar, Play, Headphones, Video, Filter, Search, Sparkles, ArrowUpRight, Disc3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSEO } from '@/hooks/useSEO';
import DesktopPageShell, { DesktopMetric, DesktopSurface } from '@/components/DesktopPageShell';

// Composant d'intégration YouTube (identique aux autres pages)
function YouTubeEmbed({ youtube_music_url, youtube_url, title }) {
  // Prioriser youtube_music_url (vidéo), sinon youtube_url (streaming)
  const targetUrl = youtube_music_url || youtube_url || '';

  const getYouTubeEmbedInfo = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
      const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
      if (listMatch) {
        return { id: listMatch[1], type: 'playlist' };
      }

      const videoPatterns = [
        /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
        /^([A-Za-z0-9_-]{11})$/
      ];
      for (const re of videoPatterns) {
        const m = url.match(re);
        if (m) return { id: m[1], type: 'video' };
      }

      if (url.toLowerCase().includes('music.youtube.com')) {
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

  const isShort = targetUrl.includes('/shorts/');
  const base = 'https://www.youtube-nocookie.com/embed';
  const embedSrc =
    info.type === 'video'
      ? `${base}/${info.id}?rel=0&modestbranding=1&playsinline=1&controls=1`
      : `${base}/videoseries?list=${info.id}&rel=0&modestbranding=1&playsinline=1&controls=1`;

  if (isShort) {
    return (
      <div className="w-full flex justify-center">
        <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ width: '100%', maxWidth: '400px', aspectRatio: '9/16' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={embedSrc}
            title={title || 'YouTube Short'}
            frameBorder="0"
            loading="lazy"
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
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function Blog() {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [availableMonths, setAvailableMonths] = useState([]);

   
  useEffect(() => {
    loadBlogPosts();
  }, []);

   
  useEffect(() => {
    filterSongsByMonth();
  }, [selectedMonth, songs]);

  const loadBlogPosts = async () => {
    try {
      setIsLoading(true);
              const allSongs = await Song.list('-release_date', null);
      
      // Trier les chansons par date de publication (plus récentes en premier)
      const sortedSongs = allSongs.sort((a, b) => 
        new Date(b.release_date) - new Date(a.release_date)
      );
      
      setSongs(sortedSongs);
      
      // Extraire les mois disponibles
      const months = extractAvailableMonths(sortedSongs);
      setAvailableMonths(months);
    } catch (err) {
      console.error('Erro ao carregar posts do blog:', err);
      setError('Erro ao carregar os posts do blog. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const extractAvailableMonths = (songsList) => {
    const monthsSet = new Set();
    
    songsList.forEach(song => {
      const date = parseISO(song.release_date);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMMM yyyy', { locale: ptBR });
      monthsSet.add(JSON.stringify({ key: monthKey, label: monthLabel }));
    });
    
    const months = Array.from(monthsSet).map(item => JSON.parse(item));
    return months.sort((a, b) => b.key.localeCompare(a.key)); // Trier par ordre chronologique inverse
  };

  const filterSongsByMonth = () => {
    if (selectedMonth === 'all') {
      setFilteredSongs(songs);
    } else {
      const filtered = songs.filter(song => {
        const songMonth = format(parseISO(song.release_date), 'yyyy-MM');
        return songMonth === selectedMonth;
      });
      setFilteredSongs(filtered);
    }
  };

  const resetFilter = () => {
    setSelectedMonth('all');
  };

  // Obtenir le lundi de la semaine de publication
  const getMondayOfWeek = (dateString) => {
    const date = parseISO(dateString);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    return monday;
  };

  // Lancer la vidéo TikTok
  const handlePlayTikTok = (song) => {
    setSelectedVideo(song);
    setShowVideoModal(true);
  };

  // SEO optimization - DOIT être avant tous les return
  useSEO({
    title: 'Blog Musical',
    description: 'Histórias por trás de cada música publicada na A Música da Segunda. Descrições detalhadas e significado de cada canção.',
    keywords: 'blog musical, histórias de músicas, música da segunda, paródias musicais, descrições de canções',
    url: '/blog',
    type: 'website'
  });

  const featuredSong = filteredSongs[0] || songs[0] || null;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header skeleton */}
        <div className="glass-panel desktop-shell-gradient rounded-[36px] p-6 xl:p-8">
          <div className="h-8 w-48 rounded-full bg-white/10 mb-3" />
          <div className="h-5 w-64 rounded-full bg-white/6" />
        </div>
        {/* Card skeletons */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass-panel desktop-shell-gradient rounded-[28px] p-6 xl:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="space-y-4">
                <div className="h-4 w-32 rounded-full bg-white/8" />
                <div className="h-9 w-3/4 rounded-2xl bg-white/10" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-white/6" />
                  <div className="h-4 w-5/6 rounded bg-white/6" />
                  <div className="h-4 w-4/6 rounded bg-white/6" />
                </div>
                <div className="flex gap-3">
                  <div className="h-10 w-24 rounded-full bg-white/8" />
                  <div className="h-10 w-28 rounded-full bg-white/8" />
                </div>
              </div>
              <div className="aspect-video rounded-[24px] bg-white/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
            Blog Musical
          </h2>
          <p className="text-gray-700 font-medium text-lg">
            Histórias por trás de cada música
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center">
          <Music className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadBlogPosts} className="bg-red-500 hover:bg-red-600">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DesktopPageShell
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5 text-[#FDE047]" />
            Blog Musical
          </>
        }
        title="Histórias por trás de cada música"
        description="Cada lançamento ganha contexto, descrição detalhada e acesso rápido às plataformas, mantendo o mesmo shell desktop da home."
        stats={
          <>
            <DesktopMetric label="Posts no acervo" value={songs.length} accent />
            <DesktopMetric label="Filtrados" value={filteredSongs.length} />
            <DesktopMetric label="Meses ativos" value={availableMonths.length} />
          </>
        }
        sideContent={
          <>
            <div className="glass-panel rounded-[28px] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Filtro</p>
              <div className="mt-4 space-y-3">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Selecione um mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses ({songs.length})</SelectItem>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.key} value={month.key}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMonth !== 'all' ? (
                  <Button
                    variant="outline"
                    onClick={resetFilter}
                    className="w-full rounded-full border-white/12 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    Limpar filtro
                  </Button>
                ) : null}
              </div>
            </div>
            {featuredSong ? (
              <div className="glass-panel rounded-[28px] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Em destaque</p>
                <h2 className="mt-3 text-xl font-bold text-white">{featuredSong.title}</h2>
                <p className="mt-1 text-sm text-white/55">{featuredSong.artist}</p>
                <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/60">
                  {featuredSong.description || 'Descrição editorial em atualização.'}
                </p>
              </div>
            ) : null}
          </>
        }
      >
        <div className="grid gap-6">
          {filteredSongs.length > 0 ? filteredSongs.map((song) => {
            const mondayDate = getMondayOfWeek(song.release_date);

            return (
              <DesktopSurface key={song.id}>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/65">
                            <Calendar className="h-3.5 w-3.5 text-[#FDE047]" />
                            {format(mondayDate, 'dd MMMM yyyy', { locale: ptBR })}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                            {song.artist}
                          </span>
                        </div>
                        <h2 className="mt-4 text-3xl font-black text-white">{song.title}</h2>
                      </div>

                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">Sobre a música</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/68">
                        {song.description || 'A descrição desta música será adicionada em breve.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {song.spotify_url ? (
                        <a href={song.spotify_url} target="_blank" rel="noopener noreferrer">
                          <Button className="rounded-full bg-[#1DB954] px-5 py-5 text-white hover:bg-[#1ed760]">
                            <Headphones className="mr-2 h-4 w-4" />
                            Spotify
                          </Button>
                        </a>
                      ) : null}
                      {song.youtube_url ? (
                        <a href={song.youtube_url} target="_blank" rel="noopener noreferrer">
                          <Button className="rounded-full bg-[#FF0000] px-5 py-5 text-white hover:bg-[#cc0000]">
                            <ArrowUpRight className="mr-2 h-4 w-4" />
                            YouTube
                          </Button>
                        </a>
                      ) : null}
                      {song.tiktok_url ? (
                        <Button
                          onClick={() => handlePlayTikTok(song)}
                          variant="outline"
                          className="rounded-full border-white/12 bg-white/5 px-5 py-5 text-white hover:bg-white/10 hover:text-white"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          Ver vídeo
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
                      <YouTubeEmbed
                        youtube_music_url={song.youtube_music_url}
                        youtube_url={song.youtube_url}
                        title={song.title}
                      />
                    </div>
                  </div>
                </div>
              </DesktopSurface>
            );
          }) : (
            <DesktopSurface className="text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-white/35" />
              <h3 className="text-xl font-semibold text-white">Nenhum artigo encontrado</h3>
              <p className="mt-2 text-white/60">
                {selectedMonth === 'all'
                  ? 'Não há artigos no blog ainda.'
                  : `Não há artigos publicados em ${availableMonths.find(m => m.key === selectedMonth)?.label}.`}
              </p>
            </DesktopSurface>
          )}
        </div>
      </DesktopPageShell>

      <div className="p-5 max-w-4xl mx-auto lg:hidden">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
          Blog Musical
        </h1>
        <p className="text-gray-700 font-medium text-lg">
          Histórias por trás de cada música
        </p>
        <p className="text-gray-600 text-sm mt-2">
          Descrições detalhadas e significado de cada canção
        </p>
      </div>

      {/* Filtre par mois */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-700" />
            <span className="text-gray-800 font-medium">Filtrar por mês:</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48 bg-white/90 border-0 text-gray-800">
                <SelectValue placeholder="Selecione um mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Todos os meses ({songs.length})
                  </div>
                </SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month.key} value={month.key}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedMonth !== 'all' && (
              <Button 
                onClick={resetFilter}
                variant="outline"
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Limpar filtro
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des articles de blog filtrés */}
      <div className="space-y-8">
        {filteredSongs.length > 0 ? (
          filteredSongs.map((song) => {
            const mondayDate = getMondayOfWeek(song.release_date);
            
            return (
              <Card key={song.id} className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl md:text-3xl font-black text-gray-800 mb-2">
                        {song.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">
                            Segunda-feira, {format(mondayDate, 'dd MMMM yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {song.artist}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Description de la chanson */}
                  {song.description ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <h3 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
                        🎵 Sobre a Música
                      </h3>
                      <p className="text-green-800 leading-relaxed whitespace-pre-wrap">
                        {song.description}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                        🎵 Sobre a Música
                      </h3>
                      <p className="text-gray-600 italic">
                        A descrição desta música será adicionada no Supabase em breve. Enquanto isso, aproveite a música!
                      </p>
                    </div>
                  )}

                  {/* Liens vers les plateformes */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                    <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
                      🎧 Ouvir e Assistir
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {song.spotify_url && (
                        <a 
                          href={song.spotify_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105">
                            <Headphones className="w-4 h-4 mr-2" />
                            Spotify
                          </Button>
                        </a>
                      )}
                      
                      {song.youtube_url && (
                        <a 
                          href={song.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105">
                            <Play className="w-4 h-4 mr-2" />
                            YouTube
                          </Button>
                        </a>
                      )}
                      
                      {song.tiktok_url && (
                        <Button 
                          onClick={() => handlePlayTikTok(song)}
                          className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Video
                        </Button>
                      )}

                      {!song.spotify_url && !song.youtube_url && !song.tiktok_url && (
                        <div className="col-span-full text-center py-4">
                          <Music className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">
                            Links de streaming em breve...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informations supplémentaires */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">Data de Lançamento:</span>
                        <br />
                        {format(parseISO(song.release_date), 'dd MMMM yyyy', { locale: ptBR })}
                      </div>
                      {song.genre && (
                        <div>
                          <span className="font-semibold">Gênero:</span>
                          <br />
                          {song.genre}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="bg-white/70 rounded-3xl p-8 text-center border border-gray-200">
            <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum artigo encontrado
            </h3>
            <p className="text-gray-700 mb-4">
              {selectedMonth === 'all' 
                ? 'Não há artigos no blog ainda.'
                : `Não há artigos publicados em ${availableMonths.find(m => m.key === selectedMonth)?.label}.`
              }
            </p>
            {selectedMonth !== 'all' && (
              <Button 
                onClick={resetFilter}
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Ver todos os artigos
              </Button>
            )}
          </div>
        )}
      </div>
      </div>

      {/* ===== MODAL VIDÉO TIKTOK ===== */}
      {showVideoModal && selectedVideo && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-blue-900">
                  🎬 {selectedVideo.title}
                </h2>
                <button 
                  onClick={() => setShowVideoModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Informations de la musique */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">
                    {selectedVideo.title}
                  </h3>
                  <p className="text-blue-700 font-medium">
                    {selectedVideo.artist}
                  </p>
                  <p className="text-blue-600 text-sm">
                    📅 Lançamento: {format(parseISO(selectedVideo.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>

                {/* Vidéo YouTube */}
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                  <YouTubeEmbed
                    youtube_music_url={selectedVideo.youtube_music_url}
                    youtube_url={selectedVideo.youtube_url}
                    title={selectedVideo.title}
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      const url = selectedVideo.youtube_music_url || selectedVideo.youtube_url;
                      if (url) window.open(url, '_blank');
                    }}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    📺 Ver no YouTube
                  </button>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
