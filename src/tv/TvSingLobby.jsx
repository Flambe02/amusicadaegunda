import { useCallback, useEffect, useRef, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { ArrowRightLeft, Check, Handshake, ListPlus, Mic, MicOff, Minus, Pencil, Plus, Settings2, Swords, Trophy, User, Users, Smartphone } from 'lucide-react';
import FocusableButton from './components/FocusableButton';
import FocusRow from './components/FocusRow';
import BsPoster from './components/BsPoster';
import TvToast from './components/TvToast';
import { queueToastMessage } from './lib/tvQueue';
import { TV_STAGE_WIDTH, useTvStageWidth } from './components/TvStage';
import { fitTitle } from './lib/bsSong';
import { toTvSong } from './lib/tvSongRepository';
import { hasScoringMic, micStatus } from '@/lib/micPrefs';
import { loadLobbyChoice, loadPlayerNames, MAX_NAME, playersFor, saveLobbyChoice, savePlayerNames } from '@/lib/karaokePlayers';
import { GAME_MODES } from '@/lib/karaokeGame';
import { topForSong } from '@/lib/karaokeRecords';
import '@/styles/bs-lobby.css';

const MODE_ICONS = { solo: User, duet: Users, duel: Swords, coop: Handshake, pass: ArrowRightLeft };

/** Prénom d'un joueur : un bouton ; OK (ou clic) le transforme en champ de saisie. */
function PlayerChip({ player, editing, onEdit, onSave }) {
  const inputRef = useRef(null);
  // Le nom est sélectionné : on tape directement le nouveau prénom.
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);
  if (editing) {
    return (
      <span className="bs-lobby-player is-editing" style={{ '--player': player.color }}>
        <span className="bs-lobby-player-dot" aria-hidden="true" />
        <input
          ref={inputRef}
          className="bs-lobby-player-input"
          defaultValue={player.name}
          maxLength={MAX_NAME}
          aria-label={`Nome de quem canta (${player.index + 1})`}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onSave(e.currentTarget.value);
            if (e.key === 'Escape') onSave(player.name);
          }}
          onBlur={(e) => onSave(e.currentTarget.value)}
        />
      </span>
    );
  }
  return (
    <FocusableButton
      focusKey={`LOBBY_PLAYER_${player.index}`}
      className="bs-lobby-player bs-focus"
      style={{ '--player': player.color }}
      ariaLabel={`Mudar o nome de ${player.name}`}
      onPress={onEdit}
    >
      <span className="bs-lobby-player-dot" aria-hidden="true" />
      {player.name}
      <Pencil size={18} aria-hidden="true" className="bs-lobby-player-pen" />
    </FocusableButton>
  );
}

/**
 * « Antes de cantar » (karaokê, 2026-11-16) : un seul écran entre « Cantar agora » et le
 * karaokê. On y voit la música et ses recordes, on choisit le mode — Solo, Dueto (si la
 * chanson l'a), Duelo, Cooperação, Passa o microfone —, qui chante (prénoms gardés sur
 * l'appareil, 2 à 4 en Cooperação/Passa), le microfone (« Configurar ») et, pendant une
 * Festa, « Adicionar à fila da Festa ». « Cantar » lance la chanson tout de suite (pas
 * d'écran « Começar »). Le dernier mode choisi est repris la fois suivante.
 * Duelo, Cooperação et Passa se jouent au score : sans micro, « Cantar » devient
 * « Configurar microfone ».
 *
 * Remplace la petite fenêtre « Como você quer cantar? ». La note au micro (jauge
 * d'énergie du lecteur) est activée pour cette session quand un micro est configuré.
 */
export default function TvSingLobby({
  song, micPrefs = null, festaActive = false, tv = false,
  onSing, onAddToFesta, onOpenMicSetup, onBack, backInterceptorRef,
}) {
  const vm = toTvSong(song);
  const hasDuet = vm.recommendedModes.includes('duet');
  const modes = ['solo', ...(hasDuet ? ['duet'] : []), 'duel', 'coop', 'pass'];
  const [choice, setChoice] = useState(() => {
    const saved = loadLobbyChoice();
    return { ...saved, mode: modes.includes(saved.mode) ? saved.mode : 'solo' };
  });
  const { mode, count } = choice;
  const pick = (next) => setChoice((c) => { const v = { ...c, ...next }; saveLobbyChoice(v); return v; });
  const [records] = useState(() => topForSong(song?.id, 5));
  const [names, setNames] = useState(loadPlayerNames);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ message: '', nonce: 0 });
  const players = playersFor(mode, names, count);
  const flexible = mode === 'coop' || mode === 'pass';
  const mic = micStatus(micPrefs);
  const withMic = hasScoringMic(micPrefs);
  const needsMic = Boolean(GAME_MODES[mode]?.needsMic) && !withMic;

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (editing != null) { setEditing(null); return true; }
      onBack?.();
      return true;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onBack, editing]);

  useEffect(() => {
    const id = setTimeout(() => { try { SpatialNavigation.setFocus('LOBBY_SING'); } catch { /* ignore */ } }, 60);
    return () => clearTimeout(id);
  }, []);

  const saveName = useCallback((index, value) => {
    setNames((current) => {
      const next = [...current];
      next[index] = value;
      savePlayerNames(next);
      return loadPlayerNames();
    });
    setEditing(null);
    setTimeout(() => { try { SpatialNavigation.setFocus(`LOBBY_PLAYER_${index}`); } catch { /* ignore */ } }, 0);
  }, []);

  const sing = () => onSing?.({ mode, players, withMic });
  const addToFesta = () => {
    const res = onAddToFesta?.(vm) || { added: false, position: 0 };
    setToast({ message: queueToastMessage(res, true), nonce: Date.now() });
    res.pending?.catch(() => setToast({ message: 'Não foi possível adicionar à fila da Festa. Tente de novo.', nonce: Date.now() }));
  };

  const stageWidth = useTvStageWidth() || TV_STAGE_WIDTH;
  const title = fitTitle(vm.title, stageWidth - 96 * 2 - 300 - 64, { max: 88, boxHeight: 96, minOneLine: 50 });

  return (
    <div className="bs-screen bs-lobby">
      <div className="bs-lobby-body">
        <div className="bs-lobby-side">
          <div className="bs-lobby-poster">
            <BsPoster song={song} eager />
          </div>
          <div className="bs-lobby-records">
            <p className="bs-lobby-records-h"><Trophy size={20} aria-hidden="true" /> Recordes desta música</p>
            {records.length ? (
              <ol>
                {records.map((r, i) => (
                  <li key={r.id || i}><span>{i + 1}</span><strong>{r.name}</strong><b>{r.score.toLocaleString('pt-BR')}</b></li>
                ))}
              </ol>
            ) : <p className="bs-lobby-records-empty">Ninguém pontuou ainda. Seja o primeiro!</p>}
          </div>
        </div>

        <div className="bs-lobby-main">
          <p className="bs-lobby-kicker"><Mic size={22} aria-hidden="true" /> Antes de cantar</p>
          <h1 className="bs-lobby-title" style={{ fontSize: title.fontSize, lineHeight: `${title.lineHeight}px`, WebkitLineClamp: title.lines }}>{vm.title}</h1>
          <div className="bs-tags bs-lobby-tags">
            <span className="bs-tag">{vm.difficultyLabel}</span>
            {hasDuet && <span className="bs-tag">Tem dueto</span>}
          </div>

          <section className="bs-lobby-section" aria-label="Modo">
            <h2 className="bs-lobby-h">Modo</h2>
            <FocusRow className="bs-lobby-row" focusKey="LOBBY_MODES">
              {modes.map((key) => {
                const { label } = GAME_MODES[key];
                const Icon = MODE_ICONS[key];
                return (
                  <FocusableButton
                    key={key}
                    focusKey={`LOBBY_MODE_${key}`}
                    className={`bs-lobby-mode bs-focus ${mode === key ? 'is-on' : ''}`}
                    ariaLabel={`Modo ${label}${mode === key ? ' (escolhido)' : ''}`}
                    onPress={() => pick({ mode: key })}
                  >
                    <Icon size={24} aria-hidden="true" />
                    <strong>{label}</strong>
                    {mode === key && <Check size={20} aria-hidden="true" className="bs-lobby-mode-check" />}
                  </FocusableButton>
                );
              })}
            </FocusRow>
            <p className="bs-lobby-mode-desc">{GAME_MODES[mode].desc}</p>
          </section>

          <section className="bs-lobby-section" aria-label="Quem canta">
            <h2 className="bs-lobby-h">Quem canta</h2>
            <FocusRow className="bs-lobby-row" focusKey="LOBBY_PLAYERS">
              {players.map((player) => (
                <PlayerChip
                  key={player.index}
                  player={player}
                  editing={editing === player.index}
                  onEdit={() => setEditing(player.index)}
                  onSave={(value) => saveName(player.index, value)}
                />
              ))}
              {flexible && count < 4 && (
                <FocusableButton focusKey="LOBBY_ADD_PLAYER" className="bs-btn bs-btn-small bs-btn-round bs-focus" ariaLabel="Mais uma pessoa" onPress={() => pick({ count: count + 1 })}>
                  <Plus size={22} aria-hidden="true" />
                </FocusableButton>
              )}
              {flexible && count > 2 && (
                <FocusableButton focusKey="LOBBY_REMOVE_PLAYER" className="bs-btn bs-btn-small bs-btn-round bs-focus" ariaLabel="Uma pessoa a menos" onPress={() => pick({ count: count - 1 })}>
                  <Minus size={22} aria-hidden="true" />
                </FocusableButton>
              )}
            </FocusRow>
          </section>

          <section className="bs-lobby-section" aria-label="Microfone">
            <h2 className="bs-lobby-h">Microfone</h2>
            <FocusRow className="bs-lobby-row bs-lobby-mic" focusKey="LOBBY_MIC">
              <span className={`bs-lobby-mic-status is-${mic.kind}`}>
                {mic.kind === 'device' && <Mic size={24} aria-hidden="true" />}
                {mic.kind === 'phone' && <Smartphone size={24} aria-hidden="true" />}
                {mic.kind !== 'device' && mic.kind !== 'phone' && <MicOff size={24} aria-hidden="true" />}
                {mic.text}
                {withMic && <span className="bs-lobby-mic-note">· pontuação ligada</span>}
              </span>
              <FocusableButton focusKey="LOBBY_MIC_SETUP" className="bs-btn bs-btn-small bs-focus" onPress={onOpenMicSetup}>
                <Settings2 size={20} aria-hidden="true" /> {mic.kind === 'unset' ? 'Configurar' : 'Trocar'}
              </FocusableButton>
            </FocusRow>
            {needsMic && (
              <p className="bs-lobby-hint is-warn">O modo {GAME_MODES[mode].label} é um jogo com pontos: precisa de um microfone.</p>
            )}
            {!needsMic && !withMic && (
              <p className="bs-lobby-hint">
                {tv ? 'Sem microfone, a letra aparece igual. Com um, a música vira jogo, com pontos.' : 'Configure uma vez: com microfone, a música vira jogo, com pontos e recordes.'}
              </p>
            )}
          </section>

          <FocusRow className="bs-lobby-actions" focusKey="LOBBY_ACTIONS">
            {needsMic ? (
              <FocusableButton focusKey="LOBBY_SING" className="bs-btn bs-btn-primary bs-lobby-sing bs-focus" onPress={onOpenMicSetup}>
                <Settings2 size={28} aria-hidden="true" /> Configurar microfone
              </FocusableButton>
            ) : (
              <FocusableButton focusKey="LOBBY_SING" className="bs-btn bs-btn-primary bs-lobby-sing bs-focus" onPress={sing} ariaLabel={`Cantar ${vm.title}`}>
                <Mic size={30} aria-hidden="true" /> Cantar
              </FocusableButton>
            )}
            {festaActive && onAddToFesta && (
              <FocusableButton focusKey="LOBBY_FESTA" className="bs-btn bs-btn-pink bs-focus" onPress={addToFesta}>
                <ListPlus size={24} aria-hidden="true" /> Adicionar à fila da Festa
              </FocusableButton>
            )}
          </FocusRow>
        </div>
      </div>
      <TvToast message={toast.message} nonce={toast.nonce} onDone={() => setToast({ message: '', nonce: 0 })} />
    </div>
  );
}
