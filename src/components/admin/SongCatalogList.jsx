// Grouped catalog list + loading / empty / error states.
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import SongCatalogRow from './SongCatalogRow';
import SongCatalogHeader from './SongCatalogHeader';
import { groupByYearMonth } from './adminData';

function ListSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-7 w-16 bg-white/10" />
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-0">
                <Skeleton className="h-10 w-10 rounded bg-white/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40 bg-white/10" />
                  <Skeleton className="h-2.5 w-20 bg-white/10" />
                </div>
                <Skeleton className="h-4 w-20 bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, cta, onCta }) {
  return (
    <div className="rounded-xl border border-white/10 py-16 text-center">
      <p className="text-sm text-gray-400">{title}</p>
      {cta && (
        <Button onClick={onCta} variant="outline" className="mt-4">{cta}</Button>
      )}
    </div>
  );
}

export default function SongCatalogList({
  loading, error, onRetry, views, totalSongs, searchActive, selectedId,
  onSelect, onKaraoke, onEdit, onDelete, onCreate, onClearSearch,
}) {
  if (loading) return <ListSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 py-16 text-center">
        <p className="text-sm text-red-300">Não foi possível carregar o catálogo.</p>
        <Button onClick={onRetry} variant="outline" className="mt-4">Tentar novamente</Button>
      </div>
    );
  }

  if (views.length === 0) {
    if (totalSongs === 0) {
      return <EmptyState title="Não há músicas cadastradas." cta="Criar primeira música" onCta={onCreate} />;
    }
    if (searchActive) {
      return <EmptyState title="Nenhuma música encontrada para esta pesquisa." cta="Limpar pesquisa" onCta={onClearSearch} />;
    }
    return <EmptyState title="Nenhuma música neste filtro." />;
  }

  const groups = groupByYearMonth(views, (v) => v.releaseDate);

  return (
    <div className="space-y-6">
      <SongCatalogHeader />
      {groups.map(({ year, total, months }) => (
        <section key={year}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xl font-bold text-white/80">{year}</h2>
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-gray-500">{total} {total === 1 ? 'música' : 'músicas'}</span>
          </div>

          <div className="space-y-4">
            {months.map(({ month, items }) => (
              <div key={month}>
                <div className="mb-1 flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">{month}</span>
                  <span className="text-xs text-gray-600">({items.length})</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {items.map((view) => (
                    <SongCatalogRow
                      key={view.id}
                      view={view}
                      selected={selectedId === view.id}
                      onSelect={onSelect}
                      onKaraoke={onKaraoke}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
