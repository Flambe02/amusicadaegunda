// Song create/edit form. Moved verbatim from the old Admin.jsx (behaviour
// preserved) so the redesign does not touch the create/edit flow.
import { useState } from 'react';
import { generateSongData } from '@/lib/hashtagGenerator';
import { generateSubtitle } from '@/lib/subtitleGenerator';
import { sanitizeInput, sanitizeURL } from '@/lib/security';
import {
  Plus, X, Save, Hash, Zap, ChevronDown, ChevronUp, Clock, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DEFAULT_CATEGORIES } from './adminData';

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  artist: 'A Música da Segunda',
  youtube_music_url: '',
  youtube_url: '',
  spotify_url: '',
  apple_music_url: '',
  cover_image: '',
  release_date: '',
  status: 'draft',
  description: '',
  lyrics: '',
  category: '',
  difficulty: null,
  hashtags: [],
  slug: '',
  publish_at: '',
};

const DIFFICULTY_OPTIONS = [
  { value: null, label: 'Auto', emoji: '✨' },
  { value: 'easy', label: 'Fácil', emoji: '🟢' },
  { value: 'medium', label: 'Médio', emoji: '🟡' },
  { value: 'hard', label: 'Difícil', emoji: '🔴' },
];

const SUBTITLE_MAX_LEN = 100;

function nextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function extractShortsId(url = '') {
  const m = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function SongForm({ initial, onSave, onCancel, isSaving, categories, songId, onAutoSaveHashtags }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...initial,
    subtitle: initial?.subtitle ?? '',
    spotify_url: initial?.spotify_url ?? '',
    apple_music_url: initial?.apple_music_url ?? '',
    youtube_url: initial?.youtube_url ?? '',
    youtube_music_url: initial?.youtube_music_url ?? '',
    cover_image: initial?.cover_image ?? '',
    description: initial?.description ?? '',
    lyrics: initial?.lyrics ?? '',
    publish_at: initial?.publish_at ?? '',
    release_date: initial?.release_date || nextMonday(),
    difficulty: initial?.difficulty ?? null,
    hashtags: Array.isArray(initial?.hashtags) ? initial.hashtags : [],
  }));
  const [showLyrics, setShowLyrics] = useState(!!initial?.lyrics);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isGeneratingSubtitle, setIsGeneratingSubtitle] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#+/, '').toLowerCase();
    if (tag && !form.hashtags.includes(tag)) set('hashtags', [...form.hashtags, tag]);
    setHashtagInput('');
  };

  const handleGenerateSubtitle = async () => {
    if (!form.title && !form.description) return;
    setIsGeneratingSubtitle(true);
    try {
      const { subtitle } = await generateSubtitle({ title: form.title, description: form.description });
      if (subtitle) set('subtitle', subtitle);
    } finally {
      setIsGeneratingSubtitle(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.title && !form.description) return;
    const { category, hashtags } = generateSongData({ title: form.title, description: form.description });
    let nextSubtitle = form.subtitle;
    if (!form.subtitle?.trim()) {
      setIsGeneratingSubtitle(true);
      try {
        const { subtitle } = await generateSubtitle({ title: form.title, description: form.description });
        if (subtitle) nextSubtitle = subtitle;
      } finally {
        setIsGeneratingSubtitle(false);
      }
    }
    setForm((f) => ({ ...f, category, hashtags, subtitle: nextSubtitle }));
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
          <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex: O Croissant" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="artist">Artista</Label>
          <Input id="artist" value={form.artist} onChange={(e) => set('artist', e.target.value)} placeholder="A Música da Segunda" className="mt-1" />
        </div>
      </div>

      {/* Subtitle (SEO) */}
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="subtitle">
            Subtítulo <span className="text-xs text-gray-400">(SEO — usado em &lt;title&gt;, alt, JSON-LD)</span>
          </Label>
          <Button type="button" size="sm" variant="outline" onClick={handleGenerateSubtitle} disabled={isGeneratingSubtitle || (!form.title && !form.description)} className="gap-1 text-xs h-7">
            <Sparkles size={12} />
            {isGeneratingSubtitle ? 'A gerar…' : 'Gerar com IA'}
          </Button>
        </div>
        <Input id="subtitle" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value.slice(0, SUBTITLE_MAX_LEN))} placeholder="Ex: O escândalo Vorcarô em paródia musical" maxLength={SUBTITLE_MAX_LEN} className="mt-1" />
        <p className={`text-xs mt-1 ${form.subtitle.length > SUBTITLE_MAX_LEN - 10 ? 'text-amber-400' : 'text-gray-500'}`}>
          {form.subtitle.length}/{SUBTITLE_MAX_LEN}
        </p>
      </div>

      {/* YouTube URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="yt_music_url">YouTube Shorts URL <span className="text-xs text-gray-400">(embed principal)</span></Label>
          <Input id="yt_music_url" value={form.youtube_music_url} onChange={(e) => set('youtube_music_url', e.target.value)} placeholder="https://youtube.com/shorts/..." className="mt-1" />
          {shortsId && <p className="text-xs text-green-400 mt-1">✓ ID: {shortsId}</p>}
        </div>
        <div>
          <Label htmlFor="yt_url">YouTube Music URL <span className="text-xs text-gray-400">(fallback)</span></Label>
          <Input id="yt_url" value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} placeholder="https://music.youtube.com/watch?v=..." className="mt-1" />
        </div>
      </div>

      {/* Streaming platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="spotify_url"><span className="inline-flex items-center gap-1">🎧 Spotify URL</span></Label>
          <Input id="spotify_url" value={form.spotify_url} onChange={(e) => set('spotify_url', e.target.value)} placeholder="https://open.spotify.com/track/..." className="mt-1" />
        </div>
        <div>
          <Label htmlFor="apple_music_url"><span className="inline-flex items-center gap-1">🎵 Apple Music URL</span></Label>
          <Input id="apple_music_url" value={form.apple_music_url} onChange={(e) => set('apple_music_url', e.target.value)} placeholder="https://music.apple.com/..." className="mt-1" />
        </div>
      </div>

      {/* Cover image + Release date + Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="cover">Imagem de capa</Label>
          <Input id="cover" value={form.cover_image} onChange={(e) => set('cover_image', e.target.value)} placeholder="https://..." className="mt-1" />
        </div>
        <div>
          <Label htmlFor="release_date">Data de lançamento *</Label>
          <Input id="release_date" type="date" value={form.release_date} onChange={(e) => set('release_date', e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => { set('status', e.target.value); if (e.target.value === 'published') set('publish_at', ''); }}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>
      </div>

      {/* Scheduled publish */}
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
              onChange={(e) => set('publish_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="mt-1 text-sm border-amber-500/30 bg-transparent"
            />
            {form.publish_at && (
              <p className="text-xs text-amber-400/70 mt-1">
                Será publicado automaticamente em {new Date(form.publish_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          {form.publish_at && (
            <button type="button" onClick={() => set('publish_at', '')} className="mt-1.5 text-gray-500 hover:text-red-400 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Descreve o contexto da música e a sua ligação com a atualidade…" rows={4} className="mt-1" />
      </div>

      {/* Lyrics toggle */}
      <div>
        <button type="button" onClick={() => setShowLyrics((v) => !v)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
          {showLyrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showLyrics ? 'Ocultar letra' : 'Adicionar letra'}
        </button>
        {showLyrics && (
          <Textarea value={form.lyrics} onChange={(e) => set('lyrics', e.target.value)} placeholder="Letra da música…" rows={6} className="mt-2 font-mono text-sm" />
        )}
      </div>

      {/* Category + Hashtags + Generate */}
      <div className="border border-white/10 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1"><Hash size={14} /> Categoria &amp; Hashtags</span>
          <Button type="button" size="sm" variant="outline" onClick={handleGenerate} disabled={isAutoSaving} className="gap-1 text-xs">
            <Zap size={12} /> {isAutoSaving ? 'A guardar…' : songId ? 'Gerar e guardar' : 'Gerar'}
          </Button>
        </div>

        <div>
          <Label>Categoria</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(categories || DEFAULT_CATEGORIES).map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set('category', o.value)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium transition-all ${
                  form.category === o.value ? `${o.color} ring-2 ring-white/30 scale-105` : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                }`}
              >
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Dificuldade <span className="text-gray-500 font-normal">(TV)</span></Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((o) => {
              const active = (form.difficulty ?? null) === o.value;
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => set('difficulty', o.value)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium transition-all ${
                    active ? 'bg-app-yellow/20 text-app-yellow border-app-yellow/40 ring-2 ring-app-yellow/30 scale-105' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {o.emoji} {o.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-1 text-gray-500">« Auto » estima pela densidade da letra. Uma escolha manual tem prioridade na TV.</p>
        </div>

        <div>
          <Label>Hashtags</Label>
          <div className="mt-1 min-h-[36px] flex flex-wrap gap-1 p-2 rounded-md border border-input bg-background">
            {form.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                #{tag}
                <button type="button" onClick={() => set('hashtags', form.hashtags.filter((t) => t !== tag))} className="ml-1 hover:text-red-400">
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
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
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
        <Button type="submit" disabled={isSaving} className="gap-1 bg-purple-600 hover:bg-purple-700">
          <Save size={14} />
          {isSaving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
