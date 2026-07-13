// "ARQUIVO LOCAL" — état de l'association audio locale d'une chanson (drawer).
// Ne montre jamais le chemin absolu ni l'utilisateur OS. L'audio ne quitte pas l'appareil.
import { useNavigate } from 'react-router-dom';
import { HardDriveDownload, AlertTriangle, FileAudio, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSongLocalAudio } from '@/hooks/useSongLocalAudio';
import { formatBytes, formatDuration, fileExtension } from '@/lib/localAudioMetadata';
import { deleteAssociation } from '@/lib/localMediaDb';
import { deleteAudioHandle } from '@/lib/audioHandleStore';

const STATE_META = {
  ready:      { label: 'Disponível neste dispositivo', tone: 'text-green-400', Icon: FileAudio },
  permission: { label: 'Arquivo associado, permissão necessária', tone: 'text-amber-400', Icon: AlertTriangle },
  missing:    { label: 'Arquivo conhecido, não localizado', tone: 'text-amber-400', Icon: AlertTriangle },
  none:       { label: 'Não associado', tone: 'text-gray-500', Icon: HardDriveDownload },
};

export default function SongLocalAudioStatus({ view }) {
  const navigate = useNavigate();
  const { assoc, state, loading } = useSongLocalAudio(view.id);
  const meta = STATE_META[state] || STATE_META.none;

  const goLibrary = () => navigate(`/admin/biblioteca?song=${view.id}`);
  const remove = async () => {
    try { await deleteAssociation(view.id); } catch { /* noop */ }
    try { await deleteAudioHandle(view.id); } catch { /* noop */ }
  };

  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Arquivo local</h3>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <div className={`flex items-center gap-2 text-xs ${meta.tone}`}>
          <meta.Icon size={14} /> {loading ? 'Verificando…' : meta.label}
        </div>

        {assoc && (
          <dl className="mt-2 space-y-1 text-xs text-gray-400">
            <div className="flex justify-between gap-2"><dt className="text-gray-500">Arquivo</dt><dd className="truncate text-right text-gray-300" title={assoc.fileName}>{assoc.fileName}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-gray-500">Formato</dt><dd className="text-gray-300">{(fileExtension(assoc.fileName) || '—').toUpperCase()}</dd></div>
            {assoc.durationSeconds ? <div className="flex justify-between gap-2"><dt className="text-gray-500">Duração</dt><dd className="text-gray-300">{formatDuration(assoc.durationSeconds)}</dd></div> : null}
            {assoc.sizeBytes ? <div className="flex justify-between gap-2"><dt className="text-gray-500">Tamanho</dt><dd className="text-gray-300">{formatBytes(assoc.sizeBytes)}</dd></div> : null}
            {assoc.lastResolvedAt ? <div className="flex justify-between gap-2"><dt className="text-gray-500">Verificado</dt><dd className="text-gray-300">{new Date(assoc.lastResolvedAt).toLocaleDateString('pt-BR')}</dd></div> : null}
          </dl>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={goLibrary} className="h-7 gap-1 text-xs">
            <HardDriveDownload size={13} /> {state === 'none' ? 'Associar arquivo' : 'Localizar na biblioteca'}
          </Button>
          {assoc && (
            <Button size="sm" variant="outline" onClick={remove} className="h-7 gap-1 border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <Unplug size={13} /> Remover associação
            </Button>
          )}
        </div>

        <p className="mt-2 text-[11px] text-gray-600">Este áudio permanece neste computador.</p>
      </div>
    </div>
  );
}
