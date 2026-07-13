import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Music, Sparkles, ChevronRight } from 'lucide-react';
import { useTvArtworkManifest, getTvCardArtwork } from './tvArtwork';
import { toTvSongs } from './lib/tvSongRepository';
import { filterCatalog, QUICK_FILTERS } from './lib/tvCatalogFilters';
import { trackTv } from './lib/tvAnalytics';
import TvTopNavigation from './components/TvTopNavigation';
import TvSongGrid from './components/TvSongGrid';
import TvFocusedSongPanel from './components/TvFocusedSongPanel';
import TvEmptyCatalogState from './components/TvEmptyCatalogState';
import FocusableButton from './components/FocusableButton';

// Mêmes clés de focus que le catálogo (les deux écrans ne coexistent jamais dans la
// pile) → la carte hérite du même « Droite depuis la dernière colonne → panneau ».
const cardFocusKey = (vm) => `CAT_CARD_${vm.id}`;

/** Une chip de filtre rapide (réutilise le style .tvc-chip du catálogo). */
function FilterChip({ label, active, focusKey, onPress }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onPress,
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-pressed={active}
      aria-label={label}
      className={`tvc-chip ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
    >
      <span>{label}</span>
    </button>
  );
}

/** Rangée de chips de filtre rapide (groupe de focus propre). */
function KaraokeFilters({ activeQuickId, onSelectQuick }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'KARAOKE_FILTERS', trackChildren: true, saveLastFocusedChild: true,
  });
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tvc-filters tvk-filters" role="toolbar" aria-label="Filtrar karaokês">
        {QUICK_FILTERS.map((f) => (
          <FilterChip
            key={f.id}
            label={f.label}
            active={activeQuickId === f.id}
            focusKey={`KARAOKE_FILTER_${f.id.toUpperCase()}`}
            onPress={() => onSelectQuick(f.id)}
          />
        ))}
      </div>
    </FocusContext.Provider>
  );
}

/**
 * Écran Karaokê TV « Palco da Segunda » — catálogo dédié aux titres chantables,
 * inspiré de la page Karaokê desktop et adapté au 10-foot / D-pad :
 *   hero compact + « Me surpreenda » + filtres rapides + grille de cartes + panneau
 *   contextuel (~30% droite). OK/clic sur une carte OUVRE LA FICHE (jamais le lecteur
 *   directement) ; « Me surpreenda » tire une chanson au hasard et ouvre sa fiche.
 *
 * Ne duplique aucune logique de lecture : la fiche décide (Cantar agora / fila /
 * dueto…). Réutilise les composants du catálogo (grille, panneau, chips) pour rester
 * cohérent, sans toucher au TvCatalogPage générique.
 */
export default function TvKaraokeLanding({
  songs, getThumb, getHasKaraoke, familiarIds = null,
  onOpenDetail, onCantar,
  onNavigateHome, onNavigateFesta, onNavigateAll, onOpenSettings,
  initialFocusKey = null, onCardFocusKey,
  backInterceptorRef,
}) {
  const manifest = useTvArtworkManifest();

  useEffect(() => { trackTv('tv_karaoke_opened'); }, []);

  const [quickId, setQuickId] = useState('todas');
  const karaokeVms = useMemo(() => toTvSongs(songs.filter(getHasKaraoke)), [songs, getHasKaraoke]);
  const filtered = useMemo(() => filterCatalog(karaokeVms, { quickId }), [karaokeVms, quickId]);
  const total = karaokeVms.length;

  // ── Chanson focalisée (pilote le panneau) — restaurée au retour d'une fiche ──
  const restoredVm = initialFocusKey && filtered.find((vm) => cardFocusKey(vm) === initialFocusKey);
  const [focusedVm, setFocusedVm] = useState(restoredVm || filtered[0] || null);
  useEffect(() => {
    if (!filtered.length) { setFocusedVm(null); return; }
    if (!focusedVm || !filtered.some((vm) => vm.id === focusedVm.id)) setFocusedVm(filtered[0]);
  }, [filtered, focusedVm]);

  const getArtwork = useCallback(
    (vm) => getTvCardArtwork(vm.raw, manifest, getThumb(vm.raw) || vm.raw?.cover_image),
    [manifest, getThumb],
  );

  const handleFocusSong = useCallback((vm) => {
    setFocusedVm(vm);
    onCardFocusKey?.(cardFocusKey(vm));
  }, [onCardFocusKey]);

  const openDetail = useCallback((vm) => {
    trackTv('tv_song_detail_opened', { song_id: vm.id, source: 'karaoke' });
    onOpenDetail(vm.raw);
  }, [onOpenDetail]);

  const selectQuick = useCallback((id) => {
    trackTv('tv_karaoke_filter_selected', { filter: id });
    setQuickId(id);
  }, []);

  // « Me surpreenda » : tire une chanson au hasard parmi les résultats filtrés
  // (respecte le filtre actif), évite de retirer la même deux fois de suite, et
  // OUVRE SA FICHE (pas de lecture auto — la fiche reste l'écran de décision).
  const lastSurpriseRef = useRef(null);
  const surprise = useCallback(() => {
    const pool = filtered.length ? filtered : karaokeVms;
    if (!pool.length) return;
    let idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && pool[idx].id === lastSurpriseRef.current) idx = (idx + 1) % pool.length;
    const pick = pool[idx];
    lastSurpriseRef.current = pick.id;
    trackTv('tv_karaoke_surprise_result', { song_id: pick.id });
    onOpenDetail(pick.raw);
  }, [filtered, karaokeVms, onOpenDetail]);

  // ── Focus initial / restauré (une seule fois au montage) ──
  useEffect(() => {
    const restorable = initialFocusKey && filtered.some((vm) => cardFocusKey(vm) === initialFocusKey);
    const target = restorable
      ? initialFocusKey
      : (filtered[0] ? cardFocusKey(filtered[0]) : 'KARAOKE_SURPRISE');
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back sans overlay → laisse TvApp dépiler (retour à l'écran précédent).
  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => false;
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef]);

  const focusFirstSong = useCallback(() => {
    setQuickId('todas');
    setTimeout(() => {
      try { SpatialNavigation.setFocus(filtered[0] ? cardFocusKey(filtered[0]) : 'KARAOKE_SURPRISE'); } catch { /* ignore */ }
    }, 0);
  }, [filtered]);

  const familiar = focusedVm && familiarIds ? familiarIds.has(focusedVm.id) : false;

  return (
    <div className="tvc-page tvk-page">
      <TvTopNavigation
        active="karaoke"
        onInicio={onNavigateHome}
        onCatalogo={onNavigateAll}
        onKaraoke={focusFirstSong}
        onFesta={onNavigateFesta}
        onOpenSettings={onOpenSettings}
        festaQueueCount={null}
      />

      <section className="tvk-hero">
        <div className="tvk-hero-text">
          <p className="tvk-eyebrow"><Mic size={17} /> Palco da Segunda</p>
          <h1 className="tvk-title">KARAOKÊ</h1>
          <p className="tvk-subtitle">Escolha uma música ou deixe a sorte decidir.</p>
        </div>
        {total > 0 && (
          <p className="tvk-count">
            <Music size={17} /> {total} música{total > 1 ? 's' : ''} pronta{total > 1 ? 's' : ''} para cantar
          </p>
        )}
      </section>

      <div className="tvk-actions">
        <FocusableButton
          focusKey="KARAOKE_SURPRISE"
          className="tvk-surprise"
          ariaLabel="Me surpreenda — sortear uma música para cantar"
          onPress={surprise}
        >
          <span className="tvk-surprise-icon" aria-hidden="true"><Sparkles size={26} /></span>
          <span className="tvk-surprise-text">
            <span className="tvk-surprise-title">ME SURPREENDA</span>
            <span className="tvk-surprise-sub">Uma música escolhida na hora</span>
          </span>
          <span className="tvk-surprise-chevron" aria-hidden="true"><ChevronRight size={22} /></span>
        </FocusableButton>
        <KaraokeFilters activeQuickId={quickId} onSelectQuick={selectQuick} />
      </div>

      <div className="tvc-body">
        <div className="tvc-left">
          {total === 0 ? (
            <p className="tvk-empty">Nenhum karaokê disponível no momento.</p>
          ) : filtered.length === 0 ? (
            <TvEmptyCatalogState variant="empty-filter" onAction={() => setQuickId('todas')} />
          ) : (
            <TvSongGrid
              items={filtered}
              getArtwork={getArtwork}
              focusKeyFor={cardFocusKey}
              onSelect={openDetail}
              onFocusSong={handleFocusSong}
            />
          )}
        </div>

        <TvFocusedSongPanel
          vm={focusedVm}
          artSrc={focusedVm ? getArtwork(focusedVm) : null}
          familiar={familiar}
          onConhecer={openDetail}
          onCantar={(vm) => onCantar(vm.raw)}
        />
      </div>
    </div>
  );
}
