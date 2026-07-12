import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { useTvArtworkManifest, getTvCardArtwork } from './tvArtwork';
import { toTvSongs } from './lib/tvSongRepository';
import {
  filterCatalog, buildThemeDimension, ADVANCED_DIMENSIONS, emptyAdvanced, advancedIsEmpty,
} from './lib/tvCatalogFilters';
import { trackTv } from './lib/tvAnalytics';
import TvTopNavigation from './components/TvTopNavigation';
import TvCatalogHeader from './components/TvCatalogHeader';
import TvCatalogFilters from './components/TvCatalogFilters';
import TvSongGrid from './components/TvSongGrid';
import TvFocusedSongPanel from './components/TvFocusedSongPanel';
import TvSearchOverlay from './components/TvSearchOverlay';
import TvAdvancedFiltersOverlay from './components/TvAdvancedFiltersOverlay';
import TvQueueOverlay from './components/TvQueueOverlay';
import TvToast from './components/TvToast';
import TvCatalogSkeleton from './components/TvCatalogSkeleton';
import TvEmptyCatalogState from './components/TvEmptyCatalogState';
import TvCatalogRemoteHint from './components/TvCatalogRemoteHint';
import { bumpCatalogOpenCount } from './lib/catalogHintPref';

const FOCUS_DWELL_MS = 600;
const cardFocusKey = (vm) => `CAT_CARD_${vm.id}`;

/**
 * Catálogo TV « song-first ». La question à résoudre en < 5 s : « O que vamos
 * cantar agora? ». Mise en page en split : grille de chansons (~70%) + panneau
 * contextuel de la chanson focalisée (~30%). Filtres rapides + recherche + filtres
 * avancés vivent DANS l'écran (jamais dans la nav globale). OK ouvre la fiche ;
 * ajouter à la fila ne quitte jamais le catálogo. État (filtres, recherche, carte
 * focalisée) restauré au retour d'une fiche via `initialState`/`onStateChange`.
 *
 * Le panneau contextuel n'est pas dans le flux D-pad normal : ses CTA ne
 * deviennent focusables qu'en pressant Droite depuis la dernière colonne de la
 * grille (géométrie Norigin). AUCUN autoplay.
 */
export default function TvCatalogPage({
  songs, getThumb, loading = false, loadError = false,
  queue = [], festaPeople = null, familiarIds = null,
  initialState, onStateChange,
  onOpenDetail, onCantar, onAddToQueue, onRemoveFromQueue, onClearQueue, onStartQueue,
  onGoHome, onOpenKaraoke, onOpenFesta, onRetryLoad,
  backInterceptorRef,
}) {
  const manifest = useTvArtworkManifest();

  useEffect(() => { trackTv('tv_catalog_opened'); bumpCatalogOpenCount(); }, []);

  // ── État de filtrage (initialisé depuis l'état restauré) ───────────────────
  const init = useRef(initialState || {}).current;
  const [quickId, setQuickId] = useState(init.quickId || 'todas');
  const [advanced, setAdvanced] = useState(init.advanced || emptyAdvanced());
  const [searchQuery, setSearchQuery] = useState(init.searchQuery || '');
  const [overlay, setOverlay] = useState(null); // 'search' | 'advanced' | 'queue' | null

  const vms = useMemo(() => toTvSongs(songs), [songs]);
  const themeDimension = useMemo(() => buildThemeDimension(vms), [vms]);
  const dimensions = useMemo(() => [...ADVANCED_DIMENSIONS, themeDimension], [themeDimension]);

  const filtered = useMemo(
    () => filterCatalog(vms, { quickId, advanced, themeDimension, query: searchQuery }),
    [vms, quickId, advanced, themeDimension, searchQuery],
  );
  const searchCount = filtered.length; // live count affiché dans l'overlay de recherche
  const countForAdvanced = useCallback(
    (draft) => filterCatalog(vms, { quickId, advanced: draft, themeDimension, query: searchQuery }).length,
    [vms, quickId, themeDimension, searchQuery],
  );

  // ── Chanson focalisée (pilote le panneau contextuel) ───────────────────────
  const restoredVm = init.focusKey && filtered.find((vm) => cardFocusKey(vm) === init.focusKey);
  const [focusedVm, setFocusedVm] = useState(restoredVm || filtered[0] || null);

  // Si la liste filtrée change et que la chanson focalisée n'y est plus, on
  // recale le panneau sur la 1ère (jamais un panneau « fantôme »).
  useEffect(() => {
    if (!filtered.length) { setFocusedVm(null); return; }
    if (!focusedVm || !filtered.some((vm) => vm.id === focusedVm.id)) setFocusedVm(filtered[0]);
  }, [filtered, focusedVm]);

  const getArtwork = useCallback(
    (vm) => getTvCardArtwork(vm.raw, manifest, getThumb(vm.raw) || vm.raw?.cover_image),
    [manifest, getThumb],
  );

  // ── Persistance d'état pour la restauration au retour d'une fiche ──────────
  useEffect(() => { onStateChange?.({ quickId, advanced, searchQuery }); }, [quickId, advanced, searchQuery, onStateChange]);
  const dwellRef = useRef(null);
  useEffect(() => () => { if (dwellRef.current) clearTimeout(dwellRef.current); }, []);

  const handleFocusSong = useCallback((vm) => {
    setFocusedVm(vm);
    onStateChange?.({ focusKey: cardFocusKey(vm) });
    if (dwellRef.current) clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(() => trackTv('tv_song_card_focused', { song_id: vm.id }), FOCUS_DWELL_MS);
  }, [onStateChange]);

  // ── Focus initial / restauré (une seule fois) ──────────────────────────────
  useEffect(() => {
    const target = init.focusKey && filtered.some((vm) => cardFocusKey(vm) === init.focusKey)
      ? init.focusKey
      : 'CAT_FILTER_TODAS';
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openDetail = useCallback((vm) => {
    trackTv('tv_song_detail_opened', { song_id: vm.id });
    onOpenDetail(vm.raw);
  }, [onOpenDetail]);

  const [toast, setToast] = useState({ message: '', nonce: 0 });
  const addToQueue = useCallback((vm) => {
    const res = onAddToQueue?.(vm) || { added: false, position: 0 };
    trackTv('tv_song_added_to_queue', { song_id: vm.id, added: res.added });
    setToast({
      message: res.added
        ? `Adicionada à fila · posição ${res.position}`
        : `Já está na fila · posição ${res.position}`,
      nonce: Date.now(),
    });
  }, [onAddToQueue]);

  const selectQuick = useCallback((id) => {
    trackTv('tv_catalog_filter_selected', { filter: id });
    setSearchQuery('');       // un filtre rapide repart d'une recherche vierge
    setAdvanced(emptyAdvanced());
    setQuickId(id);
  }, []);

  const openSearch = useCallback(() => { trackTv('tv_catalog_search_opened'); setOverlay('search'); }, []);
  const openAdvanced = useCallback(() => setOverlay('advanced'), []);
  const openQueue = useCallback(() => { trackTv('tv_queue_opened'); setOverlay('queue'); }, []);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  const applyAdvanced = useCallback((draft) => {
    setAdvanced(draft);
    setOverlay(null);
    setTimeout(() => { try { SpatialNavigation.setFocus('CAT_FILTER_MORE'); } catch { /* ignore */ } }, 0);
  }, []);

  const closeSearch = useCallback(() => {
    trackTv('tv_catalog_search_completed', { query_length: searchQuery.length, results: searchCount });
    setOverlay(null);
    setTimeout(() => {
      try { SpatialNavigation.setFocus(searchCount > 0 ? 'CAT_GRID' : 'CAT_FILTER_SEARCH'); } catch { /* ignore */ }
    }, 0);
  }, [searchQuery, searchCount]);

  const resetAll = useCallback(() => {
    setQuickId('todas'); setAdvanced(emptyAdvanced()); setSearchQuery('');
    setTimeout(() => { try { SpatialNavigation.setFocus('CAT_FILTER_TODAS'); } catch { /* ignore */ } }, 0);
  }, []);

  const emptyAction = useCallback((action) => {
    if (action === 'clear' || action === 'back') resetAll();
    else if (action === 'retry' || action === 'offline') onRetryLoad?.();
  }, [resetAll, onRetryLoad]);

  // Raccourci « ajout rapide à la fila » (touche + / touche verte) quand une carte
  // est focalisée et qu'aucun overlay n'est ouvert — l'action principale reste OK
  // (ouvrir la fiche) + le CTA « Adicionar à fila » du panneau (Droite).
  useEffect(() => {
    if (overlay) return undefined;
    const onKey = (e) => {
      if (e.key !== '+' && e.key !== 'Add' && e.code !== 'NumpadAdd') return;
      const el = document.querySelector('.tvc-card.is-focused');
      const id = el?.getAttribute('data-song-id');
      const vm = id && filtered.find((v) => String(v.id) === id);
      if (vm) addToQueue(vm);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, filtered, addToQueue]);

  // ── Back : ferme un overlay si ouvert, sinon laisse TvApp gérer (pop) ───────
  // Chaque overlay pose SON propre intercepteur pendant qu'il est monté ; ici on
  // gère seulement le cas « pas d'overlay » (retourne false → TvApp pop).
  useEffect(() => {
    if (!backInterceptorRef || overlay) return undefined;
    backInterceptorRef.current = () => false;
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, overlay]);

  const advancedActive = !advancedIsEmpty(advanced);
  const familiar = focusedVm && familiarIds ? familiarIds.has(focusedVm.id) : false;
  const showEmpty = !loading && !loadError && filtered.length === 0;
  const queueVms = queue; // {qid, id, title, singer?}

  return (
    <div className="tvc-page">
      <TvTopNavigation
        active="catalogo"
        onInicio={onGoHome}
        onCatalogo={resetAll}
        onKaraoke={onOpenKaraoke}
        onFesta={onOpenFesta}
        festaQueueCount={null}
      />

      <TvCatalogHeader
        queueCount={queueVms.length}
        festaPeople={festaPeople}
        onOpenQueue={openQueue}
      />

      <TvCatalogFilters
        activeQuickId={quickId}
        advancedActive={advancedActive}
        onSelectQuick={selectQuick}
        onOpenSearch={openSearch}
        onOpenAdvanced={openAdvanced}
      />

      <div className="tvc-body">
        <div className="tvc-left">
          {loading ? (
            <TvCatalogSkeleton />
          ) : loadError && !vms.length ? (
            <TvEmptyCatalogState variant="error" onAction={emptyAction} />
          ) : showEmpty ? (
            <TvEmptyCatalogState variant={searchQuery ? 'empty-search' : 'empty-filter'} onAction={emptyAction} />
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
          onAddQueue={addToQueue}
          onCantar={(vm) => onCantar(vm.raw)}
        />
      </div>

      <TvCatalogRemoteHint />
      <TvToast message={toast.message} nonce={toast.nonce} onDone={() => setToast({ message: '', nonce: 0 })} />

      {overlay === 'search' && (
        <TvSearchOverlay
          query={searchQuery}
          resultCount={searchCount}
          onQueryChange={setSearchQuery}
          onClose={closeSearch}
          backInterceptorRef={backInterceptorRef}
        />
      )}
      {overlay === 'advanced' && (
        <TvAdvancedFiltersOverlay
          dimensions={dimensions}
          initial={advanced}
          countFor={countForAdvanced}
          onApply={applyAdvanced}
          onClose={closeOverlay}
          backInterceptorRef={backInterceptorRef}
        />
      )}
      {overlay === 'queue' && (
        <TvQueueOverlay
          queue={queueVms}
          festaActive={typeof festaPeople === 'number'}
          onRemove={onRemoveFromQueue}
          onClear={onClearQueue}
          onStart={() => { onStartQueue?.(); setOverlay(null); }}
          onClose={closeOverlay}
          backInterceptorRef={backInterceptorRef}
        />
      )}
    </div>
  );
}
