import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Music } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useKaraokeCatalog } from '@/hooks/useKaraokeCatalog';
import { trackEvent } from '@/lib/analytics';
import { deriveSongSlug } from '@/lib/learnContent';
import { useShell } from '@/components/mobile/ShellContext';
import { getPublicSlug } from '@/components/mobile/feed/feedMedia';
import KaraokePlayer from '@/components/karaoke/KaraokePlayer';
import KaraokeHero from '@/components/karaoke/catalog/KaraokeHero';
import KaraokeSearch from '@/components/karaoke/catalog/KaraokeSearch';
import KaraokeSurpriseCard from '@/components/karaoke/catalog/KaraokeSurpriseCard';
import KaraokeFilters from '@/components/karaoke/catalog/KaraokeFilters';
import KaraokeSongCard from '@/components/karaoke/catalog/KaraokeSongCard';
import KaraokeSurpriseResult from '@/components/karaoke/catalog/KaraokeSurpriseResult';
import KaraokeEmptyState from '@/components/karaoke/catalog/KaraokeEmptyState';
import KaraokePalco from '@/components/mobile/karaoke/KaraokePalco';
import '@/styles/karaoke.css';
import '@/styles/karaoke-catalog.css';

const HINT_KEY = 'karaoke-surprise-hint-dismissed-v1';

/**
 * Hub Karaokê « Palco da Segunda » — page publique /karaoke (web / PWA / Android mobile / desktop).
 *
 * Le shell (sidebar desktop, header + bottom nav mobile) vient de Layout.jsx :
 * cette page ne rend QUE le contenu. Le mode TV est un bundle séparé (src/tv/*)
 * jamais monté ici — ce redesign n'y touche pas.
 *
 * CANTAR ouvre le lecteur plein écran <KaraokePlayer> en place (même chemin pour
 * une carte que pour « Cantar agora » du tirage surprise) — pas de nouvelle route.
 */
export default function KaraokePage() {
  const {
    songs,
    results,
    totalEligible,
    isLoading,
    error,
    reload,
    themes,
    filters,
    hasActiveFilters,
    setQuery,
    setTheme,
    setDifficulty,
    setSort,
    clearFilters,
    pickSurprise,
  } = useKaraokeCatalog();

  const [current, setCurrent] = useState(null); // chanson en lecture (overlay) ou null
  const [surprise, setSurprise] = useState(null); // chanson tirée (modal) ou null
  const [showHint, setShowHint] = useState(false);
  const surpriseBtnRef = useRef(null);

  useSEO({
    title: 'Karaokê — Cante as Paródias | A Música da Segunda',
    description:
      'Modo karaokê oficial de A Música da Segunda: cante as paródias musicais da semana com letra sincronizada na tela. No celular, no computador ou na TV.',
    url: '/karaoke',
  });

  // Astuce première visite (une seule fois, persistée).
  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
    } catch { /* storage indisponible : pas d'astuce */ }
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ }
  }, []);

  const runSurprise = useCallback(() => {
    dismissHint();
    const chosen = pickSurprise();
    if (chosen) {
      setSurprise(chosen);
      trackEvent('karaoke_surprise_result', { song_id: chosen.id, song_title: chosen.title });
    }
    trackEvent('karaoke_surprise_clicked', { result_count: results.length });
  }, [dismissHint, pickSurprise, results.length]);

  const rerollSurprise = useCallback(() => {
    const chosen = pickSurprise();
    if (chosen) setSurprise(chosen);
    trackEvent('karaoke_surprise_rerolled');
  }, [pickSurprise]);

  const sing = useCallback((song) => {
    setSurprise(null);
    setCurrent(song);
    trackEvent('karaoke_song_selected', { song_id: song.id, song_title: song.title });
  }, []);

  const handleThemeChange = useCallback((value) => {
    setTheme(value);
    trackEvent('karaoke_theme_filter_selected', { theme: value || 'todos' });
  }, [setTheme]);

  const handleDifficultyChange = useCallback((value) => {
    setDifficulty(value);
    trackEvent('karaoke_difficulty_filter_selected', { difficulty: value || 'todas' });
  }, [setDifficulty]);

  const handleSortChange = useCallback((value) => {
    setSort(value);
    trackEvent('karaoke_sort_changed', { sort: value });
  }, [setSort]);

  // Lien direct /karaoke?musica=<slug> (bouton « Cantar » du feed mobile) : ouvre le
  // lecteur de cette chanson par le même chemin qu'une carte. Layout rend cette page
  // deux fois et KaraokePlayer s'ouvre dans un portail : seule la copie qui correspond
  // au viewport agit, sinon deux lecteurs s'ouvriraient. Le paramètre est retiré
  // ensuite, pour que fermer le lecteur ramène à la liste. Chanson absente du
  // catalogue karaokê (pas publiée) : la liste s'affiche, simplement.
  const [searchParams, setSearchParams] = useSearchParams();
  const shell = useShell();
  const requestedSlug = searchParams.get('musica');
  useEffect(() => {
    if (!requestedSlug || isLoading) return;
    if (shell) {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (shell !== (isMobile ? 'mobile' : 'desktop')) return;
    }
    const match = songs.find(
      (song) => getPublicSlug(song) === requestedSlug || deriveSongSlug(song) === requestedSlug
    );
    if (match) sing(match);
    setSearchParams(
      (params) => {
        params.delete('musica');
        return params;
      },
      { replace: true }
    );
  }, [requestedSlug, isLoading, songs, shell, sing, setSearchParams]);

  const canSurprise = results.length > 0;

  // Sous 768 px, la copie mobile de la page est « O Palco » (carrousel 3D, micro) ; la
  // copie desktop garde le catalogue ci-dessous, inchangé. Le point de rupture est suivi
  // en direct (fenêtre redimensionnée, écran partagé de tablette), comme dans Home.
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener?.('change', updateViewport);
    return () => mediaQuery.removeEventListener?.('change', updateViewport);
  }, []);
  const playerOverlay = current ? (
    <KaraokePlayer
      key={current.id}
      song={current}
      onEnded={() => setCurrent(null)}
      onClose={() => setCurrent(null)}
    />
  ) : null;

  if (shell === 'mobile' && isMobileViewport) {
    // Étape 7 : sous O Palco, le lecteur laisse la barre du bas visible (onglet
    // Karaokê actif) et prend le style mobile. La copie desktop garde le lecteur tel quel.
    const mobilePlayerOverlay = current ? (
      <KaraokePlayer
        key={current.id}
        song={current}
        mobileShell
        onEnded={() => setCurrent(null)}
        onClose={() => setCurrent(null)}
      />
    ) : null;
    return (
      <>
        <Helmet><html lang="pt-BR" /></Helmet>
        <KaraokePalco
          songs={songs}
          isLoading={isLoading}
          unavailable={Boolean(error) || (!isLoading && totalEligible === 0)}
          onSing={sing}
        />
        {mobilePlayerOverlay}
      </>
    );
  }

  return (
    <>
      <Helmet><html lang="pt-BR" /></Helmet>

      <div className="karaoke-catalog">
        <div className="karaoke-spotlights !inset-0" aria-hidden="true" />

        <div className="relative">
          <KaraokeHero />

          {!isLoading && totalEligible > 0 && (
            <>
              <div className="karaoke-utility-row">
                <KaraokeSearch value={filters.query} onChange={setQuery} resultCount={results.length} />
                <KaraokeSurpriseCard
                  ref={surpriseBtnRef}
                  onSurprise={runSurprise}
                  disabled={!canSurprise}
                  hint={showHint}
                  onDismissHint={dismissHint}
                />
              </div>

              <KaraokeFilters
                themes={themes}
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                onDifficultyChange={handleDifficultyChange}
                onThemeChange={handleThemeChange}
                onSortChange={handleSortChange}
                onClear={clearFilters}
              />
            </>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> A montar o palco…
            </div>
          ) : error ? (
            <KaraokeEmptyState variant="error" onRetry={reload} />
          ) : totalEligible === 0 ? (
            <KaraokeEmptyState variant="empty" />
          ) : results.length === 0 ? (
            <KaraokeEmptyState
              variant="no-results"
              onClear={clearFilters}
              onSurprise={() => { clearFilters(); }}
              canSurprise={false}
            />
          ) : (
            <>
              {/* Compteur UNIQUE de la page, juste au-dessus de la grille — dynamique
                  (reflète les filtres actifs), remplace les deux compteurs concurrents
                  du hero et de la barre de filtres de l'ancienne version. */}
              <p className="karaoke-result-line" aria-live="polite">
                <Music className="h-4 w-4" aria-hidden="true" />
                {results.length} música{results.length > 1 ? 's' : ''} pronta{results.length > 1 ? 's' : ''} para cantar
              </p>
              <div className="karaoke-grid">
                {results.map((song) => (
                  <KaraokeSongCard key={song.id} song={song} onSelect={sing} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {surprise && (
        <KaraokeSurpriseResult
          song={surprise}
          onSing={sing}
          onReroll={rerollSurprise}
          onClose={() => setSurprise(null)}
        />
      )}

      {playerOverlay}
    </>
  );
}
