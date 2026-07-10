import { useCallback, useEffect, useMemo, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Users, PartyPopper, Settings2, LayoutGrid } from 'lucide-react';
import { loadKaraokeOptions, saveKaraokeOptions } from '@/lib/karaokeOptions';
import { getTvCardArtwork, useTvArtworkManifest } from './tvArtwork';
import TvHomeNavigation from './components/TvHomeNavigation';
import TvMediaRail from './components/TvMediaRail';
import TvSettingsPanel from './components/TvSettingsPanel';
import FocusableButton from './components/FocusableButton';

const FESTA_MIN_SONGS = 2;

/**
 * Page dédiée « Karaokê » — atteinte depuis la destination Karaokê de la nav
 * partagée. Remplace l'ancienne grille vide : hero + 4 cartes de mode + une seule
 * rangée « Para cantar agora ». Ne duplique AUCUNE logique de lecture/synchro — les
 * 4 cartes ouvrent des flux déjà câblés au niveau TvApp (grille filtrée par mode,
 * ou lancement direct karaoké/festa).
 */
export default function TvKaraokeLanding({
  songs, getThumb, getHasKaraoke,
  onChooseSolo, onChooseDuet, onChooseFesta, onOpenFullGrid, onRequestKaraoke,
  onNavigateHome, onNavigateFesta, onNavigateClips, onNavigateAll,
  onExitApp, backInterceptorRef,
}) {
  const manifest = useTvArtworkManifest();
  const getCardArtwork = useCallback(
    (song) => getTvCardArtwork(song, manifest, getThumb(song) || song?.cover_image),
    [manifest, getThumb],
  );

  const karaokeSongs = useMemo(() => songs.filter(getHasKaraoke), [songs, getHasKaraoke]);
  const karaokeRail = karaokeSongs.slice(0, 12);
  const hasSongs = karaokeSongs.length > 0;
  const festaDisabled = karaokeSongs.length < FESTA_MIN_SONGS;

  // Focus initial : Solo (cf. cahier des charges) — sauf si aucune chanson karaokê
  // n'est disponible, auquel cas on ne force rien sur un bouton désactivé.
  useEffect(() => {
    const target = hasSongs ? 'KARAOKE_MODE_SOLO' : 'HOME_NAV_KARAOKE';
    const t = setTimeout(() => { try { SpatialNavigation.setFocus(target); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, [hasSongs]);

  // ── Panneau de réglages (même composant partagé que l'accueil/la fiche) ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [karaokeOpts, setKaraokeOpts] = useState(loadKaraokeOptions);
  useEffect(() => { saveKaraokeOptions(karaokeOpts); }, [karaokeOpts]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setTimeout(() => { try { SpatialNavigation.setFocus('KARAOKE_MODE_OPTIONS'); } catch { /* ignore */ } }, 0);
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
    <div className="tv2-home tv-karaoke-landing">
      <TvHomeNavigation
        active="karaoke"
        onStart={onNavigateHome}
        onKaraoke={() => SpatialNavigation.setFocus('KARAOKE_MODE_SOLO')}
        onFesta={onNavigateFesta}
        onClips={onNavigateClips}
        onAll={onNavigateAll}
        onOpenSettings={openSettings}
      />

      <section className="tv-karaoke-hero">
        <div className="tv-karaoke-hero-text">
          <h1 className="tv-karaoke-hero-title">KARAOKÊ</h1>
          <p className="tv-karaoke-hero-subtitle">Escolha seu jeito de cantar</p>
          <p className="tv-karaoke-hero-support">Cante sozinho, em dupla ou com toda a família.</p>
        </div>
        <div className="tv-karaoke-hero-art" aria-hidden="true">
          <div className="tv-karaoke-hero-glow" />
          <Mic size={148} strokeWidth={1.2} />
        </div>
      </section>

      <div className="tv-karaoke-modes">
        <FocusableButton
          focusKey="KARAOKE_MODE_SOLO"
          className={`tv-mode-card ${!hasSongs ? 'is-disabled' : ''}`}
          ariaLabel="Cantar sozinho"
          onPress={hasSongs ? onChooseSolo : undefined}
        >
          <Mic size={28} />
          <span className="tv-mode-card-title">Solo</span>
          <span className="tv-mode-card-sub">Cante sozinho</span>
        </FocusableButton>
        <FocusableButton
          focusKey="KARAOKE_MODE_DUET"
          className={`tv-mode-card ${!hasSongs ? 'is-disabled' : ''}`}
          ariaLabel="Cantar em dueto"
          onPress={hasSongs ? onChooseDuet : undefined}
        >
          <Users size={28} />
          <span className="tv-mode-card-title">Dueto</span>
          <span className="tv-mode-card-sub">Cante com alguém</span>
        </FocusableButton>
        <FocusableButton
          focusKey="KARAOKE_MODE_FESTA"
          className={`tv-mode-card ${festaDisabled ? 'is-disabled' : ''}`}
          ariaLabel="Ativar Modo Festa"
          onPress={festaDisabled ? undefined : onChooseFesta}
        >
          <PartyPopper size={28} />
          <span className="tv-mode-card-title">Festa</span>
          <span className="tv-mode-card-sub">Todos cantam juntos</span>
        </FocusableButton>
        <FocusableButton
          focusKey="KARAOKE_MODE_OPTIONS"
          className="tv-mode-card"
          ariaLabel="Abrir opções do karaokê"
          onPress={openSettings}
        >
          <Settings2 size={28} />
          <span className="tv-mode-card-title">Opções</span>
          <span className="tv-mode-card-sub">Ajuste sua experiência</span>
        </FocusableButton>
      </div>

      {hasSongs ? (
        <div className="tv-karaoke-row-wrap">
          <TvMediaRail
            focusKey="KARAOKE_ROW"
            title="Para cantar agora"
            songs={karaokeRail}
            getArtwork={getCardArtwork}
            variant="karaoke"
            onSelect={onRequestKaraoke}
            trailingAction={{
              focusKey: 'KARAOKE_ROW_ALL',
              label: 'Ver todos os karaokês',
              ariaLabel: 'Ver todos os karaokês',
              icon: LayoutGrid,
              onPress: onOpenFullGrid,
            }}
          />
        </div>
      ) : (
        <p className="tv-karaoke-empty">Nenhum karaokê disponível no momento.</p>
      )}

      {settingsOpen && (
        <TvSettingsPanel opts={karaokeOpts} setOpts={setKaraokeOpts} onExitApp={onExitApp} />
      )}
    </div>
  );
}
