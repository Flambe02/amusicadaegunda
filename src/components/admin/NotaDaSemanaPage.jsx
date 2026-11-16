// « Nota da semana » — résultats des votes 🔥 / 😂 / 😐 (lecture seule).
// Source : fonction SQL song_reaction_totals() de
// supabase/migrations/20261115120000_create_song_reactions.sql (à appliquer dans le
// SQL Editor du dashboard). Lecture au montage de la page, jamais dans un
// onAuthStateChange.
import { useCallback, useEffect, useState } from 'react';
import { Flame, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchReactionTotals } from '@/api/reactions';
import { logger } from '@/lib/logger';

const pct = (n, total) => (total > 0 ? `${Math.round((n * 100) / total)}%` : '—');

export default function NotaDaSemanaPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(() => {
    let alive = true;
    setStatus('loading');
    fetchReactionTotals()
      .then((data) => {
        if (!alive) return;
        setRows(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (!alive) return;
        logger.warn('Nota da semana (admin) indisponível:', error);
        setStatus('error');
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Nota da semana</h1>
          <p className="text-sm text-gray-500">Votos 🔥 / 😂 / 😐 na música da semana (um voto por aparelho).</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="gap-1.5" disabled={status === 'loading'}>
          <RefreshCw size={14} /> Atualizar
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          <Flame size={14} className="text-purple-400" /> Resultados
        </h2>

        {status === 'loading' ? (
          <p className="text-sm text-gray-500">Carregando…</p>
        ) : status === 'error' ? (
          <p className="text-sm text-gray-500">
            Resultados indisponíveis. A migração <code className="text-gray-300">20261115120000_create_song_reactions.sql</code> já foi aplicada no Supabase?
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum voto ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Música</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium"><span aria-hidden="true">🔥</span><span className="sr-only">Pegou fogo</span></th>
                  <th scope="col" className="px-3 py-2 text-right font-medium"><span aria-hidden="true">😂</span><span className="sr-only">Morri de rir</span></th>
                  <th scope="col" className="px-3 py-2 text-right font-medium"><span aria-hidden="true">😐</span><span className="sr-only">Meh</span></th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.songId} className="border-b border-white/5 last:border-0">
                    <td className="max-w-[18rem] truncate py-2 pr-4 text-gray-200" title={row.title}>{row.title}</td>
                    {['fogo', 'risada', 'meh'].map((key) => (
                      <td key={key} className="px-3 py-2 text-right tabular-nums text-gray-300">
                        {row[key]} <span className="text-[11px] text-gray-600">{pct(row[key], row.total)}</span>
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-semibold tabular-nums text-white">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
