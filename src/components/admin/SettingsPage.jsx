// Settings page: category management + a LOCAL-ONLY library subsection.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderSync, RefreshCw, Trash2, Unplug, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SettingsPanel from './SettingsPanel';
import { useAdminData } from './AdminDataContext';
import { useLocalMusicLibrary } from '@/hooks/useLocalMusicLibrary';
import { estimateLocalUsage } from '@/lib/localMediaDb';
import { formatBytes } from '@/lib/localAudioMetadata';

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-1.5 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { categories, setCategories } = useAdminData();
  const lib = useLocalMusicLibrary();
  const [usage, setUsage] = useState(null);

  useEffect(() => { estimateLocalUsage().then(setUsage); }, [lib.stats.filesCount, lib.stats.associationsCount]);

  const run = (fn, ok) => async () => { try { await fn(); if (ok) toast({ title: ok }); } catch (e) { if (e?.name !== 'AbortError') toast({ title: 'Erro', description: e?.message, variant: 'destructive' }); } };

  const permLabel = lib.permission === 'granted' ? 'Autorizada'
    : lib.permission === 'denied' ? 'Recusada'
    : lib.permission === 'unsupported' ? 'Não suportada'
    : lib.root ? 'Necessária' : '—';

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Configurações</h1>
        <p className="text-sm text-gray-500">Categorias e biblioteca local (apenas neste dispositivo).</p>
      </div>

      <SettingsPanel categories={categories} onChange={setCategories} onClose={() => navigate('/admin')} />

      <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          <HardDrive size={14} className="text-purple-400" /> Biblioteca local
        </h2>

        <div className="mb-4">
          <Stat label="Pasta conectada" value={lib.root ? (lib.root.name || 'Seleção manual') : 'Nenhuma'} />
          <Stat label="Permissão" value={permLabel} />
          <Stat label="Arquivos indexados" value={lib.stats.filesCount} />
          <Stat label="Músicas associadas" value={lib.stats.associationsCount} />
          <Stat label="Último exame" value={lib.stats.lastScan ? new Date(lib.stats.lastScan).toLocaleString('pt-BR') : '—'} />
          <Stat label="Armazenamento local" value={usage != null ? formatBytes(usage) : '—'} />
        </div>

        <div className="flex flex-wrap gap-2">
          {lib.root && lib.permission !== 'granted' && (
            <Button onClick={run(lib.reconnect)} variant="outline" size="sm" className="gap-1.5"><FolderSync size={14} /> Reconectar pasta</Button>
          )}
          {lib.root && (
            <Button onClick={run(lib.rescan)} variant="outline" size="sm" className="gap-1.5"><RefreshCw size={14} /> Reexaminar</Button>
          )}
          <Button onClick={run(lib.clearAllAssociations, 'Associações locais removidas')} variant="outline" size="sm" className="gap-1.5"><Unplug size={14} /> Limpar associações locais</Button>
          <Button onClick={run(lib.clearLibrary, 'Biblioteca local removida')} variant="outline" size="sm" className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={14} /> Remover biblioteca local</Button>
        </div>

        <p className="mt-3 text-[11px] text-gray-600">
          Estas ações afetam apenas este computador. Nenhuma música do catálogo (Supabase) é apagada aqui.
        </p>
      </div>
    </>
  );
}
