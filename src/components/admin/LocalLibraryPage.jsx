// Local library page (/admin/biblioteca): associate local master audio files
// with catalog songs. Files never leave the device (IndexedDB handles only).
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Music, FileAudio, Link2, Play, Unplug, Mic, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAdminData } from './AdminDataContext';
import { formatDayMonth } from './adminData';
import { useLocalMusicLibrary } from '@/hooks/useLocalMusicLibrary';
import { suggestMatchesForSong } from '@/lib/localFileMatcher';
import { formatDuration, formatBytes } from '@/lib/localAudioMetadata';
import LocalFolderConnector from './LocalFolderConnector';
import LocalAudioPreview from './LocalAudioPreview';

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'available', label: 'Arquivo disponível' },
  { key: 'none', label: 'Sem arquivo' },
  { key: 'missing', label: 'Não localizado' },
  { key: 'suggested', label: 'Sugestões de associação' },
];

function rowState(assoc) {
  if (!assoc) return 'none';
  if (assoc.handle) return 'available';
  return 'associated'; // fallback association (no persistent handle)
}

const STATE_LABEL = {
  available: { label: 'Disponível', Icon: CheckCircle2, tone: 'text-green-400' },
  associated: { label: 'Associado', Icon: CheckCircle2, tone: 'text-gray-300' },
  missing: { label: 'Não localizado', Icon: AlertTriangle, tone: 'text-amber-400' },
  none: { label: 'Não associado', Icon: Circle, tone: 'text-gray-500' },
};

export default function LocalLibraryPage() {
  const { toast } = useToast();
  const { songs, openKaraoke } = useAdminData();
  const lib = useLocalMusicLibrary();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(null); // { file, name }
  const [associating, setAssociating] = useState(null); // song being associated
  const [params, setParams] = useSearchParams();

  const existingAssocByHash = useMemo(() => {
    const map = {};
    for (const a of Object.values(lib.associations)) if (a.fileHash) map[a.fileHash] = a.songId;
    return map;
  }, [lib.associations]);

  const suggestionsBySong = useMemo(() => {
    const out = {};
    if (!lib.files.length) return out;
    for (const s of songs) {
      if (lib.associations[String(s.id)]) continue;
      const matches = suggestMatchesForSong({ id: s.id, title: s.title }, lib.files, existingAssocByHash);
      if (matches.length) out[String(s.id)] = matches;
    }
    return out;
  }, [songs, lib.files, lib.associations, existingAssocByHash]);

  // Deep link: /admin/biblioteca?song=ID → open the associate dialog for it.
  useEffect(() => {
    const id = params.get('song');
    if (id && songs.length) {
      const s = songs.find((x) => String(x.id) === String(id));
      if (s) { setAssociating(s); setParams({}, { replace: true }); }
    }
  }, [params, songs, setParams]);

  const rows = useMemo(() => {
    let list = songs;
    if (search.trim()) { const q = norm(search); list = list.filter((s) => norm(s.title).includes(q)); }
    list = list.filter((s) => {
      const st = rowState(lib.associations[String(s.id)]);
      if (filter === 'all') return true;
      if (filter === 'available') return st === 'available';
      if (filter === 'missing') return st === 'missing';
      if (filter === 'none') return st === 'none';
      if (filter === 'suggested') return st === 'none' && suggestionsBySong[String(s.id)];
      return true;
    });
    return list;
  }, [songs, search, filter, lib.associations, suggestionsBySong]);

  const openPreview = async (source) => {
    try {
      const file = await lib.resolveFile(source, { request: true });
      if (file) setPreview({ file, name: source.fileName });
    } catch { toast({ title: 'Não foi possível abrir o áudio', description: 'Autorize novamente o acesso à pasta.', variant: 'destructive' }); }
  };

  // Success is silent — the row's Estado flips to "Associado" immediately, so we
  // don't flood the screen with one toast per file. A *failure* still shows one
  // actionable message (otherwise the button just looks broken).
  const doAssociate = async (songId, localFile) => {
    try {
      await lib.associate(songId, localFile);
    } catch (e) {
      if (import.meta.env?.DEV) console.warn('[biblioteca] associate failed:', e?.message);
      const staleFallback = lib.root?.fallback && !(localFile?._file || localFile?.handle);
      toast({
        title: 'Não foi possível associar',
        description: e?.message === 'permission-required'
          ? 'Autorize novamente o acesso à pasta.'
          : staleFallback
            ? 'Selecione os arquivos novamente (o modo manual não os guarda ao recarregar a página).'
            : (e?.message || 'Arquivo indisponível.'),
        variant: 'destructive',
      });
    }
  };

  const remove = async (songId) => { await lib.removeAssociation(songId); };

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Biblioteca</h1>
        <p className="text-sm text-gray-500">Associe os masters locais às músicas do catálogo.</p>
      </div>

      <LocalFolderConnector lib={lib} onError={(e) => toast({ title: 'Erro', description: e?.message, variant: 'destructive' })} />

      {lib.root?.fallback && lib.files.length > 0 && !lib.files.some((f) => f._file) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
          Os arquivos escolhidos manualmente foram esquecidos ao recarregar a página. Clique em <span className="font-semibold">Selecionar arquivos</span> acima para escolhê-los novamente e poder associar. Para memorizar a pasta de forma permanente, abra o admin no Chrome ou Edge (desktop).
        </div>
      )}

      {preview && <LocalAudioPreview file={preview.file} fileName={preview.name} onClose={() => setPreview(null)} />}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar música…" className="pl-9" aria-label="Pesquisar música" />
        </div>
        <span className="text-xs text-gray-500">{lib.stats.filesCount} arquivos · {lib.stats.associationsCount} associados</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${filter === f.key ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 py-14 text-center text-sm text-gray-400">
          {!lib.root ? 'Conecte a pasta onde estão os seus arquivos de música.' : lib.files.length === 0 ? 'Nenhum arquivo de áudio encontrado nesta pasta.' : 'Nenhuma música neste filtro.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2 font-semibold">Música</th>
                <th className="px-3 py-2 font-semibold">Arquivo local</th>
                <th className="px-3 py-2 font-semibold">Duração</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const assoc = lib.associations[String(s.id)];
                const st = rowState(assoc);
                const meta = STATE_LABEL[st];
                const suggestion = !assoc ? suggestionsBySong[String(s.id)]?.[0] : null;
                return (
                  <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
                          {s.cover_image ? <img src={s.cover_image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Music size={14} className="text-gray-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{s.title}</p>
                          <p className="text-xs text-gray-500">{formatDayMonth(s.release_date)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {assoc ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-300"><FileAudio size={13} className="text-gray-500" /> <span className="truncate" title={assoc.fileName}>{assoc.fileName}</span></span>
                      ) : suggestion ? (
                        <span className="text-xs text-amber-300/80" title={suggestion.reasons.join(' · ')}>Possível: {suggestion.file.fileName}</span>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{formatDuration(assoc?.durationSeconds || suggestion?.file?.durationSeconds)}</td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1.5 text-xs ${meta.tone}`}><meta.Icon size={13} /> {meta.label}</span></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {assoc && assoc.handle && (
                          <button onClick={() => openPreview(assoc)} title="Ouvir" aria-label="Ouvir" className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><Play size={14} /></button>
                        )}
                        {assoc && (
                          <button onClick={() => openKaraoke(s)} title="Usar no sincronizador" aria-label="Usar no sincronizador" className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><Mic size={14} /></button>
                        )}
                        {suggestion && (
                          <button onClick={() => doAssociate(s.id, suggestion.file)} title="Associar sugestão" className="rounded border border-purple-500/30 px-2 py-1 text-xs text-purple-300 hover:bg-purple-500/10">Associar</button>
                        )}
                        <button onClick={() => setAssociating(s)} title={assoc ? 'Trocar arquivo' : 'Associar arquivo'} aria-label="Associar" className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><Link2 size={14} /></button>
                        {assoc && (
                          <button onClick={() => remove(s.id)} title="Remover associação" aria-label="Remover" className="rounded p-1.5 text-gray-400 hover:bg-red-500/15 hover:text-red-400"><Unplug size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Associate a file to a song (song → file) */}
      <AssociateFileForSong
        song={associating}
        files={lib.files}
        suggestions={associating ? suggestMatchesForSong({ id: associating.id, title: associating.title }, lib.files, existingAssocByHash) : []}
        onClose={() => setAssociating(null)}
        onPick={async (file) => { await doAssociate(associating.id, file); setAssociating(null); }}
        onPreview={openPreview}
      />
    </>
  );
}

function AssociateFileForSong({ song, files, suggestions, onClose, onPick, onPreview }) {
  const [q, setQ] = useState('');
  useEffect(() => { setQ(''); }, [song?.id]);
  if (!song) return null;

  const sugIds = new Set(suggestions.map((m) => m.file.id));
  const rest = files.filter((f) => !sugIds.has(f.id)).filter((f) => !q.trim() || norm(f.fileName).includes(norm(q)));

  return (
    <Dialog open={Boolean(song)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="border-white/10 bg-gray-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Associar arquivo — {song.title}</DialogTitle>
          <DialogDescription className="sr-only">Escolha um arquivo de áudio local para associar a esta música.</DialogDescription>
        </DialogHeader>
        {files.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Conecte uma pasta com arquivos de áudio primeiro.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Sugestões</p>
                <div className="space-y-1">
                  {suggestions.slice(0, 4).map((m) => (
                    <FileOption key={m.file.id} file={m.file} reasons={m.reasons} confidence={m.confidence} onPick={onPick} onPreview={onPreview} />
                  ))}
                </div>
              </div>
            )}
            <div>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar arquivo…" className="mb-2" aria-label="Procurar arquivo" />
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {rest.slice(0, 60).map((f) => <FileOption key={f.id} file={f} onPick={onPick} onPreview={onPreview} />)}
                {rest.length === 0 && <p className="px-2 py-3 text-center text-xs text-gray-500">Nenhum arquivo.</p>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FileOption({ file, reasons, confidence, onPick, onPreview }) {
  return (
    <div className="flex items-center gap-2 rounded border border-white/10 px-2 py-1.5">
      <FileAudio size={14} className="flex-shrink-0 text-gray-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-200" title={file.fileName}>{file.fileName}</p>
        <p className="text-[11px] text-gray-500">
          {formatBytes(file.sizeBytes)}
          {confidence ? <span className={confidence === 'high' || confidence === 'exact' ? 'ml-1 text-green-400' : 'ml-1 text-amber-400'}> · {reasons?.[0]}</span> : null}
        </p>
      </div>
      {file.handle && <button onClick={() => onPreview(file)} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Ouvir"><Play size={13} /></button>}
      <button onClick={() => onPick(file)} className="rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700">Associar</button>
    </div>
  );
}
