import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { useTvArtworkManifest, getTvHeroArtwork, getTvCardArtwork } from './tvArtwork';
import { trackTv } from './lib/tvAnalytics';
import TvTopNavigation from './components/TvTopNavigation';
import TvFeaturedSection from './components/TvFeaturedSection';
import TvSongSelectionRail from './components/TvSongSelectionRail';
import TvSingingModes from './components/TvSingingModes';
import TvBottomInteractionBar from './components/TvBottomInteractionBar';

// Debounce du focus rail → hero (évite de charger un hero par carte traversée) et
// timeout de secours si l'image tarde/échoue à décoder.
const HERO_DEBOUNCE_MS = 230;
const HERO_DECODE_TIMEOUT_MS = 900;
// Seuil de « dwell » avant d'émettre un événement de focus — on ne veut PAS un
// événement par appui D-pad rapide en traversant la rangée, seulement quand
// l'utilisateur s'arrête réellement sur une carte.
const FOCUS_ANALYTICS_DWELL_MS = 600;
// Rangée d'accueil : on n'affiche QUE 4 chansons + une carte « Ver outras músicas »
// (5 emplacements) → tient sans débordement sur une TV 1080p standard, et la carte
// finale mène droit au Catálogo (au lieu d'une rangée qui défile à l'infini).
const RAIL_VISIBLE = 4;
// Bannière « roll out » du hero : cycle automatiquement les 3 dernières chansons
// (3 pastilles). Cadence de rotation ; la rotation se met en pause tant que
// l'utilisateur parcourt la rangée (le hero suit alors la carte focalisée) et
// reprend après ~1 cycle d'inactivité.
const CAROUSEL_MAX = 3;
const CAROUSEL_ROTATE_MS = 6000;

const cardFocusKey = (song) => `HOME_CARD_${song.id}`;

/**
 * Accueil TV « song-first » (v3). Message unique : « Escolha uma música. Conheça a
 * história. Cante. »
 *
 * Structure (calquée sur l'image de référence) : nav (Início | Catálogo | Karaokê |
 * Festa) → zone vedette (bannière roll-out des 3 dernières + panneau « Por que
 * cantar? ») → rangée « Escolha sua próxima música » → modes de chant (Solo/Dueto/
 * Festa) → barre d'interaction persistante. Tout tient dans un viewport 1080p. PAS
 * de section « Descubra pelo seu momento » (retirée pour coller à la référence).
 *
 * Le hero ne change JAMAIS en direct au focus : chaque carte programme un candidat
 * (debounce ~230ms), l'affiche est préchargée/décodée, puis le hero bascule d'un
 * coup — jamais le texte d'une chanson avec l'image d'une autre. Le focus initial
 * (ou restauré au retour d'une fiche) est posé une seule fois au montage ; un
 * changement de hero ne déplace jamais le focus.
 */
export default function TvHomePage({
  songs, getThumb, getHasKaraoke,
  festaQueueCount, initialFocusKey,
  onOpenDetail, onCantar, onChooseMode, onOpenCatalog, onOpenKaraoke, onOpenSettings, onCardFocusKey,
}) {
  const manifest = useTvArtworkManifest();
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;

  useEffect(() => { trackTv('tv_home_opened'); }, []);

  const railSongs = useMemo(() => songs.slice(0, RAIL_VISIBLE), [songs]);
  const railRemaining = Math.max(0, songs.length - RAIL_VISIBLE);
  // Bannière roll-out : les 3 dernières chansons.
  const carouselSongs = useMemo(() => songs.slice(0, CAROUSEL_MAX), [songs]);

  // Chanson en vedette : figée à la plus récente disponible (jamais recalculée).
  const initialFeaturedRef = useRef(undefined);
  if (initialFeaturedRef.current === undefined) {
    initialFeaturedRef.current = railSongs[0] || songs[0] || null;
  }
  const initialFeatured = initialFeaturedRef.current;

  const [, setPendingFeatured] = useState(initialFeatured);
  const [featuredSong, setFeaturedSong] = useState(initialFeatured);

  const dots = useMemo(
    () => (carouselSongs.length > 1 ? carouselSongs.map((s) => ({ id: s.id, active: s.id === featuredSong?.id })) : null),
    [carouselSongs, featuredSong],
  );

  const getCardArtwork = useCallback(
    (song) => getTvCardArtwork(song, manifest, getThumb(song) || song?.cover_image),
    [manifest, getThumb],
  );
  const computeHeroSrc = useCallback(
    (song) => (song ? getTvHeroArtwork(song, manifestRef.current, getThumb(song) || song.cover_image) : null),
    [getThumb],
  );
  // manifest lu via manifestRef dans computeHeroSrc, mais gardé en dep ici pour
  // forcer le recalcul du hero dès que le manifeste arrive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const heroSrc = useMemo(() => computeHeroSrc(featuredSong), [featuredSong, computeHeroSrc, manifest]);

  // ── Debounce + préchargement du hero ──────────────────────────────────────
  const debounceRef = useRef(null);
  const preloadTokenRef = useRef(0);
  const aliveRef = useRef(true);
  // Timer d'analytics séparé du debounce visuel — seuil de dwell plus long, jamais
  // annulé par une simple recomposition du hero.
  const focusDwellRef = useRef(null);
  // aliveRef DOIT être remis à true au (re)montage : le cleanup le passe à false, et
  // sans ré-init le double-invoke StrictMode (dev) le laissait à false → tous les
  // `commit()` de scheduleFeatured étaient bloqués (hero jamais mis à jour : ni la
  // rotation, ni le suivi de la carte focalisée).
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (focusDwellRef.current) clearTimeout(focusDwellRef.current);
    };
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

  // ── Rotation automatique de la bannière (roll out des 3 dernières) ─────────
  // En pause tant que l'utilisateur parcourt la rangée (le hero suit la carte
  // focalisée) : `lastRailInteractionRef` est rafraîchi à chaque focus de carte,
  // et le tick ne tourne que si l'inactivité dépasse une cadence.
  const carouselIdxRef = useRef(0);
  const lastRailInteractionRef = useRef(0);
  useEffect(() => {
    if (carouselSongs.length <= 1) return undefined;
    const id = setInterval(() => {
      if (Date.now() - lastRailInteractionRef.current < CAROUSEL_ROTATE_MS) return;
      carouselIdxRef.current = (carouselIdxRef.current + 1) % carouselSongs.length;
      scheduleFeatured(carouselSongs[carouselIdxRef.current]);
    }, CAROUSEL_ROTATE_MS);
    return () => clearInterval(id);
  }, [carouselSongs, scheduleFeatured]);

  const handleFocusSong = useCallback((song) => {
    lastRailInteractionRef.current = Date.now(); // met la rotation en pause
    onCardFocusKey?.(cardFocusKey(song)); // mémorise pour la restauration au retour d'une fiche
    setPendingFeatured((prev) => {
      if (prev?.id !== song?.id) scheduleFeatured(song);
      return song;
    });
    if (focusDwellRef.current) clearTimeout(focusDwellRef.current);
    focusDwellRef.current = setTimeout(
      () => trackTv('tv_home_song_focused', { song_id: song.id }),
      FOCUS_ANALYTICS_DWELL_MS,
    );
  }, [scheduleFeatured, onCardFocusKey]);

  // ── Focus initial / restauré (une seule fois au montage) ───────────────────
  const focusInitialTarget = useCallback(() => {
    // Cible restaurée (carte exacte quittée) si elle existe encore, sinon le CTA
    // dominant du hero.
    const restore = initialFocusKey && railSongs.some((s) => cardFocusKey(s) === initialFocusKey)
      ? initialFocusKey
      : 'HOME_HERO_PRIMARY';
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(restore); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => focusInitialTarget(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // « Início » (nav) : revient à l'état d'ouverture (hero = plus récente, focus CTA).
  const resetToInitial = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    preloadTokenRef.current += 1;
    carouselIdxRef.current = 0;         // la bannière repart de la 1ère (plus récente)
    lastRailInteractionRef.current = 0; // et la rotation reprend
    setPendingFeatured(initialFeatured);
    setFeaturedSong(initialFeatured);
    onCardFocusKey?.(null);
    setTimeout(() => { try { SpatialNavigation.setFocus('HOME_HERO_PRIMARY'); } catch { /* ignore */ } }, 0);
  }, [initialFeatured, onCardFocusKey]);

  const conhecerFeatured = useCallback(() => {
    trackTv('tv_featured_song_detail_opened', { song_id: featuredSong?.id });
    onOpenDetail(featuredSong);
  }, [onOpenDetail, featuredSong]);
  const cantarFeatured = useCallback(() => {
    trackTv('tv_featured_song_started', { song_id: featuredSong?.id });
    onCantar(featuredSong);
  }, [onCantar, featuredSong]);
  const selectFromRail = useCallback((song) => {
    trackTv('tv_home_song_detail_opened', { song_id: song.id });
    onOpenDetail(song);
  }, [onOpenDetail]);
  const chooseMode = useCallback((mode) => {
    trackTv('tv_home_mode_selected', { mode });
    onChooseMode(mode);
  }, [onChooseMode]);
  const connectPhone = useCallback(() => {
    trackTv('tv_phone_connection_opened');
    onChooseMode('festa'); // réutilise le flux d'invitation Festa existant (QR + code)
  }, [onChooseMode]);

  const heroHasKaraoke = featuredSong ? getHasKaraoke(featuredSong) : false;

  if (!songs.length) {
    return (
      <div className="tvh-home">
        <TvTopNavigation active="inicio" onInicio={resetToInitial} onCatalogo={onOpenCatalog} onKaraoke={onOpenKaraoke} onFesta={() => chooseMode('festa')} onOpenSettings={onOpenSettings} festaQueueCount={festaQueueCount} />
        <p className="tvh-empty">Nenhuma música disponível.</p>
      </div>
    );
  }

  return (
    <div className="tvh-home">
      <TvTopNavigation
        active="inicio"
        onInicio={resetToInitial}
        onCatalogo={onOpenCatalog}
        onKaraoke={onOpenKaraoke}
        onFesta={() => chooseMode('festa')}
        onOpenSettings={onOpenSettings}
        festaQueueCount={festaQueueCount}
      />

      <div className="tvh-scroll">
        <TvFeaturedSection
          key={featuredSong?.slug || featuredSong?.id}
          song={featuredSong}
          heroSrc={heroSrc}
          hasKaraoke={heroHasKaraoke}
          dots={dots}
          onConhecer={conhecerFeatured}
          onCantar={cantarFeatured}
        />

        <TvSongSelectionRail
          songs={railSongs}
          getArtwork={getCardArtwork}
          focusKeyFor={cardFocusKey}
          onSelect={selectFromRail}
          onFocusSong={handleFocusSong}
          onSeeAll={onOpenCatalog}
          remainingCount={railRemaining}
        />

        <TvSingingModes onChooseMode={chooseMode} />
      </div>

      <TvBottomInteractionBar onConnectPhone={connectPhone} />
    </div>
  );
}
