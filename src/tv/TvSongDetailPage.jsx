import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Lightbulb, Calendar, Music, Quote, ChevronRight } from 'lucide-react';
import { useYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';
import { extractYouTubeId } from '@/lib/utils';
import { useTvArtworkManifest, getTvCardArtwork } from './tvArtwork';
import { toTvSong } from './lib/tvSongRepository';
import { trackTv } from './lib/tvAnalytics';
import TvTopNavigation from './components/TvTopNavigation';
import TvSongVisualPanel from './components/TvSongVisualPanel';
import TvSongMetadataRow from './components/TvSongMetadataRow';
import TvWhySingDetailPanel from './components/TvWhySingDetailPanel';
import TvSongActions from './components/TvSongActions';
import TvModeSelectionOverlay from './components/TvModeSelectionOverlay';
import TvFullLyricsOverlay from './components/TvFullLyricsOverlay';
import TvContextOverlay from './components/TvContextOverlay';
import TvToast from './components/TvToast';
import TvBottomInteractionBar from './components/TvBottomInteractionBar';
import FocusableButton from './components/FocusableButton';
import '@/styles/tv-song-detail.css';

// Codes d'erreur runtime du player YouTube (embedding désactivé, retirée…).
const YT_BLOCKED_CODES = new Set([2, 5, 100, 101, 150]);

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const ACTIVE_BY_SOURCE = { home: 'inicio', catalog: 'catalogo', karaoke: 'karaoke', festa: 'festa' };

/**
 * Fiche chanson TV « song-first » — l'écran de DÉCISION. Conheça a música. Entenda a
 * história. Cante do seu jeito. Composition 3 colonnes (affiche+teaser / identité+
 * métadonnées+conceito+contexto+prévia da letra / « Por que cantar? ») + rangée
 * d'actions pleine largeur (Cantar agora prioritaire) + barre d'interaction. Le clip
 * n'est qu'un teaser secondaire, jamais une action primaire. AUCUN autoplay.
 *
 * Le cycle de vie du lecteur YouTube (teaser) est géré ICI (séparation
 * présentation/lecture) et monté seulement à la demande. Textes conceito/contexto/
 * letra non focusables ; seules leurs actions le sont.
 */
export default function TvSongDetailPage({
  song, source = 'catalog', getThumb,
  festaPeople = null, queue = [],
  onStartKaraoke, onAddToQueue,
  onGoHome, onOpenCatalog, onOpenKaraoke, onOpenFesta, onOpenSettings, onConnectPhone,
  backInterceptorRef,
}) {
  const manifest = useTvArtworkManifest();
  const vm = useMemo(() => toTvSong(song), [song]);
  const festaActive = typeof festaPeople === 'number';

  useEffect(() => {
    trackTv('tv_song_detail_opened', { song_id: vm.id, source });
    if (!vm.isSingable) trackTv('tv_song_media_unavailable', { song_id: vm.id, source });
  }, [vm.id, vm.isSingable, source]);

  const posterSrc = getTvCardArtwork(song, manifest, getThumb(song) || song?.cover_image);
  const teaserThumb = getThumb(song) || song?.cover_image || '';
  const videoId = extractYouTubeId(vm.videoTeaserUrl);
  const hasTeaser = Boolean(videoId);
  const hasContext = Boolean((song?.description || '').replace(/<[^>]*>/g, '').trim());
  const durationLabel = formatDuration(vm.videoTeaserDuration);

  // ── Overlays + toast + lecture teaser ──────────────────────────────────────
  const [overlay, setOverlay] = useState(null); // 'mode' | 'lyrics' | 'context' | 'queue'
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState({ message: '', nonce: 0 });
  const restoreFocusRef = useRef('DETAIL_CANTAR');

  // Modes pertinents : Solo toujours ; Dueto si compatible ; Festa si session active.
  const relevantModes = useMemo(() => {
    const m = ['solo'];
    if (vm.recommendedModes.includes('duet')) m.push('duet');
    if (festaActive) m.push('festa');
    return m;
  }, [vm.recommendedModes, festaActive]);

  const addToQueue = useCallback(() => {
    const res = onAddToQueue?.(vm) || { added: false, position: 0 };
    trackTv(res.added ? 'tv_song_added_to_queue' : 'tv_song_queue_already_contains', { song_id: vm.id, source });
    setToast({
      message: res.added ? `Adicionada à fila · posição ${res.position}` : `Já está na fila · posição ${res.position}`,
      nonce: Date.now(),
    });
  }, [onAddToQueue, vm, source]);

  const startMode = useCallback((mode) => {
    trackTv('tv_song_mode_selected', { mode, song_id: vm.id, source });
    setOverlay(null);
    if (mode === 'solo') onStartKaraoke(song, null);
    else if (mode === 'duet') onStartKaraoke(song, { dueto: true });
    else addToQueue(); // festa → adiciona à sessão
  }, [vm.id, source, onStartKaraoke, song, addToQueue]);

  const onCantar = useCallback(() => {
    trackTv('tv_song_started', { song_id: vm.id, source });
    if (relevantModes.length === 1) { onStartKaraoke(song, null); return; }
    restoreFocusRef.current = 'DETAIL_CANTAR';
    setOverlay('mode');
  }, [vm.id, source, relevantModes, onStartKaraoke, song]);

  const openContext = useCallback(() => {
    trackTv('tv_song_context_opened', { song_id: vm.id });
    restoreFocusRef.current = 'DETAIL_CONTEXT';
    setOverlay('context');
  }, [vm.id]);
  const openLyrics = useCallback(() => {
    trackTv('tv_song_lyrics_opened', { song_id: vm.id });
    restoreFocusRef.current = 'DETAIL_LYRICS';
    setOverlay('lyrics');
  }, [vm.id]);
  const closeOverlay = useCallback(() => {
    setOverlay(null);
    setTimeout(() => { try { SpatialNavigation.setFocus(restoreFocusRef.current); } catch { /* ignore */ } }, 0);
  }, []);

  const startTeaser = useCallback((opener) => {
    trackTv('tv_song_teaser_started', { song_id: vm.id });
    restoreFocusRef.current = opener;
    setBlocked(false);
    setPlaying(true);
  }, [vm.id]);
  const stopTeaser = useCallback(() => {
    setPlaying(false);
    setTimeout(() => { try { SpatialNavigation.setFocus(restoreFocusRef.current); } catch { /* ignore */ } }, 0);
  }, []);

  // ── Lecteur YouTube du teaser (monté seulement pendant la lecture) ─────────
  const { YT, ready, error: apiError } = useYouTubeIframeApi();
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const progressRef = useRef(null);
  const wrapRef = useRef(null); // .tvd-visual-player — reçoit `inert` pendant la lecture
  const focusHolderRef = useRef(null); // puits de focus (jamais l'iframe)
  const [playerReady, setPlayerReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Garde le focus HORS de l'iframe YouTube (sinon D-pad piégé + crash Back sur TV).
  const parkFocus = useCallback(() => {
    try { playerRef.current?.getIframe?.()?.blur?.(); } catch { /* ignore */ }
    try { focusHolderRef.current?.focus?.({ preventScroll: true }); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!playing || !ready || !YT || !videoId || !hostRef.current) return undefined;
    let destroyed = false;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const player = new YT.Player(hostRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        rel: 0, modestbranding: 1, playsinline: 1, controls: 0, autoplay: 1,
        disablekb: 1, fs: 0, iv_load_policy: 3, ...(origin ? { origin } : {}),
      },
      events: {
        onReady: () => {
          if (destroyed) return;
          setPlayerReady(true);
          try { player.playVideo(); } catch { /* ignore */ }
          // Rend l'iframe non-focusable et déplace le focus hors d'elle : c'est ce
          // qui empêche le D-pad de rester « coincé dans YouTube » et le Retour
          // matériel de faire planter la WebView (bug TV 2026-07-14).
          try { player.getIframe?.()?.setAttribute('tabindex', '-1'); } catch { /* ignore */ }
          try { wrapRef.current?.setAttribute('inert', ''); } catch { /* ignore */ }
          parkFocus();
        },
        onError: (e) => { if (!destroyed && YT_BLOCKED_CODES.has(e?.data)) setBlocked(true); },
      },
    });
    playerRef.current = player;
    try { player.getIframe?.()?.setAttribute('tabindex', '-1'); } catch { /* ignore */ }
    return () => {
      destroyed = true;
      // Sortir le focus de l'iframe AVANT de la détruire (destroy pendant que
      // l'iframe est focalisée = source du crash natif observé au Retour). Le focus
      // final est reposé par stopTeaser (SpatialNavigation.setFocus), pas ici.
      try { player.getIframe?.()?.blur?.(); } catch { /* ignore */ }
      try { player.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [playing, ready, YT, videoId, parkFocus]);

  useEffect(() => {
    if (!playing || !playerReady) return undefined;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || !progressRef.current) return;
      try {
        const d = p.getDuration?.() || 0;
        const t = p.getCurrentTime?.() || 0;
        progressRef.current.style.width = d > 0 ? `${Math.min(100, (t / d) * 100)}%` : '0%';
      } catch { /* ignore */ }
    }, 250);
    return () => clearInterval(id);
  }, [playing, playerReady]);

  // Pendant la lecture : nav spatiale en pause + OK/±10s au clavier (comme ailleurs).
  // Escape/Backspace = fermeture (fallback si le Retour matériel n'arrive pas jusqu'à
  // l'intercepteur). Chaque touche re-parque le focus hors de l'iframe (anti-dérive).
  useEffect(() => {
    if (!playing) return undefined;
    SpatialNavigation.pause();
    const CLOSE_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack']);
    const onKey = (e) => {
      if (CLOSE_KEYS.has(e.key) || e.keyCode === 10009 /* Tizen */ || e.keyCode === 461 /* webOS */) {
        e.preventDefault();
        stopTeaser();
        return;
      }
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
      // Après toute touche, garantir que le focus n'a pas glissé dans l'iframe.
      parkFocus();
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); SpatialNavigation.resume(); };
  }, [playing, stopTeaser, parkFocus]);

  // ── Focus initial : CANTAR AGORA (ou Adicionar à fila si non chantable) ────
  useEffect(() => {
    const target = vm.isSingable ? 'DETAIL_CANTAR' : 'DETAIL_FILA';
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, [vm.isSingable]);

  // ── Back : teaser → stop ; overlay → close ; sinon → TvApp pop (retour carte) ─
  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (playing) { stopTeaser(); return true; }
      if (overlay) { closeOverlay(); return true; }
      return false;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, playing, overlay, stopTeaser, closeOverlay]);

  const queueCount = queue.length;

  return (
    <div className="tvd-page">
      <TvTopNavigation
        active={ACTIVE_BY_SOURCE[source] || 'catalogo'}
        onInicio={onGoHome}
        onCatalogo={onOpenCatalog}
        onKaraoke={onOpenKaraoke}
        onFesta={onOpenFesta}
        onOpenSettings={onOpenSettings}
        festaQueueCount={queueCount > 0 ? queueCount : null}
      />

      <div className="tvd-body">
        <TvSongVisualPanel
          artSrc={posterSrc}
          teaserThumb={teaserThumb}
          durationLabel={durationLabel}
          hasTeaser={hasTeaser}
          playing={playing}
          loading={playing && (!ready || !playerReady) && !apiError && !blocked}
          error={Boolean(apiError) || blocked}
          hostRef={hostRef}
          progressRef={progressRef}
          wrapRef={wrapRef}
          focusHolderRef={focusHolderRef}
          onStopTeaser={stopTeaser}
          onPlayTeaser={() => startTeaser('DETAIL_TEASER')}
        />

        <div className="tvd-main">
          <div className="tvd-identity">
            <span className="tvd-type">{vm.songType}</span>
            <h1 className="tvd-title">{vm.title}</h1>
            {vm.shortPitch && <p className="tvd-pitch">{vm.shortPitch}</p>}
          </div>

          <TvSongMetadataRow vm={vm} />

          <div className="tvd-editorial">
            <div className="tvd-edit-block">
              <h3 className="tvd-edit-h"><Lightbulb size={18} /> Conceito</h3>
              <p className="tvd-edit-text">{vm.concept}</p>
            </div>
            <div className="tvd-edit-block">
              <h3 className="tvd-edit-h tvd-edit-h-context"><Calendar size={18} /> Contexto</h3>
              <p className="tvd-edit-text">{vm.context}</p>
            </div>
          </div>

          <div className="tvd-lyric">
            <div className="tvd-lyric-head">
              <h3 className="tvd-lyric-h"><Music size={18} /> Prévia da letra</h3>
              {vm.hasFullLyrics && (
                <FocusableButton
                  focusKey="DETAIL_LYRICS"
                  className="tvd-lyric-btn"
                  ariaLabel="Ver letra completa"
                  onPress={openLyrics}
                >
                  Ver letra completa <ChevronRight size={16} />
                </FocusableButton>
              )}
            </div>
            <div className="tvd-lyric-quote">
              <Quote size={22} className="tvd-lyric-qmark" aria-hidden="true" />
              <div className="tvd-lyric-lines">
                {vm.lyricPreviewLines.map((line, i) => (
                  <span key={i} className="tvd-lyric-line">{line}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <TvWhySingDetailPanel vm={vm} />
      </div>

      <TvSongActions
        hasContext={hasContext}
        hasTeaser={hasTeaser}
        canSing={vm.isSingable}
        onCantar={onCantar}
        onContext={openContext}
        onTeaser={() => startTeaser('DETAIL_CLIPE')}
      />

      {!vm.isSingable && (
        <p className="tvd-unavailable">Karaokê temporariamente indisponível — o contexto e a letra continuam disponíveis.</p>
      )}

      <TvBottomInteractionBar onConnectPhone={onConnectPhone} />

      <TvToast message={toast.message} nonce={toast.nonce} onDone={() => setToast({ message: '', nonce: 0 })} />

      {overlay === 'mode' && (
        <TvModeSelectionOverlay modes={relevantModes} onSelect={startMode} onClose={closeOverlay} />
      )}
      {overlay === 'context' && (
        <TvContextOverlay title={vm.title} text={(song?.description || '').replace(/\s+/g, ' ').trim()} onClose={closeOverlay} />
      )}
      {overlay === 'lyrics' && (
        <TvFullLyricsOverlay title={vm.title} lyrics={song?.lyrics || ''} onClose={closeOverlay} />
      )}
    </div>
  );
}
