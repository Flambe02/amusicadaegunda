import { useCallback, useEffect, useRef, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { BookOpen, ChevronRight, Mic, Play } from 'lucide-react';
import { useYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';
import { extractYouTubeId } from '@/lib/utils';
import { loadKaraokeOptions, saveKaraokeOptions } from '@/lib/karaokeOptions';
import TvHomeNavigation from './components/TvHomeNavigation';
import TvSettingsPanel from './components/TvSettingsPanel';
import FocusableButton from './components/FocusableButton';
import TvPhoneFrame from './components/TvPhoneFrame';
import TvContextOverlay from './components/TvContextOverlay';

const RESUMO_MAX_CHARS = 130;

// Codes d'erreur du player YouTube (IFrame API) qui signifient « impossible à
// intégrer/jouer ici » (embedding désactivé par le propriétaire, vidéo retirée…) —
// distingués d'un simple souci réseau pour afficher un message honnête.
const YT_BLOCKED_CODES = new Set([2, 5, 100, 101, 150]);

function firstSentence(text) {
  const m = text.match(/^.*?[.!?](?:\s|$)/);
  return m ? m[0].trim() : text;
}

// Résumé toujours affiché en entier (jamais tronqué avec "…" au milieu d'une pensée) :
// `subtitle` si présent, sinon la première phrase de `description`, plafonné à
// ~130 caractères (seul cas où un "…" apparaît, en fin de texte).
function buildResumo(song) {
  const clean = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const subtitle = clean(song?.subtitle);
  const description = clean(song?.description);
  const text = subtitle || (description ? firstSentence(description) : '');
  if (!text) return '';
  return text.length > RESUMO_MAX_CHARS ? `${text.slice(0, RESUMO_MAX_CHARS - 1).trimEnd()}…` : text;
}

/**
 * Fiche chanson TV — cadre téléphone (vidéo 9:16 assumée) + même barre de navigation
 * que l'accueil (TvHomeNavigation/TvSettingsPanel, réutilisées telles quelles pour une
 * expérience cohérente — plus d'avatar mort). Deux actions principales stylées comme
 * le hero de l'accueil (« Cantar agora » / « Assistir ao clipe »), plus un accès
 * discret au paragraphe complet via un overlay dédié (jamais affiché tronqué).
 *
 * Le cadre téléphone est purement visuel : le focus reste sur les boutons de droite,
 * jamais sur la miniature elle-même. Un seul call-to-action pour lancer la vidéo (le
 * bouton « Assistir ao clipe ») — pas d'icône play redondante sur la miniature.
 */
export default function TvSongDetail({
  song, thumb, categoryLabel, hasKaraoke, onKaraoke,
  onGoHome, onOpenKaraokeGrid, onOpenClipsGrid, onOpenCatalog, onExitApp,
  backInterceptorRef,
}) {
  const [playing, setPlaying] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  // « Assistir » = la VIDÉO = youtube_music_url (le Short). youtube_url = musique karaoké.
  const videoId = extractYouTubeId(song?.youtube_music_url) || extractYouTubeId(song?.youtube_url);
  const resumo = buildResumo(song);
  const context = (song?.description || '').replace(/\s+/g, ' ').trim();
  const hasActions = hasKaraoke || Boolean(videoId);

  // ── Lecteur YouTube inline (monté seulement pendant la lecture) — logique de
  // contrôle INCHANGÉE, seul le conteneur visuel (TvPhoneFrame) change. ──
  const { YT, ready, error: apiError } = useYouTubeIframeApi();
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const progressRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  // Erreur RUNTIME du player (ex. embedding désactivé) — distincte de l'échec de
  // chargement de l'API elle-même. Sans ceci, une vidéo bloquée laissait le spinner
  // de chargement tourner indéfiniment (onReady n'est jamais appelé dans ce cas).
  const [blocked, setBlocked] = useState(false);

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
        onError: (e) => {
          if (destroyed) return;
          if (YT_BLOCKED_CODES.has(e?.data)) setBlocked(true);
        },
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

  // Barre de progression du cadre téléphone : mutation DOM directe (pas de re-render),
  // même pattern que la barre TV du karaoké.
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

  // Pendant la lecture : nav spatiale en pause + contrôles clavier OK / ±10 s (INCHANGÉ).
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

  const startWatching = useCallback(() => {
    setBlocked(false); // chaque nouvel essai repart propre
    setPlaying(true);
  }, []);

  // Focus initial : Cantar agora → Assistir ao clipe → Ver explicação completa → rien.
  useEffect(() => {
    let target = null;
    if (hasKaraoke) target = 'SONGDETAIL_KARAOKE';
    else if (videoId) target = 'SONGDETAIL_WATCH';
    else if (context) target = 'SONGDETAIL_CONTEXT';
    if (!target) return undefined;
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeContext = useCallback(() => {
    setContextOpen(false);
    setTimeout(() => { try { SpatialNavigation.setFocus('SONGDETAIL_CONTEXT'); } catch { /* ignore */ } }, 0);
  }, []);

  // ── Barre de navigation + panneau de réglages (même composants que l'accueil,
  // même logique d'ouverture/fermeture — cf. TvHome.jsx) ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [karaokeOpts, setKaraokeOpts] = useState(loadKaraokeOptions);
  useEffect(() => { saveKaraokeOptions(karaokeOpts); }, [karaokeOpts]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setTimeout(() => { try { SpatialNavigation.setFocus('HOME_SETTINGS'); } catch { /* ignore */ } }, 0);
  }, []);

  // Intercepteur de Back (fourni par TvApp), priorité : réglages ouverts → les fermer ;
  // sinon overlay de contexte ouvert → le fermer ; sinon en lecture → couper la vidéo
  // et revenir au bouton Assistir ; sinon laisser TvApp gérer le retour à l'écran précédent.
  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (settingsOpen) { closeSettings(); return true; }
      if (contextOpen) { closeContext(); return true; }
      if (playing) {
        setPlaying(false);
        setTimeout(() => { try { SpatialNavigation.setFocus('SONGDETAIL_WATCH'); } catch { /* ignore */ } }, 0);
        return true;
      }
      return false;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [settingsOpen, closeSettings, contextOpen, playing, backInterceptorRef, closeContext]);

  if (!song) {
    return (
      <div className="tv-songdetail-error">
        <p>Música não encontrada.</p>
        <p className="tv-songdetail-error-hint">Pressiona Voltar na telecomando.</p>
      </div>
    );
  }

  return (
    <div className="tv-songdetail-screen">
      <TvHomeNavigation
        onStart={onGoHome}
        onKaraoke={onOpenKaraokeGrid}
        onClips={onOpenClipsGrid}
        onAll={onOpenCatalog}
        onOpenSettings={openSettings}
      />

      <div className="tv-songdetail-layout">
        <div className="tv-songdetail-left">
          {videoId && (
            <TvPhoneFrame
              thumb={thumb}
              playing={playing}
              loading={playing && (!ready || !playerReady) && !apiError && !blocked}
              error={Boolean(apiError) || blocked}
              hostRef={hostRef}
              progressRef={progressRef}
            />
          )}
        </div>

        <div className="tv-songdetail-right">
          {categoryLabel && <span className="tv-songdetail-cat">{categoryLabel}</span>}
          <h1 className="tv-songdetail-title">{song.title}</h1>
          {resumo && <p className="tv-songdetail-resumo">{resumo}</p>}

          {hasActions && (
            <div className="tv-songdetail-actions">
              {hasKaraoke && (
                <FocusableButton
                  focusKey="SONGDETAIL_KARAOKE"
                  onPress={onKaraoke}
                  className="tv2-btn tv2-btn-karaoke"
                  ariaLabel={`Cantar ${song.title} no karaokê`}
                >
                  <Mic size={24} /> Cantar agora
                </FocusableButton>
              )}
              {videoId && (
                <FocusableButton
                  focusKey="SONGDETAIL_WATCH"
                  onPress={startWatching}
                  className="tv2-btn tv2-btn-watch"
                  ariaLabel={`Assistir ao clipe de ${song.title}`}
                >
                  <Play size={24} className="tv2-btn-icon-fill" /> Assistir ao clipe
                </FocusableButton>
              )}
            </div>
          )}

          {context && (
            <FocusableButton
              focusKey="SONGDETAIL_CONTEXT"
              onPress={() => setContextOpen(true)}
              className="tv-context-trigger"
              ariaLabel={`Ver explicação completa de ${song.title}`}
            >
              <BookOpen size={16} /> Ver explicação completa <ChevronRight size={16} />
            </FocusableButton>
          )}
        </div>
      </div>

      {contextOpen && (
        <TvContextOverlay title={song.title} text={context} onClose={closeContext} />
      )}

      {settingsOpen && (
        <TvSettingsPanel opts={karaokeOpts} setOpts={setKaraokeOpts} onExitApp={onExitApp} />
      )}
    </div>
  );
}
