// Reusable "Editar links" dialog — edits the 4 platform URL columns of a song.
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';
import { LINK_PLATFORMS, toSongLinks, linkState, saveSongLinks } from '@/lib/adminSongLinks';

export default function EditSongLinksDialog({ song, open, onClose, onSaved }) {
  const { toast } = useToast();
  const initial = useMemo(() => (song ? toSongLinks(song) : null), [song]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setValues({ spotifyUrl: initial.spotifyUrl || '', appleMusicUrl: initial.appleMusicUrl || '', youtubeMusicUrl: initial.youtubeMusicUrl || '', youtubeVideoUrl: initial.youtubeVideoUrl || '' });
  }, [initial, song?.id]);

  if (!song) return null;

  const set = (key, v) => setValues((s) => ({ ...s, [key]: v }));

  const hasErrors = LINK_PLATFORMS.some((p) => {
    const st = linkState(p.key, values[p.key]);
    return st === 'invalid';
  });

  const handleSave = async () => {
    if (saving || hasErrors) return;
    setSaving(true);
    try {
      // Only send changed fields; '' clears intentionally.
      const patch = {};
      for (const p of LINK_PLATFORMS) {
        const before = (initial?.[p.key] ?? '') || '';
        const after = (values[p.key] ?? '').trim();
        if (before !== after) patch[p.key] = after;
      }
      if (Object.keys(patch).length === 0) { onClose(); return; }
      const { data } = await saveSongLinks(song.id, patch);
      toast({ title: '✅ Links atualizados' });
      onSaved?.(song.id, {
        spotify_url: values.spotifyUrl.trim() || null,
        apple_music_url: values.appleMusicUrl.trim() || null,
        youtube_url: values.youtubeMusicUrl.trim() || null,
        youtube_music_url: values.youtubeVideoUrl.trim() || null,
        ...(data || {}),
      });
      onClose();
    } catch (err) {
      toast({ title: 'Erro ao salvar links', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="border-white/10 bg-gray-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar links — {song.title}</DialogTitle>
          <DialogDescription className="sr-only">Editar os links de distribuição e vídeo desta música.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {LINK_PLATFORMS.map((p) => {
            const val = values[p.key] ?? '';
            const st = linkState(p.key, val);
            return (
              <div key={p.key}>
                <Label htmlFor={`link-${p.key}`}>{p.label}</Label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={`link-${p.key}`}
                      value={val}
                      onChange={(e) => set(p.key, e.target.value)}
                      placeholder={`https://${p.hosts[0]}/...`}
                      className={st === 'invalid' ? 'border-red-500/60 pr-8' : 'pr-8'}
                    />
                    {val && (
                      <button type="button" onClick={() => set(p.key, '')} aria-label="Limpar" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={st !== 'valid' && st !== 'foreign'}
                    asChild={st === 'valid' || st === 'foreign'}
                    title="Abrir link"
                  >
                    {st === 'valid' || st === 'foreign'
                      ? <a href={val} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /></a>
                      : <span><ExternalLink size={15} /></span>}
                  </Button>
                </div>
                {st === 'invalid' && <p className="mt-1 flex items-center gap-1 text-xs text-red-400"><AlertTriangle size={12} /> URL inválido</p>}
                {st === 'foreign' && <p className="mt-1 text-xs text-amber-400/80">Host incomum para {p.label} — verifique o link.</p>}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || hasErrors} className="bg-purple-600 hover:bg-purple-700">
            {saving ? 'Salvando…' : 'Salvar links'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
