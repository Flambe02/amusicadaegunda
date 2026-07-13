// Category management panel. Moved from the old Admin.jsx; behaviour preserved.
import { useState } from 'react';
import { Plus, Trash2, Save, X, Settings, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_CATEGORIES } from './adminData';

export default function SettingsPanel({ categories, onChange, onClose }) {
  const [draft, setDraft] = useState(categories.map((c) => ({ ...c })));

  const update = (idx, field, val) => setDraft((d) => d.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  const addNew = () => setDraft((d) => [...d, { value: `cat_${Date.now()}`, label: 'Nova categoria', emoji: '🏷️', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }]);
  const remove = (idx) => setDraft((d) => d.filter((_, i) => i !== idx));
  const save = () => { onChange(draft); onClose(); };

  return (
    <div className="border border-white/10 rounded-xl bg-gray-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Settings size={14} className="text-purple-400" /> Gerir categorias
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar"><X size={14} /></button>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {draft.map((cat, idx) => (
          <div key={cat.value} className="flex items-center gap-2 group">
            <GripVertical size={12} className="text-gray-600 flex-shrink-0" />
            <input value={cat.emoji} onChange={(e) => update(idx, 'emoji', e.target.value)} className="w-10 text-center rounded bg-white/5 border border-white/10 px-1 py-1 text-sm focus:outline-none focus:border-purple-500" maxLength={4} />
            <input value={cat.label} onChange={(e) => update(idx, 'label', e.target.value)} className="flex-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-sm focus:outline-none focus:border-purple-500" />
            <input value={cat.value} onChange={(e) => update(idx, 'value', e.target.value.toLowerCase().replace(/\s+/g, '_'))} className="w-28 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-gray-500 focus:outline-none focus:border-purple-500 font-mono" placeholder="slug" />
            <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium flex-shrink-0 ${cat.color}`}>{cat.emoji} {cat.label}</span>
            <button onClick={() => remove(idx)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all" aria-label="Remover categoria">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <button onClick={addNew} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
          <Plus size={12} /> Adicionar categoria
        </button>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft(DEFAULT_CATEGORIES.map((c) => ({ ...c })))}>Repor padrão</Button>
          <Button size="sm" onClick={save} className="gap-1 bg-purple-600 hover:bg-purple-700"><Save size={12} /> Guardar</Button>
        </div>
      </div>
    </div>
  );
}
