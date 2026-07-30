// Importar uma sincronização já existente: ficheiro .lrc, JSON de timing desta
// ferramenta, ou JSON de alinhamento por palavra (whisperX & co).
//
// O diálogo NÃO altera nada sozinho: calcula um plano com `buildImportPlan()` (puro,
// testado em src/lib/__tests__/timingImport.test.js), mostra exatamente o que vai
// acontecer — incluindo quantos tempos manuais serão substituídos — e só aplica
// depois de « Aplicar ». No editor, a aplicação passa por `commitLines()`, logo é
// anulável com Ctrl+Z como qualquer outra ação.
import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, FileUp, Loader2, X } from 'lucide-react';
import {
  buildImportPlan, IMPORT_FORMAT_LABEL, IMPORT_MODE_COPY, importSummaryChips,
} from '@/lib/timingImport';

const TONE_CLASS = {
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  bad: 'border-red-500/40 bg-red-500/10 text-red-300',
  info: 'border-violet-400/40 bg-violet-500/15 text-violet-200',
  muted: 'border-white/10 bg-white/5 text-gray-400',
};

export default function TimingImportDialog({ lines, onApply, onClose }) {
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const plan = useMemo(
    () => (text.trim() ? buildImportPlan({ fileName, text, currentLines: lines }) : null),
    [fileName, text, lines]
  );

  const readFile = useCallback(async (file) => {
    if (!file) return;
    setReading(true);
    try {
      const content = await file.text();
      setFileName(file.name);
      setText(content);
    } catch {
      setFileName(file.name);
      setText('');
    } finally {
      setReading(false);
    }
  }, []);

  const chips = plan?.ok ? importSummaryChips(plan.stats) : [];
  const modeCopy = plan?.ok ? IMPORT_MODE_COPY[plan.mode] : null;
  const unmatched = plan?.ok ? (plan.stats.unmatched || []) : [];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Importar sincronização">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161022] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300">
              <FileUp size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Importar sincronização</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Um ficheiro <code className="text-purple-300">.lrc</code>, o JSON de timing desta ferramenta,
                ou um JSON de alinhamento por palavra (com <code className="text-purple-300">words</code>).
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Escolher ou arrastar um ficheiro */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer?.files?.[0]); }}
            className={`rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
              dragging ? 'border-purple-400/60 bg-purple-500/10' : 'border-white/15 bg-black/20'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".lrc,.json,.txt,application/json,text/plain"
              className="hidden"
              aria-label="Escolher ficheiro de sincronização"
              onChange={(e) => readFile(e.target.files?.[0])}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              {reading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />} Escolher ficheiro
            </button>
            <p className="mt-2 text-[11px] text-gray-500">ou arrasta o ficheiro para aqui</p>
            {fileName && <p className="mt-2 truncate text-xs font-semibold text-gray-300">{fileName}</p>}
          </div>

          {/* Colar diretamente */}
          <div>
            <label htmlFor="timing-import-paste" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Ou cola o conteúdo aqui
            </label>
            <textarea
              id="timing-import-paste"
              value={text}
              onChange={(e) => { setFileName(''); setText(e.target.value); }}
              rows={6}
              placeholder={'[00:12.04]Cinco e quarenta\n\n…ou {"words":[{"start":12.04,"end":12.24,"text":"Cinco"}, …]}'}
              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-purple-400/50"
            />
          </div>

          {/* Pré-visualização do plano */}
          {plan && !plan.ok && (
            <p className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-200">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {plan.error}
            </p>
          )}

          {plan?.ok && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-gray-300">
                  {IMPORT_FORMAT_LABEL[plan.format]}
                </span>
                {chips.map((c) => (
                  <span key={c.key} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[c.tone]}`}>
                    {c.label}
                  </span>
                ))}
              </div>

              <div>
                <p className="text-sm font-semibold text-white">{modeCopy?.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">{modeCopy?.detail}</p>
              </div>

              {plan.overwritten > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {plan.overwritten} frase(s) já sincronizada(s) à mão vão receber um tempo diferente.
                  Podes anular tudo com <span className="font-mono">Ctrl+Z</span> depois de aplicar.
                </p>
              )}

              {unmatched.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[11px] font-semibold text-gray-400">
                    {unmatched.length} frase(s) sem correspondência — ficam como estão, para sincronizar à mão:
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {unmatched.slice(0, 6).map((i) => (
                      <li key={i} className="truncate text-[11px] text-gray-500">
                        <span className="mr-1.5 font-mono text-gray-600">{i + 1}.</span>{lines[i]?.text}
                      </li>
                    ))}
                    {unmatched.length > 6 && <li className="text-[11px] text-gray-600">…e {unmatched.length - 6} outra(s)</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button onClick={onClose} className="karaoke-focusable rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/10">
            Cancelar
          </button>
          <button
            onClick={() => plan?.ok && onApply(plan.lines, plan)}
            disabled={!plan?.ok || plan.stats.matchedLines === 0}
            className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
          >
            <Check size={15} /> Aplicar
          </button>
        </footer>
      </div>
    </div>
  );
}
