import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findReleaseLinks } from '@/lib/releaseLinks';

// Ordre d'affichage. Colonnes : youtube_music_url = Short, youtube_url = YouTube Music.
const RELEASE_LINK_FIELDS = [
  { field: 'youtube_music_url', label: 'YouTube Shorts' },
  { field: 'youtube_url', label: 'YouTube Music' },
  { field: 'spotify_url', label: 'Spotify' },
  { field: 'apple_music_url', label: 'Apple Music' },
];

const STATUS_TEXT = {
  not_found: 'não encontrado entre as últimas publicações',
  not_configured: 'ainda não configurado (falta a chave da plataforma)',
  error: 'busca indisponível de momento',
};

function sameLink(a, b) {
  const clean = (u) => String(u || '').trim().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '');
  return clean(a) === clean(b);
}

/**
 * Bouton « Buscar links » : remplit les champs VIDES avec les liens trouvés, et propose
 * « Usar este » quand un champ déjà rempli diffère. Rien n'est enregistré avant Salvar.
 */
export default function ReleaseLinksFinder({ title, releaseDate, values, onApply }) {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    if (!title?.trim()) return;
    setIsSearching(true);
    try {
      const found = await findReleaseLinks({ title, release_date: releaseDate });
      for (const { field } of RELEASE_LINK_FIELDS) {
        if (found[field]?.status === 'found' && !values[field]?.trim()) onApply(field, found[field].url);
      }
      setResults(found);
    } catch {
      setResults(Object.fromEntries(RELEASE_LINK_FIELDS.map(({ field }) => [field, { status: 'error' }])));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-400">Procura os links pelo título e pela data de lançamento. Revê antes de clicar em Salvar.</p>
        <Button type="button" size="sm" variant="outline" onClick={handleSearch} disabled={isSearching || !title?.trim()} className="gap-1 text-xs h-7">
          <Search size={12} />
          {isSearching ? 'A procurar…' : 'Buscar links'}
        </Button>
      </div>
      {results && (
        <ul className="space-y-1 text-xs" aria-live="polite">
          {RELEASE_LINK_FIELDS.map(({ field, label }) => {
            const r = results[field] || { status: 'error' };
            if (r.status !== 'found') {
              return <li key={field} className="text-gray-500">{label} : {STATUS_TEXT[r.status] || STATUS_TEXT.error}</li>;
            }
            const current = values[field];
            // Champ vide = rempli à l'instant par la recherche (le parent met `values` à jour).
            if (!current?.trim() || sameLink(current, r.url)) {
              return <li key={field} className="text-green-400">✓ {label} : {r.title}</li>;
            }
            return (
              <li key={field} className="flex flex-wrap items-center gap-2 text-amber-300">
                <span>{label} : encontrado « {r.title} », diferente do link atual</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">abrir</a>
                <button type="button" onClick={() => onApply(field, r.url)} className="rounded border border-amber-300/40 px-2 py-0.5 hover:bg-amber-300/10">
                  Usar este
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
