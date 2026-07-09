import { useEffect, useRef, useState } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Play, Mic, Loader2 } from 'lucide-react';
import { useYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';
import { extractYouTubeId } from '@/lib/utils';
import FocusableButton from './components/FocusableButton';
import TvSidebar from './components/TvSidebar';
import TvTopBar from './components/TvTopBar';

/**
 * Fiche chanson TV — même chrome que l'accueil (sidebar + recherche). La cover est un
 * VRAI lecteur : OK démarre la lecture YouTube DANS la carte (mêmes dimensions). Les
 * seuls focusables sont la carte vidéo (focus cyan) et « Cantar (Karaokê) » (jaune).
 *
 * Pendant la lecture : la nav spatiale est en pause (OK = play/pause, ←/→ = ±10 s) et
 * le bouton Retour coupe la vidéo et revient à l'état idle (sans quitter la fiche) —
 * géré via backInterceptorRef fourni par TvApp.
 */
export default function TvSongDetail({
  song, thumb, categoryLabel, hasKaraoke, onKaraoke, onHome, onSearch, onExitTv, backInterceptorRef,
}) {
  const { ref, focusKey } = useFocusable({ trackChildren: true, saveLastFocusedChild: true });
  const [playing, setPlaying] = useState(false);
  // « Assistir » = la VIDÉO = youtube_music_url (le Short). youtube_url = musique karaoké.
  const videoId = extractYouTubeId(song?.youtube_music_url) || extractYouTubeId(song?.youtube_url);

  const { ref: artRef, focused: artFocused, focusSelf: focusArt } = useFocusable({
    onEnterPress: () => { if (videoId) setPlaying(true); },
  });

  const short = (song?.subtitle || '').replace(/\s+/g, ' ').trim();
  const context = (song?.description || '').replace(/\s+/g, ' ').trim();

  // Focus initial : Cantar si dispo, sinon la carte vidéo.
  useEffect(() => { if (!hasKaraoke) focusArt(); }, [hasKaraoke, focusArt]);

  // ── Lecteur YouTube inline (monté seulement pendant la lecture) ──
  const { YT, ready, error } = useYouTubeIframeApi();
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    if (!playing || !ready || !YT || !videoId || !hostRef.current) return undefined;
    let destroyed = false;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const player = new YT.Player(hostRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 1, autoplay: 1, ...(origin ? { origin } : {}) },
      events: {
        onReady: () => { if (!destroyed) { setPlayerReady(true); try { player.playVideo(); } catch { /* ignore */ } } },
      },
    });
    playerRef.current = player;
    return () => {
      destroyed = true;
      try { player.destroy(); } catch { /* ignore */ } // coupe l'audio avant démontage
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [playing, ready, YT, videoId]);

  // Pendant la lecture : nav spatiale en pause + contrôles clavier OK / ±10 s.
  useEffect(() => {
    if (!playing) return undefined;
    SpatialNavigation.pause();
    const onKey = (e) => {
      const p = playerRef.current;
      if (!p) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        try { (p.getPlayerState?.() === 1 ? p.pauseVideo() : p.playVideo()); } catch { /* ignore */ }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        try { p.seekTo(Math.max(0, (p.getCurrentTime?.() || 0) - 10), true); } catch { /* ignore */ }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        try { p.seekTo((p.getCurrentTime?.() || 0) + 10, true); } catch { /* ignore */ }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); SpatialNavigation.resume(); };
  }, [playing]);

  // Intercepteur de Back (fourni par TvApp) : en lecture, Back coupe la vidéo et
  // revient à l'idle (consomme le Back) ; sinon laisse TvApp gérer le retour.
  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (playing) {
        setPlaying(false);
        setTimeout(() => { try { focusArt(); } catch { /* ignore */ } }, 0);
        return true;
      }
      return false;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [playing, backInterceptorRef, focusArt]);

  return (
    <div className="tv-detail-screen">
      <TvSidebar focusKey="SIDEBAR_DETAIL" onHome={onHome} onSearch={onSearch} onCatalog={onSearch} onSettings={onExitTv} />

      <div className="tv-detail-main">
        <TvTopBar focusKey="SEARCH_DETAIL" onSearch={onSearch} />

        <FocusContext.Provider value={focusKey}>
          <div ref={ref} className="tv-detail">
            <div className="tv-detail-left">
              {playing ? (
                <div className="tv-detail-art is-playing">
                  <div ref={hostRef} className="tv-detail-player" />
                  {(!ready || !playerReady) && !error && (
                    <span className="tv-detail-loading"><Loader2 size={40} className="tv-spin" /></span>
                  )}
                </div>
              ) : (
                <button
                  ref={artRef}
                  type="button"
                  onClick={() => { if (videoId) setPlaying(true); }}
                  aria-label="Assistir ao vídeo"
                  className={`tv-detail-art ${artFocused ? 'is-focused' : ''}`}
                >
                  {thumb ? <img src={thumb} alt="" /> : <div className="tv-card-thumb-fallback" aria-hidden="true" />}
                  {videoId && <span className="tv-detail-play"><Play size={44} className="tv-btn-play" /></span>}
                  <span className="tv-detail-progress"><span /></span>
                </button>
              )}
            </div>

            <div className="tv-detail-info">
              {categoryLabel && <span className="tv-detail-cat">{categoryLabel}</span>}
              <h1 className="tv-detail-title">{song?.title}</h1>
              {short && <p className="tv-detail-summary">{short}</p>}

              {context && (
                <>
                  <h2 className="tv-detail-context-h">Contexto</h2>
                  <p className="tv-detail-context">{context.slice(0, 420)}{context.length > 420 ? '…' : ''}</p>
                </>
              )}

              {hasKaraoke ? (
                <FocusableButton onPress={onKaraoke} autoFocus className="tv-btn tv-btn-karaoke tv-btn-lg" ariaLabel="Cantar no karaokê">
                  <Mic size={26} /> Cantar (Karaokê)
                </FocusableButton>
              ) : (
                <p className="tv-detail-hint">🎤 Letras sincronizadas em breve</p>
              )}
            </div>
          </div>
        </FocusContext.Provider>
      </div>
    </div>
  );
}
