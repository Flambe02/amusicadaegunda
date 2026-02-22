import { useEffect, useRef, useState } from 'react';
import { getYouTubeEmbedInfo, getYouTubeThumbnailUrl } from '@/lib/utils';

export default function YouTubeEmbed({
  youtubeMusicUrl,
  youtubeUrl,
  title,
  useFacade = false,
  autoplayOnActivate = false,
  thumbnailQuality = 'hqdefault'
}) {
  const [activated, setActivated] = useState(false);
  const iframeRef = useRef(null);

  const primaryUrl = youtubeMusicUrl && youtubeMusicUrl.trim() ? youtubeMusicUrl.trim() : null;
  const fallbackUrl = youtubeUrl && youtubeUrl.trim() ? youtubeUrl.trim() : null;

  let info = primaryUrl ? getYouTubeEmbedInfo(primaryUrl) : null;
  let targetUrl = primaryUrl || '';

  if (!info && fallbackUrl) {
    info = getYouTubeEmbedInfo(fallbackUrl);
    targetUrl = fallbackUrl || '';
  }

  useEffect(() => {
    setActivated(false);
  }, [youtubeMusicUrl, youtubeUrl]);

  const isShort = targetUrl.includes('/shorts/');
  const shouldAutoplay = useFacade && activated && autoplayOnActivate;
  const autoplay = shouldAutoplay ? '&autoplay=1' : '';
  const base = 'https://www.youtube-nocookie.com/embed';
  const embedSrc = info
    ? info.type === 'video'
      ? `${base}/${info.id}?rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1${autoplay}`
      : `${base}/videoseries?list=${info.id}&rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1${autoplay}`
    : '';

  const thumbnailUrl =
    info && info.type === 'video' ? getYouTubeThumbnailUrl(targetUrl, thumbnailQuality) : null;

  const attemptPlay = () => {
    if (!shouldAutoplay) return;
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      '*'
    );
  };

  useEffect(() => {
    if (!shouldAutoplay) return undefined;
    const t1 = setTimeout(() => attemptPlay(), 200);
    const t2 = setTimeout(() => attemptPlay(), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [shouldAutoplay, info?.id]);

  if (!info) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <p className="text-white text-sm">Video nao disponivel</p>
      </div>
    );
  }

  if (!useFacade || activated) {
    if (isShort) {
      return (
        <div className="w-full flex justify-center">
          <div
            className="relative rounded-lg overflow-hidden shadow-lg"
            style={{ width: '100%', maxWidth: '400px', aspectRatio: '9/16' }}
          >
            <iframe
              ref={iframeRef}
              className="absolute top-0 left-0 w-full h-full"
              src={embedSrc}
              title={title || 'YouTube Short'}
              frameBorder="0"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              onLoad={attemptPlay}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        <iframe
          ref={iframeRef}
          className="w-full h-full"
          src={embedSrc}
          title={title || 'YouTube'}
          frameBorder="0"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={attemptPlay}
        />
      </div>
    );
  }

  const activateVideo = () => setActivated(true);

  const handleKeyActivate = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateVideo();
    }
  };

  if (isShort) {
    return (
      <div
        className="relative rounded-lg overflow-hidden shadow-2xl cursor-pointer group"
        style={{ width: '100%', aspectRatio: '9/16', minHeight: 'min(500px, 70vh)', maxHeight: '70vh' }}
        onClick={activateVideo}
        onKeyDown={handleKeyActivate}
        role="button"
        tabIndex={0}
        aria-label={`Reproduzir ${title || 'video'}`}
      >
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={title || 'YouTube Short'}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        )}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white ml-1" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-video rounded-lg overflow-hidden shadow-lg cursor-pointer group relative"
      onClick={activateVideo}
      onKeyDown={handleKeyActivate}
      role="button"
      tabIndex={0}
      aria-label={`Reproduzir ${title || 'video'}`}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title || 'YouTube'}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
      )}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white ml-1" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

