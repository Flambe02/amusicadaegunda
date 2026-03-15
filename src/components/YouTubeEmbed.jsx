import { useEffect, useRef, useState } from 'react';
import { getYouTubeEmbedInfo, getYouTubeThumbnailUrl } from '@/lib/utils';

export default function YouTubeEmbed({
  youtubeMusicUrl,
  youtubeUrl,
  title,
  preferWatchUrl = false,
  useFacade = false,
  autoplayOnActivate = false,
  thumbnailQuality = 'hqdefault',
  loading = 'lazy',
  forceActivated = false,
  shortMaxWidth = 400,
  startMuted = false,
  playerStateRef = null,
  onActivatedChange,
  onMuteChange,
  portraitMode = false,
  playButtonStyle = 'youtube',
}) {
  const [activated, setActivated] = useState(false);
  const [isMuted, setIsMuted] = useState(startMuted);
  const [embedError, setEmbedError] = useState(false);
  const iframeRef = useRef(null);

  // URL processing — must be declared before useEffects that reference isShort in their deps
  const watchUrl = youtubeUrl && youtubeUrl.trim() ? youtubeUrl.trim() : null;
  const musicUrl = youtubeMusicUrl && youtubeMusicUrl.trim() ? youtubeMusicUrl.trim() : null;
  const primaryUrl = preferWatchUrl ? (watchUrl || musicUrl) : (musicUrl || watchUrl);
  const fallbackUrl = preferWatchUrl ? musicUrl : watchUrl;
  let info = primaryUrl ? getYouTubeEmbedInfo(primaryUrl) : null;
  let targetUrl = primaryUrl || '';
  if (!info && fallbackUrl) {
    info = getYouTubeEmbedInfo(fallbackUrl);
    targetUrl = fallbackUrl || '';
  }
  const isShort = targetUrl.includes('/shorts/');

  useEffect(() => {
    if (forceActivated) setActivated(true);
  }, [forceActivated]);

  // Listen for YouTube IFrame API error events (e.g. embedding disabled, video removed)
  // Only act on codes 100/101/150 (not embeddable / not found).
  // Code 2 = invalid param (false positive for newly-uploaded Shorts with loop/playlist params).
  // event.source check ensures we only handle messages from our own iframe, not other iframes on the page.
  useEffect(() => {
    if (!activated) return;
    const handleYTMessage = (event) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onError' && [100, 101, 150].includes(data?.info)) {
          setEmbedError(true);
        }
      } catch {}
    };
    window.addEventListener('message', handleYTMessage);
    return () => window.removeEventListener('message', handleYTMessage);
  }, [activated]);

  // Shorts: auto-replay when video ends (state 0) — replaces loop=1&playlist= params
  // which cause YouTube error code 2 for newly-uploaded Shorts.
  useEffect(() => {
    if (!activated || !isShort) return;
    const handleShortEnd = (event) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onStateChange' && data?.info === 0) {
          // Video ended — replay it (mimics native Short loop behavior)
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
              '*'
            );
          }, 300);
        }
      } catch {}
    };
    window.addEventListener('message', handleShortEnd);
    return () => window.removeEventListener('message', handleShortEnd);
  }, [activated, isShort]);

  // Reset embed error when URL changes
  useEffect(() => {
    setEmbedError(false);
  }, [youtubeMusicUrl, youtubeUrl]);

  useEffect(() => {
    setActivated(false);
    setIsMuted(startMuted);
  }, [youtubeMusicUrl, youtubeUrl, preferWatchUrl]);
  const portraitFrameAspect = isShort ? '9/16' : '16/9';
  const shouldAutoplay = useFacade && activated && autoplayOnActivate;
  const autoplay = shouldAutoplay ? '&autoplay=1' : '';
  const muted = startMuted ? '&mute=1' : '';
  const base = 'https://www.youtube-nocookie.com/embed';
  // Shorts loop natively — adding loop=1&playlist= causes YouTube error code 2 for newly-uploaded Shorts
  const loopParams = info?.type === 'video' && !isShort ? `&loop=1&playlist=${info.id}` : '';
  const embedSrc = info
    ? info.type === 'video'
      ? `${base}/${info.id}?rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1${loopParams}${autoplay}${muted}`
      : `${base}/videoseries?list=${info.id}&rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1${autoplay}${muted}`
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

  const sendCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  };

  const mute = () => {
    sendCommand('mute');
    setIsMuted(true);
  };

  const unmute = () => {
    sendCommand('unMute');
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
      return;
    }
    mute();
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

  useEffect(() => {
    if (!activated) return;
    if (isMuted) {
      const timer = setTimeout(() => mute(), 150);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => unmute(), 150);
    return () => clearTimeout(timer);
  }, [activated, isMuted]);

  useEffect(() => {
    onActivatedChange?.(activated);
  }, [activated, onActivatedChange]);

  useEffect(() => {
    onMuteChange?.(isMuted);
  }, [isMuted, onMuteChange]);

  useEffect(() => {
    if (!playerStateRef) return;
    playerStateRef.current = {
      activated,
      isMuted,
      play: () => sendCommand('playVideo'),
      pause: () => sendCommand('pauseVideo'),
      stop: () => sendCommand('stopVideo'),
      mute,
      unmute,
      toggleMute,
    };
    return () => {
      if (playerStateRef) {
        playerStateRef.current = null;
      }
    };
  }, [activated, isMuted, playerStateRef]);

  if (!info) {
    const externalUrl = watchUrl || musicUrl;
    return (
      <div className={`w-full rounded-lg overflow-hidden shadow-lg flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-800 to-gray-900 ${isShort ? '' : 'aspect-video'}`}>
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-red-500" fill="currentColor">
          <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
        </svg>
        <p className="text-white text-sm font-medium px-4 text-center">Vídeo não disponível</p>
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
            </svg>
            Ouvir no YouTube
          </a>
        )}
      </div>
    );
  }

  // Embed error detected via YouTube IFrame API postMessage
  if (embedError) {
    const externalUrl = watchUrl || musicUrl;
    return (
      <div className={`w-full rounded-lg overflow-hidden shadow-lg flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-800 to-gray-900 ${isShort ? 'h-full' : 'aspect-video'}`}>
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-red-500/60" fill="currentColor">
          <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
        </svg>
        <p className="text-white/70 text-sm px-4 text-center">Vídeo não disponível para incorporação</p>
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
            </svg>
            Ouvir no YouTube
          </a>
        )}
      </div>
    );
  }

  if (!useFacade || activated) {
    if (isShort || portraitMode) {
      return (
        <div className="flex h-full w-full justify-center">
          {portraitMode && !isShort
            ? renderPortraitFrame(
                <iframe
                  ref={iframeRef}
                  className="h-full w-full bg-black"
                  src={embedSrc}
                  title={title || 'YouTube Short'}
                  frameBorder="0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading={loading}
                  onLoad={attemptPlay}
                />
              )
            : (
              <div
                className="relative h-full w-full overflow-hidden rounded-lg bg-black shadow-lg"
                style={{ width: '100%', maxWidth: `${shortMaxWidth}px`, aspectRatio: '9/16', maxHeight: '100%' }}
              >
                <iframe
                  ref={iframeRef}
                  className="absolute left-0 top-0 h-full w-full bg-black"
                  src={embedSrc}
                  title={title || 'YouTube Short'}
                  frameBorder="0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading={loading}
                  onLoad={attemptPlay}
                />
              </div>
            )}
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
          loading={loading}
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

  const renderPortraitFrame = (content, { showPlayBadge = false } = {}) => (
    <div
      className="group relative h-full w-full overflow-hidden rounded-lg bg-black shadow-2xl"
      style={{
        maxWidth: `${shortMaxWidth}px`,
        aspectRatio: '9/16',
        maxHeight: '100%',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div
          className="relative w-full overflow-hidden rounded-[28px] bg-black"
          style={{
            aspectRatio: portraitFrameAspect,
            maxHeight: '100%',
          }}
        >
          {content}
        </div>
      </div>

      {showPlayBadge ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
          <div className="rounded-full border border-white/10 bg-black/44 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl">
            Toque para ouvir
          </div>
        </div>
      ) : null}
    </div>
  );

  if (isShort) {
    return (
      <div
        className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl cursor-pointer group"
        style={{
          maxWidth: `${shortMaxWidth}px`,
          aspectRatio: '9/16',
          maxHeight: '100%',
        }}
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
            decoding="async"
            width="720"
            height="1280"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          {playButtonStyle === 'minimal' ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/28 backdrop-blur-sm shadow-lg transition-all duration-200 group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white ml-0.5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white ml-1" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (portraitMode) {
    return (
      <div
        className="h-full w-full cursor-pointer"
        onClick={activateVideo}
        onKeyDown={handleKeyActivate}
        role="button"
        tabIndex={0}
        aria-label={`Reproduzir ${title || 'video'}`}
      >
        {renderPortraitFrame(
          thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title || 'YouTube'}
              className="h-full w-full object-contain"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width="720"
              height="1280"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900" />
          ),
          { showPlayBadge: true }
        )}
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
          decoding="async"
          width="1280"
          height="720"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white ml-1" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
