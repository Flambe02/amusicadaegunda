// Small, restrained status elements shared by the row and drawer.
// Status is always communicated with text, not colour alone (a11y).

export function StatusBadge({ status, scheduled }) {
  const published = status === 'published';
  const label = published ? 'Publicado' : scheduled ? 'Agendado' : 'Rascunho';
  const dot = published ? 'bg-green-500' : scheduled ? 'bg-amber-400' : 'bg-gray-500';
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-300">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// Neutral category tag — dark background, thin border, light text (no saturated colour).
export function CategoryTag({ label }) {
  if (!label) return <span className="text-xs text-gray-600">—</span>;
  return (
    <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-300">
      {label}
    </span>
  );
}

// Restrained karaoke state.
export function KaraokeTag({ state }) {
  if (state === 'active') {
    return (
      <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-300">
        Karaokê
      </span>
    );
  }
  if (state === 'pending') {
    return (
      <span className="inline-flex items-center rounded border border-amber-500/25 bg-amber-500/5 px-2 py-0.5 text-xs text-amber-300/90">
        Sincronizar
      </span>
    );
  }
  return <span className="text-xs text-gray-600">Não configurado</span>;
}
