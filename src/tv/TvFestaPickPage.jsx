import { useEffect, useMemo } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { PartyPopper, Shuffle } from 'lucide-react';
import TvTopNavigation from './components/TvTopNavigation';
import FocusableButton from './components/FocusableButton';
import FocusRow from './components/FocusRow';
import BsPoster from './components/BsPoster';
import { getDifficultyMeta } from './lib/songMeta';
import { formatShortDate } from './lib/bsSong';
import '@/styles/bs-home.css';
import '@/styles/bs-lobby.css';
import '@/styles/bs-festa.css';

/**
 * Festa → « Começar a cantar » quand aucun celular n'a encore rien pedido (audit grand
 * écran B5, 2026-11-16) : on choisit la primeira música ici, dans le style du reste de
 * l'interface. Remplace l'ancien écran « mode-landing » (autre barre, « Karaokê » et
 * « Clipes » revenus, indicateur de Festa perdu).
 *
 * Ensuite, TvApp fait passer la fila des celulares ; si elle est vide, une música du
 * catálogo karaokê suit (filet de sécurité de `advanceFesta`).
 */
export default function TvFestaPickPage({
  songs = [], getHasKaraoke, festaQueueCount = null, onPick,
  onGoHome, onOpenCatalog, onOpenFesta, onOpenSettings, backInterceptorRef,
}) {
  const choices = useMemo(() => songs
    .filter((s) => (getHasKaraoke ? getHasKaraoke(s) : true))
    .slice()
    .sort((a, b) => String(b.release_date || '').localeCompare(String(a.release_date || ''))), [songs, getHasKaraoke]);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => false; // Voltar → TvApp revient à l'écran précédent
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef]);

  useEffect(() => {
    const id = setTimeout(() => {
      try { SpatialNavigation.setFocus(choices.length ? 'FESTA_PICK_0' : 'HOME_NAV_FESTA'); } catch { /* ignore */ }
    }, 60);
    return () => clearTimeout(id);
  }, [choices.length]);

  const surprise = () => {
    if (!choices.length) return;
    onPick?.(choices[Math.floor(Math.random() * choices.length)]);
  };

  return (
    <div className="bs-screen bs-festa-pick">
      <TvTopNavigation
        active="festa"
        festaQueueCount={festaQueueCount}
        onInicio={onGoHome}
        onCatalogo={onOpenCatalog}
        onFesta={onOpenFesta}
        onOpenSettings={onOpenSettings}
      />
      <div className="bs-scroll">
        <header className="bs-festa-pick-head">
          <div>
            <p className="bs-lobby-kicker"><PartyPopper size={22} aria-hidden="true" /> Festa</p>
            <h1 className="bs-festa-pick-title">Escolha a primeira música</h1>
            <p className="bs-festa-pick-text">
              Depois dela, tocam as músicas que os convidados pedirem pelo celular.
              Se ninguém pedir nada, outra música do karaokê vem em seguida.
            </p>
          </div>
          {choices.length > 1 && (
            <FocusRow className="bs-festa-pick-actions" focusKey="FESTA_PICK_ACTIONS">
              <FocusableButton
                focusKey="FESTA_PICK_SURPRISE"
                className="bs-btn bs-focus"
                ariaLabel="Me surpreenda: escolher uma música ao acaso"
                onPress={surprise}
              >
                <Shuffle size={24} aria-hidden="true" /> Me surpreenda
              </FocusableButton>
            </FocusRow>
          )}
        </header>

        {choices.length === 0 ? (
          <p className="bs-festa-pick-text">Nenhuma música com karaokê disponível agora.</p>
        ) : (
          <FocusRow className="bs-festa-pick-grid" focusKey="FESTA_PICK_GRID">
            {choices.map((song, i) => {
              const difficulty = getDifficultyMeta(song).label;
              const date = formatShortDate(song.release_date);
              return (
                <FocusableButton
                  key={song.id}
                  focusKey={`FESTA_PICK_${i}`}
                  className="bs-card bs-focus"
                  ariaLabel={`Começar a Festa com ${song.title}`}
                  onPress={() => onPick?.(song)}
                >
                  <BsPoster song={song} className="bs-card-poster" eager={i < 8} />
                  <span className="bs-card-title">{(song.title || '').trim()}</span>
                  <span className="bs-card-meta">{[difficulty, date].filter(Boolean).join(' · ')}</span>
                </FocusableButton>
              );
            })}
          </FocusRow>
        )}
      </div>
    </div>
  );
}
