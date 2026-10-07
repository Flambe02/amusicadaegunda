import { useEffect } from 'react';
import { useSEO } from './useSEO';
import { musicRecordingJsonLd, breadcrumbsJsonLd, injectJsonLd } from '@/lib/seo-jsonld';

export const SONG_CATEGORY_LABELS = {
  internacional: 'Internacional',
  midia: 'Mídia',
  energia: 'Energia',
  esporte: 'Esporte',
  cultura: 'Cultura',
  outros: 'Outros',
  saude: 'Saúde',
  policia: 'Polícia',
  politica: 'Política',
  seguranca: 'Segurança',
  tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia',
  economia: 'Economia',
};

/**
 * SEO d'une fiche `/musica/:slug` — une seule définition pour la page chanson
 * (src/pages/Song.jsx) et la fiche de l'interface grand écran (src/tv/TvSongDetailPage) :
 * balises (titre aligné sur les stubs de generate-stubs.cjs, canonical avec barre
 * finale, `music.song`, `max-video-preview:0`) et JSON-LD `MusicRecording` +
 * `BreadcrumbList` (ids `song-music-schema` / `song-breadcrumb-schema`).
 *
 * `enabled: false` : ne touche à rien (app TV, où il n'y a ni URL ni indexation).
 */
export function useSongSEO({ song, slug, noindex = false, enabled = true }) {
  const normalizedUrl = slug ? `/musica/${slug.replace(/\/$/, '')}/` : '/musica/';

  // ✅ SEO: titre court et keyword-friendly, aligné sur les stubs (generate-stubs.cjs).
  // Le sous-titre long (phrase) reste affiché dans le <h1>/contexte, pas dans le <title>.
  const seoTitle = song
    ? (SONG_CATEGORY_LABELS[song.category]
        ? `${song.title} — Paródia ${SONG_CATEGORY_LABELS[song.category]} | A Música da Segunda`
        : `${song.title} — Paródia Musical | A Música da Segunda`)
    : slug ? slug.replace(/-/g, ' ') : 'A Música da Segunda';
  const seoDescription = song?.description
    ? (song.description.length > 155 ? song.description.slice(0, 152).trimEnd() + '...' : song.description)
    : 'Paródias musicais inteligentes e divertidas sobre as notícias do Brasil.';

  useSEO({
    title: seoTitle,
    description: seoDescription,
    image: song?.cover_image,
    url: normalizedUrl,
    type: 'music.song',
    robots: noindex ? 'noindex, follow' : 'index, follow, max-video-preview:0',
    publishedTime: song?.release_date || null,
    articleSection: song?.category ? (SONG_CATEGORY_LABELS[song.category] || song.category) : null,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    if (slug) injectJsonLd(breadcrumbsJsonLd({ title: null, slug }), 'song-breadcrumb-schema');
    if (song && slug) {
      const streamingUrls = [song.spotify_url, song.apple_music_url, song.youtube_url, song.youtube_music_url].filter(Boolean);
      const songKeywords = [
        song.title,
        song.subtitle ? song.subtitle.replace(/—.*$/, '').trim() : null,
        song.category ? SONG_CATEGORY_LABELS[song.category] || song.category : null,
        'paródia musical', 'música da segunda', 'brasil', 'sátira musical',
      ].filter(Boolean);
      injectJsonLd(musicRecordingJsonLd({
        title: song.title, slug, datePublished: song.release_date,
        image: song.cover_image, byArtist: song.artist || 'A Música da Segunda',
        description: song.description || `Paródia musical de ${song.title} por A Música da Segunda.`,
        streamingUrls,
        keywords: songKeywords,
      }), 'song-music-schema');
      injectJsonLd(breadcrumbsJsonLd({ title: song.title, slug }), 'song-breadcrumb-schema');
    }
    return () => {
      document.getElementById('song-music-schema')?.remove();
      document.getElementById('song-breadcrumb-schema')?.remove();
    };
  }, [song, slug, enabled]);

  return { normalizedUrl };
}
