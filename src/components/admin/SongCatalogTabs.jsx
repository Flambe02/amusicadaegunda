// Primary filter tabs: Todos / Publicados / Rascunhos.
// Active tab = purple text + purple underline (no coloured pills).

export default function SongCatalogTabs({ value, onChange, counts }) {
  const tabs = [
    ['all', 'Todos', counts.all],
    ['published', 'Publicados', counts.published],
    ['draft', 'Rascunhos', counts.draft],
  ];
  return (
    <div className="flex gap-1 border-b border-white/10" role="tablist" aria-label="Filtrar músicas">
      {tabs.map(([key, label, count]) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {label} <span className="tabular-nums text-gray-500">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
