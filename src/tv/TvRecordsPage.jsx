import { useEffect, useMemo, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Trophy } from 'lucide-react';
import FocusableButton from './components/FocusableButton';
import FocusRow from './components/FocusRow';
import TvTopNavigation from './components/TvTopNavigation';
import { topOverall } from '@/lib/karaokeRecords';
import { GAME_MODES } from '@/lib/karaokeGame';
import '@/styles/bs-lobby.css';

const FILTERS = [['all', 'Todos'], ...Object.entries(GAME_MODES).map(([key, m]) => [key, m.label])];
const formatDate = (at) => {
  try { return new Date(at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }); } catch { return ''; }
};

/**
 * « Recordes » (grand écran, 2026-11-16) : les meilleurs scores de CET appareil, toutes
 * músicas confondues, filtrables par mode. Une ligne ouvre « Antes de cantar » sur la
 * música, pour tenter de battre le recorde. Rien n'est envoyé : les recordes restent
 * dans l'appareil (src/lib/karaokeRecords.js).
 */
export default function TvRecordsPage({
  songs = [], onOpenLobby, onGoHome, onOpenCatalog, onOpenFesta, onOpenSettings, backInterceptorRef,
}) {
  const [filter, setFilter] = useState('all');
  const [all] = useState(() => topOverall(200));
  const rows = useMemo(() => all.filter((r) => filter === 'all' || r.mode === filter).slice(0, 12), [all, filter]);
  const songById = useMemo(() => new Map(songs.map((s) => [String(s.id), s])), [songs]);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => false;
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef]);

  useEffect(() => {
    const id = setTimeout(() => {
      try { SpatialNavigation.setFocus(all.length ? 'REC_ROW_0' : 'REC_FILTER_all'); } catch { /* ignore */ }
    }, 60);
    return () => clearTimeout(id);
  }, [all.length]);

  return (
    <div className="bs-screen bs-records">
      <TvTopNavigation active="recordes" onInicio={onGoHome} onCatalogo={onOpenCatalog} onFesta={onOpenFesta} onOpenSettings={onOpenSettings} />
      <div className="bs-records-body">
        <p className="bs-lobby-kicker"><Trophy size={22} aria-hidden="true" /> Recordes deste aparelho</p>
        <h1 className="bs-records-title">Quem canta melhor aqui?</h1>
        <FocusRow className="bs-lobby-row bs-records-filters" focusKey="REC_FILTERS">
          {FILTERS.map(([key, label]) => (
            <FocusableButton
              key={key}
              focusKey={`REC_FILTER_${key}`}
              className={`bs-lobby-mode bs-focus ${filter === key ? 'is-on' : ''}`}
              ariaLabel={`Filtrar: ${label}`}
              onPress={() => setFilter(key)}
            >
              <strong>{label}</strong>
            </FocusableButton>
          ))}
        </FocusRow>

        {rows.length === 0 ? (
          <p className="bs-records-empty">
            {all.length === 0
              ? 'Ainda não há recordes. Escolha uma música, configure o microfone e cante: os melhores pontos aparecem aqui.'
              : 'Nenhum recorde neste modo ainda.'}
          </p>
        ) : (
          <FocusRow className="bs-records-list" focusKey="REC_LIST">
            {rows.map((r, i) => {
              const song = songById.get(String(r.songId));
              return (
                <FocusableButton
                  key={r.id || `${r.songId}-${i}`}
                  focusKey={`REC_ROW_${i}`}
                  className={`bs-records-row bs-focus ${i === 0 ? 'is-first' : ''}`}
                  ariaLabel={`${i + 1}º ${r.name}, ${r.songTitle}, ${r.score} pontos. Cantar esta música`}
                  onPress={() => song && onOpenLobby?.(song)}
                >
                  <span className="bs-records-rank">{i + 1}</span>
                  <span className="bs-records-name">{r.name}</span>
                  <span className="bs-records-song">{r.songTitle}</span>
                  <span className="bs-records-mode">{GAME_MODES[r.mode]?.label || ''}</span>
                  <span className="bs-records-stars" aria-hidden="true">{'★'.repeat(r.stars || 0)}<span>{'★'.repeat(5 - (r.stars || 0))}</span></span>
                  <span className="bs-records-score">{r.score.toLocaleString('pt-BR')}</span>
                  <span className="bs-records-date">{formatDate(r.at)}</span>
                  {song && <Mic size={20} aria-hidden="true" className="bs-records-go" />}
                </FocusableButton>
              );
            })}
          </FocusRow>
        )}
      </div>
    </div>
  );
}
