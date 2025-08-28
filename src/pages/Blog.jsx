import React, { useState, useEffect } from 'react';
import { Song } from '@/api/entities';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Music, Calendar, ExternalLink, Play, Headphones, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Blog() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    try {
      setIsLoading(true);
      const allSongs = await Song.list();
      
      // Trier les chansons par date de publication (plus récentes en premier)
      const sortedSongs = allSongs.sort((a, b) => 
        new Date(b.release_date) - new Date(a.release_date)
      );
      
      setSongs(sortedSongs);
    } catch (err) {
      console.error('Erro ao carregar posts do blog:', err);
      setError('Erro ao carregar os posts do blog. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
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

  // Générer le contexte de l'actualité basé sur la date
  const generateNewsContext = (dateString) => {
    const date = parseISO(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Contexte générique basé sur la période
    if (month === 0) { // Janvier
      return "Début d'année, résolutions et nouveaux départs. Une période de renouveau et d'espoir.";
    } else if (month === 1) { // Février
      return "Mois de l'amour et du carnaval. Une époque de célébration et de joie.";
    } else if (month === 2) { // Mars
      return "Arrivée du printemps, renaissance de la nature. Une saison de croissance et de transformation.";
    } else if (month === 3) { // Avril
      return "Pâques et renouveau printanier. Une période de réflexion et de renouveau.";
    } else if (month === 4) { // Mai
      return "Mois des fleurs et de la célébration du travail. Une époque de gratitude et d'appréciation.";
    } else if (month === 5) { // Juin
      return "Début de l'été, festivals et célébrations. Une saison de liberté et d'expression.";
    } else if (month === 6) { // Juillet
      return "Cœur de l'été, vacances et détente. Une période de repos et de découverte.";
    } else if (month === 7) { // Août
      return "Fin de l'été, préparation de la rentrée. Une époque de transition et de préparation.";
    } else if (month === 8) { // Septembre
      return "Rentrée scolaire et retour à la routine. Une saison de nouveaux commencements.";
    } else if (month === 9) { // Octobre
      return "Automne, changement de couleurs. Une période de transformation et de mélancolie.";
    } else if (month === 10) { // Novembre
      return "Approche de l'hiver, réflexion et introspection. Une époque de contemplation.";
    } else { // Décembre
      return "Fin d'année, fêtes et célébrations. Une saison de joie et de partage.";
    }
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
          Contexto histórico, atualidades e significado de cada canção
        </p>
      </div>

      {/* Liste des articles de blog */}
      <div className="space-y-8">
        {songs.map((song) => {
          const mondayDate = getMondayOfWeek(song.release_date);
          const newsContext = generateNewsContext(song.release_date);
          
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
                {/* Contexte de l'actualité */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                    📰 Contexto da Época
                  </h3>
                  <p className="text-blue-800 leading-relaxed">
                    {newsContext}
                  </p>
                </div>

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
                      A descrição desta música será adicionada em breve. Enquanto isso, aproveite a música!
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
                      <a 
                        href={song.tiktok_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105">
                          <Video className="w-4 h-4 mr-2" />
                          TikTok
                        </Button>
                      </a>
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
        })}
      </div>

      {/* Message si aucune chanson */}
      {songs.length === 0 && (
        <div className="bg-white/20 rounded-3xl p-8 text-center">
          <Music className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhum post do blog ainda
          </h3>
          <p className="text-white/80">
            Os primeiros posts do blog serão publicados em breve!
          </p>
        </div>
      )}
    </div>
  );
}
