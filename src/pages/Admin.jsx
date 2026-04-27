import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateSongData } from '@/lib/hashtagGenerator';
import { generateSubtitle } from '@/lib/subtitleGenerator';
import { sanitizeInput, sanitizeURL } from '@/lib/security';
import { notifyAllSubscribers } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Edit2, Trash2, Search, Save, X, Music,
  Hash, Zap, ExternalLink, RefreshCw, Eye,
  ChevronDown, ChevronUp, LogOut, Settings, GripVertical, Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { value: 'politica',      label: 'Política',       emoji: '🏛️', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'economia',      label: 'Economia',       emoji: '💰', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'policia',       label: 'Polícia',        emoji: '👮', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'midia',         label: 'Mídia',          emoji: '📺', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'internacional', label: 'Internacional',  emoji: '🌍', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { value: 'energia',       label: 'Energia',        emoji: '⚡', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'saude',         label: 'Saúde',          emoji: '🏥', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { value: 'esporte',       label: 'Esporte',        emoji: '⚽', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'tecnologia',    label: 'Tecnologia',     emoji: '💻', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { value: 'seguranca',     label: 'Segurança',      emoji: '🚔', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'cultura',       label: 'Cultura',        emoji: '🎭', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { value: 'gastronomia',   label: 'Gastronomia',    emoji: '🍽️', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'outros',        label: 'Outros',         emoji: '❓', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const STORAGE_KEY = 'admin-categories-v1';

function loadCategories() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return DEFAULT_CATEGORIES;
}

function persistCategories(cats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

// Derive CATEGORY_OPTIONS shape from live categories (for form pills / SongRow)
function catOptions(categories) {
  return categories.map(c => ({ ...c, label: `${c.emoji} ${c.label}` }));
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ categories, onChange, onClose }) {
  const [draft, setDraft] = useState(categories.map(c => ({ ...c })));

  const update = (idx, field, val) =>
    setDraft(d => d.map((c, i) => i === idx ? { ...c, [field]: val } : c));

  const addNew = () =>
    setDraft(d => [...d, { value: `cat_${Date.now()}`, label: 'Nova categoria', emoji: '🏷️', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }]);

  const remove = (idx) =>
    setDraft(d => d.filter((_, i) => i !== idx));

  const save = () => { onChange(draft); onClose(); };

  return (
    <div className="border border-white/10 rounded-xl bg-gray-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Settings size={14} className="text-purple-400" /> Gerir categorias
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={14} /></button>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {draft.map((cat, idx) => (
          <div key={cat.value} className="flex items-center gap-2 group">
            <GripVertical size={12} className="text-gray-600 flex-shrink-0" />
            {/* Emoji */}
            <input
              value={cat.emoji}
              onChange={e => update(idx, 'emoji', e.target.value)}
              className="w-10 text-center rounded bg-white/5 border border-white/10 px-1 py-1 text-sm focus:outline-none focus:border-purple-500"
              maxLength={4}
            />
            {/* Label */}
            <input
              value={cat.label}
              onChange={e => update(idx, 'label', e.target.value)}
              className="flex-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-sm focus:outline-none focus:border-purple-500"
            />
            {/* Value (slug) */}
            <input
              value={cat.value}
              onChange={e => update(idx, 'value', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              className="w-28 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-gray-500 focus:outline-none focus:border-purple-500 font-mono"
              placeholder="slug"
            />
            {/* Preview pill */}
            <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium flex-shrink-0 ${cat.color}`}>
              {cat.emoji} {cat.label}
            </span>
            {/* Delete */}
            <button
              onClick={() => remove(idx)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <button
          onClick={addNew}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Plus size={12} /> Adicionar categoria
        </button>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft(DEFAULT_CATEGORIES.map(c => ({ ...c })))}>
            Repor padrão
          </Button>
          <Button size="sm" onClick={save} className="gap-1 bg-purple-600 hover:bg-purple-700">
            <Save size={12} /> Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Category badge pill — used in list rows
function CategoryPill({ value, categories, onClick }) {
  const cats = categories || DEFAULT_CATEGORIES;
  if (!value) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-dashed border-white/20 text-gray-600 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
      >
        + categoria
      </button>
    );
  }
  const cat = cats.find(c => c.value === value);
  if (!cat) return <span onClick={onClick} className="text-xs text-gray-500 cursor-pointer">{value}</span>;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium transition-all hover:brightness-125 ${cat.color}`}
    >
      {cat.emoji} {cat.label}
    </button>
  );
}

// Group songs array by year → month (desc)
function groupByYearMonth(songs) {
  const groups = {};
  for (const song of songs) {
    if (!song.release_date) {
      const key = 'Sem data';
      groups[key] = groups[key] || {};
      groups[key]['—'] = groups[key]['—'] || [];
      groups[key]['—'].push(song);
      continue;
    }
    const d = parseISO(song.release_date);
    const year = d.getFullYear().toString();
    const month = format(d, 'MMMM', { locale: ptBR });
    groups[year] = groups[year] || {};
    groups[year][month] = groups[year][month] || [];
    groups[year][month].push(song);
  }
  // Sort years desc, months desc (songs are already ordered by release_date desc)
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => ({
      year,
      months: Object.entries(months).map(([month, items]) => ({ month, items })),
    }));
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',            // SEO subtitle, ~40-80 chars (used in <title>, alt, JSON-LD)
  artist: 'A Música da Segunda',
  youtube_music_url: '',   // Shorts (embed principal)
  youtube_url: '',         // YouTube Music (fallback)
  spotify_url: '',
  apple_music_url: '',
  cover_image: '',
  release_date: '',
  status: 'draft',
  description: '',
  lyrics: '',
  category: '',
  hashtags: [],
  slug: '',
  publish_at: '',          // Auto-publish datetime (ISO string or '')
};

const SUBTITLE_MAX_LEN = 100;

function nextMonday() {
  const d = new Date();
  const day = d.getDay(); // 0 = dim, 1 = lun
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function extractShortsId(url = '') {
  const m = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function parseMissingColumn(error) {
  const message = error?.message || error?.details || '';
  const patterns = [
    /Could not find the '([^']+)' column of 'songs' in the schema cache/i,
    /column ['"]?([^'".\s]+)['"]? does not exist/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function normalizeSongPayload(formData) {
  const payload = Object.fromEntries(
    Object.entries(formData).filter(([, value]) => value !== '' && !(Array.isArray(value) && value.length === 0))
  );

  if (payload.youtube_music_url && !payload.youtube_url) {
    payload.youtube_url = payload.youtube_music_url;
  }

  return payload;
}

async function persistSongWithSchemaFallback({ panel, payload }) {
  let nextPayload = { ...payload };
  const removedColumns = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await (
      panel === 'new'
        ? supabase.from('songs').insert([nextPayload]).select().single()
        : supabase.from('songs').update(nextPayload).eq('id', panel.id).select().single()
    );

    if (!error) {
      return { data, removedColumns };
    }

    const missingColumn = parseMissingColumn(error);
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw error;
    }

    if (missingColumn === 'youtube_music_url' && !nextPayload.youtube_url && payload.youtube_music_url) {
      nextPayload.youtube_url = payload.youtube_music_url;
    }

    delete nextPayload[missingColumn];
    removedColumns.push(missingColumn);
  }

  throw new Error('Impossible de sauvegarder la chanson: trop de colonnes manquantes dans la table songs.');
}

// ─── Song Form ───────────────────────────────────────────────────────────────

function SongForm({ initial, onSave, onCancel, isSaving, categories, songId, onAutoSaveHashtags }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...initial,
    release_date: initial?.release_date || nextMonday(),
    hashtags: Array.isArray(initial?.hashtags) ? initial.hashtags : [],
  }));
  const [showLyrics, setShowLyrics] = useState(!!initial?.lyrics);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isGeneratingSubtitle, setIsGeneratingSubtitle] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#+/, '').toLowerCase();
    if (tag && !form.hashtags.includes(tag)) {
      set('hashtags', [...form.hashtags, tag]);
    }
    setHashtagInput('');
  };

  const handleGenerateSubtitle = async () => {
    if (!form.title && !form.description) return;
    setIsGeneratingSubtitle(true);
    try {
      const { subtitle } = await generateSubtitle({
        title: form.title,
        description: form.description,
      });
      if (subtitle) set('subtitle', subtitle);
    } finally {
      setIsGeneratingSubtitle(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.title && !form.description) return;
    const { category, hashtags } = generateSongData({
      title: form.title,
      description: form.description,
    });
    // Génère aussi le subtitle si vide (en parallèle)
    let nextSubtitle = form.subtitle;
    if (!form.subtitle?.trim()) {
      setIsGeneratingSubtitle(true);
      try {
        const { subtitle } = await generateSubtitle({
          title: form.title,
          description: form.description,
        });
        if (subtitle) nextSubtitle = subtitle;
      } finally {
        setIsGeneratingSubtitle(false);
      }
    }
    setForm(f => ({ ...f, category, hashtags, subtitle: nextSubtitle }));
    if (songId && onAutoSaveHashtags && hashtags.length > 0) {
      setIsAutoSaving(true);
      await onAutoSaveHashtags({ hashtags, category, subtitle: nextSubtitle });
      setIsAutoSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      title: sanitizeInput(form.title),
      subtitle: sanitizeInput(form.subtitle),
      description: sanitizeInput(form.description),
      lyrics: sanitizeInput(form.lyrics),
      youtube_music_url: sanitizeURL(form.youtube_music_url) || null,
      youtube_url: sanitizeURL(form.youtube_url) || null,
      spotify_url: sanitizeURL(form.spotify_url) || null,
      apple_music_url: sanitizeURL(form.apple_music_url) || null,
      cover_image: sanitizeURL(form.cover_image) || null,
      hashtags: Array.isArray(form.hashtags) ? form.hashtags : [],
    });
  };

  const shortsId = extractShortsId(form.youtube_music_url);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Title + Artist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Ex: O Croissant"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="artist">Artista</Label>
          <Input
            id="artist"
            value={form.artist}
            onChange={e => set('artist', e.target.value)}
            placeholder="A Música da Segunda"
            className="mt-1"
          />
        </div>
      </div>

      {/* Subtitle (SEO) */}
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="subtitle">
            Subtítulo <span className="text-xs text-gray-400">(SEO — usado em &lt;title&gt;, alt, JSON-LD)</span>
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGenerateSubtitle}
            disabled={isGeneratingSubtitle || (!form.title && !form.description)}
            className="gap-1 text-xs h-7"
          >
            <Sparkles size={12} />
            {isGeneratingSubtitle ? 'A gerar…' : 'Gerar com IA'}
          </Button>
        </div>
        <Input
          id="subtitle"
          value={form.subtitle}
          onChange={e => set('subtitle', e.target.value.slice(0, SUBTITLE_MAX_LEN))}
          placeholder="Ex: O escândalo Vorcarô em paródia musical"
          maxLength={SUBTITLE_MAX_LEN}
          className="mt-1"
        />
        <p className={`text-xs mt-1 ${form.subtitle.length > SUBTITLE_MAX_LEN - 10 ? 'text-amber-400' : 'text-gray-500'}`}>
          {form.subtitle.length}/{SUBTITLE_MAX_LEN}
        </p>
      </div>

      {/* YouTube URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="yt_music_url">
            YouTube Shorts URL <span className="text-xs text-gray-400">(embed principal)</span>
          </Label>
          <Input
            id="yt_music_url"
            value={form.youtube_music_url}
            onChange={e => set('youtube_music_url', e.target.value)}
            placeholder="https://youtube.com/shorts/..."
            className="mt-1"
          />
          {shortsId && (
            <p className="text-xs text-green-400 mt-1">✓ ID: {shortsId}</p>
          )}
        </div>
        <div>
          <Label htmlFor="yt_url">
            YouTube Music URL <span className="text-xs text-gray-400">(fallback)</span>
          </Label>
          <Input
            id="yt_url"
            value={form.youtube_url}
            onChange={e => set('youtube_url', e.target.value)}
            placeholder="https://music.youtube.com/watch?v=..."
            className="mt-1"
          />
        </div>
      </div>

      {/* Streaming platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="spotify_url">
            <span className="inline-flex items-center gap-1">🎧 Spotify URL</span>
          </Label>
          <Input
            id="spotify_url"
            value={form.spotify_url}
            onChange={e => set('spotify_url', e.target.value)}
            placeholder="https://open.spotify.com/track/..."
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="apple_music_url">
            <span className="inline-flex items-center gap-1">🎵 Apple Music URL</span>
          </Label>
          <Input
            id="apple_music_url"
            value={form.apple_music_url}
            onChange={e => set('apple_music_url', e.target.value)}
            placeholder="https://music.apple.com/..."
            className="mt-1"
          />
        </div>
      </div>

      {/* Cover image + Release date + Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="cover">Imagem de capa</Label>
          <Input
            id="cover"
            value={form.cover_image}
            onChange={e => set('cover_image', e.target.value)}
            placeholder="https://..."
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="release_date">Data de lançamento *</Label>
          <Input
            id="release_date"
            type="date"
            value={form.release_date}
            onChange={e => set('release_date', e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={form.status}
            onChange={e => {
              set('status', e.target.value);
              if (e.target.value === 'published') set('publish_at', '');
            }}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>
      </div>

      {/* Scheduled publish — only shown when status is draft */}
      {form.status === 'draft' && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5">
          <Clock size={16} className="text-amber-400 mt-2 flex-shrink-0" />
          <div className="flex-1">
            <Label htmlFor="publish_at" className="text-amber-300 text-xs">
              Publicação automática <span className="text-gray-500 font-normal">(opcional)</span>
            </Label>
            <Input
              id="publish_at"
              type="datetime-local"
              value={form.publish_at ? form.publish_at.slice(0, 16) : ''}
              onChange={e => set('publish_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="mt-1 text-sm border-amber-500/30 bg-transparent"
            />
            {form.publish_at && (
              <p className="text-xs text-amber-400/70 mt-1">
                Será publicado automaticamente em {new Date(form.publish_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          {form.publish_at && (
            <button
              type="button"
              onClick={() => set('publish_at', '')}
              className="mt-1.5 text-gray-500 hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Descreve o contexto da música e a sua ligação com a atualidade…"
          rows={4}
          className="mt-1"
        />
      </div>

      {/* Lyrics toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowLyrics(v => !v)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {showLyrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showLyrics ? 'Ocultar letra' : 'Adicionar letra'}
        </button>
        {showLyrics && (
          <Textarea
            value={form.lyrics}
            onChange={e => set('lyrics', e.target.value)}
            placeholder="Letra da música…"
            rows={6}
            className="mt-2 font-mono text-sm"
          />
        )}
      </div>

      {/* Category + Hashtags + Generate */}
      <div className="border border-white/10 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1">
            <Hash size={14} /> Categoria &amp; Hashtags
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isAutoSaving}
            className="gap-1 text-xs"
          >
            <Zap size={12} /> {isAutoSaving ? 'A guardar…' : songId ? 'Gerar e guardar' : 'Gerar'}
          </Button>
        </div>

        <div>
          <Label>Categoria</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(categories || DEFAULT_CATEGORIES).map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => set('category', o.value)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium transition-all
                  ${form.category === o.value
                    ? `${o.color} ring-2 ring-white/30 scale-105`
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  }`}
              >
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Hashtags</Label>
          <div className="mt-1 min-h-[36px] flex flex-wrap gap-1 p-2 rounded-md border border-input bg-background">
            {form.hashtags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                #{tag}
                <button
                  type="button"
                  onClick={() => set('hashtags', form.hashtags.filter(t => t !== tag))}
                  className="ml-1 hover:text-red-400"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
            {form.hashtags.length === 0 && (
              <span className="text-xs text-gray-500">Clique em &quot;Gerar e guardar&quot; ou adicione manualmente</span>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
              placeholder="#hashtag"
              className="text-sm h-8"
            />
            <Button type="button" size="sm" variant="outline" onClick={addHashtag} className="h-8 px-3 gap-1 text-xs">
              <Plus size={12} /> Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X size={14} className="mr-1" /> Cancelar
        </Button>
        <Button type="submit" disabled={isSaving} className="gap-1">
          <Save size={14} />
          {isSaving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

// ─── Song Row ────────────────────────────────────────────────────────────────

function SongRow({ song, onEdit, onDelete, onPublish, onCategoryChange, categories }) {
  const [showCatPicker, setShowCatPicker] = useState(false);
  const isPublished = song.status === 'published';

  const handleCategorySelect = (value) => {
    setShowCatPicker(false);
    if (value !== song.category) onCategoryChange(song.id, value);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
      {/* Cover thumb */}
      <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
        {song.cover_image
          ? <img src={song.cover_image} alt="" className="w-full h-full object-cover" />
          : <Music size={16} className="m-auto mt-[10px] text-gray-500" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{song.title}</p>
          <p className="text-xs text-gray-500">
            {song.release_date ? format(parseISO(song.release_date), 'dd MMM', { locale: ptBR }) : '—'}
          </p>
        </div>

        {/* Inline category picker */}
        <div className="relative">
          <CategoryPill
            value={song.category}
            categories={categories}
            onClick={() => setShowCatPicker(v => !v)}
          />
          {showCatPicker && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-gray-900 border border-white/10 rounded-xl shadow-xl p-2 w-64">
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {(categories || DEFAULT_CATEGORIES).map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs border font-medium transition-all hover:brightness-125
                      ${song.category === cat.value ? `${cat.color} ring-1 ring-white/30` : cat.color}`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => handleCategorySelect('')}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  ✕ Remover categoria
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scheduled publish indicator */}
      {!isPublished && song.publish_at && (
        <span
          title={`Publicação: ${new Date(song.publish_at).toLocaleString('pt-BR')}`}
          className="hidden sm:flex items-center gap-1 text-xs text-amber-400 flex-shrink-0"
        >
          <Clock size={12} />
          {format(parseISO(song.publish_at), 'dd/MM HH:mm')}
        </span>
      )}

      {/* Status badge */}
      <Badge
        variant={isPublished ? 'default' : 'secondary'}
        className="hidden sm:flex text-xs flex-shrink-0"
      >
        {isPublished ? 'Publicado' : 'Rascunho'}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isPublished && (
          <button
            onClick={() => onPublish(song)}
            title="Publicar"
            className="p-1.5 rounded hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-colors"
          >
            <Eye size={14} />
          </button>
        )}
        {song.youtube_music_url && (
          <a
            href={song.youtube_music_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver no YouTube"
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          onClick={() => onEdit(song)}
          title="Editar"
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(song)}
          title="Apagar"
          className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const { toast } = useToast();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState(null); // null | 'new' | song object
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [categories, setCategories] = useState(loadCategories);
  const [showSettings, setShowSettings] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'draft'

  // ── Load ──
  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('release_date', { ascending: false });
      if (error) throw error;
      setSongs(data || []);
    } catch {
      toast({ title: 'Erro ao carregar músicas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Auto-publish scheduled songs ──
  const checkScheduled = useCallback(async () => {
    const now = new Date().toISOString();
    const due = songs.filter(
      s => s.status === 'draft' && s.publish_at && s.publish_at <= now
    );
    for (const song of due) {
      const { error } = await supabase
        .from('songs')
        .update({ status: 'published', publish_at: null })
        .eq('id', song.id);
      if (!error) {
        toast({ title: `✅ "${song.title}" publicada automaticamente!` });
        try {
          await notifyAllSubscribers({
            title: '🎵 Nova Música da Segunda!',
            body: song.title,
            url: song.slug ? `/musica/${song.slug}` : '/',
          });
        } catch { /* silent */ }
      }
    }
    if (due.length > 0) await loadSongs();
  }, [songs, toast, loadSongs]);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  // Check scheduled every 60 seconds
  useEffect(() => {
    checkScheduled();
    const interval = setInterval(checkScheduled, 60_000);
    return () => clearInterval(interval);
  }, [checkScheduled]);

  // ── Filter ──
  const filtered = useMemo(() => {
    let result = songs;
    if (statusFilter === 'published') result = result.filter(s => s.status === 'published');
    else if (statusFilter === 'draft') result = result.filter(s => s.status !== 'published');
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [songs, statusFilter, search]);

  // ── Save (create or update) ──
  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      const wasPublished = panel?.status === 'published';
      const becomesPublished = formData.status === 'published';
      const toSave = normalizeSongPayload(formData);
      const { removedColumns } = await persistSongWithSchemaFallback({ panel, payload: toSave });

      toast({
        title: panel === 'new' ? 'Musique creee' : 'Musique mise a jour',
        description: removedColumns.length > 0
          ? `Champs non enregistres dans Supabase: ${removedColumns.join(', ')}.`
          : undefined,
      });
      // Push notification when publishing for the first time
      if (!wasPublished && becomesPublished) {
        try {
          await notifyAllSubscribers({
            title: '🎵 Nova Música da Segunda!',
            body: formData.title,
            url: formData.slug ? `/musica/${formData.slug}` : '/',
          });
        } catch {
          // Silent — push failure shouldn't block save
        }
      }

      setPanel(null);
      await loadSongs();
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Quick publish ──
  const handlePublish = async (song) => {
    try {
      const { error } = await supabase.from('songs').update({ status: 'published' }).eq('id', song.id);
      if (error) throw error;
      try {
        await notifyAllSubscribers({
          title: '🎵 Nova Música da Segunda!',
          body: song.title,
          url: song.slug ? `/musica/${song.slug}` : '/',
        });
      } catch {
        // Silent
      }
      toast({ title: `✅ "${song.title}" publicada!` });
      await loadSongs();
    } catch (err) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' });
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const { error } = await supabase.from('songs').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      toast({ title: `🗑️ "${confirmDelete.title}" apagada.` });
      setConfirmDelete(null);
      await loadSongs();
    } catch (err) {
      toast({ title: 'Erro ao apagar', description: err.message, variant: 'destructive' });
    }
  };

  // ── Auto-save hashtags + category + subtitle (called from SongForm "Gerar e guardar") ──
  const handleAutoSaveHashtags = useCallback(async ({ hashtags, category, subtitle }) => {
    if (!panel || panel === 'new') return;
    const update = { hashtags, category };
    if (subtitle && subtitle !== panel.subtitle) update.subtitle = subtitle;
    const { error } = await supabase
      .from('songs')
      .update(update)
      .eq('id', panel.id);
    if (error) {
      toast({ title: 'Erro ao guardar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Guardado!' });
      setSongs(prev => prev.map(s => s.id === panel.id ? { ...s, ...update } : s));
    }
  }, [panel, toast]);

  // ── Category change (inline from SongRow) ──
  const handleCategoryChange = async (songId, newCategory) => {
    const { error } = await supabase.from('songs').update({ category: newCategory }).eq('id', songId);
    if (error) {
      toast({ title: 'Erro ao mudar categoria', variant: 'destructive' });
    } else {
      setSongs(prev => prev.map(s => s.id === songId ? { ...s, category: newCategory } : s));
    }
  };

  // ── Logout ──
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // ── Stats ──
  const published = songs.filter(s => s.status === 'published').length;
  const drafts = songs.length - published;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music size={20} className="text-purple-400" />
          <span className="font-semibold">Admin — A Música da Segunda</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{published} publicadas · {drafts} rascunhos</span>
          <button
            onClick={() => setShowSettings(v => !v)}
            title="Categorias"
            className={`flex items-center gap-1 transition-colors ${showSettings ? 'text-purple-400' : 'hover:text-white'}`}
          >
            <Settings size={14} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar título, descrição, categoria…"
                className="pl-9"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadSongs}
              title="Recarregar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              onClick={() => setPanel('new')}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Plus size={16} /> Nova música
            </Button>
          </div>
          <div className="flex gap-1">
            {[['all', `Todos (${songs.length})`], ['published', `Publicados (${published})`], ['draft', `Rascunhos (${drafts})`]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusFilter === v ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <SettingsPanel
            categories={categories}
            onChange={cats => { setCategories(cats); persistCategories(cats); }}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Form panel (create / edit) */}
        {panel !== null && (
          <div className="border border-white/10 rounded-xl bg-gray-900 p-6">
            <h2 className="text-base font-semibold mb-5">
              {panel === 'new' ? '➕ Nova música' : `✏️ Editar — ${panel.title}`}
            </h2>
            <SongForm
              initial={panel === 'new' ? null : panel}
              onSave={handleSave}
              onCancel={() => setPanel(null)}
              isSaving={isSaving}
              categories={categories}
              songId={panel === 'new' ? null : panel?.id}
              onAutoSaveHashtags={panel !== 'new' ? handleAutoSaveHashtags : undefined}
            />
          </div>
        )}

        {/* Song list — grouped by year / month */}
        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">A carregar…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm border border-white/10 rounded-xl">
            {search ? 'Nenhuma música encontrada.' : 'Nenhuma música. Crie a primeira!'}
          </div>
        ) : (
          <div className="space-y-6">
            {groupByYearMonth(filtered).map(({ year, months }) => (
              <div key={year}>
                {/* Year header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl font-bold text-white/80">{year}</span>
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-gray-500">
                    {months.reduce((n, m) => n + m.items.length, 0)} músicas
                  </span>
                </div>

                {/* Months */}
                <div className="space-y-4">
                  {months.map(({ month, items }) => (
                    <div key={month}>
                      {/* Month label */}
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                          {month}
                        </span>
                        <span className="text-xs text-gray-600">({items.length})</span>
                      </div>

                      {/* Songs */}
                      <div className="border border-white/10 rounded-xl overflow-hidden">
                        {items.map(song => (
                          <SongRow
                            key={song.id}
                            song={song}
                            categories={categories}
                            onEdit={s => {
                              setPanel(s);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            onDelete={s => setConfirmDelete(s)}
                            onPublish={handlePublish}
                            onCategoryChange={handleCategoryChange}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold">Apagar música?</h3>
            <p className="text-sm text-gray-400">
              &quot;{confirmDelete.title}&quot; será removida permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} className="gap-1">
                <Trash2 size={14} /> Apagar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

