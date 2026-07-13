// "Pasta de músicas" — folder connection status + actions (top of Biblioteca).
import { useRef } from 'react';
import { FolderOpen, FolderSync, RefreshCw, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LocalFolderConnector({ lib, onError }) {
  const { root, permission, browserSupport, scanning, scanProgress, connectFolder, reconnect, rescan, cancelScan, importFallbackFiles, clearLibrary } = lib;
  const fallbackRef = useRef(null);

  const run = (fn) => async () => { try { await fn(); } catch (e) { if (e?.name !== 'AbortError') onError?.(e); } };

  let statusLabel = 'Nenhuma pasta conectada';
  let tone = 'text-gray-400';
  if (browserSupport === 'none') { statusLabel = 'Navegador sem suporte'; tone = 'text-amber-400'; }
  else if (root?.fallback) { statusLabel = 'Seleção manual (sem persistência)'; tone = 'text-amber-400'; }
  else if (root && permission === 'granted') { statusLabel = `Pasta conectada: ${root.name}`; tone = 'text-green-400'; }
  else if (root && permission === 'denied') { statusLabel = 'Acesso recusado'; tone = 'text-red-400'; }
  else if (root) { statusLabel = `Pasta memorizada: ${root.name} — clique em Reconectar`; tone = 'text-amber-400'; }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Pasta de músicas</p>
          <p className={`mt-1 flex items-center gap-1.5 text-sm ${tone}`}>
            <FolderOpen size={15} /> {statusLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {browserSupport === 'full' && !root && (
            <Button onClick={run(connectFolder)} className="gap-2 bg-purple-600 hover:bg-purple-700"><FolderOpen size={15} /> Selecionar pasta</Button>
          )}
          {browserSupport === 'full' && root && permission !== 'granted' && (
            <Button onClick={run(reconnect)} variant="outline" className="gap-2"><FolderSync size={15} /> Reconectar</Button>
          )}
          {browserSupport === 'full' && root && (
            <>
              <Button onClick={run(connectFolder)} variant="outline" className="gap-2"><FolderSync size={15} /> Trocar pasta</Button>
              {!scanning
                ? <Button onClick={run(rescan)} variant="outline" className="gap-2"><RefreshCw size={15} /> Reexaminar</Button>
                : <Button onClick={cancelScan} variant="outline" className="gap-2"><RefreshCw size={15} className="animate-spin" /> Cancelar ({scanProgress})</Button>}
              <Button onClick={run(clearLibrary)} variant="outline" className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={15} /> Remover acesso</Button>
            </>
          )}

          {(browserSupport === 'fallback' || browserSupport === 'none') && (
            <>
              <input
                ref={fallbackRef}
                type="file"
                accept="audio/*"
                multiple
                // @ts-ignore non-standard directory selection
                webkitdirectory=""
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) importFallbackFiles(e.target.files); e.target.value = ''; }}
              />
              <Button onClick={() => fallbackRef.current?.click()} variant="outline" className="gap-2"><Upload size={15} /> Selecionar arquivos</Button>
            </>
          )}
        </div>
      </div>

      {browserSupport !== 'full' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-400/80">
          <AlertTriangle size={13} /> Este navegador não permite manter o acesso à pasta. Abra o admin no Chrome ou Edge (desktop) para memorizar a pasta e reconectar com um clique.
        </p>
      )}
      {browserSupport === 'full' && root && !root.fallback && permission !== 'granted' && permission !== 'denied' && (
        <p className="mt-3 text-xs text-gray-400">
          A pasta fica memorizada neste computador (nunca no Git nem no servidor). Basta um clique em <span className="text-gray-200">Reconectar</span> por sessão — exigência de segurança do navegador.
        </p>
      )}
      <p className="mt-2 text-[11px] text-gray-600">Os arquivos permanecem neste computador. Nada é enviado ao servidor.</p>
    </div>
  );
}
