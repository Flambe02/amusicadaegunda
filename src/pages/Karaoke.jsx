import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useKaraokeCatalog } from '@/hooks/useKaraokeCatalog';
import { groupByMonth } from '@/lib/karaokeCatalog';
import { trackEvent } from '@/lib/analytics';
import KaraokePlayer from '@/components/karaoke/KaraokePlayer';
import KaraokeHero from '@/components/karaoke/catalog/KaraokeHero';
import KaraokeSearch from '@/components/karaoke/catalog/KaraokeSearch';
import KaraokeSurpriseCard from '@/components/karaoke/catalog/KaraokeSurpriseCard';
import KaraokeFilters from '@/components/karaoke/catalog/KaraokeFilters';
import KaraokeMonthSection from '@/components/karaoke/catalog/KaraokeMonthSection';
import KaraokeSurpriseResult from '@/components/karaoke/catalog/KaraokeSurpriseResult';
import KaraokeEmptyState from '@/components/karaoke/catalog/KaraokeEmptyState';
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
    results,
    totalEligible,
    isLoading,
    themes,
    months,
    filters,
    hasActiveFilters,
    setQuery,
    setTheme,
    setMonth,
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

  const handleMonthChange = useCallback((value) => {
    setMonth(value);
    trackEvent('karaoke_month_filter_selected', { month: value || 'todos' });
  }, [setMonth]);

  const handleSortChange = useCallback((value) => {
    setSort(value);
    trackEvent('karaoke_sort_changed', { sort: value });
  }, [setSort]);

  const groups = groupByMonth(results);
  const canSurprise = results.length > 0;

  return (
    <>
      <Helmet><html lang="pt-BR" /></Helmet>

      <div className="karaoke-catalog">
        <div className="karaoke-spotlights !inset-0" aria-hidden="true" />

        <div className="relative">
          <KaraokeHero count={totalEligible} showCount={!isLoading} />

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
                months={months}
                filters={filters}
                resultCount={results.length}
                hasActiveFilters={hasActiveFilters}
                onThemeChange={handleThemeChange}
                onMonthChange={handleMonthChange}
                onSortChange={handleSortChange}
                onClear={clearFilters}
              />
            </>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> A montar o palco…
            </div>
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
            <div className="karaoke-results">
              {groups.map((group) => (
                <KaraokeMonthSection
                  key={group.key}
                  label={group.label}
                  songs={group.songs}
                  onSelect={sing}
                />
              ))}
            </div>
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

      {current && (
        <KaraokePlayer
          key={current.id}
          song={current}
          onEnded={() => setCurrent(null)}
          onClose={() => setCurrent(null)}
        />
      )}
    </>
  );
}
