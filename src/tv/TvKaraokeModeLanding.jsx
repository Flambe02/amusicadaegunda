import { useCallback, useEffect, useMemo, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Users, PartyPopper, LayoutGrid } from 'lucide-react';
import { loadKaraokeOptions, saveKaraokeOptions } from '@/lib/karaokeOptions';
import { getTvCardArtwork, useTvArtworkManifest } from './tvArtwork';
import TvHomeNavigation from './components/TvHomeNavigation';
import TvMediaRail from './components/TvMediaRail';
import TvSettingsPanel from './components/TvSettingsPanel';
import FocusableButton from './components/FocusableButton';

const FESTA_MIN_SONGS = 2;

// Contenu spécifique à chaque mode — texte, icône, identité visuelle (classe CSS
// .tv-modelanding-hero.mode-*) et clés de focus dédiées (cf. cahier des charges :
// SOLO_PRIMARY/SOLO_SONGS, DUET_PRIMARY/DUET_SONGS, FESTA_PRIMARY/FESTA_SONGS).
const MODE_CONFIG = {
  solo: {
    navActive: 'karaoke',
    icon: Mic,
    title: 'KARAOKÊ SOLO',
    subtitle: 'Cante no seu ritmo',
    description: 'Escolha uma música, ajuste a letra e solte a voz. Você decide o que acontece depois.',
    primaryLabel: 'Escolher uma música',
    rowTitle: 'Para cantar solo',
    focusPrimary: 'SOLO_PRIMARY',
    focusSongs: 'SOLO_SONGS',
    focusSongsAll: 'SOLO_SONGS_ALL',
  },
  duet: {
    navActive: 'karaoke',
    icon: Users,
    title: 'KARAOKÊ DUETO',
    subtitle: 'Duas vozes. Uma música.',
    description: 'Cada pessoa canta uma parte. As letras alternam para facilitar o dueto.',
    primaryLabel: 'Escolher uma música',
    rowTitle: 'Escolha uma música para dueto',
    focusPrimary: 'DUET_PRIMARY',
    focusSongs: 'DUET_SONGS',
    focusSongsAll: 'DUET_SONGS_ALL',
  },
  festa: {
    navActive: 'festa',
    icon: PartyPopper,
    title: 'MODO FESTA',
    subtitle: 'A música não para',
    description: 'Escolha a primeira música. Depois, as próximas começam automaticamente.',
    primaryLabel: 'Escolher a primeira música',
    rowTitle: 'Escolha a primeira música',
    focusPrimary: 'FESTA_PRIMARY',
    focusSongs: 'FESTA_SONGS',
    focusSongsAll: 'FESTA_SONGS_ALL',
  },
};

/**
 * Page explicative dédiée à UN mode de karaokê (Solo, Dueto ou Festa) — remplace
 * l'ancien raccourci direct vers une grille générique (même TvGrid, seul le titre
 * changeait). Hero explicatif + action principale + rangée de chansons + carte
 * « Ver todos os karaokês », tout dans un même contexte de mode explicite : la
 * sélection d'une chanson (ici ou dans la grille complète ouverte depuis cette
 * page) ne rouvre JAMAIS le sélecteur générique Karaokê/Festa (TvKaraokeModeChooser
 * reste réservé aux entrées SANS contexte de mode, cf. TvApp.jsx `onRequestKaraoke`).
 */
export default function TvKaraokeModeLanding({
  mode, songs, getThumb, getHasKaraoke,
  onSelectSong, onOpenFullGrid,
  onNavigateHome, onNavigateKaraoke, onNavigateFesta, onNavigateClips, onNavigateAll,
  onExitApp, backInterceptorRef,
}) {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.solo;
  const Icon = cfg.icon;

  const manifest = useTvArtworkManifest();
  const getCardArtwork = useCallback(
    (song) => getTvCardArtwork(song, manifest, getThumb(song) || song?.cover_image),
    [manifest, getThumb],
  );

  const karaokeSongs = useMemo(() => songs.filter(getHasKaraoke), [songs, getHasKaraoke]);
  const karaokeRail = karaokeSongs.slice(0, 12);
  const hasSongs = karaokeSongs.length > 0;
  const disabled = mode === 'festa' ? karaokeSongs.length < FESTA_MIN_SONGS : !hasSongs;

  // Focus initial : action principale (cf. cahier des charges) — jamais sur un
  // bouton désactivé.
  useEffect(() => {
    const target = disabled ? 'HOME_NAV_KARAOKE' : cfg.focusPrimary;
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, [disabled, cfg.focusPrimary]);

  // ── Panneau de réglages (même composant partagé que les autres écrans) ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [karaokeOpts, setKaraokeOpts] = useState(loadKaraokeOptions);
  useEffect(() => { saveKaraokeOptions(karaokeOpts); }, [karaokeOpts]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setTimeout(() => { try { SpatialNavigation.setFocus('HOME_SETTINGS'); } catch { /* ignore */ } }, 0);
  }, []);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (settingsOpen) { closeSettings(); return true; }
      return false;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, settingsOpen, closeSettings]);

  return (
    <div className="tv2-home tv-modelanding">
      <TvHomeNavigation
        active={cfg.navActive}
        onStart={onNavigateHome}
        onKaraoke={onNavigateKaraoke}
        onFesta={mode === 'festa' ? () => SpatialNavigation.setFocus(cfg.focusPrimary) : onNavigateFesta}
        onClips={onNavigateClips}
        onAll={onNavigateAll}
        onOpenSettings={openSettings}
      />

      <section className={`tv-modelanding-hero mode-${mode}`}>
        <div className="tv-modelanding-hero-text">
          <h1 className="tv-modelanding-title">{cfg.title}</h1>
          <p className="tv-modelanding-subtitle">{cfg.subtitle}</p>
          <p className="tv-modelanding-description">{cfg.description}</p>
          <FocusableButton
            focusKey={cfg.focusPrimary}
            className={`tv2-btn tv2-btn-karaoke tv-modelanding-primary ${disabled ? 'is-disabled' : ''}`}
            ariaLabel={cfg.primaryLabel}
            onPress={disabled ? undefined : onOpenFullGrid}
          >
            {cfg.primaryLabel}
          </FocusableButton>
        </div>
        <div className="tv-modelanding-hero-art" aria-hidden="true">
          <div className="tv-modelanding-hero-glow" />
          <Icon size={132} strokeWidth={1.15} />
        </div>
      </section>

      {hasSongs ? (
        <div className="tv-modelanding-row-wrap">
          <TvMediaRail
            focusKey={cfg.focusSongs}
            title={cfg.rowTitle}
            songs={karaokeRail}
            getArtwork={getCardArtwork}
            variant="karaoke"
            onSelect={onSelectSong}
            trailingAction={{
              focusKey: cfg.focusSongsAll,
              label: 'Ver todos os karaokês',
              ariaLabel: 'Ver todos os karaokês',
              icon: LayoutGrid,
              onPress: onOpenFullGrid,
            }}
          />
        </div>
      ) : (
        <p className="tv-modelanding-empty">Nenhum karaokê disponível no momento.</p>
      )}

      {settingsOpen && (
        <TvSettingsPanel opts={karaokeOpts} setOpts={setKaraokeOpts} onExitApp={onExitApp} />
      )}
    </div>
  );
}
