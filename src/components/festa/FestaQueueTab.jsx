import { Mic2, X } from 'lucide-react';

/**
 * Aba « Fila » de /festa — lista das músicas em espera / tocando / já cantadas.
 * As reações ao vivo (aplaudir 👏, jogar tomate 🍅) e o micro emprestado vivem agora
 * no painel « Ao vivo » no topo da página (FestaLivePanel), sempre visível — aqui fica
 * só a lista + o botão de remover a própria entrada em espera.
 */
export default function FestaQueueTab({ songsById, queue, myEntryIds, onRemove }) {
  const visible = queue.filter((q) => q.status !== 'skipped');

  if (visible.length === 0) {
    return <p className="festa-empty">A fila está vazia — adiciona uma música na aba Catálogo.</p>;
  }

  return (
    <ul className="festa-queue-list">
      {visible.map((entry) => {
        const song = songsById.get(entry.song_id);
        const isMine = myEntryIds.has(entry.id);
        const canRemove = isMine && entry.status === 'waiting';
        return (
          <li key={entry.id} className={`festa-queue-item status-${entry.status}`}>
            <div className="festa-queue-item-main">
              {entry.status === 'playing' && <Mic2 size={16} className="festa-queue-playing-icon" />}
              <div className="festa-queue-item-text">
                <p className="festa-queue-song">{song?.title || 'Música'}</p>
                <p className="festa-queue-singer">{entry.singer_name}</p>
              </div>
              {canRemove && (
                <button type="button" className="festa-queue-remove" aria-label="Remover da fila" onClick={() => onRemove(entry.id)}>
                  <X size={16} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
