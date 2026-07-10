import { useMemo, useState } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { getYouTubeThumbnailUrl } from '@/lib/utils';

const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};

/**
 * Étape 2 de /festa — catálogo + recherche (comble un manque de l'écran TV,
 * qui n'a pas de recherche libre). "Adicionar à fila" reste possible même si
 * la chanson y est déjà (doublons tolérés, cf. spec — juste signalé visuellement).
 */
export default function FestaCatalogTab({ songs, queuedSongIds, onAdd, adding }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => (s.title || '').toLowerCase().includes(q));
  }, [songs, query]);

  return (
    <div className="festa-catalog">
      <div className="festa-search">
        <Search size={18} className="festa-search-icon" />
        <input
          type="search"
          placeholder="Buscar uma música…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="festa-search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="festa-empty">Nenhuma música encontrada.</p>
      ) : (
        <ul className="festa-song-list">
          {filtered.map((song) => {
            const thumb = getYouTubeThumbnailUrl(song.youtube_music_url, 'mqdefault')
              || getYouTubeThumbnailUrl(song.youtube_url, 'mqdefault')
              || song.cover_image;
            const already = queuedSongIds.has(song.id);
            return (
              <li key={song.id} className="festa-song-item">
                {thumb ? (
                  <img src={thumb} alt="" className="festa-song-thumb" loading="lazy" />
                ) : (
                  <div className="festa-song-thumb festa-song-thumb-empty" aria-hidden="true" />
                )}
                <div className="festa-song-info">
                  <p className="festa-song-title">{song.title}</p>
                  <p className="festa-song-cat">{CATEGORY_LABELS[song.category] || song.category || ''}</p>
                </div>
                <button
                  type="button"
                  className={`festa-add-btn ${already ? 'is-added' : ''}`}
                  disabled={adding === song.id}
                  onClick={() => onAdd(song)}
                  aria-label={already ? 'Já está na fila — adicionar de novo' : 'Adicionar à fila'}
                >
                  {already ? <Check size={18} /> : <Plus size={18} />}
                  {already ? 'Na fila' : 'Adicionar'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
