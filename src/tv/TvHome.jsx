import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { extractYouTubeId } from '@/lib/utils';
import { loadKaraokeOptions, saveKaraokeOptions } from '@/lib/karaokeOptions';
import { useTvArtworkManifest, getTvHeroArtwork, getTvCardArtwork } from './tvArtwork';
import TvHomeNavigation from './components/TvHomeNavigation';
import TvHero from './components/TvHero';
import TvMediaRail from './components/TvMediaRail';
import TvSettingsPanel from './components/TvSettingsPanel';
import { MONTHS_PT } from './tvMonths';

// Nombre minimum de chansons karaokê en dessous duquel on ajoute une carte
// « Ver todos os karaokês » pour ne pas laisser la rangée avoir l'air inachevée.
const KARAOKE_ACTION_CARD_THRESHOLD = 3;

// Métadonnée discrète (mois/année) affichée sous le titre des cartes « Últimos
// clipes » — même vocabulaire que le badge du hero, jamais combinée à la catégorie
// (cf. cahier des charges : une seule information secondaire par carte).
function clipMeta(song) {
  const d = song?.release_date ? new Date(song.release_date) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

// Debounce du focus rail → hero (évite de charger un hero par carte traversée) et
// timeout de secours si l'image tarde/échoue à décoder (cf. cahier des charges).
const HERO_DEBOUNCE_MS = 230;
const HERO_DECODE_TIMEOUT_MS = 900;

function hasPlayableVideo(song) {
  return Boolean(extractYouTubeId(song?.youtube_music_url) || extractYouTubeId(song?.youtube_url));
}

function pickInitialFeatured(latestSongs, karaokeSongs, songs) {
  return latestSongs[0] || karaokeSongs[0] || songs[0] || null;
}

/**
 * Accueil TV v2 — nav horizontale + hero immersif (dominant) + 2 rangées
 * (« Para cantar agora » / « Últimos clipes »). Remplace la sidebar/catégories/mois
 * de l'ancienne version ; ceux-ci restent disponibles via Todos → catálogo.
 *
 * Le hero ne se met JAMAIS à jour en direct au focus : chaque carte qui reçoit le
 * focus programme un `featuredSong` candidat (debounce ~230ms) ; si le focus reste
 * dessus, on précharge/décode l'affiche puis on bascule le hero d'un coup (jamais
 * de texte d'une chanson avec l'image d'une autre). Le focus initial est posé une
 * seule fois au montage — un changement de hero ne déplace JAMAIS le focus.
 */
export default function TvHome({
  songs, getThumb,
  getCat, // eslint-disable-line no-unused-vars -- conservé pour compat de props (catégories affichées seulement dans le catálogo/grid)
  getHasKaraoke, onSelectSong, onOpenKaraoke, onOpenGrid,
  onOpenKaraokeLanding, onOpenClipsLanding, onOpenFestaGrid,
  onExitTv, onExitApp, backInterceptorRef,
}) {
  const manifest = useTvArtworkManifest();
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;

  const { latestSongsRail, karaokeSongsAll, karaokeSongsRail, lastClipsRail } = useMemo(() => {
    const karaokeAll = songs.filter(getHasKaraoke);
    const videoAll = songs.filter(hasPlayableVideo);
    const latest = songs.slice(0, 12);
    return {
      latestSongsRail: latest,
      karaokeSongsAll: karaokeAll,
      karaokeSongsRail: karaokeAll.slice(0, 12),
      lastClipsRail: latest.length ? latest : videoAll.slice(0, 12),
    };
  }, [songs, getHasKaraoke]);

  // Chanson initiale : figée à la 1ère liste utile disponible (jamais recalculée).
  const initialFeaturedRef = useRef(undefined);
  if (initialFeaturedRef.current === undefined) {
    initialFeaturedRef.current = pickInitialFeatured(latestSongsRail, karaokeSongsRail, songs);
  }
  const initialFeatured = initialFeaturedRef.current;

  const [, setPendingFeaturedSong] = useState(initialFeatured);
  const [featuredSong, setFeaturedSong] = useState(initialFeatured);

  const getCardArtwork = useCallback(
    (song) => getTvCardArtwork(song, manifest, getThumb(song) || song?.cover_image),
    [manifest, getThumb],
  );
  const computeHeroSrc = useCallback(
    (song) => (song ? getTvHeroArtwork(song, manifestRef.current, getThumb(song) || song.cover_image) : null),
    [getThumb],
  );
  // `manifest` est lu via manifestRef à l'intérieur de computeHeroSrc (pour ne pas
  // recréer ce callback à chaque résolution du manifeste) — il doit néanmoins rester
  // dans les deps ici pour forcer le recalcul dès que le manifeste arrive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const heroSrc = useMemo(() => computeHeroSrc(featuredSong), [featuredSong, computeHeroSrc, manifest]);

  // ── Debounce + préchargement du hero ──────────────────────────────────────
  const debounceRef = useRef(null);
  const preloadTokenRef = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => () => {
    aliveRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const scheduleFeatured = useCallback((song) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const token = (preloadTokenRef.current += 1);
    debounceRef.current = setTimeout(() => {
      if (!aliveRef.current || token !== preloadTokenRef.current) return;
      const src = computeHeroSrc(song);
      if (!src) { setFeaturedSong(song); return; }

      let settled = false;
      let timeoutId = null;
      const commit = () => {
        if (settled || !aliveRef.current || token !== preloadTokenRef.current) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        setFeaturedSong(song);
      };
      timeoutId = setTimeout(commit, HERO_DECODE_TIMEOUT_MS);

      const img = new Image();
      img.onload = () => {
        if (typeof img.decode === 'function') img.decode().then(commit).catch(commit);
        else commit();
      };
      img.onerror = commit;
      img.src = src;
    }, HERO_DEBOUNCE_MS);
  }, [computeHeroSrc]);

  const handleFocusSong = useCallback((song) => {
    setPendingFeaturedSong((prev) => {
      if (prev?.id !== song?.id) scheduleFeatured(song);
      return song;
    });
  }, [scheduleFeatured]);

  // ── Focus initial (une seule fois) ────────────────────────────────────────
  const focusInitialTarget = useCallback(() => {
    let target = 'HOME_NAV_START';
    if (initialFeatured && hasPlayableVideo(initialFeatured)) target = 'HOME_HERO_WATCH';
    else if (initialFeatured && getHasKaraoke(initialFeatured)) target = 'HOME_HERO_KARAOKE';
    else if (karaokeSongsRail.length) target = 'HOME_ROW_KARAOKE';
    else if (lastClipsRail.length) target = 'HOME_ROW_CLIPS';
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => focusInitialTarget(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // « Início » : revient à l'état d'ouverture (jamais un simple no-op si déjà dessus).
  const resetToInitial = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    preloadTokenRef.current += 1;
    setPendingFeaturedSong(initialFeatured);
    setFeaturedSong(initialFeatured);
    focusInitialTarget();
  }, [initialFeatured, focusInitialTarget]);

  const openCatalog = useCallback(() => onOpenGrid('Catálogo', songs), [onOpenGrid, songs]);
  // Teaser court (comme « Para cantar agora ») + carte « Ver todos os clipes » en
  // guise de dernière case, toutes deux entièrement visibles sans défilement —
  // jamais une rangée qui se termine par une carte coupée à mi-chemin par le
  // bord de l'écran.
  const lastClipsRailTrimmed = useMemo(() => lastClipsRail.slice(0, 4), [lastClipsRail]);

  const watchFeatured = useCallback(() => onSelectSong(featuredSong), [onSelectSong, featuredSong]);
  const karaokeFeatured = useCallback(() => onOpenKaraoke(featuredSong), [onOpenKaraoke, featuredSong]);

  // ── Panneau de réglages (avatar) ───────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [karaokeOpts, setKaraokeOpts] = useState(loadKaraokeOptions);
  useEffect(() => { saveKaraokeOptions(karaokeOpts); }, [karaokeOpts]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setTimeout(() => { try { SpatialNavigation.setFocus('HOME_SETTINGS'); } catch { /* ignore */ } }, 0);
  }, []);

  // Back (télécommande) pendant que le panneau est ouvert → le referme seulement
  // (TvApp appelle cet intercepteur avant son propre pop/exit).
  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (settingsOpen) { closeSettings(); return true; }
      return false;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, settingsOpen, closeSettings]);

  const heroHasVideo = hasPlayableVideo(featuredSong);
  const heroHasKaraoke = featuredSong ? getHasKaraoke(featuredSong) : false;

  return (
    <div className="tv2-home">
      <TvHomeNavigation
        active="home"
        onStart={resetToInitial}
        onKaraoke={onOpenKaraokeLanding}
        onFesta={onOpenFestaGrid}
        onClips={onOpenClipsLanding}
        onAll={openCatalog}
        onOpenSettings={openSettings}
      />

      {!songs.length ? (
        <p className="tv2-empty">Nenhuma música disponível.</p>
      ) : (
        <>
          <TvHero
            key={featuredSong?.slug || featuredSong?.id}
            song={featuredSong}
            heroSrc={heroSrc}
            hasVideo={heroHasVideo}
            hasKaraoke={heroHasKaraoke}
            onWatch={watchFeatured}
            onKaraoke={karaokeFeatured}
          />

          <div className="tv2-rails">
            <TvMediaRail
              focusKey="HOME_ROW_KARAOKE"
              title="Para cantar agora"
              songs={karaokeSongsRail}
              getArtwork={getCardArtwork}
              variant="karaoke"
              onSelect={onOpenKaraoke}
              onFocusSong={handleFocusSong}
              trailingAction={
                karaokeSongsAll.length > 0 && karaokeSongsAll.length < KARAOKE_ACTION_CARD_THRESHOLD
                  ? {
                    focusKey: 'HOME_ROW_KARAOKE_ALL',
                    label: 'Ver todos os karaokês',
                    ariaLabel: 'Ver todos os karaokês',
                    icon: LayoutGrid,
                    onPress: onOpenKaraokeLanding,
                  }
                  : null
              }
            />
            <TvMediaRail
              focusKey="HOME_ROW_CLIPS"
              title="Últimos clipes"
              songs={lastClipsRailTrimmed}
              getArtwork={getCardArtwork}
              getMeta={clipMeta}
              variant="default"
              onSelect={onSelectSong}
              onFocusSong={handleFocusSong}
              trailingAction={{
                focusKey: 'HOME_ROW_CLIPS_ALL',
                label: 'Ver todos os clipes',
                ariaLabel: 'Ver todos os clipes',
                icon: LayoutGrid,
                onPress: onOpenClipsLanding,
              }}
            />
          </div>
        </>
      )}

      {settingsOpen && (
        <TvSettingsPanel opts={karaokeOpts} setOpts={setKaraokeOpts} onExitApp={onExitApp || onExitTv} />
      )}
    </div>
  );
}

