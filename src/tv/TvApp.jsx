import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { init, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Loader2 } from 'lucide-react';
import { Song } from '@/api/entities';
import { hasLrcContent } from '@/lib/lrc';
import { getYouTubeThumbnailUrl } from '@/lib/utils';
import { onBackPress, exitApp } from './adapters/backButton';
import { applyTvFlag } from './platform';
import {
  createFestaSession, endFestaSession, updateFestaSessionCurrentSong,
  markFestaQueueStatus, buildFestaJoinUrl,
} from '@/lib/festa';
import { useFestaSession } from '@/hooks/useFestaSession';
import TvHome from './TvHome';
import TvGrid from './TvGrid';
import TvSongDetail from './TvSongDetail';
import TvKaraokeScreen from './TvKaraokeScreen';
import TvKaraokeLanding from './TvKaraokeLanding';
import TvClipsLanding from './TvClipsLanding';
import TvKaraokeModeLanding from './TvKaraokeModeLanding';
import TvFestaInvite from './components/TvFestaInvite';
import '@/styles/tv.css';
import '@/styles/tv-home-v2.css';
import '@/styles/tv-karaoke-landing.css';
import '@/styles/tv-clips-landing.css';
import '@/styles/tv-karaoke-mode-landing.css';

// Initialise la navigation spatiale une seule fois (au chargement du bundle TV).
init({ debug: false, visualDebug: false });

const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};

/**
 * Application TV (« 10-foot UI ») — isolée du mobile/web (montée par App.jsx quand
 * isTV()). Pile d'écrans maison (home → detail → watch/karaoke), Retour matériel via
 * l'adaptateur, nav spatiale mise en pause pendant les overlays plein écran.
 */
export default function TvApp() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stack, setStack] = useState([{ name: 'home' }]);
  const top = stack[stack.length - 1];

  // ── Modo Festa piloté par téléphone (fila Supabase) ─────────────────────
  // Session créée à la demande (premier passage par l'écran d'invitation),
  // réutilisée tant qu'elle reste active (permet de la « rouvrir » en
  // revenant simplement sur Início → Festa). `festaPlaybackStartedRef`
  // distingue « invitation ouverte mais rien n'a encore joué » (Voltar =
  // ferme la session) de « la festa est en cours » (Voltar = comportement
  // normal de la pile, la session continue de tourner en tâche de fond).
  const [festaSession, setFestaSession] = useState(null);
  const [festaLoading, setFestaLoading] = useState(false);
  const [festaOffline, setFestaOffline] = useState(false);
  const festaSessionRef = useRef(festaSession);
  festaSessionRef.current = festaSession;
  const festaPlaybackStartedRef = useRef(false);
  const {
    queue: festaQueue, presentNames: festaPresentNames, liveEnergyByEntry, getEnergyGrade,
  } = useFestaSession(festaSession?.id || null);
  const festaQueueRef = useRef(festaQueue);
  festaQueueRef.current = festaQueue;

  const openFestaInvite = useCallback(async () => {
    if (!festaSessionRef.current) {
      setFestaLoading(true);
      setFestaOffline(false);
      try {
        const sess = await createFestaSession();
        setFestaSession(sess);
        festaPlaybackStartedRef.current = false;
      } catch {
        setFestaOffline(true);
      } finally {
        setFestaLoading(false);
      }
    }
    setStack((s) => [...s, { name: 'festa-invite' }]);
  }, []);

  const exitFestaInvite = useCallback(() => {
    if (!festaPlaybackStartedRef.current && festaSessionRef.current) {
      const id = festaSessionRef.current.id;
      setFestaSession(null);
      endFestaSession(id).catch(() => { /* best-effort — la session restera "active" en base, sans conséquence grave */ });
    }
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  useEffect(() => { applyTvFlag(true); return () => applyTvFlag(false); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await Song.list('-release_date');
        if (!cancelled) setSongs(all || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const push = useCallback((screen) => setStack((s) => [...s, screen]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  // Un écran peut « intercepter » le Back (ex. fiche en lecture vidéo → couper la vidéo
  // au lieu de quitter l'écran). L'intercepteur retourne true s'il a consommé le Back.
  const backInterceptorRef = useRef(null);

  // Retour matériel/télécommande — un seul abonnement, dispatch selon la pile.
  const stackRef = useRef(stack);
  stackRef.current = stack;
  useEffect(() => onBackPress(() => {
    if (backInterceptorRef.current?.()) return; // l'écran courant a géré le Back
    if (stackRef.current.length > 1) pop();
    else exitApp();
  }), [pop]);

  // Overlays plein écran (watch/karaoke) : on met la nav spatiale en pause pour
  // laisser flèches/OK au lecteur, puis on la réactive au retour.
  const isOverlay = top.name === 'karaoke';
  useEffect(() => {
    if (isOverlay) SpatialNavigation.pause(); else SpatialNavigation.resume();
    return () => SpatialNavigation.resume();
  }, [isOverlay]);

  // Miniature = image de la VIDÉO YouTube. ⚠️ Colonnes Supabase (noms trompeurs) :
  // `youtube_music_url` = la VIDÉO (Short) → à utiliser pour la miniature/lecture ;
  // `youtube_url` = la MUSIQUE (source karaoké). La pochette cover_image en dernier recours.
  const getThumb = useCallback(
    (s) => getYouTubeThumbnailUrl(s.youtube_music_url, 'hqdefault')
      || getYouTubeThumbnailUrl(s.youtube_url, 'hqdefault')
      || s.cover_image
      || '',
    [],
  );
  const getCat = useCallback((s) => (s.category ? (CATEGORY_LABELS[s.category] || s.category) : ''), []);
  const getHasKaraoke = useCallback(
    (s) => hasLrcContent(s.lrc_content) && Boolean(s.youtube_url || s.youtube_music_url),
    [],
  );

  // Navigation centralisée pour la barre TvHomeNavigation quand elle est montée depuis
  // un écran autre que l'accueil (TvSongDetail) — TvHome calcule ces mêmes listes en
  // interne pour SES propres boutons ; on duplique ici pour ne jamais avoir à modifier
  // TvHome.jsx (fichier verrouillé pour sa mise en page — seule sa nav est étendue).
  const goHome = useCallback(() => setStack([{ name: 'home' }]), []);
  const songsRef = useRef(songs);
  songsRef.current = songs;
  // Destination « Clipes » de la nav partagée — page dédiée (rangées mês/ano/
  // tema), plus la grille générique (cf. TvClipsLanding.jsx).
  const openClipsLanding = useCallback(() => setStack((s) => [...s, { name: 'clips-landing' }]), []);
  const openCatalog = useCallback(() => setStack((s) => [
    ...s, { name: 'grid', title: 'Catálogo', songs: songsRef.current },
  ]), []);

  // ── Landing Karaokê (page dédiée) : 4 modes + rangée « Para cantar agora » ──
  const openKaraokeLanding = useCallback(() => setStack((s) => [...s, { name: 'karaoke-landing' }]), []);

  // Grilles de sélection avec CONTEXTE DE MODE explicite — `mode` détermine ce que
  // fait `onSelect` (cf. branche 'grid' plus bas) : jamais de comportement implicite
  // selon l'écran appelant.
  const openModeGrid = useCallback((mode, title) => setStack((s) => [
    ...s, { name: 'grid', title, songs: songsRef.current.filter(getHasKaraoke), mode },
  ]), [getHasKaraoke]);
  const onOpenFullKaraokeGrid = useCallback(() => openModeGrid('karaoke-any', 'Karaokê'), [openModeGrid]);
  // Grilles complètes « Ver todos os karaokês » ATTEINTES DEPUIS une page de mode
  // (mode-landing) — même contexte de mode que la page d'origine (jamais le
  // sélecteur générique 'karaoke-any', qui rouvrirait le choix Karaokê/Festa).
  const openSoloGrid = useCallback(() => openModeGrid('solo', 'Karaokê — Solo'), [openModeGrid]);
  const openDuetGrid = useCallback(() => openModeGrid('duet', 'Karaokê — Dueto'), [openModeGrid]);
  const openFestaGrid = useCallback(() => openModeGrid('festa', 'Escolha a primeira música'), [openModeGrid]);

  // Pages dédiées Solo/Dueto/Festa (TvKaraokeModeLanding) — remplacent l'ancien
  // raccourci direct vers la grille : chaque mode a maintenant son écran
  // explicatif (hero + rangée de chansons) avant la sélection.
  const openModeLanding = useCallback((mode) => setStack((s) => [...s, { name: 'mode-landing', mode }]), []);
  const onChooseSolo = useCallback(() => openModeLanding('solo'), [openModeLanding]);
  const onChooseDuet = useCallback(() => openModeLanding('duet'), [openModeLanding]);
  // Festa passe désormais TOUJOURS par l'écran d'invitation (QR + code) avant
  // le choix de la première chanson. « Continuar sem fila » : si des invités ont
  // déjà mis des chansons en fila PENDANT que l'invitation était affichée, on
  // démarre direto avec la 1ère au lieu de reposer un choix manuel (sinon la fila
  // déjà remplie serait ignorée — piège découvert en test réel) ; sinon,
  // comportement historique inchangé (mène au choix manuel de la 1ère chanson).
  const onChooseFesta = useCallback(() => openFestaInvite(), [openFestaInvite]);
  const proceedToFestaPicker = useCallback(() => {
    const waiting = festaQueueRef.current
      .filter((q) => q.status === 'waiting')
      .sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
    const firstEntry = waiting[0];
    const song = firstEntry && songsRef.current.find((sg) => sg.id === firstEntry.song_id);
    if (firstEntry && song) {
      markFestaQueueStatus(firstEntry.id, 'playing').catch(() => {});
      if (festaSessionRef.current) updateFestaSessionCurrentSong(festaSessionRef.current.id, song.id).catch(() => {});
      festaPlaybackStartedRef.current = true;
      setStack((s) => {
        const pool = songsRef.current.filter(getHasKaraoke);
        const rest = pool.filter((sg) => sg.id !== song.id);
        return [...s, {
          name: 'karaoke', queue: [song, ...rest], index: 0, handoff: false, sessionOptions: null,
          festaQueueId: firstEntry.id, prevApplause: null, prevTomato: null,
        }];
      });
      return;
    }
    openModeLanding('festa');
  }, [openModeLanding, getHasKaraoke]);

  // Lance le karaoké normal (solo ou dueto — `sessionOptions` porte le dueto en
  // session uniquement, cf. KaraokePlayer `initialSessionOptions`). Représenté comme
  // une fila d'UNE chanson : la même forme de pile sert le solo/dueto ET la festa.
  const startKaraoke = useCallback((song, sessionOptions) => setStack((s) => [
    ...s, { name: 'karaoke', queue: [song], index: 0, handoff: false, sessionOptions: sessionOptions || null },
  ]), []);

  // Chanson choisie SANS contexte de mode (rangée « Para cantar agora », grille
  // complète) → lance directement le karaoké en solo par défaut, SANS écran
  // intermédiaire de question (le Modo Festa reste un choix fait depuis son point
  // d'entrée dédié de l'accueil, jamais reposé au niveau d'une chanson individuelle).
  const onRequestKaraoke = useCallback((song) => startKaraoke(song, null), [startKaraoke]);
  // Fila festa : la chanson choisie en premier, puis le reste du catalogue karaokê
  // (filet de sécurité si la fila Supabase des téléphones reste vide, cf. advanceFesta).
  const startFesta = useCallback((firstSong) => {
    festaPlaybackStartedRef.current = true;
    if (festaSessionRef.current) {
      updateFestaSessionCurrentSong(festaSessionRef.current.id, firstSong.id).catch(() => {});
    }
    setStack((s) => {
      const pool = songsRef.current.filter(getHasKaraoke);
      const rest = pool.filter((song) => song.id !== firstSong.id);
      return [...s, {
        name: 'karaoke', queue: [firstSong, ...rest], index: 0, handoff: false, sessionOptions: null,
        festaQueueId: null, prevApplause: null, prevTomato: null,
      }];
    });
  }, [getHasKaraoke]);

  // Avance dans la fila festa (fin naturelle OU skip manuel). PRIORITÉ à la fila
  // Supabase alimentée par les téléphones (entrées "waiting", triées par added_at) ;
  // si elle est vide, filet de sécurité INCHANGÉ : le catalogue précalculé au
  // lancement (comportement historique, zéro régression quand personne n'a rejoint).
  const advanceFesta = useCallback(() => setStack((s) => {
    const t = s[s.length - 1];
    if (!t || t.name !== 'karaoke') return s;

    // La chanson qui vient de finir était pilotée par la fila → on la clôture.
    const finishedEntry = t.festaQueueId
      ? festaQueueRef.current.find((q) => q.id === t.festaQueueId)
      : null;
    if (t.festaQueueId) markFestaQueueStatus(t.festaQueueId, 'done').catch(() => {});

    const waiting = festaSessionRef.current
      ? festaQueueRef.current
        .filter((q) => q.status === 'waiting')
        .sort((a, b) => new Date(a.added_at) - new Date(b.added_at))
      : [];

    if (waiting.length > 0) {
      const nextEntry = waiting[0];
      const song = songsRef.current.find((sg) => sg.id === nextEntry.song_id);
      if (song) {
        markFestaQueueStatus(nextEntry.id, 'playing').catch(() => {});
        updateFestaSessionCurrentSong(festaSessionRef.current.id, song.id).catch(() => {});
        return [...s.slice(0, -1), {
          name: 'karaoke',
          queue: [...t.queue.slice(0, t.index + 1), song],
          index: t.index + 1,
          handoff: true,
          sessionOptions: null,
          festaQueueId: nextEntry.id,
          prevApplause: finishedEntry?.applause_score ?? null,
          prevTomato: finishedEntry?.tomato_score ?? null,
          prevEnergyGrade: t.festaQueueId ? getEnergyGrade(t.festaQueueId) : null,
        }];
      }
    }

    if (t.index < t.queue.length - 1) {
      return [...s.slice(0, -1), {
        ...t, index: t.index + 1, handoff: true, festaQueueId: null,
        prevApplause: finishedEntry?.applause_score ?? null,
        prevTomato: finishedEntry?.tomato_score ?? null,
        prevEnergyGrade: t.festaQueueId ? getEnergyGrade(t.festaQueueId) : null,
      }];
    }
    return s.slice(0, -1);
  }), [getEnergyGrade]);

  const content = useMemo(() => {
    if (top.name === 'grid') {
      // Le contexte de mode (posé par openModeGrid) détermine ce que fait la
      // sélection d'une chanson — jamais implicite selon l'écran d'origine.
      const handleSelect = (s) => {
        if (top.mode === 'solo') return startKaraoke(s, null);
        if (top.mode === 'duet') return startKaraoke(s, { dueto: true });
        if (top.mode === 'festa') return startFesta(s);
        if (top.mode === 'karaoke-any') return onRequestKaraoke(s);
        return push({ name: 'detail', song: s }); // Todos/Clipes/Catálogo : comportement historique inchangé
      };
      return (
        <TvGrid
          title={top.title}
          songs={top.songs}
          getThumb={getThumb}
          getCat={getCat}
          getHasKaraoke={getHasKaraoke}
          onSelect={handleSelect}
        />
      );
    }
    if (top.name === 'detail') {
      return (
        <TvSongDetail
          key={top.song.id}
          song={top.song}
          thumb={getThumb(top.song)}
          categoryLabel={getCat(top.song)}
          hasKaraoke={getHasKaraoke(top.song)}
          onKaraoke={() => startKaraoke(top.song, null)}
          onGoHome={goHome}
          onOpenKaraokeGrid={openKaraokeLanding}
          onOpenClipsGrid={openClipsLanding}
          onOpenCatalog={openCatalog}
          onExitApp={exitApp}
          backInterceptorRef={backInterceptorRef}
        />
      );
    }
    if (top.name === 'karaoke-landing') {
      return (
        <TvKaraokeLanding
          songs={songs}
          getThumb={getThumb}
          getHasKaraoke={getHasKaraoke}
          onChooseSolo={onChooseSolo}
          onChooseDuet={onChooseDuet}
          onChooseFesta={onChooseFesta}
          onOpenFullGrid={onOpenFullKaraokeGrid}
          onRequestKaraoke={onRequestKaraoke}
          onNavigateHome={goHome}
          onNavigateFesta={onChooseFesta}
          onNavigateClips={openClipsLanding}
          onNavigateAll={openCatalog}
          onExitApp={exitApp}
          backInterceptorRef={backInterceptorRef}
        />
      );
    }
    if (top.name === 'clips-landing') {
      return (
        <TvClipsLanding
          songs={songs}
          getThumb={getThumb}
          onSelectSong={(s) => push({ name: 'detail', song: s })}
          onNavigateHome={goHome}
          onNavigateKaraoke={openKaraokeLanding}
          onNavigateFesta={onChooseFesta}
          onNavigateAll={openCatalog}
          onExitApp={exitApp}
          backInterceptorRef={backInterceptorRef}
        />
      );
    }
    if (top.name === 'mode-landing') {
      const fullGridOpeners = { solo: openSoloGrid, duet: openDuetGrid, festa: openFestaGrid };
      const handleSelect = (s) => {
        if (top.mode === 'solo') return startKaraoke(s, null);
        if (top.mode === 'duet') return startKaraoke(s, { dueto: true });
        return startFesta(s); // festa
      };
      return (
        <TvKaraokeModeLanding
          mode={top.mode}
          songs={songs}
          getThumb={getThumb}
          getHasKaraoke={getHasKaraoke}
          onSelectSong={handleSelect}
          onOpenFullGrid={fullGridOpeners[top.mode]}
          onNavigateHome={goHome}
          onNavigateKaraoke={openKaraokeLanding}
          onNavigateFesta={onChooseFesta}
          onNavigateClips={openClipsLanding}
          onNavigateAll={openCatalog}
          onExitApp={exitApp}
          backInterceptorRef={backInterceptorRef}
        />
      );
    }
    if (top.name === 'festa-invite') {
      return (
        <TvFestaInvite
          code={festaSession?.code}
          joinUrl={festaSession?.code ? buildFestaJoinUrl(festaSession.code) : ''}
          presentNames={festaPresentNames}
          loading={festaLoading}
          offline={festaOffline}
          onContinue={proceedToFestaPicker}
          onBack={exitFestaInvite}
          backInterceptorRef={backInterceptorRef}
        />
      );
    }
    if (top.name === 'karaoke') {
      const currentSong = top.queue[top.index];
      const qInfo = top.queue.length > 1
        ? { index: top.index, total: top.queue.length, nextTitle: top.queue[top.index + 1]?.title }
        : null;
      return (
        <TvKaraokeScreen
          key={`${currentSong.id}-${top.index}`}
          song={currentSong}
          onClose={pop}
          backInterceptorRef={backInterceptorRef}
          queueInfo={qInfo}
          onNext={qInfo ? advanceFesta : undefined}
          onEnded={qInfo ? advanceFesta : undefined}
          handoff={top.handoff}
          applauseScore={top.prevApplause ?? null}
          tomatoScore={top.prevTomato ?? null}
          remoteEnergyLevel={top.festaQueueId ? (liveEnergyByEntry[top.festaQueueId] ?? null) : null}
          remoteEnergyGrade={top.prevEnergyGrade ?? null}
          initialSessionOptions={top.sessionOptions}
        />
      );
    }
    return (
      <TvHome
        songs={songs}
        getThumb={getThumb}
        getCat={getCat}
        getHasKaraoke={getHasKaraoke}
        onSelectSong={(s) => push({ name: 'detail', song: s })}
        onOpenKaraoke={(s) => startKaraoke(s, null)}
        onOpenKaraokeLanding={openKaraokeLanding}
        onOpenClipsLanding={openClipsLanding}
        onOpenFestaGrid={onChooseFesta}
        onOpenGrid={(title, list) => push({ name: 'grid', title, songs: list })}
        onExitApp={exitApp}
        backInterceptorRef={backInterceptorRef}
      />
    );
  }, [
    top, songs, getThumb, getCat, getHasKaraoke, push, pop, goHome, openClipsLanding, openCatalog,
    openKaraokeLanding, onChooseSolo, onChooseDuet, onChooseFesta, onOpenFullKaraokeGrid,
    openSoloGrid, openDuetGrid, openFestaGrid,
    onRequestKaraoke, startKaraoke, startFesta, advanceFesta,
    festaSession, festaPresentNames, festaLoading, festaOffline, proceedToFestaPicker, exitFestaInvite,
    liveEnergyByEntry,
  ]);

  if (loading) {
    return (
      <div className="tv-root tv-boot">
        <Loader2 className="tv-spin" size={44} />
        <p>A preparar o palco…</p>
      </div>
    );
  }

  return <div className="tv-root">{content}</div>;
}
