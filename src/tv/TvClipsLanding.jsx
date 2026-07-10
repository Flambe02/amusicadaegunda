import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { loadKaraokeOptions, saveKaraokeOptions } from '@/lib/karaokeOptions';
import { useTvArtworkManifest, getTvCardArtwork } from './tvArtwork';
import {
  hasValidClip, getSongMonth, getSongYear, getSongTheme, getSongKey,
  groupClipsByMonth, groupClipsByYear, groupClipsByTheme, getNewClipIds,
} from './lib/clipGrouping';
import { MONTHS_PT } from './tvMonths';
import TvHomeNavigation from './components/TvHomeNavigation';
import TvMediaRail from './components/TvMediaRail';
import TvSettingsPanel from './components/TvSettingsPanel';
import FocusRow from './components/FocusRow';
import FocusableButton from './components/FocusableButton';

const SORT_MODES = [
  { key: 'month', label: 'MÊS', focusKey: 'CLIPS_SORT_MONTH' },
  { key: 'year', label: 'ANO', focusKey: 'CLIPS_SORT_YEAR' },
  { key: 'theme', label: 'TEMA', focusKey: 'CLIPS_SORT_THEME' },
];

// Métadonnée discrète par carte — dépend du mode d'organisation courant (jamais
// la même information que le titre de la rangée, cf. cahier des charges : « ne
// pas répéter mois/année sur chaque carte quand la rangée entière le représente
// déjà »).
function buildMetaGetter(sortMode) {
  if (sortMode === 'month') {
    return (song) => getSongTheme(song).label || null;
  }
  if (sortMode === 'year') {
    return (song) => {
      const month = getSongMonth(song);
      const theme = getSongTheme(song).label;
      if (month == null) return theme || null;
      return theme ? `${MONTHS_PT[month]} • ${theme}` : MONTHS_PT[month];
    };
  }
  // theme
  return (song) => {
    const month = getSongMonth(song);
    const year = getSongYear(song);
    if (month == null || year == null) return null;
    return `${MONTHS_PT[month]} ${year}`;
  };
}

/**
 * Page dédiée « Clipes » — atteinte depuis la destination Clipes de la nav
 * partagée. Remplace l'ancienne grille générique (TvGrid) pour cette destination
 * uniquement : rangées horizontales groupées par mês/ano/tema (jamais de grille
 * multi-colonnes). Ne duplique AUCUNE logique de lecture — la sélection d'une
 * carte réutilise le flux existant (fiche chanson) via `onSelectSong`.
 */
export default function TvClipsLanding({
  songs, getThumb,
  onSelectSong,
  onNavigateHome, onNavigateKaraoke, onNavigateFesta, onNavigateAll,
  onExitApp, backInterceptorRef,
}) {
  const manifest = useTvArtworkManifest();
  const getCardArtwork = useCallback(
    (song) => getTvCardArtwork(song, manifest, getThumb(song) || song?.cover_image),
    [manifest, getThumb],
  );

  const clipSongs = useMemo(() => songs.filter(hasValidClip), [songs]);
  const newClipIds = useMemo(() => getNewClipIds(clipSongs), [clipSongs]);
  const getBadge = useCallback((song) => (newClipIds.has(getSongKey(song)) ? 'NOVA' : null), [newClipIds]);

  const [sortMode, setSortMode] = useState('month');
  const monthGroups = useMemo(() => groupClipsByMonth(clipSongs), [clipSongs]);
  const yearGroups = useMemo(() => groupClipsByYear(clipSongs), [clipSongs]);
  const themeGroups = useMemo(() => groupClipsByTheme(clipSongs), [clipSongs]);
  const groups = sortMode === 'year' ? yearGroups : sortMode === 'theme' ? themeGroups : monthGroups;
  const getMeta = useMemo(() => buildMetaGetter(sortMode), [sortMode]);

  const hasClips = clipSongs.length > 0;

  const handleSortChange = useCallback((mode) => {
    if (!hasClips) return;
    setSortMode((prev) => (prev === mode ? prev : mode));
  }, [hasClips]);

  // Focus : au montage ET à chaque changement de mode, on repose sur la 1ère
  // carte de la 1ère rangée (jamais sur un bouton désactivé) — cf. cahier des
  // charges « place focus on the first card of the first group ».
  useEffect(() => {
    const target = (hasClips && groups.length) ? 'CLIPS_RAIL_0' : 'HOME_NAV_CLIPS';
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  // ── Panneau de réglages (même composant partagé que les autres écrans) ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [karaokeOpts, setKaraokeOpts] = useState(loadKaraokeOptions);
  useEffect(() => { saveKaraokeOptions(karaokeOpts); }, [karaokeOpts]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setTimeout(() => { try { SpatialNavigation.setFocus('HOME_SETTINGS'); } catch { /* ignore */ } }, 0);
  }, []);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (settingsOpen) { closeSettings(); return true; }
      return false;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, settingsOpen, closeSettings]);

  const refocusSort = useRef(false);
  refocusSort.current = hasClips;

  return (
    <div className="tv2-home tv-clips-landing">
      <TvHomeNavigation
        active="clips"
        onStart={onNavigateHome}
        onKaraoke={onNavigateKaraoke}
        onFesta={onNavigateFesta}
        onClips={() => { if (refocusSort.current) SpatialNavigation.setFocus('CLIPS_SORT_MONTH'); }}
        onAll={onNavigateAll}
        onOpenSettings={openSettings}
      />

      <div className="tv-clips-head">
        <div className="tv-clips-heading">
          <h1 className="tv-clips-title">Clipes</h1>
          <p className="tv-clips-subtitle">Assista aos lançamentos por mês, ano ou tema.</p>
        </div>

        <div className="tv-clips-sort">
          <span className="tv-clips-sort-label">Organizar por</span>
          <FocusRow className="tv-clips-sort-pills" focusKey="CLIPS_SORT">
            {SORT_MODES.map((mode) => (
              <FocusableButton
                key={mode.key}
                focusKey={mode.focusKey}
                ariaLabel={`Organizar clipes por ${mode.label.toLowerCase()}`}
                className={`tv-clips-pill ${sortMode === mode.key ? 'is-selected' : ''} ${!hasClips ? 'is-disabled' : ''}`}
                onPress={hasClips ? () => handleSortChange(mode.key) : undefined}
              >
                {mode.label}
              </FocusableButton>
            ))}
          </FocusRow>
        </div>
      </div>

      {!hasClips ? (
        <p className="tv-clips-empty">Nenhum clipe disponível no momento.</p>
      ) : (
        <div className="tv-clips-rails">
          {groups.map((group, i) => (
            <TvMediaRail
              key={`${sortMode}-${group.key}`}
              focusKey={`CLIPS_RAIL_${i}`}
              title={group.label}
              subtitle={sortMode === 'theme' ? `${group.songs.length} clipe${group.songs.length === 1 ? '' : 's'}` : null}
              songs={group.songs}
              getArtwork={getCardArtwork}
              getMeta={getMeta}
              getBadge={getBadge}
              onSelect={onSelectSong}
            />
          ))}
        </div>
      )}

      {settingsOpen && (
        <TvSettingsPanel opts={karaokeOpts} setOpts={setKaraokeOpts} onExitApp={onExitApp} />
      )}
    </div>
  );
}
