import { useEffect, useRef, useState } from 'react';
import { isKaraokePublished } from '@/lib/lrc';
import { getPublicSlug } from './feedMedia';
import WeekRibbon from './WeekRibbon';
import FeedStorySheet from './FeedStorySheet';
import Scrubber from './Scrubber';
import FeedKaraokeLine from './FeedKaraokeLine';
import { Rail, RailButton, RailLink } from './FeedRail';
import { useShareSong } from './useShareSong';
import {
  HeadphonesFilled,
  LyricsSheetFilled,
  MicFilled,
  NewspaperFilled,
  ShareArrowFilled,
  SpeakerMutedFilled,
  SpeakerFilled,
} from '@/components/mobile/icons/FilledIcons';
import { ICON_SHADOW, TEXT_SHADOW, TEXT_SHADOW_DENSE } from './feedStyles';

// Courbe « strong ease-out » (changements d'état d'interface).
const EASE_OUT = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

/**
 * Calques du feed (étape 4), posés au-dessus du bouton son plein cadre du feed (MobileFeed).
 *
 * Seuls les contrôles réels captent les taps (colonne droite) ; tout le reste est en
 * `pointer-events-none`, pour qu'un tap sur la vidéo continue de couper/rétablir le son.
 * Un seul jaune par zone : son actif, c'est la ligne de karaokê (FeedKaraokeLine) ;
 * son coupé, rien n'est jaune sur la vidéo.
 * `karaokeMode` : ce que joue le lecteur pour cette chanson (`video` = le Short,
 * `audio` = la chanson complète, autre = rien ou le calque Ouvir) — la ligne de
 * karaokê n'est montrée que là où sa synchro est vérifiable.
 *
 * Aucun second mouvement ne concurrence la vidéo : pas d'avatar animé ni de bulle
 * (retirés après test sur iPhone, 2026-09-25).
 */
export default function FeedOverlay({ song, player, karaokeMode = 'video', isFirst = true, onShowLyrics, onOuvir, onRequestSound }) {
  const slug = getPublicSlug(song);
  const canSing = isKaraokePublished(song) && Boolean(slug);
  const TitleTag = isFirst ? 'h1' : 'h2';
  // Son actif (état réel du lecteur, pause comprise) : le titre se fait discret pour
  // laisser lisibles les paroles incrustées dans la vidéo.
  const compact = !player.isMuted && player.phase === 'playing';
  // Haut-parleur en haut à droite : plein quand le son joue (tap = Silenciar), barré
  // tant que le son est coupé (tap = activer le son). Rien sans vidéo.
  const showSound = player.phase !== 'none' && !player.isMuted;
  const showMuted = player.phase !== 'none' && player.isMuted;
  // « História » : seulement si la chanson a une description — jamais de bouton vide.
  const hasStory = typeof song?.description === 'string' && song.description.trim().length > 0;
  const [storyOpen, setStoryOpen] = useState(false);
  const storyButtonRef = useRef(null);
  useEffect(() => { setStoryOpen(false); }, [song?.id, song?.title]);

  const { share, linkSheet } = useShareSong(song);

  return (
    <>
      {/* Haut : ruban éphémère de la semaine, sous l'en-tête (remplace le chip permanent). */}
      <WeekRibbon song={song} phase={player.phase} />

      {/* Bas gauche : titre (h1 de la page sur la première chanson). Même élément dans
          les deux états, seul son style change. */}
      <div
        className={`pointer-events-none absolute left-4 right-24 z-20 transition-[bottom] duration-300 ${EASE_OUT} motion-reduce:transition-none ${
          compact ? 'bottom-3' : 'bottom-6'
        }`}
      >
        <TitleTag
          data-compact={compact ? 'true' : 'false'}
          className={`font-black tracking-tight text-white transition-[font-size,line-height] duration-300 ${EASE_OUT} motion-reduce:transition-none ${
            compact
              ? `truncate text-[15px] leading-tight ${TEXT_SHADOW_DENSE}`
              : `line-clamp-2 text-[28px] leading-[1.1] ${TEXT_SHADOW}`
          }`}
        >
          {song.title}
        </TitleTag>
      </div>

      {/* Som : petite icône haut-parleur en haut à droite, à la place de l'ancien bouton
          « i » de l'en-tête (même taille, même alignement), seulement une fois le son
          activé. L'en-tête transparent laisse passer les taps jusqu'ici. */}
      {showSound ? (
        <button
          type="button"
          onClick={player.mute}
          aria-label="Silenciar"
          data-sound-toggle
          className="absolute right-3 top-[calc(max(env(safe-area-inset-top),0.35rem)+0.25rem)] z-30 flex h-11 w-11 touch-manipulation items-center justify-center text-white active:opacity-70"
        >
          <SpeakerFilled className={`h-6 w-6 ${ICON_SHADOW}`} />
        </button>
      ) : showMuted ? (
        <button
          type="button"
          onClick={onRequestSound || player.unmute}
          aria-label="Ativar o som"
          data-sound-toggle="muted"
          className="absolute right-3 top-[calc(max(env(safe-area-inset-top),0.35rem)+0.25rem)] z-30 flex h-11 w-11 touch-manipulation items-center justify-center text-white active:opacity-70"
        >
          <SpeakerMutedFilled className={`h-6 w-6 ${ICON_SHADOW}`} />
        </button>
      ) : null}

      {/* Colonne droite, de haut en bas : Ouvir, Letra, História, Cantar, Compartilhar.
          Façon TikTok : icônes pleines posées sur la vidéo, sans rond. */}
      <Rail className="absolute bottom-6 right-1.5">
        {/* Ouvir : la chanson complète dans le Catálogo (calque), son lancé dans ce geste.
            Seulement si la chanson a un lien youtube_url lisible (onOuvir fourni). */}
        {onOuvir ? (
          <RailButton label="Ouvir" onClick={onOuvir} icon={HeadphonesFilled} ariaLabel={`Ouvir a música completa de ${song.title}`} />
        ) : null}
        <RailButton label="Letra" onClick={onShowLyrics} icon={LyricsSheetFilled} ariaLabel={`Ver a letra de ${song.title}`} />
        {hasStory ? (
          <RailButton
            buttonRef={storyButtonRef}
            label="História"
            onClick={() => setStoryOpen(true)}
            icon={NewspaperFilled}
            ariaLabel={`Ler a história de ${song.title}`}
          />
        ) : null}
        {canSing ? (
          <RailLink
            label="Cantar"
            to={`/karaoke?musica=${encodeURIComponent(slug)}`}
            icon={MicFilled}
            ariaLabel={`Cantar ${song.title} no karaokê`}
          />
        ) : null}
        <RailButton label="Compartilhar" onClick={share} icon={ShareArrowFilled} ariaLabel={`Compartilhar ${song.title}`} />
      </Rail>

      {/* Étape 5 : ligne de karaokê, au-dessus du titre compact, son actif seulement. */}
      <FeedKaraokeLine song={song} player={player} mode={karaokeMode} />

      <Scrubber player={player} />

      {hasStory ? (
        <FeedStorySheet song={song} open={storyOpen} onOpenChange={setStoryOpen} returnFocusRef={storyButtonRef} />
      ) : null}
      {linkSheet}
    </>
  );
}
