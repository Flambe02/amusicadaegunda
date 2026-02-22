import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function titleToSlug(title) {
  if (!title || typeof title !== 'string') return null;
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;

  const patterns = [
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
    /music\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

export function getYouTubeEmbedInfo(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const lower = url.toLowerCase();
    const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (listMatch) {
      return { id: listMatch[1], type: 'playlist' };
    }

    const videoId = extractYouTubeId(url);
    if (videoId) {
      return { id: videoId, type: 'video' };
    }

    if (lower.includes('music.youtube.com')) {
      const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
      if (m) return { id: m[1], type: 'video' };
    }

    return null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnailUrl(url, quality = 'maxresdefault') {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
