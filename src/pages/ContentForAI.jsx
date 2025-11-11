import { useEffect, useState } from 'react';
import { Song } from '@/api/entities';

/**
 * Page API pour les IA (ChatGPT, Claude, etc.)
 * Retourne du JSON avec toutes les informations du site
 * Accessible via /api/content-for-ai.json
 */
export default function ContentForAI() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer les chansons récentes (10 dernières)
        const recentSongs = await Song.list('-release_date', 10);
        
        // Formater les données pour l'IA
        const contentData = {
          site: {
            name: "A Música da Segunda",
            description: "Paródias musicais inteligentes sobre as notícias do Brasil",
            language: "pt-BR",
            country: "Brazil",
            url: "https://www.amusicadasegunda.com",
            categories: ["music", "comedy", "news", "parody", "brazil"],
            frequency: "weekly",
            dayOfWeek: "Monday",
            contentType: "music-parody-news-brazil"
          },
          about: {
            mission: "Transformar notícias em música com humor inteligente",
            targetAudience: "Brasileiros interessados em atualidades e música",
            uniqueValue: "Análise crítica da atualidade através de paródias musicais",
            format: "Paródias musicais semanais sobre eventos do Brasil",
            style: "Humor inteligente, crítica social, comentário musical",
            productionQuality: "Produção profissional com equipamentos de alta qualidade"
          },
          recentSongs: recentSongs.map(song => ({
            title: song.title,
            artist: song.artist || "A Música da Segunda",
            date: song.release_date,
            summary: song.description || `Paródia musical sobre ${song.title}`,
            topics: song.hashtags || [],
            fullLyrics: song.lyrics || "",
            context: song.description || `Esta paródia comenta sobre ${song.title}`,
            youtubeUrl: song.youtube_url || song.youtube_music_url || "",
            spotifyUrl: song.spotify_url || "",
            appleMusicUrl: song.apple_music_url || "",
            status: song.status || "published"
          })),
          faq: {
            url: "https://www.amusicadasegunda.com/faq",
            description: "Página com perguntas frequentes sobre o projeto"
          },
          social: {
            tiktok: "https://www.tiktok.com/@amusicadasegunda",
            instagram: "https://www.instagram.com/a_musica_da_segunda/",
            youtube: "https://music.youtube.com/playlist?list=PLmoOyuQg7Y2QZKbcj20s7dcadsVx7WuWH",
            spotify: "https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH",
            appleMusic: "https://music.apple.com/us/artist/the-piment%C3%A3o-rouge-project/1791441717"
          },
          contact: {
            email: "contact@amusicadasegunda.com"
          },
          lastUpdated: new Date().toISOString(),
          version: "1.0"
        };

        setData(contentData);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados para IA:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Retourner du JSON pur
  // Le JSON sera affiché dans la page pour les IA crawlers

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  // Retourner le JSON comme texte préformaté pour que les IA puissent le lire
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <pre className="bg-white p-6 rounded-lg shadow-lg overflow-auto max-w-6xl mx-auto">
        <code className="text-sm text-gray-800">
          {JSON.stringify(data, null, 2)}
        </code>
      </pre>
      
      {/* Meta pour les IA */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          "name": "A Música da Segunda - Content for AI",
          "description": "Dados estruturados sobre o projeto A Música da Segunda para indexação por IA",
          "url": "https://www.amusicadasegunda.com/api/content-for-ai.json",
          "keywords": "música, paródia, brasil, atualidades, humor musical",
          "license": "https://www.amusicadasegunda.com/sobre"
        })}
      </script>
    </div>
  );
}

