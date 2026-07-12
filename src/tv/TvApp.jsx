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
import TvHomePage from './TvHomePage';
import TvCatalogPage from './TvCatalogPage';
import TvGrid from './TvGrid';
import TvSongDetailPage from './TvSongDetailPage';
import TvKaraokeScreen from './TvKaraokeScreen';
import TvKaraokeLanding from './TvKaraokeLanding';
import TvClipsLanding from './TvClipsLanding';
import TvKaraokeModeLanding from './TvKaraokeModeLanding';
import TvFestaInvite from './components/TvFestaInvite';
import { emptyAdvanced } from './lib/tvCatalogFilters';
import '@/styles/tv.css';
import '@/styles/tv-home-v2.css';
import '@/styles/tv-home-v3.css';
import '@/styles/tv-catalog.css';
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
  const [loadError, setLoadError] = useState(false);
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

  // Chargement des chansons (Song.list bascule déjà tout seul sur content/songs.json
  // si Supabase échoue — cf. src/api/entities.js). `loadError` = liste vide au final
  // (les deux sources ont échoué) → l'état d'erreur du catálogo propose de réessayer.
  const loadSongs = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const all = await Song.list('-release_date');
      setSongs(all || []);
      setLoadError(!all || all.length === 0);
    } catch {
      setSongs([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { applyTvFlag(true); return () => applyTvFlag(false); }, []);
  useEffect(() => { loadSongs(); }, [loadSongs]);

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
  // Destination « Catálogo » de la nav = page dédiée song-first (recherche, filtres,
  // grille + panneau contextuel, fila). Remplace l'ancienne grille générique.
  const openCatalog = useCallback(() => setStack((s) => [...s, { name: 'catalog' }]), []);

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
  // Dispatcher unique pour la section « Como você quer cantar? » de l'accueil v3 :
  // chaque mode mène à SON parcours (jamais la même page), cf. onChoose* ci-dessus.
  const onChooseMode = useCallback((mode) => {
    if (mode === 'solo') return onChooseSolo();
    if (mode === 'duet') return onChooseDuet();
    return onChooseFesta(); // festa
  }, [onChooseSolo, onChooseDuet, onChooseFesta]);

  // Restauration du focus au retour d'une fiche → l'accueil v3 mémorise la clé de la
  // dernière carte focalisée (ref, pas de state : jamais de re-render pendant que
  // l'accueil est monté). Persistée sur TvApp (qui reste monté) → survit au
  // démontage/remontage de l'accueil quand une fiche passe au-dessus dans la pile.
  const homeFocusKeyRef = useRef(null);
  const setHomeFocusKey = useCallback((key) => { homeFocusKeyRef.current = key; }, []);

  // ── État du Catálogo (filtres/recherche/carte focalisée) — ref, restauré au
  // retour d'une fiche sans re-render pendant que le catálogo est monté. ──
  const catalogStateRef = useRef({ quickId: 'todas', advanced: emptyAdvanced(), searchQuery: '', focusKey: null });
  const setCatalogState = useCallback((partial) => {
    catalogStateRef.current = { ...catalogStateRef.current, ...partial };
  }, []);

  // ── Fila LOCALE du catálogo (en mémoire) — indépendante de la fila Festa
  // Supabase. Chaque entrée : { qid, id, title, singer? }. Sert au bouton
  // « Adicionar à fila » + à l'overlay de fila + « Começar a cantar ». ──
  const [localQueue, setLocalQueue] = useState([]);
  const localQueueRef = useRef(localQueue);
  localQueueRef.current = localQueue;
  const addToQueue = useCallback((vm) => {
    const existingIndex = localQueueRef.current.findIndex((q) => q.id === vm.id);
    if (existingIndex >= 0) return { added: false, position: existingIndex + 1 };
    const entry = { qid: `${vm.id}-${Date.now()}`, id: vm.id, title: vm.title, raw: vm.raw };
    setLocalQueue((q) => [...q, entry]);
    return { added: true, position: localQueueRef.current.length + 1 };
  }, []);
  const removeFromQueue = useCallback((qid) => setLocalQueue((q) => q.filter((e) => e.qid !== qid)), []);
  const clearQueue = useCallback(() => setLocalQueue([]), []);

  // Titres « familiers » (récemment ouverts en fiche ou chantés) → débloque le CTA
  // tertiaire discret « Cantar agora » dans le panneau du catálogo.
  const familiarIdsRef = useRef(new Set());
  const markFamiliar = useCallback((song) => { if (song?.id) familiarIdsRef.current.add(song.id); }, []);

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

  // « Começar a cantar » depuis l'overlay de fila du catálogo — lance le karaokê
  // avec la fila LOCALE comme playlist (titres chantables d'abord). `advanceFesta`
  // (réutilisé comme onNext/onEnded) avance dans la fila via sa branche générique
  // « index < length-1 » quand aucune session Festa n'est active.
  const startLocalQueue = useCallback(() => {
    const list = localQueueRef.current.map((e) => e.raw).filter(Boolean);
    const singable = list.filter(getHasKaraoke);
    const queue = singable.length ? singable : list;
    if (!queue.length) return;
    setStack((s) => [...s, {
      name: 'karaoke', queue, index: 0, handoff: false, sessionOptions: null,
      festaQueueId: null, prevApplause: null, prevTomato: null,
    }]);
  }, [getHasKaraoke]);

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
    if (top.name === 'catalog') {
      return (
        <TvCatalogPage
          songs={songs}
          getThumb={getThumb}
          loading={loading}
          loadError={loadError}
          queue={localQueue}
          festaPeople={festaSession ? festaPresentNames.length : null}
          familiarIds={familiarIdsRef.current}
          initialState={catalogStateRef.current}
          onStateChange={setCatalogState}
          onOpenDetail={(song) => { markFamiliar(song); push({ name: 'detail', song, source: 'catalog' }); }}
          onCantar={(song) => { markFamiliar(song); startKaraoke(song, null); }}
          onAddToQueue={addToQueue}
          onRemoveFromQueue={removeFromQueue}
          onClearQueue={clearQueue}
          onStartQueue={startLocalQueue}
          onGoHome={goHome}
          onOpenKaraoke={openKaraokeLanding}
          onOpenFesta={onChooseFesta}
          onRetryLoad={loadSongs}
          backInterceptorRef={backInterceptorRef}
        />
      );
    }
    if (top.name === 'detail') {
      return (
        <TvSongDetailPage
          key={top.song.id}
          song={top.song}
          source={top.source || 'catalog'}
          getThumb={getThumb}
          festaPeople={festaSession ? festaPresentNames.length : null}
          queue={localQueue}
          onStartKaraoke={startKaraoke}
          onAddToQueue={addToQueue}
          onGoHome={goHome}
          onOpenCatalog={openCatalog}
          onOpenKaraoke={openKaraokeLanding}
          onOpenFesta={onChooseFesta}
          onConnectPhone={onChooseFesta}
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
          queuedCount={festaQueue.filter((q) => q.status === 'waiting').length}
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
      <TvHomePage
        songs={songs}
        getThumb={getThumb}
        getHasKaraoke={getHasKaraoke}
        festaQueueCount={festaSession ? festaQueue.filter((q) => q.status === 'waiting').length : null}
        initialFocusKey={homeFocusKeyRef.current}
        onOpenDetail={(s) => { markFamiliar(s); push({ name: 'detail', song: s, source: 'home' }); }}
        onCantar={(s) => startKaraoke(s, null)}
        onChooseMode={onChooseMode}
        onOpenCatalog={openCatalog}
        onOpenKaraoke={openKaraokeLanding}
        onCardFocusKey={setHomeFocusKey}
      />
    );
  }, [
    top, songs, getThumb, getHasKaraoke, push, openCatalog,
    onChooseMode, startKaraoke, advanceFesta, startFesta,
    onChooseSolo, onChooseDuet, onChooseFesta, openKaraokeLanding, openClipsLanding,
    onOpenFullKaraokeGrid, onRequestKaraoke, openSoloGrid, openDuetGrid, openFestaGrid,
    goHome, pop, getCat, setHomeFocusKey,
    festaSession, festaPresentNames, festaLoading, festaOffline, proceedToFestaPicker, exitFestaInvite,
    liveEnergyByEntry, festaQueue,
    // Catálogo
    loading, loadError, localQueue, setCatalogState, markFamiliar,
    addToQueue, removeFromQueue, clearQueue, startLocalQueue, loadSongs,
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
