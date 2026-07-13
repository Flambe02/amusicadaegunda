// Catalog toolbar: debounced search, refresh, and the primary "Nova música" CTA.
import { useEffect, useRef, useState } from 'react';
import { Search, RefreshCw, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SongCatalogToolbar({ search, onSearch, onRefresh, refreshing, onCreate }) {
  // Local text mirrors the input; pushes upstream debounced (~250ms).
  const [text, setText] = useState(search);
  const timer = useRef(null);

  // Keep local text in sync when search is cleared externally (e.g. "Limpar pesquisa").
  useEffect(() => { setText(search); }, [search]);

  const handleChange = (value) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(value), 250);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    setText('');
    onSearch('');
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Pesquisar título, descrição, categoria..."
          aria-label="Pesquisar músicas"
          className="pl-9 pr-9"
        />
        {text && (
          <button onClick={clear} aria-label="Limpar pesquisa" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>
      <Button variant="outline" size="icon" onClick={onRefresh} disabled={refreshing} title="Recarregar" aria-label="Recarregar catálogo">
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
      </Button>
      <Button onClick={onCreate} className="gap-2 bg-purple-600 hover:bg-purple-700">
        <Plus size={16} /> Nova música
      </Button>
    </div>
  );
}
