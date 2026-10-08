import { useEffect, useMemo } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { AlignLeft, Mic, Play, QrCode, Smartphone } from 'lucide-react';
import TvTopNavigation from './components/TvTopNavigation';
import FocusableButton from './components/FocusableButton';
import FocusRow from './components/FocusRow';
import BsPoster from './components/BsPoster';
import BsBackdrop from './components/BsBackdrop';
import TvHomeRemoteHint from './components/TvHomeRemoteHint';
import { getInterface } from '@/lib/interface';
import { TV_STAGE_WIDTH, useTvStageWidth } from './components/TvStage';
import { getDifficultyMeta, getMode } from './lib/songMeta';
import { fitTitle, formatShortDate, formatWeekdayDate, getBackdropUrl, getShortContext } from './lib/bsSong';
import '@/styles/bs-home.css';

/**
 * Ce que l'accueil lit d'une chanson — et rien d'autre. Le view model complet
 * (toTvSong : conceito, contexto, prévia da letra…) coûte cher pour tout le catalogue,
 * et l'accueil est recalculé à chaque arrivée de données (descriptions, letras).
 */
function toHomeSong(song) {
  const difficulty = getDifficultyMeta(song);
  return {
    id: song.id,
    title: (song.title || '').trim(),
    difficulty: difficulty.key,
    difficultyLabel: difficulty.label,
    releaseDate: song.release_date || null,
    videoTeaserUrl: song.youtube_music_url || song.youtube_url || null,
    raw: song,
  };
}

// Une carte de rangée : 195 px d'affiche + 24 px d'écart (maquette : 8 cartes en 1920).
const CARD_SLOT = 219;
const SIDE_PADDING = 96;

/** Carte d'une rangée : affiche verticale, titre, « difficulté · date ». */
function SongCard({ vm, focusKey, onPress, onFocused }) {
  return (
    <FocusableButton
      focusKey={focusKey}
      className="bs-card bs-focus"
      ariaLabel={`${vm.title}, ${vm.difficultyLabel}`}
      onPress={onPress}
      onFocused={onFocused}
    >
      <BsPoster song={vm.raw} className="bs-card-poster" />
      <span className="bs-card-title">{vm.title}</span>
      <span className="bs-card-meta">{vm.difficultyLabel} · {formatShortDate(vm.releaseDate)}</span>
    </FocusableButton>
  );
}

function Rail({ id, title, hint, vms, onOpen, onFocusKey, action }) {
  if (vms.length === 0) return null;
  return (
    <section className="bs-rail" aria-label={title}>
      <header className="bs-rail-head">
        <h2 className="bs-rail-title">{title}</h2>
        {hint && <span className="bs-rail-hint">{hint}</span>}
        {action}
      </header>
      <FocusRow className="bs-rail-cards" focusKey={`BS_RAIL_${id}`}>
        {vms.map((vm) => {
          const focusKey = `BS_CARD_${id}_${vm.id}`;
          return <SongCard key={vm.id} vm={vm} focusKey={focusKey} onPress={() => onOpen(vm.raw)} onFocused={() => onFocusKey?.(focusKey)} />;
        })}
      </FocusRow>
    </section>
  );
}

/**
 * Accueil de l'interface grand écran — maquette design/bigscreen/01-inicio.png.
 * Barre du haut, bloc « Música da semana » (le titre une seule fois), carte Festa, puis
 * les rangées : « Novas músicas », « Fáceis para começar », « Com karaokê ».
 *
 * Focus initial : « Cantar agora » ; sans karaokê synchronisé (souvent le lundi), ce
 * bouton n'existe pas et le focus va sur « Ver clipe ». Au retour d'une fiche, la carte
 * d'origine reprend le focus (`initialFocusKey`).
 */
export default function BsHomePage({
  songs, getHasKaraoke, festaQueueCount = null, initialFocusKey = null,
  onOpenDetail, onOpenClip, onCantar, onOpenFesta, onOpenCatalog, onOpenSettings, onCardFocusKey,
}) {
  const stageWidth = useTvStageWidth();
  const perRow = Math.max(4, Math.floor(((stageWidth || TV_STAGE_WIDTH) - SIDE_PADDING * 2 + 24) / CARD_SLOT));

  const vms = useMemo(() => songs.map(toHomeSong), [songs]);
  const week = vms[0] || null;
  const rows = useMemo(() => ({
    novas: vms.slice(1, perRow + 1),
    faceis: vms.filter((vm) => vm.difficulty === 'easy').slice(0, perRow),
    karaoke: vms.filter((vm) => getHasKaraoke(vm.raw)).slice(0, perRow),
  }), [vms, perRow, getHasKaraoke]);

  const weekSingable = Boolean(week && getHasKaraoke(week.raw));
  const hasClip = Boolean(week?.videoTeaserUrl);
  const defaultFocus = weekSingable ? 'BS_HERO_CANTAR' : hasClip ? 'BS_HERO_CLIPE' : 'BS_HERO_LETRA';

  useEffect(() => {
    if (!week) return undefined;
    const id = setTimeout(() => {
      try {
        const wanted = initialFocusKey && SpatialNavigation.focusableComponents?.[initialFocusKey] ? initialFocusKey : defaultFocus;
        SpatialNavigation.setFocus(wanted);
      } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(id);
    // Au montage seulement : le focus ne doit pas sauter quand la liste se complète.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(week)]);

  const nav = (
    <TvTopNavigation
      active="inicio"
      onInicio={() => { try { SpatialNavigation.setFocus(defaultFocus); } catch { /* ignore */ } }}
      onCatalogo={onOpenCatalog}
      onFesta={onOpenFesta}
      onOpenSettings={onOpenSettings}
      festaQueueCount={festaQueueCount}
    />
  );

  if (!week) {
    return (
      <div className="bs-screen bs-home">
        {nav}
        <p className="bs-empty">Nenhuma música disponível.</p>
      </div>
    );
  }

  const backdrop = getBackdropUrl(week.raw);
  // Sur une scène plus étroite que 1920 (ordinateur 16:10, 4:3), le bloc se resserre :
  // boutons compacts, puis affiche masquée — le titre garde toute sa place.
  const width = stageWidth || TV_STAGE_WIDTH;
  const compact = width < 1900;
  const showPoster = width >= 1700;
  const title = fitTitle(week.title, width - SIDE_PADDING * 2 - 448 - 40 - 64 - 56 - (showPoster ? 213 + 40 : 0));
  const heroFocus = (key) => () => onCardFocusKey?.(key);

  return (
    <div className="bs-screen bs-home">
      {nav}
      <div className="bs-scroll">
        <div className="bs-top">
          <section className={`bs-hero ${compact ? 'is-compact' : ''}`} aria-label="Música da semana">
            {/* Fond flouté sans filter: blur() : miniature dessinée en 32×18 puis étirée. */}
            <BsBackdrop src={backdrop} className="bs-hero-backdrop" />
            <span className="bs-hero-veil" aria-hidden="true" />
            <div className="bs-hero-body">
              <p className="bs-hero-kicker">
                <span className="bs-badge">Música da semana</span>
                {week.releaseDate && <span className="bs-hero-date">Nova desde {formatWeekdayDate(week.releaseDate)}</span>}
              </p>
              <h1 className="bs-hero-title" style={{ fontSize: title.fontSize, lineHeight: `${title.lineHeight}px`, WebkitLineClamp: title.lines }}>{week.title}</h1>
              <p className="bs-hero-context">{getShortContext(week.raw)}</p>
              <div className="bs-tags">
                <span className="bs-tag">{week.difficultyLabel}</span>
                <span className="bs-tag">{getMode(week.raw)}</span>
              </div>
              <FocusRow className="bs-hero-actions" focusKey="BS_HERO_ACTIONS">
                {weekSingable && (
                  <FocusableButton focusKey="BS_HERO_CANTAR" className="bs-btn bs-btn-primary bs-focus" onPress={() => onCantar(week.raw)} onFocused={heroFocus('BS_HERO_CANTAR')}>
                    <Mic size={30} aria-hidden="true" /> Cantar agora
                  </FocusableButton>
                )}
                {hasClip && (
                  <FocusableButton focusKey="BS_HERO_CLIPE" className="bs-btn bs-focus" onPress={() => onOpenClip(week.raw)} onFocused={heroFocus('BS_HERO_CLIPE')}>
                    <Play size={22} aria-hidden="true" className="bs-icon-fill" /> Ver clipe
                  </FocusableButton>
                )}
                <FocusableButton focusKey="BS_HERO_LETRA" className="bs-btn bs-btn-ghost bs-focus" onPress={() => onOpenDetail(week.raw)} onFocused={heroFocus('BS_HERO_LETRA')}>
                  <AlignLeft size={24} aria-hidden="true" /> Letra e contexto
                </FocusableButton>
              </FocusRow>
            </div>
            {showPoster && <BsPoster song={week.raw} className="bs-hero-poster" eager />}
          </section>

          <aside className="bs-festa-card" aria-label="Modo Festa">
            <p className="bs-festa-card-kicker"><Smartphone size={30} aria-hidden="true" /> Modo Festa</p>
            <h2 className="bs-festa-card-title">Chama a galera</h2>
            <p className="bs-festa-card-text">A sala vira palco. Cada um entra pelo celular, escolhe a música e entra na fila.</p>
            <FocusableButton focusKey="BS_FESTA_START" className="bs-btn bs-btn-pink bs-festa-card-btn bs-focus" onPress={onOpenFesta} onFocused={heroFocus('BS_FESTA_START')}>
              <QrCode size={26} aria-hidden="true" /> Começar uma Festa
            </FocusableButton>
          </aside>
        </div>

        <Rail
          id="NOVAS" title="Novas músicas" hint="Uma nova toda segunda" vms={rows.novas}
          onOpen={onOpenDetail} onFocusKey={onCardFocusKey}
          action={(
            <FocusableButton focusKey="BS_RAIL_CATALOGO" className="bs-link bs-rail-action bs-focus" onPress={onOpenCatalog}>
              Ver catálogo completo
            </FocusableButton>
          )}
        />
        <Rail id="FACEIS" title="Fáceis para começar" vms={rows.faceis} onOpen={onOpenDetail} onFocusKey={onCardFocusKey} />
        <Rail id="KARAOKE" title="Com karaokê" vms={rows.karaoke} onOpen={onOpenDetail} onFocusKey={onCardFocusKey} />
      </div>
      {getInterface().tv && <TvHomeRemoteHint />}
    </div>
  );
}
