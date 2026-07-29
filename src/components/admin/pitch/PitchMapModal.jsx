// Módulo A — gestor do « Guia de tom » (pitch-map) de uma música, no admin.
//
// Fluxo: escolher vocals LOCAL (nunca enviado) → gerar pitch-map num Web Worker
// (com progresso) → prévia piano-roll + estatísticas → guardar em Supabase
// (songs.pitch_map). Importar/Descarregar/Remover também disponíveis.
//
// O áudio vocal NUNCA sai do dispositivo (só a análise JSON é guardada). Mesmo
// princípio do estúdio da bola (useLocalAudioSession + audioHandleStore).
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Loader2, Play, Pause, Save, Download, Trash2, FileUp,
  AudioLines, Music, FolderOpen, Settings2, RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useLocalAudioSession } from '@/hooks/useLocalAudioSession';
import { usePitchAnalysisWorker } from '@/hooks/usePitchAnalysisWorker';
import { parsePitchReference } from '@/lib/pitchReference';
import { computePitchMapStats } from '@/lib/pitch/pitchMapBuilder';
import { ensureWritableSession, describeWriteError } from '@/components/admin/adminData';
import { saveAudioHandle, getAudioHandle, deleteAudioHandle } from '@/lib/audioHandleStore';
import PitchMapPreview from './PitchMapPreview';

const AUDIO_ACCEPT = {
  'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'], 'audio/x-wav': ['.wav'],
  'audio/mp4': ['.m4a'], 'audio/aac': ['.aac'], 'audio/ogg': ['.ogg'], 'audio/flac': ['.flac'],
};

export default function PitchMapModal({ song, onClose, onSaved, sharedAudio = null }) {
  const { toast } = useToast();
  // Se `sharedAudio` for fornecido (AdminLayout), usa-o em vez de instanciar uma
  // nova sessão — permite que o vocal carregado no ecrã « Sincronizar » (ou
  // vice-versa) seja reconhecido aqui de imediato, sem repetir a escolha do
  // ficheiro (§ sessão partilhada).
  const ownLocalAudio = useLocalAudioSession();
  const localAudio = sharedAudio || ownLocalAudio;
  const { analyze } = usePitchAnalysisWorker();
  const handleKey = `vocals-${song?.id}`;

  const supportsFsApi = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const pendingHandleRef = useRef(null);
  const [pendingName, setPendingName] = useState(null);

  const [pitchMap, setPitchMap] = useState(() => parsePitchReference(song?.pitch_map));
  const [dirty, setDirty] = useState(false);
  const [progress, setProgress] = useState(null); // 0..1 | null
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);
  const [minConfidence, setMinConfidence] = useState(0.8);

  const hasStored = parsePitchReference(song?.pitch_map) != null;

  // ── Escape + trava de scroll ──
  // Escape em fase de CAPTURA + stopPropagation: quando este modal está por cima do
  // editor de sincronização (z acima), o Escape fecha SÓ este, não o editor por baixo.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey, true); document.body.style.overflow = prev; };
  }, [onClose]);

  // ── Reabrir vocals memorizado (File System Access), se a permissão ainda vale ──
  useEffect(() => {
    if (!supportsFsApi || !song?.id) return undefined;
    if (localAudio.fileName) return undefined; // já há áudio (ex.: sessão partilhada) — não sobrepor
    let cancelled = false;
    (async () => {
      try {
        const handle = await getAudioHandle(handleKey);
        if (!handle || cancelled) return;
        pendingHandleRef.current = handle;
        const perm = await handle.queryPermission?.({ mode: 'read' });
        if (perm === 'granted') {
          const file = await handle.getFile();
          if (!cancelled) localAudio.load(file);
        } else if (!cancelled) setPendingName(handle.name || 'vocais');
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, supportsFsApi, handleKey]);

  // Sincroniza estado de reprodução com o elemento <audio>.
  useEffect(() => {
    const el = localAudio.audioRef.current;
    if (!el) return undefined;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onPause);
    return () => { el.removeEventListener('play', onPlay); el.removeEventListener('pause', onPause); el.removeEventListener('ended', onPause); };
  }, [localAudio.audioRef]);

  const pickVocals = useCallback(async () => {
    if (supportsFsApi) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false, types: [{ description: 'Vocais', accept: AUDIO_ACCEPT }],
        });
        const file = await handle.getFile();
        await localAudio.load(file);
        setPendingName(null);
        pendingHandleRef.current = handle;
        try { await saveAudioHandle(handleKey, handle); } catch { /* IndexedDB indisponível */ }
        toast({ title: `✔ Vocal carregado: ${file.name}`, description: sharedAudio ? 'Também disponível em Sincronizar.' : undefined });
      } catch { /* cancelado */ }
    } else {
      fileInputRef.current?.click();
    }
  }, [supportsFsApi, handleKey, localAudio, sharedAudio, toast]);

  const reopenVocals = useCallback(async () => {
    const handle = pendingHandleRef.current;
    if (!handle) return;
    try {
      const perm = await handle.requestPermission?.({ mode: 'read' });
      if (perm && perm !== 'granted') return;
      const file = await handle.getFile();
      await localAudio.load(file);
      setPendingName(null);
    } catch { /* ficheiro movido/renomeado */ }
  }, [localAudio]);

  const onFilePick = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      localAudio.load(f);
      toast({ title: `✔ Vocal carregado: ${f.name}`, description: sharedAudio ? 'Também disponível em Sincronizar.' : undefined });
    }
    e.target.value = '';
  };

  const removeVocals = useCallback(async () => {
    localAudio.clear();
    setPendingName(null);
    pendingHandleRef.current = null;
    try { await deleteAudioHandle(handleKey); } catch { /* noop */ }
  }, [localAudio, handleKey]);

  // ── Gerar pitch-map ──
  const generate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setProgress(0);
    try {
      const decoded = await localAudio.getMonoSamples();
      if (!decoded) { toast({ title: 'Carrega primeiro os vocais', variant: 'destructive' }); return; }
      const result = await analyze('pitchMap', decoded.samples, decoded.sampleRate,
        { source: localAudio.fileName || 'vocals', offsetMs, minConfidence },
        (v) => setProgress(v));
      setPitchMap(result);
      setDirty(true);
      toast({ title: `✔ ${result.notes.length} notas geradas` });
    } catch (err) {
      toast({ title: 'Erro na análise', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [generating, localAudio, analyze, offsetMs, minConfidence, toast]);

  const togglePlay = useCallback(() => {
    const el = localAudio.audioRef.current;
    if (!el || !localAudio.fileName) return;
    if (el.paused) el.play().catch(() => {}); else el.pause();
  }, [localAudio]);

  // ── Importar / Descarregar JSON ──
  const onImportJson = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    f.text().then((txt) => {
      const parsed = parsePitchReference(txt);
      if (!parsed) { toast({ title: 'JSON inválido', description: 'Formato de pitch-map não reconhecido.', variant: 'destructive' }); return; }
      parsed.stats = computePitchMapStats(parsed.notes, localAudio.duration || 0);
      setPitchMap(parsed);
      setDirty(true);
      toast({ title: `✔ Importado (${parsed.notes.length} notas)` });
    });
  };

  const downloadJson = useCallback(() => {
    if (!pitchMap) return;
    const toStore = serialize(pitchMap);
    const blob = new Blob([JSON.stringify(toStore, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${slugify(song?.title || 'musica')}.pitch-map.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pitchMap, song?.title]);

  // ── Supabase ──
  const saveToSupabase = useCallback(async () => {
    if (!pitchMap || saving) return;
    setSaving(true);
    try {
      await ensureWritableSession();
      const toStore = serialize(pitchMap);
      const { data, error } = await supabase.from('songs').update({ pitch_map: toStore }).eq('id', song.id).select();
      if (error) throw new Error(describeWriteError(error) || error.message);
      if (!data || data.length === 0) throw new Error('Nada gravado (0 linhas). Sessão expirada ou RLS.');
      onSaved?.(song.id, { pitch_map: toStore });
      setDirty(false);
      toast({ title: '✅ Guia de tom guardado!' });
    } catch (err) {
      toast({ title: 'Erro ao guardar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [pitchMap, saving, song?.id, onSaved, toast]);

  const removeFromSupabase = useCallback(async () => {
    setSaving(true);
    try {
      await ensureWritableSession();
      const { error } = await supabase.from('songs').update({ pitch_map: null }).eq('id', song.id).select();
      if (error) throw new Error(describeWriteError(error) || error.message);
      onSaved?.(song.id, { pitch_map: null });
      setPitchMap(null);
      setDirty(false);
      toast({ title: '🗑️ Guia de tom removido.' });
    } catch (err) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [song?.id, onSaved, toast]);

  const stats = pitchMap ? (pitchMap.stats || computePitchMapStats(pitchMap.notes, localAudio.duration || 0)) : null;
  const audioReady = Boolean(localAudio.fileName);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/75 p-4 py-8"
      role="dialog" aria-modal="true" aria-label={`Guia de tom — ${song?.title}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <AudioLines size={17} className="text-app-yellow" /> Guia de tom
            <span className="text-xs font-normal text-gray-500">— {song?.title}</span>
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-5 p-6">
          {/* Zona 1 — Áudio local */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500">1 · Vocais (local, nunca enviado)</p>
            {audioReady ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <Music size={15} className="shrink-0 text-app-yellow" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{localAudio.fileName}</span>
                {localAudio.loading && <Loader2 size={15} className="animate-spin text-gray-400" />}
                <button onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Ouvir'} className="rounded p-1.5 text-gray-300 hover:bg-white/10">
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button onClick={removeVocals} aria-label="Remover vocais" className="rounded p-1.5 text-gray-400 hover:bg-red-500/15 hover:text-red-400"><Trash2 size={15} /></button>
              </div>
            ) : pendingName ? (
              <button onClick={reopenVocals} className="flex w-full items-center justify-center gap-2 rounded-lg border border-app-yellow/30 bg-app-yellow/10 px-3 py-2.5 text-sm font-semibold text-app-yellow hover:bg-app-yellow/15">
                <FolderOpen size={15} /> Reabrir vocais: {pendingName}
              </button>
            ) : (
              <>
                <button onClick={pickVocals} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-3 py-3 text-sm text-gray-300 hover:bg-white/[0.06]">
                  <FileUp size={15} /> Escolher vocais (wav/mp3)
                </button>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Por segurança do navegador, o ficheiro tem de ser escolhido uma vez por sessão
                  (não é guardado nem enviado). Depois de escolhido aqui, fica também disponível em
                  « Sincronizar » sem repetir a escolha.
                </p>
              </>
            )}
            {localAudio.error && <p className="mt-1.5 text-xs text-amber-400/80">{localAudio.error}</p>}
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onFilePick} />
          </section>

          {/* Zona 2 — Gerar */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">2 · Gerar</p>
              <button onClick={() => setShowAdvanced((v) => !v)} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300">
                <Settings2 size={12} /> Avançado
              </button>
            </div>
            {showAdvanced && (
              <div className="mb-2 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <label className="text-xs text-gray-400">
                  Offset (ms)
                  <input type="number" step="50" value={offsetMs} onChange={(e) => setOffsetMs(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-white" />
                </label>
                <label className="text-xs text-gray-400">
                  Confiança mín. ({minConfidence})
                  <input type="range" min="0.5" max="0.95" step="0.05" value={minConfidence}
                    onChange={(e) => setMinConfidence(Number(e.target.value))} className="mt-2 w-full" />
                </label>
              </div>
            )}
            <button onClick={generate} disabled={!audioReady || generating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-app-yellow px-3 py-2.5 text-sm font-bold text-black disabled:opacity-40">
              {generating ? <><Loader2 size={16} className="animate-spin" /> A analisar… {Math.round((progress || 0) * 100)}%</> : <><AudioLines size={16} /> Gerar pitch-map</>}
            </button>
            {generating && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-app-yellow transition-[width] duration-150" style={{ width: `${Math.round((progress || 0) * 100)}%` }} />
              </div>
            )}
          </section>

          {/* Zona 3 — Prévia */}
          {pitchMap && stats && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">3 · Prévia {dirty && <span className="ml-1 text-app-yellow">· não guardado</span>}</p>
                <div className="flex gap-3 text-[11px] text-gray-400">
                  <span><b className="text-gray-200">{stats.noteCount}</b> notas</span>
                  <span><b className="text-gray-200">{stats.coveragePct}%</b> cantado</span>
                  <span><b className="text-gray-200">{stats.rangeLabel}</b></span>
                </div>
              </div>
              <PitchMapPreview notes={pitchMap.notes} audioRef={localAudio.audioRef} durationSec={localAudio.duration} />
              <div className="mt-1.5 flex items-center gap-2">
                <button onClick={togglePlay} disabled={!audioReady}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-gray-200 hover:bg-white/10 disabled:opacity-40">
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />} {isPlaying ? 'Pausar' : 'Ouvir com playhead'}
                </button>
                {!audioReady && <span className="text-[11px] text-gray-500">(carrega os vocais para veres o playhead)</span>}
              </div>
            </section>
          )}

          {/* Zona 4 — Ações */}
          <section className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <button onClick={saveToSupabase} disabled={!pitchMap || saving}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-40">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar no Supabase
            </button>
            <button onClick={() => jsonInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 hover:bg-white/10">
              <FileUp size={15} /> Importar JSON
            </button>
            <button onClick={downloadJson} disabled={!pitchMap} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-40">
              <Download size={15} /> Descarregar
            </button>
            {hasStored && (
              <button onClick={removeFromSupabase} disabled={saving} className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-40">
                <RotateCcw size={15} /> Remover do Supabase
              </button>
            )}
            <input ref={jsonInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportJson} />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Objeto a guardar (sem `stats` — o ficheiro/coluna não precisa delas).
function serialize(pitchMap) {
  return {
    version: pitchMap.version || 1,
    ...(pitchMap.source ? { source: pitchMap.source } : {}),
    generatedAt: pitchMap.generatedAt || new Date().toISOString(),
    notes: pitchMap.notes,
  };
}

function slugify(s) {
  return s.toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
