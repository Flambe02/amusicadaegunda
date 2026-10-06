import { extractYouTubeId } from '@/lib/utils';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';
import { CURRENT_SONG_ARTWORK } from '@/generated/currentSongArtwork';

/** Image d'une chanson pour l'accueil (hero desktop, grille, instantané hors ligne). */
export function getSongArtwork(song, quality = 'hqdefault') {
  if (!song) return BRAND_SQUARE_MEDIUM;

  if (
    CURRENT_SONG_ARTWORK.path &&
    CURRENT_SONG_ARTWORK.slug &&
    song.slug === CURRENT_SONG_ARTWORK.slug
  ) {
    return CURRENT_SONG_ARTWORK.path;
  }

  if (song.cover_image) return song.cover_image;
  if (song.thumbnail_url) return song.thumbnail_url;

  const videoId = extractYouTubeId(song.youtube_music_url || song.youtube_url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  }

  return BRAND_SQUARE_MEDIUM;
}
