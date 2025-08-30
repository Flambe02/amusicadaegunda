import React, { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Music, Calendar, ExternalLink, Play, Headphones, Video, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TikTokEmbedOptimized from '@/components/TikTokEmbedOptimized';

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
      const allSongs = await Song.list();
      
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

  if (isLoading) {
    return (
      <div className="p-5 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
            Blog Musical
          </h1>
          <p className="text-white/80 font-medium text-lg drop-shadow-md">
            Histórias por trás de cada música
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Carregando posts do blog...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
            Blog Musical
          </h1>
          <p className="text-white/80 font-medium text-lg drop-shadow-md">
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
    <div className="p-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
          Blog Musical
        </h1>
        <p className="text-white/80 font-medium text-lg drop-shadow-md">
          Histórias por trás de cada música
        </p>
        <p className="text-white/60 text-sm mt-2">
          Descrições detalhadas e significado de cada canção
        </p>
      </div>

      {/* Filtre par mois */}
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Filtrar por mês:</span>
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
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
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
                        <button 
                          onClick={() => handlePlayTikTok(song)}
                          className="block w-full"
                        >
                          <Button className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105">
                            <Video className="w-4 h-4 mr-2" />
                            Video
                          </Button>
                        </button>
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
          <div className="bg-white/20 rounded-3xl p-8 text-center">
            <Search className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum artigo encontrado
            </h3>
            <p className="text-white/80 mb-4">
              {selectedMonth === 'all' 
                ? 'Não há artigos no blog ainda.'
                : `Não há artigos publicados em ${availableMonths.find(m => m.key === selectedMonth)?.label}.`
              }
            </p>
            {selectedMonth !== 'all' && (
              <Button 
                onClick={resetFilter}
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                Ver todos os artigos
              </Button>
            )}
          </div>
        )}
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

                {/* Lecteur TikTok intégré */}
                {selectedVideo.tiktok_video_id && (
                  <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                    <TikTokEmbedOptimized
                      postId={selectedVideo.tiktok_video_id}
                      className="w-full"
                      song={selectedVideo}
                    />
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => window.open(selectedVideo.tiktok_url, '_blank')}
                    className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    🎬 Ver no TikTok
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
    </div>
  );
}
