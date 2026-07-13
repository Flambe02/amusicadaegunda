import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight, ChevronLeft, Play, Pause,
  Plus, Copy, Trash2, Undo2, Redo2, Crosshair, Save, Loader2, Music, Minus, FileText,
  RotateCcw, History, ClipboardPaste, ArrowLeft, Gauge, X, Sparkles, AlertTriangle, Pencil,
  Repeat, Clock, ShieldCheck, CheckCircle2, AlertCircle, Info, Type, Wand2,
  ListMusic, Search, Video, Maximize2, Minimize2, Keyboard, MoreHorizontal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';
import { extractYouTubeId } from '@/lib/utils';
import { splitLyricsLines, parseLrc, buildLrc, formatTimestamp, activeLineIndex } from '@/lib/lrc';
import { validateTiming } from '@/lib/timingValidation';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { useTimingDraft, linesSignature } from '@/hooks/useTimingDraft';
import { listTimingVersions, getTimingVersion, createTimingVersion } from '@/lib/timingVersions';
import { parseTimingModel, timingModelToEditorLines, buildTimingModel } from '@/lib/timingModel';
import { distributeWords } from '@/lib/wordDistribution';
import KaraokeWipeLine from '@/components/karaoke/KaraokeWipeLine';
import KaraokeWordLine from '@/components/karaoke/KaraokeWordLine';
import KaraokeBallSyncStudio from '@/components/karaoke/ball-sync/KaraokeBallSyncStudio';
import TimelineWaveform from '@/components/karaoke/ball-sync/TimelineWaveform';
import { useLocalAudioSession } from '@/hooks/useLocalAudioSession';
import { saveAudioHandle, getAudioHandle, deleteAudioHandle } from '@/lib/audioHandleStore';
import { putAssociation, deleteAssociation } from '@/lib/localMediaDb';
import { getSessionAudioFile, setSessionAudioFile, deleteSessionAudioFile } from '@/lib/localAudioSessionCache';
import '@/styles/karaoke.css';

const REWIND_SECONDS = 3;
const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 300;
const DEFAULT_PX_PER_SEC = 80;
const DEFAULT_LINE_WIDTH_SEC = 2; // largeur visuelle par défaut d'un bloc (fixe, pas dynamique)
const PLAYBACK_RATES = [1, 0.75, 0.5, 0.25];
const MAX_HISTORY = 100;
const AUTOSAVE_DEBOUNCE_MS = 12000; // ~12s après la DERNIÈRE édition (jamais pendant un drag/hold)

// Calibration de latence : la latence de réaction (voir + taper Espace) est propre
// à la personne + à l'appareil, pas à la chanson → persistée en localStorage.
const LATENCY_KEY = 'karaoke-latency-ms';
const CAL_FLASHES = 5;        // nombre de flashs du test de réaction
const CAL_MIN_GAP = 1100;     // délai min (ms) avant un flash (aléatoire → pas d'anticipation)
const CAL_MAX_GAP = 2200;     // délai max (ms) avant un flash
const MAX_LATENCY = 600;      // borne haute raisonnable (ms)

/**
 * Éditeur / synchroniseur de karaoké (admin, Partie A).
 *
 * Écran unique façon « Manual Sync » : liste des lignes à gauche, aperçu vidéo +
 * overlay karaoké à droite, barre d'outils, et une frise temporelle en bas où
 * chaque ligne est un bloc qu'on peut glisser pour affiner son timing.
 *
 * Toujours ligne par ligne (pas mot-par-mot). Chaque ligne a un temps de DÉPART
 * (toujours) et, optionnellement, un temps de FIN capturé via le geste Espace
 * maintenu/relâché — sans fin captée, la fin reste implicite (= début de la ligne
 * suivante), comme avant. Le lecteur karaoké public respecte les deux cas
 * (via activeLineIndex, partagé avec cet outil).
 */
export default function KaraokeSyncTool({ song, onClose, onSaved }) {
  const { toast } = useToast();
  const { YT, ready: apiReady, error: apiError } = useYouTubeIframeApi();

  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);

  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [syncLyricsToo, setSyncLyricsToo] = useState(true);
  const [pxPerSecond, setPxPerSecond] = useState(DEFAULT_PX_PER_SEC);
  const [isHolding, setIsHolding] = useState(false); // Espace maintenu = en train de marquer la ligne
  const isHoldingRef = useRef(false); // miroir de isHolding pour les handlers (keyup/blur) sans stale
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [shiftAllMode, setShiftAllMode] = useState(true); // ±100ms : toutes les lignes (true) ou juste la sélectionnée (false)

  // ── Stage 1 : protection du travail de synchronisation ──
  // saveState pilote la pastille de statut du header (états visibles requis) :
  // 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'recovered'.
  const [saveState, setSaveState] = useState('clean');
  const [lastSavedAt, setLastSavedAt] = useState(null); // horodatage dernière sauvegarde serveur
  const [draftSavedAt, setDraftSavedAt] = useState(null); // horodatage dernier autosave local
  const savingRef = useRef(false); // garde anti double-sauvegarde concurrente
  const isDirtyRef = useRef(false); // miroir de isDirty pour handleClose (évite de recréer le handler)
  // Signature de l'état SERVEUR courant (dernier état sauvegardé/chargé). Sert à
  // détecter « modifications non salvas » et à décider quand faire un autosave local.
  const savedSignatureRef = useRef(linesSignature(buildInitialLines(song)));

  const { initialDraft, saveDraft, clearDraft } = useTimingDraft(song.id);
  const [draftPrompt, setDraftPrompt] = useState(false); // banner « Recuperar rascunho »
  const draftDecidedRef = useRef(false); // la récupération n'est proposée qu'une fois

  // ── Session Supabase : vérifiée au montage + suivie en continu ──
  // SANS session, l'UI admin peut parfaitement s'afficher (mode dev, session
  // expirée…) mais le RLS bloque toute écriture → « Falha ao salvar » incompréhensible
  // (bug 2026-07-13). On prévient AVANT que l'utilisateur ne travaille pour rien.
  const [hasSession, setHasSession] = useState(true); // optimiste jusqu'à vérification
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data: { session } }) => { if (alive) setHasSession(Boolean(session)); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setHasSession(Boolean(session));
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const [loopActive, setLoopActive] = useState(false); // « Repetir linha » : boucle la ligne sélectionnée

  // ── Mode d'édition explicite (une seule source de vérité pour le clavier) ──
  // 'review'         : Espaço = Play/Pause, aucune modification de timing accidentelle.
  // 'capture-lines'  : Espaço maintenu = marque début→fin de la ligne (workflow central).
  // 'capture-words'  : Espaço = toque bref, capture le mot suivant (panneau palavras).
  // Défaut sûr : une chanson déjà synchronisée s'ouvre en « review » (Espaço = Play/Pause,
  // aucun risque d'écraser un timing existant) ; une chanson vierge s'ouvre « armée » en
  // capture-lines (le geste central est immédiatement prêt).
  const [mode, setMode] = useState(() => (buildInitialLines(song).some((l) => l.time != null) ? 'review' : 'capture-lines'));
  const wordCaptureActive = mode === 'capture-words'; // dérivé — le panneau palavras s'y réfère
  const prevModeRef = useRef('capture-lines'); // mode à restaurer en sortant de la capture palavra

  // ── Stage 2 : édition mot-à-mot (hybride) ──
  const [wordPanelIndex, setWordPanelIndex] = useState(null); // index de ligne dont le panneau « Sincronizar palavras » est ouvert
  const [ballStudioIndex, setBallStudioIndex] = useState(null); // ligne ouverte dans le studio « Afinar palavras e bola » (mode focalisé)

  // Session audio LOCALE partagée (écran principal + studio) — montée une fois par
  // chanson, elle persiste quand on ouvre/ferme le studio ou qu'on change de ligne.
  // L'audio n'est JAMAIS envoyé au serveur (voir useLocalAudioSession).
  const localAudio = useLocalAudioSession();
  const audioOffsetKey = `karaoke-audio-offset-${song?.id}`;
  const [audioOffsetMs, setAudioOffsetMs] = useState(() => {
    const v = parseInt(typeof localStorage !== 'undefined' ? localStorage.getItem(audioOffsetKey) : '', 10);
    return Number.isFinite(v) ? v : 0;
  });
  useEffect(() => { try { localStorage.setItem(audioOffsetKey, String(audioOffsetMs)); } catch { /* noop */ } }, [audioOffsetMs, audioOffsetKey]);
  const audioOffsetSec = audioOffsetMs / 1000;

  // Le fichier audio est MÉMORISÉ localement (File System Access API + IndexedDB, par
  // chanson, sur cet appareil) pour éviter de le re-sélectionner à chaque session.
  // Aucun octet n'est envoyé au serveur ; on ne garde qu'un handle local (voir audioHandleStore).
  const supportsFsApi = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  const fileInputRef = useRef(null);
  const pendingHandleRef = useRef(null);
  const [pendingAudioName, setPendingAudioName] = useState(null); // handle mémorisé en attente d'une permission
  const localAudioRef = useRef(localAudio); localAudioRef.current = localAudio;

  const onMainAudioPick = (e) => {
    const f = e.target.files?.[0];
    if (f) { localAudioRef.current.load(f); setSessionAudioFile(song?.id, f); }
    e.target.value = '';
  };

  const pickLocalAudio = useCallback(async () => {
    if (supportsFsApi) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: false,
          types: [{ description: 'Áudio', accept: {
            'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'], 'audio/x-wav': ['.wav'],
            'audio/mp4': ['.m4a'], 'audio/aac': ['.aac'], 'audio/ogg': ['.ogg'], 'audio/flac': ['.flac'],
          } }],
        });
        const file = await handle.getFile();
        await localAudioRef.current.load(file);
        setPendingAudioName(null);
        pendingHandleRef.current = handle;
        setSessionAudioFile(song?.id, file);
        try { await saveAudioHandle(song?.id, handle); } catch { /* IndexedDB indisponível */ }
        // Mirror into the admin local library so Biblioteca / drawer reflect it.
        try {
          await putAssociation({
            songId: song?.id, handle, localFileId: null, fileHash: null,
            fileName: file.name, mimeType: file.type, sizeBytes: file.size,
            durationSeconds: null, relativePath: file.name,
          });
        } catch { /* noop */ }
      } catch { /* cancelado pelo utilizador */ }
    } else {
      fileInputRef.current?.click();
    }
  }, [supportsFsApi, song?.id]);

  const reopenLocalAudio = useCallback(async () => {
    const handle = pendingHandleRef.current;
    if (!handle) return;
    try {
      const perm = await handle.requestPermission?.({ mode: 'read' });
      if (perm && perm !== 'granted') return;
      const file = await handle.getFile();
      await localAudioRef.current.load(file);
      setPendingAudioName(null);
    } catch { /* falhou — o ficheiro pode ter sido movido/renomeado */ }
  }, []);

  const removeLocalAudio = useCallback(async () => {
    localAudioRef.current.clear();
    setPendingAudioName(null);
    pendingHandleRef.current = null;
    try { await deleteAudioHandle(song?.id); } catch { /* noop */ }
    try { await deleteAssociation(song?.id); } catch { /* noop */ }
    deleteSessionAudioFile(song?.id);
  }, [song?.id]);

  // Ao abrir uma música: reutiliza o áudio já associado sem recarregar.
  //   1) Ficheiro em cache de sessão (associado na Biblioteca ou já carregado) —
  //      funciona mesmo sem File System Access (modo manual).
  //   2) Handle persistente (File System Access) — reabre automaticamente se a
  //      permissão ainda vale, senão propõe « Reabrir áudio ».
  useEffect(() => {
    if (!song?.id) return undefined;
    let cancelled = false;
    (async () => {
      const cached = getSessionAudioFile(song.id);
      if (cached) { if (!cancelled) { localAudioRef.current.load(cached); setPendingAudioName(null); } return; }
      if (!supportsFsApi) return;
      try {
        const handle = await getAudioHandle(song.id);
        if (!handle || cancelled) return;
        pendingHandleRef.current = handle;
        const perm = await handle.queryPermission?.({ mode: 'read' });
        if (perm === 'granted') {
          const file = await handle.getFile();
          if (!cancelled) { localAudioRef.current.load(file); setSessionAudioFile(song.id, file); }
        } else if (!cancelled) {
          setPendingAudioName(handle.name || 'áudio');
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [supportsFsApi, song?.id]);
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const captureIndexRef = useRef(0); // prochain mot à capturer (0-based)

  const enterWordCapture = useCallback(() => {
    setMode((m) => { if (m !== 'capture-words') prevModeRef.current = m; return 'capture-words'; });
  }, []);
  const exitWordCapture = useCallback(() => {
    setMode((m) => (m === 'capture-words' ? (prevModeRef.current || 'capture-lines') : m));
  }, []);
  // Réf vers captureNextWord (défini plus bas) — évite un TDZ dans l'effet clavier
  // principal, déclaré plus haut dans le fichier, sans avoir à réordonner tout l'éditeur.
  const captureNextWordRef = useRef(() => {});

  const [showValidation, setShowValidation] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false); // diálogo de atalhos de teclado
  const [showMoreMenu, setShowMoreMenu] = useState(false);    // menu «⋯» do header

  // ── UI de remaster : navegação, pré-visualização e inspector ──
  const [inspectorTab, setInspectorTab] = useState('line');   // 'line' | 'words'
  const [previewTab, setPreviewTab] = useState('karaoke');    // 'karaoke' | 'video' | 'split'
  const [lineFilter, setLineFilter] = useState('all');        // 'all' | 'unsynced' | 'warnings' | 'words'
  const [lineSearch, setLineSearch] = useState('');
  const [autoFollow, setAutoFollow] = useState(true);         // seguir a linha ativa durante a reprodução
  const [videoHidden, setVideoHidden] = useState(false);      // janela de vídeo flutuante fechada
  const [videoExpanded, setVideoExpanded] = useState(false);  // janela de vídeo flutuante ampliada
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsUnavailable, setVersionsUnavailable] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  // Latence de réaction mesurée (ms) : retranchée automatiquement à chaque marquage
  // Espace/Enter (voir markLineStart) → la frise affiche déjà la bonne position, ce
  // qui rend la passe « Shift All » globale inutile. Réglage fin ±100ms toujours dispo.
  const [latencyMs, setLatencyMs] = useState(() => {
    try { const v = parseInt(localStorage.getItem(LATENCY_KEY), 10); return Number.isFinite(v) ? v : 0; } catch { return 0; }
  });
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Recharge la chanson DIRECTEMENT depuis Supabase à l'ouverture (garde-fou
  // supplémentaire contre toute donnée obsolète côté client — le prop `song` vient de
  // l'état local de l'admin, cette requête garantit lyrics/lrc_content/youtube_url à jour).
  const [freshSong, setFreshSong] = useState(null);
  const effectiveSong = freshSong || song;
  const userEditedLyricsRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('songs')
        .select('id, title, lyrics, lrc_content, youtube_url, youtube_music_url')
        .eq('id', song.id)
        .maybeSingle();
      if (!cancelled && data) setFreshSong(data);
    })();
    return () => { cancelled = true; };
  }, [song?.id]);

  const videoId = useMemo(
    () => extractYouTubeId(effectiveSong?.youtube_url) || extractYouTubeId(effectiveSong?.youtube_music_url),
    [effectiveSong?.youtube_url, effectiveSong?.youtube_music_url]
  );

  // Lignes : { text, time:number|null }. Init depuis LRC existant, sinon paroles brutes.
  // (nouvelle instance à chaque changement de `song` grâce à key={song.id} côté Admin.jsx)
  const [lines, setLines] = useState(() => buildInitialLines(song));
  const [cursor, setCursor] = useState(() => {
    const init = buildInitialLines(song);
    const firstNull = init.findIndex((l) => l.time == null);
    return firstNull === -1 ? Math.max(0, init.length - 1) : firstNull;
  });
  const cursorRef = useRef(0);
  cursorRef.current = cursor;
  // Horodatage de la dernière sélection MANUELLE d'une ligne (clic liste/frise) : pendant
  // ~4 s, l'auto-suivi (Seguir reprodução) ne réécrase pas ce choix — sinon le curseur
  // « dérive » vers la ligne jouée et on ouvre le studio sur la mauvaise frase.
  const manualSelectRef = useRef(0);
  const selectLineManually = useCallback((i) => { manualSelectRef.current = Date.now(); setCursor(i); }, []);

  // ── Étape « Letra » : confirmer/corriger le texte AVANT de synchroniser ──
  // Sert aussi de garde-fou visuel : le titre + la letra affichés doivent correspondre
  // à la chanson ouverte — si jamais ce n'était pas le cas, c'est visible ici tout de suite.
  // Uma música já sincronizada abre diretamente no editor de sincronização (não força
  // o ecrã «Letra» de cada vez) — «Letra completa» no header volta lá quando preciso.
  const [step, setStep] = useState(() => (buildInitialLines(song).some((l) => l.time != null) ? 'sync' : 'lyrics')); // 'lyrics' | 'sync'
  const [lyricsDraft, setLyricsDraft] = useState(() => lines.map((l) => l.text).join('\n'));

  // Dès que la donnée FRAÎCHE de Supabase arrive, si l'utilisateur n'a encore rien
  // corrigé manuellement et qu'on est toujours à l'étape « Letra », on aligne le
  // brouillon dessus (sécurité : le prop `song` initial pourrait être obsolète).
  useEffect(() => {
    if (!freshSong || step !== 'lyrics' || userEditedLyricsRef.current) return;
    const fresh = buildInitialLines(freshSong);
    const currentTexts = lines.map((l) => l.text).join('\n');
    const freshTexts = fresh.map((l) => l.text).join('\n');
    if (freshTexts && freshTexts !== currentTexts) {
      setLines(fresh);
      setLyricsDraft(freshTexts);
      setCursor(0);
      savedSignatureRef.current = linesSignature(fresh); // nouvel état serveur de référence
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshSong, step]);

  // Instantané des lignes au moment d'entrer en sync — sert de filet de sécurité
  // (« Restaurar versão inicial ») pour annuler TOUTE la session de sync en une fois.
  const initialSyncLinesRef = useRef(null);

  // Quand on ouvre directement en mode « sync » (chanson déjà synchronisée), on fixe
  // l'instantané de référence une seule fois au montage (pour « Restaurar versão inicial »).
  useEffect(() => {
    if (step === 'sync' && !initialSyncLinesRef.current) {
      initialSyncLinesRef.current = lines.map((l) => ({ ...l }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proceedToSync = useCallback(() => {
    const newTexts = splitLyricsLines(lyricsDraft);
    if (newTexts.length === 0) return;
    const unchanged = newTexts.length === lines.length && newTexts.every((t, i) => t === lines[i].text);
    // Le texte a changé (ajout/suppression/correction) → FUSION intelligente qui
    // préserve les temps des lignes inchangées (seules les lignes ajoutées repartent
    // sans temps). Fini le « ajouter une phrase remet toute la synchro à zéro ».
    const finalLines = unchanged ? lines : mergeLinesPreservingTimes(lines, newTexts);
    if (!unchanged) {
      setLines(finalLines);
      const firstNull = finalLines.findIndex((l) => l.time == null);
      setCursor(firstNull === -1 ? 0 : firstNull); // curseur sur la 1ère ligne à marquer
    }
    initialSyncLinesRef.current = finalLines.map((l) => ({ ...l }));
    setStep('sync');
  }, [lyricsDraft, lines]);

  // Revenir à l'écran « Letra completa » depuis la sync : recharge le brouillon avec
  // le texte ACTUEL des lignes (y compris les ajouts/corrections faits en sync).
  const backToLyrics = useCallback(() => {
    setLyricsDraft(lines.map((l) => l.text).join('\n'));
    userEditedLyricsRef.current = true; // empêche l'écrasement par le fetch « fresh »
    setStep('lyrics');
  }, [lines]);

  // Sauvegarde SEULE la letra (colonne `lyrics`) dans Supabase, sans toucher au LRC —
  // pour corriger/compléter les paroles complètes stockées et les réutiliser ailleurs.
  const [isSavingLyrics, setIsSavingLyrics] = useState(false);
  const handleSaveLyricsOnly = useCallback(async () => {
    const joined = splitLyricsLines(lyricsDraft).join('\n');
    if (!joined) return;
    setIsSavingLyrics(true);
    try {
      try { await supabase.auth.refreshSession(); } catch { /* diagnostic plus bas */ }
      const { data, error } = await supabase.from('songs').update({ lyrics: joined }).eq('id', song.id).select();
      if (error) throw new Error(describeSaveError(error));
      if (!data || data.length === 0) throw new Error(await diagnoseZeroRows());
      toast({ title: '✅ Letra guardada', description: 'A letra completa foi atualizada no Supabase.' });
    } catch (err) {
      toast({ title: 'Erro ao guardar letra', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingLyrics(false);
    }
  }, [lyricsDraft, song.id, toast]);

  // Colle le contenu du presse-papiers directement dans le textarea des paroles.
  const handlePasteLyrics = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { userEditedLyricsRef.current = true; setLyricsDraft(text); }
    } catch {
      toast({ title: 'Não foi possível aceder à área de transferência', description: 'Cola manualmente com Ctrl+V no campo.', variant: 'destructive' });
    }
  }, [toast]);

  const listItemRefs = useRef({});
  const activeBlockRef = useRef(null);
  const timelineTrackRef = useRef(null);
  const dragRef = useRef(null);

  // ── Historique Undo/Redo générique — toute action « discrète » (marquer, ajouter,
  // supprimer, dupliquer, insérer, réinitialiser, décaler) passe par commitLines()
  // pour être annulable. Le drag de bloc ne pousse qu'UNE entrée au début du geste
  // (pas à chaque pixel) ; la frappe libre dans les champs texte/temps n'est pas
  // historisée (undo natif du navigateur dans le champ suffit pour ce cas).
  const historyPast = useRef([]);
  const historyFuture = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const commitLines = useCallback((updater) => {
    setLines((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      historyPast.current.push(prev);
      if (historyPast.current.length > MAX_HISTORY) historyPast.current.shift();
      historyFuture.current = [];
      setCanUndo(true);
      setCanRedo(false);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setLines((prev) => {
      if (historyPast.current.length === 0) return prev;
      const previous = historyPast.current.pop();
      historyFuture.current.push(prev);
      setCanUndo(historyPast.current.length > 0);
      setCanRedo(true);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setLines((prev) => {
      if (historyFuture.current.length === 0) return prev;
      const nextState = historyFuture.current.pop();
      historyPast.current.push(prev);
      setCanUndo(true);
      setCanRedo(historyFuture.current.length > 0);
      return nextState;
    });
  }, []);

  // ── Player (monté seulement une fois l'étape « Sincronizar » atteinte) ──
  useEffect(() => {
    if (step !== 'sync' || !apiReady || !YT || !videoId || !hostRef.current) return undefined;
    let destroyed = false;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;

    const player = new YT.Player(hostRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 1, ...(origin ? { origin } : {}) },
      events: {
        onReady: (e) => {
          if (destroyed) return;
          setPlayerReady(true);
          try { setDuration(e.target.getDuration() || 0); } catch { /* ignore */ }
        },
        onStateChange: (e) => {
          if (destroyed) return;
          if (e.data === 1) setIsPlaying(true);
          else if (e.data === 2 || e.data === 0) setIsPlaying(false);
        },
      },
    });
    playerRef.current = player;

    return () => {
      destroyed = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      try { player.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [step, apiReady, YT, videoId]);

  // ── Poll temps courant ──
  useEffect(() => {
    if (!playerReady) return undefined;
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') setCurrentTime(p.getCurrentTime() || 0);
    }, 100);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [playerReady]);

  const getTime = () => {
    const p = playerRef.current;
    return p && typeof p.getCurrentTime === 'function' ? p.getCurrentTime() : 0;
  };
  const seekTo = useCallback((t) => {
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') p.seekTo(Math.max(0, t), true);
  }, []);
  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
  }, [isPlaying]);
  const rewind = useCallback(() => seekTo(getTime() - REWIND_SECONDS), [seekTo]);

  // ── Vitesse de lecture (aide au calage des passages rapides) ──
  const applyPlaybackRate = useCallback((rate) => {
    const p = playerRef.current;
    if (p && typeof p.setPlaybackRate === 'function') p.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }, []);
  const cyclePlaybackRate = useCallback(() => {
    setPlaybackRateState((prevRate) => {
      const idx = PLAYBACK_RATES.indexOf(prevRate);
      const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      const p = playerRef.current;
      if (p && typeof p.setPlaybackRate === 'function') p.setPlaybackRate(next);
      return next;
    });
  }, []);

  // ── Édition des lignes (toutes les actions agissent sur la ligne sélectionnée = cursor) ──
  // Horloge réelle du navigateur au moment de l'appui — sert à calculer la durée de
  // maintien indépendamment de getCurrentTime() de YouTube, dont la granularité
  // interne (mise à jour par à-coups, ~250ms) rend un appui/relâchement rapide
  // souvent indiscernable (même valeur au press et au release).
  const holdStartWallClockRef = useRef(null);

  // Marque le DÉPART d'une ligne (efface un éventuel ancien temps de fin, devenu
  // caduc puisqu'il était lié à l'ancien départ).
  const markLineStart = useCallback((index) => {
    // On retranche la latence de réaction mesurée. Elle est en temps RÉEL ; convertie
    // en temps vidéo selon la vitesse de lecture (à 0.5×, 200ms réels = 100ms vidéo),
    // cohérent avec le calcul de la durée dans markLineEnd.
    const t = Math.max(0, getTime() - (latencyMs / 1000) * playbackRate);
    holdStartWallClockRef.current = performance.now();
    commitLines((prev) => prev.map((l, i) => (i === index ? { ...l, time: t, endTime: null } : l)));
  }, [commitLines, latencyMs, playbackRate]);

  // Marque la FIN d'une ligne (relâchement d'Espace) — durée = temps RÉEL écoulé
  // depuis l'appui (converti en temps vidéo selon la vitesse de lecture), pas
  // getCurrentTime() au relâchement. Fusionnée dans le même pas d'historique que
  // le départ (setLines direct, pas de nouveau commitLines) pour qu'un seul
  // Anular annule tout le geste maintenu.
  const markLineEnd = useCallback((index) => {
    const startedAt = holdStartWallClockRef.current;
    const elapsedRealSec = startedAt != null ? Math.max(0, (performance.now() - startedAt) / 1000) : 0;
    const elapsedVideoSec = elapsedRealSec * playbackRate;
    holdStartWallClockRef.current = null;
    setLines((prev) => prev.map((l, i) => {
      if (i !== index || l.time == null || elapsedVideoSec <= 0.03) return l;
      return { ...l, endTime: l.time + elapsedVideoSec };
    }));
  }, [playbackRate]);

  const markCursor = useCallback(() => {
    if (cursor < 0 || cursor >= lines.length) return;
    markLineStart(cursor);
    setCursor((c) => Math.min(c + 1, lines.length - 1));
  }, [cursor, lines.length, markLineStart]);

  // Outil manuel « Marcar fim » : fixe la fin de la ligne sélectionnée au temps courant
  // (correction ponctuelle — le geste central reste Espaço maintenu). Un pas d'undo.
  const markEndAtPlayhead = useCallback(() => {
    const t = getTime();
    commitLines((prev) => prev.map((l, i) => (
      i === cursor && l.time != null && t > l.time + 0.05 ? { ...l, endTime: t } : l
    )));
  }, [cursor, commitLines]);

  // « Recomeçar linha » : recua até ao início da linha e toca (para reouvir/afinar).
  const restartLine = useCallback(() => {
    const l = lines[cursor];
    if (l?.time == null) return;
    seekTo(l.time);
    try { playerRef.current?.playVideo?.(); } catch { /* ignore */ }
  }, [cursor, lines, seekTo]);

  const setLineText = useCallback((index, text) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, text } : l)));
  }, []);

  const addLineAfter = useCallback((index) => {
    commitLines((prev) => {
      const next = prev.slice();
      next.splice(index + 1, 0, { text: '', time: null, endTime: null });
      return next;
    });
    setCursor(index + 1);
  }, [commitLines]);

  const deleteLine = useCallback((index) => {
    commitLines((prev) => prev.filter((_, i) => i !== index));
    setCursor((c) => Math.max(0, c > index ? c - 1 : c));
  }, [commitLines]);

  // Duplique la ligne sélectionnée (même texte, sans temps) — pour un refrão répété.
  const duplicateLine = useCallback((index) => {
    commitLines((prev) => {
      const next = prev.slice();
      const src = next[index];
      if (!src) return prev;
      next.splice(index + 1, 0, { text: src.text, time: null, endTime: null });
      return next;
    });
    setCursor(index + 1);
  }, [commitLines]);

  // Insère une ligne vide au temps courant (pause auto), pour une parole oubliée.
  const insertAtPlayhead = useCallback(() => {
    try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    const t = getTime();
    commitLines((prev) => {
      const next = prev.slice();
      let idx = next.length;
      for (let i = 0; i < next.length; i += 1) {
        if (next[i].time != null && next[i].time <= t) idx = i + 1;
      }
      next.splice(idx, 0, { text: '', time: t, endTime: null });
      return next;
    });
  }, [commitLines]);

  // « Reset From Current » : efface seulement les temps à partir de la ligne sélectionnée
  // (préserve le travail déjà fait avant) — vs « Reset All » qui efface tout.
  const resetFromCursor = useCallback(() => {
    commitLines((prev) => prev.map((l, i) => (i >= cursor ? { ...l, time: null, endTime: null } : l)));
  }, [cursor, commitLines]);

  const resetAll = useCallback(() => {
    commitLines((prev) => prev.map((l) => ({ ...l, time: null, endTime: null })));
    setCursor(0);
    seekTo(0);
  }, [commitLines, seekTo]);

  // Filet de sécurité : revient à l'état des lignes tel qu'il était à l'ouverture
  // de l'étape de sync (avant toute correction faite pendant cette session).
  const restoreInitial = useCallback(() => {
    if (!initialSyncLinesRef.current) return;
    commitLines(() => initialSyncLinesRef.current.map((l) => ({ ...l })));
    setCursor(0);
  }, [commitLines]);

  // Décale TOUTES les lignes déjà marquées d'un coup (ex. la chanson entière est
  // légèrement en avance/retard) — évite de refaire chaque ligne une par une.
  const shiftAll = useCallback((deltaMs) => {
    const delta = deltaMs / 1000;
    commitLines((prev) => prev.map((l) => (l.time != null ? { ...l, time: Math.max(0, l.time + delta) } : l)));
  }, [commitLines]);

  // Décale seulement la ligne SÉLECTIONNÉE (quand « Shift All » est désactivé).
  const nudgeCursorTime = useCallback((deltaMs) => {
    const delta = deltaMs / 1000;
    commitLines((prev) => prev.map((l, i) => (i === cursor && l.time != null ? { ...l, time: Math.max(0, l.time + delta) } : l)));
  }, [cursor, commitLines]);

  // Bouton ±100ms : agit sur TOUTES les lignes si shiftAllMode est actif (par défaut),
  // sinon uniquement sur la ligne actuellement sélectionnée.
  const applyShiftButton = useCallback((deltaMs) => {
    if (shiftAllMode) shiftAll(deltaMs); else nudgeCursorTime(deltaMs);
  }, [shiftAllMode, shiftAll, nudgeCursorTime]);

  // Applique une latence fraîchement mesurée. Si des lignes ont déjà été marquées avec
  // l'ancienne latence, on les recale par la DIFFÉRENCE (ex. avant 0ms, maintenant 120ms
  // → on avance de 120ms les lignes déjà posées). Persistée par appareil.
  const applyCalibration = useCallback((newLatency) => {
    const deltaMs = newLatency - latencyMs;
    const hasTimed = lines.some((l) => l.time != null);
    if (deltaMs !== 0 && hasTimed) shiftAll(-deltaMs);
    setLatencyMs(newLatency);
    try { localStorage.setItem(LATENCY_KEY, String(newLatency)); } catch { /* ignore */ }
    setIsCalibrating(false);
    toast({ title: `🎯 Calibrado: ${newLatency} ms`, description: 'As marcações Espaço/Enter vão compensar o teu tempo de reação automaticamente.' });
  }, [latencyMs, lines, shiftAll, toast]);

  const handleClose = useCallback(() => {
    try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    // Garde de navigation INTERNE : confirmer si des modifications ne sont pas guardadas.
    // Le brouillon local reste (récupérable au retour) même si on quitte.
    if (isDirtyRef.current) {
      const ok = window.confirm('Tens alterações não guardadas. Sair mesmo assim? (o rascunho fica guardado neste dispositivo)');
      if (!ok) return;
    }
    onClose?.();
  }, [onClose]);

  // ── Clavier (désactivé pendant l'édition d'un champ texte) ──
  // Espace = maintenir/relâcher comme un chrono : on appuie quand la phrase COMMENCE
  // (capture le temps de départ de la ligne sélectionnée) et on relâche quand la
  // phrase SE TERMINE (avance à la ligne suivante). Enter reste un marquage instantané
  // (appui bref) pour les lignes très courtes/rapprochées.
  // Le comportement d'Espaço est dérivé du `mode` explicite (une seule source de
  // vérité) — l'utilisateur ne devine jamais ce que fait Espaço :
  //   review        → Play/Pause (aucun timing modifié)
  //   capture-lines → maintenir/relâcher = début/fin de la ligne (workflow central)
  //   capture-words → toque bref = capture le mot suivant
  const finishHold = useCallback(() => {
    if (!isHoldingRef.current) return;
    markLineEnd(cursorRef.current);
    isHoldingRef.current = false;
    setIsHolding(false);
    setCursor((c) => Math.min(c + 1, lines.length - 1));
  }, [markLineEnd, lines.length]);

  useEffect(() => {
    if (step !== 'sync') return undefined; // aucune capture avant l'étape de synchronisation
    const isEditable = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const onKeyDown = (e) => {
      if (isCalibrating) return; // la calibration capture Espace pour son propre test
      if (isEditable(e.target)) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // évite le scroll de page
        if (e.repeat) return; // ignore la répétition auto du navigateur pendant le maintien
        if (mode === 'capture-words') { captureNextWordRef.current?.(); return; }
        if (mode === 'review') { togglePlay(); return; }
        // capture-lines : démarre le chrono de la ligne
        markLineStart(cursor);
        isHoldingRef.current = true;
        setIsHolding(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'capture-lines') markCursor(); // marquage instantané (sans fin)
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        rewind();
      } else if (e.key === 'p' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's') {
        e.preventDefault();
        cyclePlaybackRate();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Cancelar a captura por palavra não altera dados guardados — apenas sai do modo.
        if (mode === 'capture-words') { exitWordCapture(); return; }
        handleClose();
      }
    };

    const onKeyUp = (e) => {
      if (isCalibrating) return;
      if (isEditable(e.target)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (mode !== 'capture-lines') return; // toque/palavra = rien à faire au relâchement
        finishHold();
      }
    };

    // Filet de sécurité : si la fenêtre perd le focus (alt-tab, clic ailleurs) pendant
    // un maintien, on clôt la ligne proprement — jamais de ligne bloquée « en gravação ».
    const onBlur = () => { finishHold(); };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [step, cursor, mode, markLineStart, markCursor, finishHold, undo, redo, rewind, togglePlay, handleClose, cyclePlaybackRate, isCalibrating, exitWordCapture]);

  // Compteur live (durée du maintien) affiché pendant la capture — rAF, un seul petit
  // state, actif seulement le temps bref d'un maintien d'Espaço.
  const [holdMs, setHoldMs] = useState(0);
  useEffect(() => {
    if (!isHolding) { setHoldMs(0); return undefined; }
    const start = performance.now();
    let raf = 0;
    const tick = () => { setHoldMs(Math.round((performance.now() - start) * playbackRate)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isHolding, playbackRate]);

  // ── Auto-scroll liste + frise vers la ligne sélectionnée ──
  useEffect(() => {
    listItemRefs.current[cursor]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    activeBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [cursor]);

  // ── Auto-scroll de la frise pour suivre la position de lecture (naviguer sans
  // perdre le curseur de vue), que la vidéo soit en lecture ou en pause après un seek.
  // Ne recentre QUE si le curseur sort de la zone visible (pas à chaque frame), pour
  // ne pas gêner un défilement manuel.
  useEffect(() => {
    const track = timelineTrackRef.current;
    if (!track) return;
    const playheadPx = currentTime * pxPerSecond;
    const viewLeft = track.scrollLeft;
    const viewWidth = track.clientWidth;
    const margin = viewWidth * 0.12;
    if (playheadPx < viewLeft + margin || playheadPx > viewLeft + viewWidth - margin) {
      track.scrollLeft = Math.max(0, playheadPx - viewWidth * 0.3);
    }
  }, [currentTime, pxPerSecond]);

  // Ligne active pour l'overlay — même logique gap-aware que le lecteur public
  // (endTime dépassé = aucune ligne active), MAIS on ne peut pas passer `lines` tel
  // quel à activeLineIndex() : celle-ci suppose un tableau déjà TRIÉ par temps et SANS
  // lignes non marquées (vrai pour un LRC parsé, faux ici — `lines` reste dans l'ordre
  // du texte, avec des `time: null` mélangés pendant la sync). En JS, `null <= t` vaut
  // `true` (coercion à 0), donc une ligne non marquée serait sinon prise pour la ligne
  // active. On construit donc d'abord la sous-liste triée des lignes déjà marquées.
  const { activeIdx, activeProgress, activeWordIdx, activeWordProgress } = useMemo(() => {
    const timed = lines
      .map((l, i) => ({ i, time: l.time, endTime: l.endTime }))
      .filter((l) => l.time != null)
      .sort((a, b) => a.time - b.time);
    const pos = activeLineIndex(timed, currentTime);
    if (pos === -1) return { activeIdx: -1, activeProgress: 0, activeWordIdx: -1, activeWordProgress: 0 };
    const cur = timed[pos];
    // Fin = endTime capté, sinon début de la ligne suivante (dans l'ordre du temps).
    const end = cur.endTime ?? timed[pos + 1]?.time ?? cur.time + 4;
    const progress = (currentTime - cur.time) / Math.max(0.2, end - cur.time);

    // Aperçu mot-à-mot (Stage 2) : si la ligne active a des mots, calcule le mot actif +
    // sa progression, avec la même priorité mot > frase que le lecteur public.
    const words = lines[cur.i]?.words;
    if (Array.isArray(words) && words.length > 0) {
      let wi = -1;
      for (let k = 0; k < words.length; k += 1) { if (words[k].start <= currentTime) wi = k; else break; }
      if (wi === -1) wi = 0;
      const w = words[wi];
      const wEnd = Number.isFinite(w.end) ? w.end : (words[wi + 1]?.start ?? end);
      const wProgress = (currentTime - w.start) / Math.max(0.05, wEnd - w.start);
      return { activeIdx: cur.i, activeProgress: progress, activeWordIdx: wi, activeWordProgress: wProgress };
    }
    return { activeIdx: cur.i, activeProgress: progress, activeWordIdx: -1, activeWordProgress: 0 };
  }, [lines, currentTime]);

  const syncedCount = lines.filter((l) => l.time != null).length;

  // ── « Alterações não salvas » : l'état courant diffère de l'état serveur ──
  const currentSignature = useMemo(() => linesSignature(lines), [lines]);
  const isDirty = currentSignature !== savedSignatureRef.current;
  isDirtyRef.current = isDirty;

  // Reflète l'état sale dans la pastille sans écraser les états transitoires collants
  // (saving/error/recovered restent jusqu'à la prochaine sauvegarde explicite).
  useEffect(() => {
    setSaveState((prev) => {
      if (prev === 'saving' || prev === 'error' || prev === 'recovered') return prev;
      if (isDirty) return 'dirty';
      return lastSavedAt ? 'saved' : 'clean';
    });
  }, [isDirty, lastSavedAt]);

  // Garde navigateur (refresh / fermeture) — seulement tant que c'est sale.
  useUnsavedGuard(isDirty);

  // ── Autosave LOCAL (brouillon) : ~12s après la DERNIÈRE édition ──
  // Le debounce se réarme à CHAQUE changement de `lines`. Pendant un drag de bloc,
  // `lines` change en continu → aucun timer ne se déclenche ; il ne part qu'une fois
  // que le mouvement s'arrête (= geste terminé), ce qui satisfait « save after the
  // drag operation is complete » sans jamais écrire pendant le glissement. Le garde
  // `isHolding` évite de programmer un enregistrement pendant un maintien d'Espace.
  // N'écrit JAMAIS en base (ce n'est pas le système de versions permanent).
  useEffect(() => {
    if (step !== 'sync' || !isDirty || isHolding) return undefined;
    const id = setTimeout(() => {
      if (saveDraft(lines, savedSignatureRef.current)) setDraftSavedAt(new Date());
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [lines, isDirty, isHolding, step, saveDraft]);

  // ── Récupération de brouillon : propose UNE fois si un brouillon local plus récent
  // que la version serveur existe pour cette chanson (refresh/fermeture accidentelle).
  useEffect(() => {
    if (draftDecidedRef.current || !initialDraft) return;
    const serverSig = linesSignature(buildInitialLines(freshSong || song));
    const draftSig = linesSignature(initialDraft.lines);
    if (draftSig && draftSig !== serverSig) setDraftPrompt(true);
    else draftDecidedRef.current = true; // brouillon identique au serveur → rien à proposer
  }, [initialDraft, freshSong, song]);

  const recoverDraft = useCallback(() => {
    draftDecidedRef.current = true;
    setDraftPrompt(false);
    if (!initialDraft?.lines) return;
    commitLines(() => initialDraft.lines.map((l) => ({ ...l })));
    setStep('sync');
    setSaveState('recovered');
    setDraftSavedAt(initialDraft.savedAt ? new Date(initialDraft.savedAt) : new Date());
    toast({ title: 'Rascunho recuperado', description: 'Retomaste o trabalho não guardado desta música.' });
  }, [initialDraft, commitLines, toast]);

  const discardDraft = useCallback(() => {
    draftDecidedRef.current = true;
    setDraftPrompt(false);
    clearDraft();
    setDraftSavedAt(null);
  }, [clearDraft]);

  // ── Validation de timing (non destructive) — recalculée en direct ──
  const validation = useMemo(() => validateTiming(lines, { duration }), [lines, duration]);

  // ── Suivi automatique de la lecture ──
  // Quand la vidéo joue, la ligne ACTIVE devient la ligne SÉLECTIONNÉE (cursor) → les
  // champs Tempo/Fim, le bloc surligné et l'auto-scroll suivent la musique, pour
  // ajuster instantanément la ligne en cours (nudge ±100ms, re-marquage, drag après
  // pause). Garde-fous : on ne suit pas la « frontière de marquage » de la passe 1 (si
  // la ligne juste après l'active n'a pas encore de temps), ni pendant un geste Espace
  // maintenu, ni si un champ de saisie est focalisé (pour ne pas casser une frappe).
  useEffect(() => {
    if (ballStudioIndex != null) return; // studio focalisé ouvert : ne pas bouger le curseur
    if (!autoFollow) return; // seguimento automático desligado pelo utilizador
    if (loopActive) return; // en boucle, on garde le curseur sur la ligne bouclée
    if (!isPlaying || isHolding || activeIdx < 0) return;
    if (Date.now() - manualSelectRef.current < 4000) return; // respecte une sélection manuelle récente
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    const aheadSynced = activeIdx >= lines.length - 1 || lines[activeIdx + 1]?.time != null;
    if (!aheadSynced) return;
    setCursor((c) => (c === activeIdx ? c : activeIdx));
  }, [isPlaying, isHolding, activeIdx, lines, loopActive, autoFollow, ballStudioIndex]);

  // ── Frise temporelle : zoom + drag pour ajuster le temps d'une ligne ──
  const zoomIn = () => setPxPerSecond((v) => Math.min(MAX_PX_PER_SEC, Math.round(v * 1.4)));
  const zoomOut = () => setPxPerSecond((v) => Math.max(MIN_PX_PER_SEC, Math.round(v / 1.4)));

  const totalSeconds = Math.max(duration || 0, (lines[lines.length - 1]?.time || 0) + 15, 30);
  const timelineWidth = totalSeconds * pxPerSecond;

  // Début de la ligne CHRONOLOGIQUEMENT suivante (plus petit temps strictement
  // supérieur à `startTime`) — robuste au chevauchement (l'ordre du texte peut ne
  // plus suivre l'ordre du temps une fois qu'on autorise les blocs à se superposer).
  const nextChronoStart = useCallback((startTime, selfIndex) => {
    let best = null;
    for (let i = 0; i < lines.length; i += 1) {
      if (i === selfIndex) continue;
      const tt = lines[i].time;
      if (tt != null && tt > startTime && (best == null || tt < best)) best = tt;
    }
    return best;
  }, [lines]);

  // Fin EFFECTIVE d'une ligne : le endTime manuel s'il existe (peut raccourcir OU
  // chevaucher la ligne suivante), sinon on s'aligne automatiquement sur le début du
  // bloc suivant (plus de cap fixe à 2s), sinon largeur par défaut si c'est la dernière.
  const effectiveEnd = useCallback((index) => {
    const line = lines[index];
    if (line?.time == null) return null;
    if (line.endTime != null && line.endTime > line.time) return line.endTime;
    const nextStart = nextChronoStart(line.time, index);
    return nextStart != null ? nextStart : line.time + DEFAULT_LINE_WIDTH_SEC;
  }, [lines, nextChronoStart]);

  // Fin EFFECTIVE de la ligne chronologiquement PRÉCÉDENTE (pour l'inspecteur : « pausa
  // antes »). null si aucune ligne marquée avant celle-ci.
  const prevChronoEnd = useCallback((startTime, selfIndex) => {
    let bestTime = null; let bestIdx = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (i === selfIndex) continue;
      const tt = lines[i].time;
      if (tt != null && tt < startTime && (bestTime == null || tt > bestTime)) { bestTime = tt; bestIdx = i; }
    }
    return bestIdx === -1 ? null : effectiveEnd(bestIdx);
  }, [lines, effectiveEnd]);

  const blockWidthFor = (index) => {
    const line = lines[index];
    if (line?.time == null) return 0;
    const end = effectiveEnd(index);
    const widthSec = Math.max(0.05, end - line.time);
    return Math.max(6, widthSec * pxPerSecond - 2);
  };

  // ── Boucle de la ligne sélectionnée (« Repetir linha ») ──
  // Rejoue en continu la frase sélectionnée entre son début et sa fin effective, à la
  // vitesse de lecture choisie (aide au calage fin, et base de la capture mot-par-mot).
  // S'arrête automatiquement dès qu'une autre ligne est sélectionnée (cf. effet ci-dessous)
  // et ne survit jamais à la fermeture de l'éditeur (état local démonté).
  const toggleLoop = useCallback(() => {
    setLoopActive((on) => {
      const next = !on;
      if (next) {
        const line = lines[cursor];
        if (line?.time != null) { seekTo(line.time); try { playerRef.current?.playVideo?.(); } catch { /* ignore */ } }
      }
      return next;
    });
  }, [cursor, lines, seekTo]);

  // Arrête la boucle quand on change de ligne sélectionnée.
  const loopCursorRef = useRef(cursor);
  useEffect(() => {
    if (loopCursorRef.current !== cursor) { loopCursorRef.current = cursor; setLoopActive(false); }
  }, [cursor]);

  // Tick de bouclage : quand on atteint la fin de la ligne, on revient à son début.
  useEffect(() => {
    if (!loopActive) return;
    const line = lines[cursor];
    if (!line || line.time == null) return;
    const end = effectiveEnd(cursor) ?? (line.time + DEFAULT_LINE_WIDTH_SEC);
    if (currentTime >= end - 0.04 || currentTime < line.time - 0.5) seekTo(line.time);
  }, [loopActive, currentTime, cursor, lines, effectiveEnd, seekTo]);

  // ── Stage 2 : édition mot-à-mot (hybride) — extension de la ligne existante, pas
  // un nouvel éditeur. `lines[i].words` est la source de vérité du timing par mot ;
  // absent/vide = la ligne reste en mode frase (comportement historique).
  const setLineWords = useCallback((index, updater) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, words: typeof updater === 'function' ? updater(l.words || []) : updater } : l)));
  }, []);
  const commitLineWords = useCallback((index, updater) => {
    commitLines((prev) => prev.map((l, i) => (i === index ? { ...l, words: typeof updater === 'function' ? updater(l.words || []) : updater } : l)));
  }, [commitLines]);

  // Applique le résultat du studio « Afinar palavras e bola » : mots + bornes de frase
  // (time/endTime seulement si l'admin les a modifiées), en un seul pas d'historique.
  const applyBallStudioResult = useCallback((index, res) => {
    commitLines((prev) => prev.map((l, i) => {
      if (i !== index) return l;
      const nl = { ...l, words: res.words };
      if (res.startEdited && Number.isFinite(res.phraseStart)) nl.time = res.phraseStart;
      if (res.endEdited && Number.isFinite(res.phraseEnd)) nl.endTime = res.phraseEnd;
      return nl;
    }));
  }, [commitLines]);

  // Ao abrir o estúdio focado : pausa o vídeo do YouTube do editor principal — senão a
  // música toca em fundo por baixo do overlay e o seguimento automático move o curseur.
  useEffect(() => {
    if (ballStudioIndex != null) {
      try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    }
  }, [ballStudioIndex]);

  // Ouvre le panneau « Sincronizar palavras » pour une ligne — génère une distribution
  // automatique de départ si elle n'a pas encore de mots (jamais présentée comme une
  // synchro exacte : l'admin corrige ensuite à la main).
  const openWordPanel = useCallback((index) => {
    setCursor(index);
    setWordPanelIndex(index);
    setSelectedWordIndex(0);
    exitWordCapture();
    const line = lines[index];
    if (line?.time != null && !(Array.isArray(line.words) && line.words.length > 0)) {
      const end = effectiveEnd(index) ?? (line.time + DEFAULT_LINE_WIDTH_SEC);
      commitLineWords(index, distributeWords(line.text, line.time, end));
    }
  }, [lines, effectiveEnd, commitLineWords, exitWordCapture]);

  const closeWordPanel = useCallback(() => {
    setWordPanelIndex(null);
    exitWordCapture();
  }, [exitWordCapture]);

  // L'onglet « Palavras » (et donc la CTA « Afinar palavras e bola ») suit TOUJOURS a
  // linha selecionada : sinon, si un panneau restait ouvert sur une ligne antérieure,
  // la CTA ouvrait o estúdio numa frase antiga (bug signalé). On ne (re)génère jamais de
  // distribution ici — on suit juste l'index.
  useEffect(() => {
    if (wordPanelIndex != null && wordPanelIndex !== cursor) {
      setWordPanelIndex(cursor);
      setSelectedWordIndex(0);
    }
  }, [cursor, wordPanelIndex]);

  // « Distribuir palavras » : recalcule une distribution automatique à partir de zéro
  // (perd les corrections manuelles de cette ligne — action explicite, un seul pas d'historique).
  const redistributeWords = useCallback((index) => {
    const line = lines[index];
    if (line?.time == null) return;
    const end = effectiveEnd(index) ?? (line.time + DEFAULT_LINE_WIDTH_SEC);
    commitLineWords(index, distributeWords(line.text, line.time, end));
    setSelectedWordIndex(0);
  }, [lines, effectiveEnd, commitLineWords]);

  // « Voltar para sincronização por frase » : retire le timing par mot, la ligne
  // retombe sur son timing de frase existant (jamais supprimé).
  const revertToPhrase = useCallback((index) => {
    commitLines((prev) => prev.map((l, i) => {
      if (i !== index) return l;
      const { words: _words, ...rest } = l;
      return rest;
    }));
    if (wordPanelIndex === index) closeWordPanel();
  }, [commitLines, wordPanelIndex, closeWordPanel]);

  const selectWord = useCallback((delta) => {
    const words = lines[wordPanelIndex]?.words;
    if (!words || words.length === 0) return;
    setSelectedWordIndex((i) => Math.max(0, Math.min(words.length - 1, i + delta)));
  }, [lines, wordPanelIndex]);

  const setWordTimeField = useCallback((lineIndex, wordIndex, field, raw) => {
    const num = raw === '' ? null : parseFloat(raw);
    if (num == null || Number.isNaN(num)) return;
    setLineWords(lineIndex, (words) => words.map((w, wi) => (wi === wordIndex ? { ...w, [field]: Math.max(0, num) } : w)));
  }, [setLineWords]);

  // ── Captura de tempos por toque (Espaço) ──
  // Chaque appui capture le DÉBUT du mot suivant ; la FIN du mot précédent devient ce
  // même instant. Le dernier mot se termine par défaut à la fin de la ligne (corrigible
  // ensuite à la main). Distinct du marquage de ligne (Espaço maintenu) — actif
  // UNIQUEMENT quand ce mode est explicitement activé pour la ligne ouverte.
  const startWordCapture = useCallback(() => {
    captureIndexRef.current = 0;
    setSelectedWordIndex(0);
    enterWordCapture();
  }, [enterWordCapture]);
  const stopWordCapture = useCallback(() => exitWordCapture(), [exitWordCapture]);

  const captureNextWord = useCallback(() => {
    if (wordPanelIndex == null) return;
    const words = lines[wordPanelIndex]?.words;
    if (!words || words.length === 0) return;
    const idx = captureIndexRef.current;
    if (idx >= words.length) { exitWordCapture(); return; } // tout est déjà capturé
    const t = getTime();
    const line = lines[wordPanelIndex];
    const lineEnd = line.endTime ?? effectiveEnd(wordPanelIndex);
    setLineWords(wordPanelIndex, (prevWords) => prevWords.map((w, wi) => {
      // La FIN du mot précédent devient l'instant capté (frontière nette entre mots).
      if (wi === idx - 1) return { ...w, end: Math.max((w.start ?? t) + 0.03, t) };
      // Le mot capté démarre à `t` ; sa fin reste provisoire (mise à jour au prochain
      // toque) mais toujours ≥ start pour ne jamais afficher un bloc invalide.
      if (wi === idx) return { ...w, start: t, end: idx === prevWords.length - 1 ? Math.max(t + 0.05, lineEnd ?? t + 0.3) : Math.max(t + 0.05, w.end) };
      return w;
    }));
    const next = idx + 1;
    captureIndexRef.current = next;
    setSelectedWordIndex(Math.min(next, words.length - 1));
    if (next >= words.length) exitWordCapture(); // capture terminée après le dernier mot
  }, [wordPanelIndex, lines, effectiveEnd, setLineWords, exitWordCapture]);
  captureNextWordRef.current = captureNextWord; // synchronise la réf lue par l'effet clavier (déclaré plus haut)

  // Déplace/redimensionne un bloc-mot par pointeur (même technique que le drag de
  // ligne, mais borné localement à la ligne — pas de recalcul de frise globale).
  const handleWordPointerDown = (lineIndex, wordIndex, mode, e) => {
    e.preventDefault();
    e.stopPropagation();
    const words = lines[lineIndex]?.words;
    const w = words?.[wordIndex];
    if (!w) return;
    setSelectedWordIndex(wordIndex);
    // Un seul pas d'historique pour tout le geste.
    historyPast.current.push(lines);
    if (historyPast.current.length > MAX_HISTORY) historyPast.current.shift();
    historyFuture.current = [];
    setCanUndo(true);
    setCanRedo(false);
    const startX = e.clientX;
    const startWord = { ...w };
    const pxPerSec = wordPxPerSecFor(lineIndex);
    const onMove = (ev) => {
      const deltaSec = (ev.clientX - startX) / pxPerSec;
      setLineWords(lineIndex, (prevWords) => prevWords.map((pw, wi) => {
        if (wi !== wordIndex) return pw;
        if (mode === 'move') {
          const dur = startWord.end - startWord.start;
          const start = Math.max(0, startWord.start + deltaSec);
          return { ...pw, start, end: start + dur };
        }
        if (mode === 'start') return { ...pw, start: Math.max(0, Math.min(startWord.end - 0.03, startWord.start + deltaSec)) };
        return { ...pw, end: Math.max(startWord.start + 0.03, startWord.end + deltaSec) }; // mode 'end'
      }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Échelle px/s de la mini-frise du panneau de mots — ajustée à la durée de la ligne
  // pour rester lisible que la phrase soit courte ou longue.
  const wordPxPerSecFor = useCallback((lineIndex) => {
    const line = lines[lineIndex];
    if (!line || line.time == null) return 120;
    const end = line.endTime ?? effectiveEnd(lineIndex) ?? (line.time + DEFAULT_LINE_WIDTH_SEC);
    const dur = Math.max(0.4, end - line.time);
    return Math.min(400, Math.max(50, 640 / dur));
  }, [lines, effectiveEnd]);

  // ── Contrôle qualité heuristique (zéro audio / zéro API) ──────────────────────
  // Lignes « suspectes », recalculées en direct : un trou au milieu (ligne sans
  // temps encadrée par deux lignes marquées = oubli de la passe 1), une durée trop
  // courte pour le texte (toque raté) ou beaucoup trop longue (ligne suivante non
  // marquée). Les lignes pas encore atteintes (sans ancre après) NE sont PAS signalées
  // → reste silencieux pendant le calage normal, s'allume seulement pour un vrai souci.
  const { warnSet, warnReason } = useMemo(() => {
    const set = new Set();
    const reason = {};
    const hasBefore = (idx) => { for (let k = idx - 1; k >= 0; k -= 1) if (lines[k].time != null) return true; return false; };
    const hasAfter = (idx) => { for (let k = idx + 1; k < lines.length; k += 1) if (lines[k].time != null) return true; return false; };
    lines.forEach((l, i) => {
      if (l.time == null) {
        if (hasBefore(i) && hasAfter(i)) { set.add(i); reason[i] = 'Sem tempo entre duas linhas marcadas — «Afinar auto» interpola'; }
        return;
      }
      const syl = countSyllables(l.text);
      const dur = effectiveEnd(i) - l.time;
      if (syl >= 3 && dur < 0.35) { set.add(i); reason[i] = 'Muito curta para o texto — provável toque errado'; }
      else if (syl <= 6 && dur > 12) { set.add(i); reason[i] = 'Muito longa — talvez falte marcar a linha seguinte'; }
    });
    return { warnSet: set, warnReason: reason };
  }, [lines, effectiveEnd]);

  // ── Données dérivées pour le navigateur de lignes + le badge de mode ──
  // Niveau de problème par ligne (erreur > avertissement) : union de la validation
  // (bloquante/non) et de l'heuristique warnSet.
  const lineLevel = useCallback((i) => {
    const arr = validation.byLine.get(i);
    if (arr && arr.some((x) => x.level === 'error')) return 'error';
    if ((arr && arr.some((x) => x.level === 'warning')) || warnSet.has(i)) return 'warning';
    return null;
  }, [validation, warnSet]);

  const filterCounts = useMemo(() => {
    let unsynced = 0; let warnings = 0; let words = 0;
    lines.forEach((l, i) => {
      if (l.time == null) unsynced += 1;
      if (lineLevel(i)) warnings += 1;
      if (Array.isArray(l.words) && l.words.length > 0) words += 1;
    });
    return { all: lines.length, unsynced, warnings, words };
  }, [lines, lineLevel]);

  // Index (originaux) des lignes visibles après filtre + recherche.
  const visibleIndexes = useMemo(() => {
    const q = lineSearch.trim().toLowerCase();
    const out = [];
    lines.forEach((l, i) => {
      if (lineFilter === 'unsynced' && l.time != null) return;
      if (lineFilter === 'warnings' && !lineLevel(i)) return;
      if (lineFilter === 'words' && !(Array.isArray(l.words) && l.words.length > 0)) return;
      if (q && !(l.text || '').toLowerCase().includes(q)) return;
      out.push(i);
    });
    return out;
  }, [lines, lineFilter, lineSearch, lineLevel]);

  // Mode de timing global — badge du header (Linha / Palavra / Híbrido).
  const timingMode = useMemo(() => {
    let any = false; let all = true;
    lines.forEach((l) => {
      if (l.time == null) return;
      const has = Array.isArray(l.words) && l.words.length > 0;
      if (has) any = true; else all = false;
    });
    if (!any) return 'line';
    return all ? 'word' : 'hybrid';
  }, [lines]);

  // « Afinar auto » : correction structurelle en UN seul pas d'historique (donc
  // annulable d'un Ctrl+Z / Backspace, ou via « Restaurar versão inicial »).
  //  1) Interpole les lignes sans temps entre deux ancres, proportionnellement au
  //     nombre de syllabes (chant à débit ~constant sur une phrase → bonne approx).
  //  2) Répare l'ordre des débuts cassé par un glissement (chevauchement autorisé
  //     sur les FINS, mais les DÉBUTS doivent rester croissants dans l'ordre du texte).
  //  3) Nettoie les fins invalides (fin ≤ début → fin auto).
  const autoTune = useCallback(() => {
    const next = lines.map((l) => ({ ...l }));
    let interpolated = 0; let ordered = 0; let cleanedEnds = 0;

    let anchor = -1;
    for (let i = 0; i < next.length; i += 1) {
      if (next[i].time != null) {
        if (anchor !== -1 && i - anchor > 1) {
          const Sa = next[anchor].time;
          const Sb = next[i].time;
          if (Sb > Sa) {
            const weights = [];
            let total = 0;
            for (let k = anchor; k < i; k += 1) { const w = countSyllables(next[k].text); weights.push(w); total += w; }
            let acc = 0;
            for (let k = anchor; k < i; k += 1) {
              if (k > anchor && next[k].time == null) {
                next[k] = { ...next[k], time: Sa + (acc / total) * (Sb - Sa), endTime: null };
                interpolated += 1;
              }
              acc += weights[k - anchor];
            }
          }
        }
        anchor = i;
      }
    }

    for (let i = 1; i < next.length; i += 1) {
      if (next[i].time != null && next[i - 1].time != null && next[i].time < next[i - 1].time) {
        next[i] = { ...next[i], time: next[i - 1].time + 0.05 };
        ordered += 1;
      }
    }

    for (let i = 0; i < next.length; i += 1) {
      if (next[i].endTime != null && next[i].time != null && next[i].endTime <= next[i].time) {
        next[i] = { ...next[i], endTime: null };
        cleanedEnds += 1;
      }
    }

    if (interpolated + ordered + cleanedEnds === 0) {
      const stillNull = next.filter((l) => l.time == null).length;
      if (stillNull > 0) {
        toast({
          title: 'Nada para interpolar',
          description: `${stillNull} linha(s) sem tempo estão nas pontas (antes da 1ª ou depois da última marcada) — marca-as à mão com Espaço.`,
        });
      } else {
        toast({ title: 'Já está afinado ✅', description: 'Todas as linhas têm tempo e estão em ordem — nada a corrigir.' });
      }
      return;
    }
    commitLines(() => next);
    const parts = [];
    if (interpolated) parts.push(`${interpolated} linha(s) interpolada(s)`);
    if (ordered) parts.push(`${ordered} ordem corrigida`);
    if (cleanedEnds) parts.push(`${cleanedEnds} fim limpo`);
    toast({ title: '✨ Afinado', description: `${parts.join(' · ')}. Anula com Ctrl+Z ou «Restaurar versão inicial».` });
  }, [lines, commitLines, toast]);

  const handleBlockPointerDown = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const line = lines[index];
    if (line.time == null) return;
    setCursor(index);
    // Une seule entrée d'historique pour tout le geste de glissement (pas une par pixel).
    historyPast.current.push(lines);
    if (historyPast.current.length > MAX_HISTORY) historyPast.current.shift();
    historyFuture.current = [];
    setCanUndo(true);
    setCanRedo(false);
    // Plus de clamp entre voisins : les blocs peuvent désormais se chevaucher
    // librement (une phrase peut rester affichée pendant que la suivante démarre).
    // Si la ligne a une fin manuelle, on déplace le bloc ENTIER (début ET fin) pour
    // préserver sa durée ; sinon seul le début bouge (la fin auto suit le bloc suivant).
    dragRef.current = {
      index,
      startX: e.clientX,
      startTime: line.time,
      startEnd: line.endTime,
      duration: line.endTime != null && line.endTime > line.time ? line.endTime - line.time : null,
    };
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaSec = (ev.clientX - d.startX) / pxPerSecond;
      const t = Math.max(0, d.startTime + deltaSec);
      setLines((prev) => prev.map((l, i) => (
        i === d.index
          ? { ...l, time: t, endTime: d.duration != null ? t + d.duration : l.endTime }
          : l
      )));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Redimensionnement manuel du bloc par son bord droit : fixe un endTime explicite.
  // Permet de RACCOURCIR un bloc (fin avant le bloc suivant → petit silence) ou de le
  // prolonger au-delà (chevauchement volontaire avec la ligne suivante).
  const handleBlockResizePointerDown = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const line = lines[index];
    if (line.time == null) return;
    setCursor(index);
    historyPast.current.push(lines);
    if (historyPast.current.length > MAX_HISTORY) historyPast.current.shift();
    historyFuture.current = [];
    setCanUndo(true);
    setCanRedo(false);
    const startX = e.clientX;
    const baseEnd = effectiveEnd(index); // point de départ = bord droit visible actuel
    const onMove = (ev) => {
      const deltaSec = (ev.clientX - startX) / pxPerSecond;
      const end = Math.max(line.time + 0.05, baseEnd + deltaSec);
      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, endTime: end } : l)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Clic sur une zone VIDE de la frise (pas sur un bloc — ceux-ci stoppent déjà la
  // propagation) : par défaut, NAVIGUE simplement jusqu'à cet instant (comme un vrai
  // curseur de lecture, que la vidéo joue ou soit en pause). Shift+clic garde l'ancien
  // comportement : insérer une ligne manquante exactement à cet instant.
  const handleTrackClick = (e) => {
    const track = timelineTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left + track.scrollLeft;
    const t = Math.max(0, x / pxPerSecond);

    if (!e.shiftKey) {
      seekTo(t);
      return;
    }

    let insertIdx = lines.length;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].time != null && lines[i].time <= t) insertIdx = i + 1;
    }
    commitLines((prev) => {
      const next = prev.slice();
      next.splice(insertIdx, 0, { text: '', time: t, endTime: null });
      return next;
    });
    setCursor(insertIdx);
  };

  // Marques de règle (toutes les 1s, 2s ou 5s selon le zoom pour rester lisible).
  const tickStep = pxPerSecond >= 60 ? 1 : pxPerSecond >= 25 ? 2 : 5;
  const ticks = [];
  for (let s = 0; s <= totalSeconds; s += tickStep) ticks.push(s);

  const currentLine = activeIdx >= 0 ? lines[activeIdx] : null;
  const nextLine = activeIdx + 1 < lines.length ? lines[activeIdx + 1] : null;

  // ── Sauvegarde ──
  // Persiste le LRC dans `songs`, PUIS crée une version durable (song_timing_versions)
  // — au contraire de l'autosave qui n'écrit QUE le brouillon local. Bloque si la
  // validation contient des erreurs (fin<début, mot hors ligne…). Garde anti double-clic.
  const handleSave = async () => {
    if (savingRef.current) return; // évite deux sauvegardes concurrentes
    const lrc = buildLrc(lines);
    if (!lrc) {
      toast({ title: 'Nada para guardar', description: 'Marca pelo menos uma linha antes de guardar.', variant: 'destructive' });
      return;
    }
    if (validation.errors > 0) {
      setShowValidation(true);
      toast({ title: 'Corrige os erros antes de guardar', description: `${validation.errors} erro(s) de timing bloqueiam a gravação. Vê o painel de validação.`, variant: 'destructive' });
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setSaveState('saving');
    try {
      try { await supabase.auth.refreshSession(); } catch { /* pas de session → check explicite ci-dessous */ }

      // Vérification EXPLICITE de session avant d'écrire : sans session, l'UPDATE
      // passe en anon → RLS → 0 lignes, un échec silencieux incompréhensible
      // (bug « Falha ao salvar » 2026-07-13). Échec immédiat + message actionnable.
      const { data: { session: saveSession } } = await supabase.auth.getSession();
      if (!saveSession) {
        throw new Error('Sem sessão Supabase — recarrega /admin, faz login com a conta admin e guarda de novo.');
      }

      // Timing structuré (Stage 2) : seulement si au moins une ligne a des mots — sinon
      // `timing_data` reste NULL et le lecteur retombe sur lrc_content (comportement
      // historique inchangé pour toute chanson purement ligne).
      const timingModel = buildTimingModel(lines);
      const hasWordTiming = Boolean(timingModel && timingModel.timingMode !== 'line');

      const payload = { lrc_content: lrc, karaoke_synced_at: new Date().toISOString() };
      if (hasWordTiming) {
        payload.timing_data = timingModel;
        payload.timing_mode = timingModel.timingMode;
      }
      if (syncLyricsToo) {
        const joined = lines.map((l) => l.text.trim()).filter(Boolean).join('\n');
        if (joined) payload.lyrics = joined;
      }

      const { data, error } = await supabase
        .from('songs')
        .update(payload)
        .eq('id', song.id)
        .select();

      if (error) throw new Error(describeSaveError(error));
      if (!data || data.length === 0) {
        throw new Error(await diagnoseZeroRows());
      }

      // Version durable (best-effort — silencieux si la migration n'est pas encore appliquée).
      let versionNote = '';
      try {
        const res = await createTimingVersion(song.id, {
          lrc_content: lrc,
          timing_data: hasWordTiming ? timingModel : null,
          timing_mode: hasWordTiming ? timingModel.timingMode : 'line',
          source: 'manual_save',
        });
        if (res?.unavailable) versionNote = ' (histórico de versões indisponível até aplicar a migração)';
      } catch { /* l'historique ne doit jamais bloquer une sauvegarde réussie */ }

      // Nouvel état de référence : plus « sale », brouillon effacé.
      savedSignatureRef.current = linesSignature(lines);
      initialSyncLinesRef.current = lines.map((l) => ({ ...l }));
      clearDraft();
      setDraftSavedAt(null);
      setLastSavedAt(new Date());
      setSaveState('saved');
      if (showVersions) loadVersions();

      toast({ title: '✅ Karaokê sincronizado!', description: `${syncedCount} linhas guardadas.${versionNote}` });
      onSaved?.(data[0]);
    } catch (err) {
      // Le travail n'est JAMAIS perdu : brouillon local forcé IMMÉDIATEMENT (sans
      // attendre le tick d'autosave ~12s), conservé jusqu'à une sauvegarde serveur
      // confirmée et reproposé à la réouverture de cette chanson (banner amarelo).
      const backedUpLocally = saveDraft(lines, savedSignatureRef.current);
      if (backedUpLocally) setDraftSavedAt(new Date());
      setSaveState('error');
      toast({
        title: 'Erro ao guardar no Supabase',
        description: `${err.message}${backedUpLocally
          ? ' O teu trabalho está guardado LOCALMENTE neste aparelho — reconecta-te e clica Guardar de novo (ou aceita « Recuperar rascunho » ao reabrir).'
          : ''}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  // ── Historique de versions (song_timing_versions) ──
  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const { versions: rows, unavailable } = await listTimingVersions(song.id);
      setVersions(rows);
      setVersionsUnavailable(unavailable);
    } catch (err) {
      toast({ title: 'Erro ao carregar versões', description: err.message, variant: 'destructive' });
    } finally {
      setVersionsLoading(false);
    }
  }, [song.id, toast]);

  const openVersions = useCallback(() => { setShowVersions(true); loadVersions(); }, [loadVersions]);

  // Restauration : charge une version dans l'éditeur, la republie (songs.lrc_content) ET
  // crée une NOUVELLE version (source 'restore') → l'historique n'est jamais détruit, et
  // la restauration est elle-même annulable en restaurant une version antérieure.
  const handleRestoreVersion = useCallback(async (versionId, versionNumber) => {
    if (!window.confirm(`Restaurar a versão #${versionNumber}? Cria uma nova versão atual; o histórico é preservado.`)) return;
    setRestoringId(versionId);
    try {
      const { version, unavailable } = await getTimingVersion(versionId);
      if (unavailable || !version) throw new Error('Versão indisponível.');
      // Restaure le timing structuré (mots) quand la version en avait un ; sinon
      // comportement historique (LRC ligne uniquement).
      const restoredModel = parseTimingModel(version.timing_data);
      const restoredLines = restoredModel
        ? timingModelToEditorLines(restoredModel)
        : parseLrc(version.lrc_content).map((l) => ({ text: l.text, time: l.time, endTime: l.endTime ?? null }));
      const lrc = version.lrc_content || buildLrc(restoredLines);

      try { await supabase.auth.refreshSession(); } catch { /* diagnostic plus bas */ }
      const updatePayload = { lrc_content: lrc, karaoke_synced_at: new Date().toISOString() };
      if (restoredModel) { updatePayload.timing_data = restoredModel; updatePayload.timing_mode = restoredModel.timingMode; }
      const { data, error } = await supabase
        .from('songs')
        .update(updatePayload)
        .eq('id', song.id)
        .select();
      if (error) throw new Error(describeSaveError(error));
      if (!data || data.length === 0) throw new Error(await diagnoseZeroRows());

      try {
        await createTimingVersion(song.id, {
          lrc_content: lrc,
          timing_data: restoredModel || null,
          timing_mode: version.timing_mode || 'line',
          source: 'restore',
          note: `Restaurado de #${versionNumber}`,
        });
      } catch { /* non bloquant */ }

      commitLines(() => restoredLines.map((l) => ({ ...l })));
      setCursor(0);
      savedSignatureRef.current = linesSignature(restoredLines);
      initialSyncLinesRef.current = restoredLines.map((l) => ({ ...l }));
      clearDraft();
      setDraftSavedAt(null);
      setLastSavedAt(new Date());
      setSaveState('saved');
      loadVersions();
      onSaved?.(data[0]);
      toast({ title: `↩️ Versão #${versionNumber} restaurada`, description: 'A letra sincronizada atual foi substituída. O histórico foi preservado.' });
    } catch (err) {
      toast({ title: 'Erro ao restaurar', description: err.message, variant: 'destructive' });
    } finally {
      setRestoringId(null);
    }
  }, [song.id, commitLines, clearDraft, loadVersions, onSaved, toast]);

  // Sélectionne et centre une ligne signalée par la validation.
  const focusIssueLine = useCallback((lineIndex, time) => {
    setCursor(lineIndex);
    if (time != null) seekTo(time);
    listItemRefs.current[lineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [seekTo]);

  const noVideo = !videoId;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0b0710] text-white">
      {/* Header — breadcrumb + Cancelar/Guardar */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-white/50">
          <button
            onClick={handleClose}
            title="Voltar à lista de músicas"
            className="karaoke-focusable mr-2 flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <Music size={15} className="mr-1 shrink-0 text-purple-400" />
          <span className="hidden sm:inline">Karaokê</span>
          <ChevronRight size={13} className="hidden shrink-0 sm:inline" />
          <span className="truncate font-semibold text-white">{effectiveSong?.title}</span>
          <ChevronRight size={13} className="shrink-0" />
          {step === 'sync' ? (
            <>
              <button
                onClick={backToLyrics}
                title="Editar a letra completa (adicionar/corrigir linhas sem perder a sincronização)"
                className="karaoke-focusable inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-gray-400 hover:bg-white/10 hover:text-purple-300"
              >
                <Pencil size={12} /> Letra completa
              </button>
              <ChevronRight size={13} className="shrink-0" />
              <span className="shrink-0 text-purple-300">Sincronizar</span>
              <span
                title={timingMode === 'hybrid' ? 'Híbrido — algumas linhas por palavra' : timingMode === 'word' ? 'Todas as linhas por palavra' : 'Sincronização por frase'}
                className={`ml-1.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  timingMode === 'hybrid' ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                    : timingMode === 'word' ? 'border-violet-400/40 bg-violet-600/25 text-violet-200'
                    : 'border-white/15 bg-white/5 text-gray-300'
                }`}
              >
                {timingMode === 'hybrid' ? 'Híbrido' : timingMode === 'word' ? 'Palavra' : 'Linha'}
              </span>
              <span className="ml-1 shrink-0 text-[11px] text-gray-500">{syncedCount} / {lines.length} linhas</span>
            </>
          ) : (
            <span className="shrink-0 text-purple-300">Letra</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {step === 'sync' && <SaveStatusPill state={saveState} lastSavedAt={lastSavedAt} draftSavedAt={draftSavedAt} />}
          {step === 'sync' && (
            <>
              <button
                onClick={() => setShowValidation((v) => !v)}
                title="Ver problemas de timing (não bloqueia, exceto erros)"
                className={`karaoke-focusable inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  validation.errors > 0
                    ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                    : validation.warnings > 0
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <ShieldCheck size={13} /> Validação
                {(validation.errors + validation.warnings) > 0 && (
                  <span className="rounded-full bg-black/40 px-1.5 text-[10px] font-bold">{validation.errors + validation.warnings}</span>
                )}
              </button>
              <button
                onClick={openVersions}
                title="Histórico de versões de sincronização (restaurar uma anterior)"
                className="karaoke-focusable inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10"
              >
                <History size={13} /> Versões
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu((v) => !v)}
                  aria-label="Mais opções"
                  aria-expanded={showMoreMenu}
                  className="karaoke-focusable inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-300 hover:bg-white/10"
                >
                  <MoreHorizontal size={16} />
                </button>
                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                    <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#161022] py-1 shadow-2xl">
                      <button onClick={() => { setShowShortcuts(true); setShowMoreMenu(false); }} className="karaoke-focusable flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10">
                        <Keyboard size={14} /> Atalhos de teclado
                      </button>
                      <button onClick={() => { setIsCalibrating(true); setShowMoreMenu(false); }} className="karaoke-focusable flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10">
                        <Gauge size={14} /> Calibrar tempo de reação
                      </button>
                      <button onClick={() => { restoreInitial(); setShowMoreMenu(false); }} disabled={!initialSyncLinesRef.current} className="karaoke-focusable flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10 disabled:opacity-40">
                        <RotateCcw size={14} /> Restaurar versão inicial
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          <button onClick={handleClose} className="rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10">
            Cancelar
          </button>
          {step === 'sync' && (
            <button
              onClick={handleSave}
              disabled={isSaving || syncedCount === 0}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold hover:bg-purple-700 disabled:opacity-40"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Guardar
            </button>
          )}
        </div>
      </header>

      {/* Banner « sem sessão » — l'UI admin peut s'afficher SANS session Supabase
          (mode dev, session expirée) et alors le RLS bloque toute gravação. On le
          dit clairement AVANT que l'utilisateur ne clique Guardar pour rien : le
          travail reste protégé par le rascunho local dans tous les cas. */}
      {!hasSession && (
        <div className="flex flex-wrap items-center gap-2 border-b border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          <AlertCircle size={15} className="shrink-0" />
          <span>
            <strong>Sem sessão Supabase</strong> — podes sincronizar normalmente, mas o Guardar vai falhar.
            O trabalho fica guardado <strong>localmente</strong> neste aparelho; entra como admin (recarrega /admin e faz login) e guarda de novo.
          </span>
        </div>
      )}

      {/* Banner de récupération de brouillon (refresh/fermeture accidentelle) */}
      {draftPrompt && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm">
          <span className="flex items-center gap-2 text-amber-200">
            <RotateCcw size={15} />
            Há um rascunho local mais recente desta música
            {initialDraft?.savedAt && <span className="text-amber-200/60">({formatClock(new Date(initialDraft.savedAt))})</span>}
          </span>
          <span className="flex items-center gap-2">
            <button onClick={recoverDraft} className="karaoke-focusable rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400">
              Recuperar rascunho
            </button>
            <button onClick={discardDraft} className="karaoke-focusable rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10">
              Usar versão salva
            </button>
          </span>
        </div>
      )}

      {/* Painel de validação (não destrutivo) */}
      {showValidation && step === 'sync' && (
        <ValidationPanel validation={validation} onClose={() => setShowValidation(false)} onFocus={focusIssueLine} />
      )}

      {/* Painel de versões */}
      {showVersions && step === 'sync' && (
        <VersionsPanel
          versions={versions}
          loading={versionsLoading}
          unavailable={versionsUnavailable}
          restoringId={restoringId}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersions(false)}
        />
      )}

      {step === 'lyrics' ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
          <div className="w-full max-w-4xl space-y-4">
            {/* En-tête */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300">
                <Music size={19} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Sincronizar karaokê</h1>
                <p className="text-xs text-gray-500">Mantém o vídeo original e sincroniza a letra</p>
              </div>
            </div>

            {/* Étape 1 — título (confirmação) */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">1</span>
                <div>
                  <h2 className="text-sm font-bold text-white">Título da música</h2>
                  <p className="text-xs text-gray-500">Confirma que é a música certa antes de continuar</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white">
                {effectiveSong?.title}
              </div>
            </div>

            {/* Étape 2 — letra */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">2</span>
                  <div>
                    <h2 className="text-sm font-bold text-white">Letra da música</h2>
                    <p className="text-xs text-gray-500">Uma linha por frase cantada, na ordem da música (repete o refrão se for 2×)</p>
                  </div>
                </div>
                <button
                  onClick={handlePasteLyrics}
                  className="karaoke-focusable inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10"
                >
                  <ClipboardPaste size={13} /> Colar
                </button>
              </div>
              <textarea
                value={lyricsDraft}
                onChange={(e) => { userEditedLyricsRef.current = true; setLyricsDraft(e.target.value); }}
                rows={16}
                placeholder="Cola ou escreve a letra aqui, uma linha por linha…"
                className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white outline-none focus:border-purple-400/50"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {(() => {
                  const ll = splitLyricsLines(lyricsDraft);
                  const dup = ll.length - new Set(ll.map((l) => l.toLowerCase())).size;
                  const long = ll.filter((l) => l.length > 60).length;
                  const empty = lyricsDraft.split('\n').filter((l) => l.trim() === '').length;
                  return (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><FileText size={12} /> {ll.length} linha(s)</span>
                      {dup > 0 && <span className="flex items-center gap-1 text-gray-400" title="Linhas repetidas (ex.: refrão) — normal se forem cantadas 2×"><Copy size={11} /> {dup} repetida(s)</span>}
                      {long > 0 && <span className="flex items-center gap-1 text-amber-400/80" title="Linhas longas (>60 caract.) — talvez dividir em duas frases"><AlertTriangle size={11} /> {long} longa(s)</span>}
                      {empty > 0 && <span className="text-gray-600">{empty} linha(s) vazia(s) ignorada(s)</span>}
                    </span>
                  );
                })()}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveLyricsOnly}
                    disabled={isSavingLyrics || splitLyricsLines(lyricsDraft).length === 0}
                    title="Guardar apenas a letra completa no Supabase (sem tocar na sincronização)"
                    className="karaoke-focusable inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    {isSavingLyrics ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar letra
                  </button>
                  <button
                    onClick={proceedToSync}
                    disabled={splitLyricsLines(lyricsDraft).length === 0}
                    className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-40"
                  >
                    Sincronizar <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Adicionar ou corrigir linhas aqui <span className="text-gray-400">preserva os tempos já marcados</span> (só as linhas novas ficam por sincronizar).
              </p>
            </div>
          </div>
        </div>
      ) : noVideo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
          <Music className="h-10 w-10 text-gray-600" />
          <p className="max-w-md text-sm">
            Esta música não tem um link YouTube válido em <code className="text-purple-300">youtube_url</code> (vídeo único).
            Adiciona um link antes de sincronizar.
          </p>
        </div>
      ) : (
        <>
<div className="flex min-h-0 flex-1 overflow-hidden">
            {/* ═══════════ ESQUERDA — Navegador de linhas ═══════════ */}
            <aside className="flex w-[340px] shrink-0 flex-col border-r border-white/10 bg-black/20">
              <div className="shrink-0 border-b border-white/10 px-3 py-2">
                <div className="mb-2 flex items-center gap-1.5">
                  <ListMusic size={14} className="text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/50">Linhas</span>
                  <span className="ml-auto text-[11px] text-gray-500">{syncedCount}/{lines.length} sinc.</span>
                </div>
                <div className="relative mb-2">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={lineSearch}
                    onChange={(e) => setLineSearch(e.target.value)}
                    placeholder="Procurar na letra…"
                    aria-label="Procurar linha"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-white outline-none focus:border-purple-400/50"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {[['all', 'Todas', filterCounts.all], ['unsynced', 'Não sinc.', filterCounts.unsynced], ['warnings', 'Avisos', filterCounts.warnings], ['words', 'Palavras', filterCounts.words]].map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => setLineFilter(key)}
                      aria-pressed={lineFilter === key}
                      className={`karaoke-focusable inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${lineFilter === key ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      {label}
                      <span className={`rounded-full px-1.5 text-[10px] ${lineFilter === key ? 'bg-black/30' : 'bg-white/10'}`}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {visibleIndexes.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-gray-500">
                    {lines.length === 0 ? 'Sem letra — volta a «Letra completa».' : 'Nenhuma linha corresponde ao filtro.'}
                  </p>
                ) : visibleIndexes.map((i) => {
                  const line = lines[i];
                  const isCursor = i === cursor;
                  const isSynced = line.time != null;
                  const level = lineLevel(i);
                  const hasWords = Array.isArray(line.words) && line.words.length > 0;
                  return (
                    <div
                      key={i}
                      ref={(el) => { listItemRefs.current[i] = el; }}
                      onClick={() => { selectLineManually(i); if (line.time != null) seekTo(line.time); }}
                      className={`group flex cursor-pointer items-start gap-2.5 border-l-2 px-3 py-2 transition-colors ${
                        isCursor && isHolding ? 'border-red-500 bg-red-500/15'
                          : isCursor ? 'border-purple-500 bg-purple-500/12'
                          : i === activeIdx ? 'border-emerald-500/50 bg-emerald-500/[0.08]'
                          : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <span className={`mt-1 w-6 shrink-0 text-right font-mono text-xs font-bold ${isCursor ? 'text-purple-300' : 'text-gray-600'}`}>{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        {/* Texto editável diretamente na lista (como antes) — Espaço fica desativado enquanto editas */}
                        <input
                          value={line.text}
                          onChange={(e) => setLineText(i, e.target.value)}
                          onFocus={() => selectLineManually(i)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="(texto da linha)"
                          aria-label={`Texto da linha ${i + 1}`}
                          className={`w-full rounded bg-transparent px-1 py-0.5 text-sm leading-snug outline-none focus:bg-white/10 focus:ring-1 focus:ring-purple-400/50 ${isSynced ? (isCursor ? 'text-white' : 'text-gray-200') : 'italic text-gray-500'}`}
                        />
                        <div className="mt-0.5 flex items-center gap-1.5 px-1 font-mono text-[10px]">
                          {isSynced ? (
                            <>
                              <span className="text-app-yellow/80">{round2(line.time)}s</span>
                              <span className="text-gray-600">→</span>
                              <span className="text-emerald-300/80">{round2(effectiveEnd(i))}s</span>
                              <span className="text-gray-500">· {round2(effectiveEnd(i) - line.time)}s</span>
                            </>
                          ) : <span className="text-gray-600">por sincronizar</span>}
                        </div>
                      </div>
                      <div className="mt-1 flex shrink-0 items-center gap-0.5">
                        {hasWords && <span title="Sincronizada por palavra" className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/25 text-[9px] font-bold text-violet-200">W</span>}
                        {level === 'error' ? <AlertCircle size={13} className="shrink-0 text-red-400" />
                          : level === 'warning' ? <AlertTriangle size={13} className="shrink-0 text-amber-400" title={warnReason[i] || 'Verificar esta linha'} />
                          : isSynced ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400/70" /> : null}
                        {/* Ações diretas na linha (aparecem ao passar o rato) */}
                        {isSynced && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setCursor(i); commitLines((prev) => prev.map((l, li) => (li === i ? { ...l, time: null, endTime: null } : l))); }}
                            title="Limpar o tempo desta linha (para a remarcar com Espaço)"
                            aria-label="Limpar tempo da linha"
                            className="karaoke-focusable shrink-0 rounded p-1 text-gray-600 opacity-0 transition hover:bg-white/10 hover:text-amber-300 group-hover:opacity-100"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        {isSynced && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openWordPanel(i); setInspectorTab('words'); }}
                            title={hasWords ? 'Editar sincronização por palavra' : 'Sincronizar por palavra (opcional)'}
                            aria-label="Sincronizar palavras"
                            className={`karaoke-focusable shrink-0 rounded p-1 transition ${hasWords ? 'text-violet-300 hover:bg-violet-500/20' : 'text-gray-600 opacity-0 hover:bg-violet-500/20 hover:text-violet-300 group-hover:opacity-100'}`}
                          >
                            <Type size={12} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteLine(i); }}
                          title="Apagar esta linha"
                          aria-label="Apagar linha"
                          className="karaoke-focusable shrink-0 rounded p-1 text-gray-600 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-3 py-1.5">
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-400" title="Seguir automaticamente a linha em reprodução (sem atrapalhar a navegação manual)">
                  <input type="checkbox" checked={autoFollow} onChange={(e) => setAutoFollow(e.target.checked)} className="accent-purple-600" /> Seguir reprodução
                </label>
                <button onClick={() => addLineAfter(lines.length - 1)} className="karaoke-focusable inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-400 hover:bg-white/10 hover:text-purple-300">
                  <Plus size={12} /> Inserir linha
                </button>
              </div>
            </aside>

            {/* ═══════════ CENTRO — Aperçu + frise temporal ═══════════ */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-3 py-1.5">
                {[['karaoke', 'Karaokê'], ['video', 'Vídeo'], ['split', 'Dividido']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setPreviewTab(key)}
                    aria-pressed={previewTab === key}
                    className={`karaoke-focusable rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${previewTab === key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-gray-400">
                  <span className="text-purple-300">{formatTimestamp(currentTime)}</span> / {formatTimestamp(duration)}
                </span>
              </div>

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                {previewTab !== 'video' && (
                  <div className={`karaoke-lyrics relative flex min-h-0 flex-col items-center justify-center gap-3 overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(147,51,234,0.16),transparent_60%)] px-6 py-6 text-center ${previewTab === 'split' ? 'w-1/2 border-r border-white/10' : 'flex-1'}`}>
                    <div className="absolute left-3 top-3 z-10">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        mode === 'capture-lines' ? (isHolding ? 'bg-red-500 text-white' : 'bg-app-yellow/20 text-app-yellow')
                          : mode === 'capture-words' ? 'bg-violet-500/25 text-violet-200'
                          : 'bg-white/10 text-gray-300'
                      }`}>
                        {mode === 'capture-lines' ? (isHolding ? `● Gravando ${holdMs}ms` : 'Captura de linhas ativa')
                          : mode === 'capture-words' ? 'Captura de palavras ativa'
                          : 'Modo revisão'}
                      </span>
                    </div>
                    <p className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                      {currentLine
                        ? (Array.isArray(currentLine.words) && currentLine.words.length > 0
                          ? <KaraokeWordLine words={currentLine.words} activeIndex={activeWordIdx} progress={activeWordProgress} />
                          : <KaraokeWipeLine text={currentLine.text || '♪'} progress={activeProgress} />)
                        : <span className="text-app-yellow/70">{activeIdx < 0 ? '♪ (música)' : ''}</span>}
                    </p>
                    {nextLine && (
                      <p className="max-w-2xl text-lg font-semibold text-white/35">{nextLine.text || '♪'}</p>
                    )}
                  </div>
                )}

                <div className={
                  previewTab === 'video' ? 'flex flex-1 items-center justify-center bg-black p-4'
                    : previewTab === 'split' ? 'flex w-1/2 items-center justify-center bg-black p-3'
                    : (videoHidden ? 'hidden' : `absolute right-3 top-3 z-20 overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl ${videoExpanded ? 'w-80' : 'w-52'}`)
                }>
                  <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                    {(!apiReady || !playerReady) && !apiError && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center text-white/60">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                    {apiError && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center px-2 text-center text-[11px] text-white/60">Erro ao carregar o vídeo</div>
                    )}
                    <div ref={hostRef} className="h-full w-full" />
                    {previewTab === 'karaoke' && !videoHidden && (
                      <div className="absolute right-1 top-1 z-20 flex gap-1">
                        <button onClick={() => setVideoExpanded((v) => !v)} aria-label={videoExpanded ? 'Reduzir vídeo' : 'Ampliar vídeo'} className="karaoke-focusable rounded-md bg-black/60 p-1 text-white/80 hover:bg-black/80">
                          {videoExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        </button>
                        <button onClick={() => setVideoHidden(true)} aria-label="Fechar vídeo" className="karaoke-focusable rounded-md bg-black/60 p-1 text-white/80 hover:bg-black/80">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {previewTab === 'karaoke' && videoHidden && (
                  <button onClick={() => setVideoHidden(false)} className="karaoke-focusable absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/70 px-2.5 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-black/90">
                    <Video size={13} /> Mostrar vídeo
                  </button>
                )}
              </div>

              <div className="shrink-0 border-t border-white/10 bg-black/50">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Frise temporal</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={zoomOut} aria-label="Menos zoom" className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><Minus size={13} /></button>
                    <span className="w-12 text-center text-[10px] text-gray-500">{pxPerSecond}px/s</span>
                    <button onClick={zoomIn} aria-label="Mais zoom" className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><Plus size={13} /></button>
                  </div>
                </div>
                <div
                  ref={timelineTrackRef}
                  onClick={handleTrackClick}
                  title="Clica para navegar até este instante · Shift+clique para adicionar uma linha aqui"
                  className="relative h-[150px] cursor-pointer select-none overflow-x-auto overflow-y-hidden"
                >
                  <div className="relative h-full" style={{ width: timelineWidth }}>
                    {localAudio.peaks && (
                      <TimelineWaveform
                        peaks={localAudio.peaks}
                        audioDuration={localAudio.duration}
                        offsetSec={audioOffsetSec}
                        pxPerSecond={pxPerSecond}
                        width={timelineWidth}
                        height={150}
                      />
                    )}
                    <div className="absolute inset-x-0 top-0 h-5 border-b border-white/10">
                      {ticks.map((s) => (
                        <span key={s} className="absolute top-0 border-l border-white/10 pl-1 text-[9px] text-white/30" style={{ left: s * pxPerSecond, height: '100%' }}>
                          {formatShort(s)}
                        </span>
                      ))}
                    </div>
                    {lines.map((line, i) => {
                      if (line.time == null) return null;
                      const isCursor = i === cursor;
                      const hasWords = Array.isArray(line.words) && line.words.length > 0;
                      const level = lineLevel(i);
                      return (
                        <div
                          key={i}
                          ref={isCursor ? activeBlockRef : null}
                          onPointerDown={(e) => handleBlockPointerDown(i, e)}
                          onClick={(e) => { e.stopPropagation(); selectLineManually(i); seekTo(line.time); }}
                          title={line.endTime != null ? `${line.text} (fim manual) — arrasta o corpo para mover, o bordo direito para o fim` : `${line.text} — fim alinhado à linha seguinte · arrasta o bordo direito para encurtar/sobrepor`}
                          className={`group/block absolute flex h-12 cursor-grab items-center overflow-hidden rounded pl-1.5 pr-2 text-[10px] font-semibold active:cursor-grabbing ${line.endTime == null ? 'border-dashed' : ''} ${
                            isCursor ? 'z-10 border-2 border-app-yellow bg-app-yellow/20 text-app-yellow'
                              : level === 'error' ? 'border border-red-400/60 bg-red-500/15 text-red-200'
                              : level === 'warning' ? 'border border-amber-400/60 bg-amber-500/[0.12] text-amber-200'
                              : hasWords ? 'border border-violet-400/50 bg-violet-500/[0.18] text-violet-100'
                              : i === activeIdx ? 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                              : 'border border-white/15 bg-white/10 text-white/70'
                          }`}
                          style={{ left: line.time * pxPerSecond, top: 28, width: blockWidthFor(i) }}
                        >
                          <span className="truncate">{line.text || '♪'}</span>
                          <span
                            onPointerDown={(e) => handleBlockResizePointerDown(i, e)}
                            onClick={(e) => e.stopPropagation()}
                            title="Arrastar para ajustar o fim (encurtar ou sobrepor a linha seguinte)"
                            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r bg-white/10 opacity-0 transition group-hover/block:opacity-100 hover:!bg-app-yellow/70"
                          />
                        </div>
                      );
                    })}
                    <div className="pointer-events-none absolute top-0 h-full w-0.5 bg-red-500" style={{ left: currentTime * pxPerSecond }}>
                      <div className="absolute -left-[3px] -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════ DIREITA — Inspector contextual ═══════════ */}
            <aside className="flex w-[340px] shrink-0 flex-col border-l border-white/10 bg-black/20">
              <div className="flex shrink-0 border-b border-white/10">
                {[['line', 'Linha'], ['words', 'Palavras']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setInspectorTab(key); if (key === 'words' && wordPanelIndex == null && lines[cursor]?.time != null) openWordPanel(cursor); }}
                    aria-pressed={inspectorTab === key}
                    className={`karaoke-focusable flex-1 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${inspectorTab === key ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {inspectorTab === 'line' && (() => {
                  const cur = cursor >= 0 && cursor < lines.length ? lines[cursor] : null;
                  if (!cur) return <p className="text-xs text-gray-500">Nenhuma linha selecionada.</p>;
                  const synced = cur.time != null;
                  const end = synced ? effectiveEnd(cursor) : null;
                  const dur = synced ? end - cur.time : null;
                  const prevEnd = synced ? prevChronoEnd(cur.time, cursor) : null;
                  const nextStart = synced ? nextChronoStart(cur.time, cursor) : null;
                  const gapBefore = (synced && prevEnd != null) ? cur.time - prevEnd : null;
                  const gapAfter = (synced && nextStart != null && end != null) ? nextStart - end : null;
                  const level = lineLevel(cursor);
                  return (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Linha selecionada</span>
                          <span className="font-mono text-xs text-purple-300">{cursor + 1}/{lines.length}</span>
                        </div>
                        <textarea
                          rows={2}
                          value={cur.text}
                          onChange={(e) => setLineText(cursor, e.target.value)}
                          placeholder="(texto da linha)"
                          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/50"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase text-white/40">
                          Início
                          <input
                            type="number" step="0.01" min="0"
                            value={cur.time != null ? cur.time.toFixed(2) : ''}
                            onChange={(e) => { const v = e.target.value; const n = v === '' ? null : parseFloat(v); setLines((prev) => prev.map((l, li) => (li === cursor ? { ...l, time: (n == null || Number.isNaN(n)) ? null : Math.max(0, n) } : l))); }}
                            placeholder="—"
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center font-mono text-sm text-app-yellow outline-none focus:border-app-yellow/50"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase text-white/40">
                          Fim
                          <input
                            type="number" step="0.01" min="0"
                            value={cur.endTime != null ? cur.endTime.toFixed(2) : ''}
                            onChange={(e) => { const v = e.target.value; const n = v === '' ? null : parseFloat(v); setLines((prev) => prev.map((l, li) => (li === cursor ? { ...l, endTime: (n == null || Number.isNaN(n)) ? null : Math.max(0, n) } : l))); }}
                            placeholder={synced && cur.endTime == null ? `≈${round2(end)}` : '—'}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center font-mono text-sm text-emerald-300 outline-none focus:border-emerald-400/50 placeholder:text-emerald-300/30"
                          />
                        </label>
                        <div className="flex flex-col gap-1 text-[10px] font-semibold uppercase text-white/40">
                          Duração
                          <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center font-mono text-sm text-gray-300">{dur != null ? `${round2(dur)}s` : '—'}</div>
                        </div>
                      </div>

                      <div>
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">Ajuste fino (início)</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[-100, -25, 25, 100].map((ms) => (
                            <button key={ms} onClick={() => nudgeCursorTime(ms)} disabled={!synced} className="karaoke-focusable rounded-lg border border-white/10 bg-white/5 px-1 py-1.5 text-[11px] font-semibold text-gray-300 hover:bg-white/10 disabled:opacity-30">
                              {ms > 0 ? '+' : ''}{ms}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={toggleLoop} disabled={!synced} aria-pressed={loopActive} className={`karaoke-focusable inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-30 ${loopActive ? 'border-app-yellow/50 bg-app-yellow/15 text-app-yellow' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                          <Repeat size={13} /> {loopActive ? 'Parar loop' : 'Loop linha'}
                        </button>
                        <button onClick={restartLine} disabled={!synced} className="karaoke-focusable inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-gray-300 hover:bg-white/10 disabled:opacity-30">
                          <RotateCcw size={13} /> Recomeçar
                        </button>
                        <button onClick={() => commitLines((prev) => prev.map((l, li) => (li === cursor ? { ...l, time: null, endTime: null } : l)))} disabled={!synced} className="karaoke-focusable col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-30">
                          <Trash2 size={13} /> Limpar timing da linha
                        </button>
                      </div>

                      <div className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
                        mode === 'capture-lines' ? 'border-app-yellow/30 bg-app-yellow/[0.08] text-amber-100'
                          : mode === 'capture-words' ? 'border-violet-400/30 bg-violet-500/10 text-violet-100'
                          : 'border-white/10 bg-white/5 text-gray-400'
                      }`}>
                        {mode === 'capture-lines' ? (
                          <><strong>Segure a BARRA DE ESPAÇO:</strong><br />• pressione no início da frase<br />• solte no fim da frase</>
                        ) : mode === 'capture-words' ? (
                          <><strong>Captura de palavras:</strong><br />toque Espaço no início de cada palavra. Esc para sair.</>
                        ) : (
                          <>Modo revisão — Espaço = Play/Pausa. Nenhum timing é alterado.</>
                        )}
                      </div>

                      <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px]">
                        <div className="flex items-center justify-between"><span className="text-gray-500">Linha anterior (fim)</span><span className="font-mono text-gray-300">{prevEnd != null ? `${round2(prevEnd)}s` : '—'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">Pausa antes</span><span className={`font-mono ${gapBefore != null && gapBefore < 0 ? 'text-amber-300' : 'text-gray-300'}`}>{gapBefore != null ? `${round2(gapBefore)}s` : '—'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">Duração</span><span className="font-mono text-gray-300">{dur != null ? `${round2(dur)}s` : '—'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">Pausa depois</span><span className={`font-mono ${gapAfter != null && gapAfter < 0 ? 'text-amber-300' : 'text-gray-300'}`}>{gapAfter != null ? `${round2(gapAfter)}s` : '—'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">Próxima linha (início)</span><span className="font-mono text-gray-300">{nextStart != null ? `${round2(nextStart)}s` : '—'}</span></div>
                        <div className="flex items-center justify-between border-t border-white/5 pt-1.5"><span className="text-gray-500">Estado</span>
                          <span className={`font-semibold ${level === 'error' ? 'text-red-300' : level === 'warning' ? 'text-amber-300' : synced ? 'text-emerald-300' : 'text-gray-400'}`}>
                            {level === 'error' ? 'Erro de timing' : level === 'warning' ? 'Aviso' : synced ? 'Sincronizada' : 'Por sincronizar'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {inspectorTab === 'words' && (
                  wordPanelIndex != null && lines[wordPanelIndex] ? (
                    <div className="-m-3">
                      <WordSyncPanel
                        lineIndex={wordPanelIndex}
                        line={lines[wordPanelIndex]}
                        selectedWordIndex={selectedWordIndex}
                        onSelectWord={setSelectedWordIndex}
                        onSelectRelative={selectWord}
                        pxPerSec={wordPxPerSecFor(wordPanelIndex)}
                        onWordPointerDown={handleWordPointerDown}
                        onWordTimeField={setWordTimeField}
                        onDistribute={() => redistributeWords(wordPanelIndex)}
                        onRevert={() => revertToPhrase(wordPanelIndex)}
                        onOpenBallStudio={() => setBallStudioIndex(cursor)}
                        onClose={closeWordPanel}
                        loopActive={loopActive}
                        onToggleLoop={toggleLoop}
                        captureActive={wordCaptureActive}
                        onStartCapture={startWordCapture}
                        onStopCapture={stopWordCapture}
                        playbackRate={playbackRate}
                        onSetPlaybackRate={applyPlaybackRate}
                        currentTime={currentTime}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Type size={24} className="text-violet-300/60" />
                      <p className="text-xs text-gray-400">{lines[cursor]?.time != null ? 'Sincroniza esta linha palavra a palavra (opcional).' : 'Seleciona uma linha já sincronizada para editar as palavras.'}</p>
                      {lines[cursor]?.time != null ? (
                        <div className="flex flex-col items-center gap-2">
                          <button onClick={() => setBallStudioIndex(cursor)} className="karaoke-focusable inline-flex items-center gap-2 rounded-xl bg-app-yellow px-4 py-2.5 text-sm font-black text-black shadow-[0_0_24px_rgba(253,224,71,0.35)] hover:brightness-110">
                            <Sparkles size={16} /> Afinar palavras e bola
                          </button>
                          <button onClick={() => openWordPanel(cursor)} className="karaoke-focusable inline-flex items-center gap-1.5 rounded-lg bg-violet-600/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
                            <Wand2 size={13} /> Editor avançado (por palavra)
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500">Sincronize primeiro o início e o fim da frase.</p>
                      )}
                    </div>
                  )
                )}
              </div>
            </aside>
          </div>

          {/* ═══════════ DOCK INFERIOR — Leitura · Sincronização · Ferramentas ═══════════ */}
          <div className="shrink-0 border-t border-white/10 bg-black/40">
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-3 py-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Leitura</span>
                <div className="flex items-center gap-1">
                  <ToolButton onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor <= 0} title="Linha anterior"><ChevronLeft size={15} /></ToolButton>
                  <ToolButton onClick={rewind} disabled={!playerReady} title="Recuar 3s (←)"><span className="text-[10px] font-bold">-3s</span></ToolButton>
                  <button onClick={togglePlay} disabled={!playerReady} aria-label={isPlaying ? 'Pausar' : 'Tocar'} className="karaoke-focusable inline-flex h-9 w-11 items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40">
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5 fill-current" />}
                  </button>
                  <ToolButton onClick={() => seekTo(getTime() + REWIND_SECONDS)} disabled={!playerReady} title="Avançar 3s"><span className="text-[10px] font-bold">+3s</span></ToolButton>
                  <ToolButton onClick={() => setCursor((c) => Math.min(lines.length - 1, c + 1))} disabled={cursor >= lines.length - 1} title="Próxima linha"><ChevronRight size={15} /></ToolButton>
                  <ToolButton onClick={toggleLoop} disabled={lines[cursor]?.time == null} active={loopActive} title="Repetir linha selecionada"><Repeat size={15} /></ToolButton>
                  <select value={playbackRate} onChange={(e) => applyPlaybackRate(parseFloat(e.target.value))} aria-label="Velocidade de reprodução" className="rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-[11px] font-semibold text-gray-200 outline-none">
                    {PLAYBACK_RATES.map((r) => <option key={r} value={r} className="bg-[#1a1420]">{r}×</option>)}
                  </select>
                </div>
              </div>

              <div className="w-px self-stretch bg-white/10" />

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Sincronização</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMode((m) => (m === 'capture-lines' ? 'review' : 'capture-lines'))}
                    aria-pressed={mode === 'capture-lines'}
                    className={`karaoke-focusable inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                      mode === 'capture-lines' ? 'animate-pulse border-app-yellow/60 bg-app-yellow/20 text-app-yellow'
                        : 'border-purple-500/40 bg-purple-600/20 text-purple-200 hover:bg-purple-600/30'
                    }`}
                  >
                    {mode === 'capture-lines' ? <span className="h-2 w-2 rounded-full bg-app-yellow" /> : <Crosshair size={14} />}
                    {isHolding ? `Gravando… ${holdMs}ms` : mode === 'capture-lines' ? 'Capturar linhas (ativo)' : 'Capturar linhas'}
                  </button>
                  <ToolButton onClick={() => markLineStart(cursor)} disabled={!playerReady || cursor < 0} title="Marcar início (correção manual)"><span className="text-[10px] font-bold">I</span></ToolButton>
                  <ToolButton onClick={markEndAtPlayhead} disabled={!playerReady || lines[cursor]?.time == null} title="Marcar fim no instante atual"><span className="text-[10px] font-bold">F</span></ToolButton>
                  <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5" title="Ajuste fino do início da linha selecionada">
                    {[-25, -10, 10, 25].map((ms) => (
                      <button key={ms} onClick={() => nudgeCursorTime(ms)} className="karaoke-focusable rounded px-1.5 py-1 text-[10px] font-semibold text-gray-400 hover:bg-white/10 hover:text-white">{ms > 0 ? '+' : ''}{ms}</button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-gray-500">
                  {mode === 'capture-lines' ? 'Segure Espaço no início da frase e solte no fim.'
                    : mode === 'capture-words' ? 'Toque Espaço em cada palavra. Esc sai.'
                    : 'Modo revisão — clique «Capturar linhas» para marcar.'}
                </span>
              </div>

              <div className="w-px self-stretch bg-white/10" />

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Ferramentas</span>
                <div className="flex flex-wrap items-center gap-1">
                  <ToolButton onClick={insertAtPlayhead} disabled={!playerReady} title="Inserir linha em falta neste instante"><Plus size={15} /></ToolButton>
                  <ToolButton onClick={() => duplicateLine(cursor)} title="Duplicar linha (refrão)"><Copy size={15} /></ToolButton>
                  <ToolButton onClick={() => deleteLine(cursor)} title="Apagar linha"><Trash2 size={15} /></ToolButton>
                  <div className="mx-0.5 h-6 w-px bg-white/10" />
                  <ToolButton onClick={undo} disabled={!canUndo} title="Anular (Ctrl+Z / Backspace)"><Undo2 size={15} /></ToolButton>
                  <ToolButton onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)"><Redo2 size={15} /></ToolButton>
                  <ToolButton onClick={autoTune} active title="Afinar auto — interpola linhas em falta, corrige a ordem, limpa fins inválidos"><Sparkles size={15} /></ToolButton>
                  <ToolButton onClick={() => setIsCalibrating(true)} active={latencyMs > 0} title={`Calibrar tempo de reação${latencyMs > 0 ? ` · ${latencyMs}ms` : ''}`}><Gauge size={15} /></ToolButton>
                  <div className="mx-0.5 h-6 w-px bg-white/10" />
                  <ToolButton onClick={resetFromCursor} title="Reiniciar a partir daqui"><History size={15} /></ToolButton>
                  <ToolButton onClick={resetAll} title="Reiniciar tudo"><RotateCcw size={15} /></ToolButton>
                  <ToolButton onClick={() => setShowShortcuts(true)} title="Atalhos de teclado"><Keyboard size={15} /></ToolButton>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 bg-black/30 px-3 py-1.5 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="text-white/40">Modo:</span>
                {[['review', 'Revisar'], ['capture-lines', 'Capturar linhas']].map(([key, label]) => (
                  <button key={key} onClick={() => setMode(key)} aria-pressed={mode === key} className={`karaoke-focusable rounded-md px-2 py-0.5 font-semibold ${mode === key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}>{label}</button>
                ))}
                {mode === 'capture-words' && <span className="rounded-md bg-violet-600 px-2 py-0.5 font-semibold text-white">Capturar palavras</span>}
              </div>
              <div className="w-px self-stretch bg-white/10" />
              <div className="flex items-center gap-1.5" title="Deslocar as marcações (todas as linhas ou só a selecionada)">
                <label className="flex cursor-pointer items-center gap-1 text-white/40">
                  <input type="checkbox" checked={shiftAllMode} onChange={(e) => setShiftAllMode(e.target.checked)} className="accent-purple-600" /> Deslocar tudo
                </label>
                <button onClick={() => applyShiftButton(-100)} className="karaoke-focusable rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold hover:bg-white/10">−100ms</button>
                <button onClick={() => applyShiftButton(100)} className="karaoke-focusable rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold hover:bg-white/10">+100ms</button>
                <span className="text-white/30">{shiftAllMode ? '(todas)' : '(linha)'}</span>
              </div>
              <div className="w-px self-stretch bg-white/10" />
              <button onClick={restoreInitial} disabled={!initialSyncLinesRef.current} className="karaoke-focusable rounded px-1.5 py-0.5 hover:bg-white/10 disabled:opacity-30">Restaurar versão inicial</button>
              <div className="w-px self-stretch bg-white/10" />
              {/* Áudio local partilhado — a onda aparece na frise; não é enviado ao servidor */}
              <div className="flex items-center gap-1.5" title="O áudio local permanece neste computador e não é enviado ao servidor. É memorizado neste aparelho para não recarregar a cada sessão.">
                <span className="text-white/40">Áudio local:</span>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onMainAudioPick} />
                {localAudio.fileName ? (
                  <>
                    <span className="inline-flex max-w-[140px] items-center gap-1 truncate text-gray-200"><Music size={11} /> {localAudio.fileName}</span>
                    {localAudio.loading && <Loader2 size={11} className="animate-spin text-violet-300" />}
                    <button onClick={pickLocalAudio} className="karaoke-focusable rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold hover:bg-white/10">Trocar</button>
                    <button onClick={removeLocalAudio} className="karaoke-focusable rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold hover:bg-white/10">Remover</button>
                  </>
                ) : pendingAudioName ? (
                  <>
                    <button onClick={reopenLocalAudio} title="O áudio deste vídeo já foi usado neste aparelho — um clique para reabrir" className="karaoke-focusable inline-flex items-center gap-1 rounded border border-app-yellow/50 bg-app-yellow/15 px-2 py-0.5 font-semibold text-app-yellow hover:bg-app-yellow/25">
                      <Music size={11} /> Reabrir áudio: {pendingAudioName}
                    </button>
                    <button onClick={pickLocalAudio} className="karaoke-focusable rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold hover:bg-white/10">Escolher outro</button>
                  </>
                ) : (
                  <button onClick={pickLocalAudio} className="karaoke-focusable inline-flex items-center gap-1 rounded border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 font-semibold text-violet-100 hover:bg-violet-500/25">
                    <Music size={11} /> {localAudio.loading ? 'A carregar…' : 'Carregar áudio local'}
                  </button>
                )}
              </div>
              <label className="ml-auto flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={syncLyricsToo} onChange={(e) => setSyncLyricsToo(e.target.checked)} className="accent-purple-600" /> Atualizar letra também
              </label>
            </div>
          </div>

          {isCalibrating && (
            <LatencyCalibration
              currentLatency={latencyMs}
              onApply={applyCalibration}
              onCancel={() => setIsCalibrating(false)}
            />
          )}
        </>
      )}

      {showShortcuts && <KeyboardShortcutsDialog onClose={() => setShowShortcuts(false)} />}

      {ballStudioIndex != null && lines[ballStudioIndex]?.time != null && (() => {
        const idx = ballStudioIndex;
        const neighbor = (dir) => {
          for (let i = idx + dir; i >= 0 && i < lines.length; i += dir) if (lines[i]?.time != null) return i;
          return -1;
        };
        return (
          <KaraokeBallSyncStudio
            key={idx}
            song={song}
            lineIndex={idx}
            totalLines={lines.length}
            line={lines[idx]}
            phraseStart={lines[idx].time}
            phraseEnd={effectiveEnd(idx) ?? (lines[idx].time + DEFAULT_LINE_WIDTH_SEC)}
            videoDuration={duration}
            audioSession={localAudio}
            offsetMs={audioOffsetMs}
            onOffsetChange={setAudioOffsetMs}
            onPickAudio={pickLocalAudio}
            onReopenAudio={reopenLocalAudio}
            onRemoveAudio={removeLocalAudio}
            pendingAudioName={pendingAudioName}
            canPrev={neighbor(-1) >= 0}
            canNext={neighbor(1) >= 0}
            onCommit={(res) => {
              applyBallStudioResult(idx, res);
              setBallStudioIndex(null);
              setCursor(idx);
              setWordPanelIndex(idx);
              setInspectorTab('words');
            }}
            onNavigate={(dir, res) => {
              const target = neighbor(dir);
              if (target < 0) return;
              if (res) applyBallStudioResult(idx, res);
              setBallStudioIndex(target);
            }}
            onClose={() => setBallStudioIndex(null)}
          />
        );
      })()}
    </div>,
    document.body
  );
}

/**
 * Test de réaction pour mesurer la latence « voir/entendre → taper Espace » de
 * l'utilisateur. Une série de flashs (+ bips) apparaît à des instants aléatoires ;
 * on mesure l'écart entre l'allumage réel (relevé dans un rAF, = paint effectif) et
 * l'appui. Médiane des mesures (1er flash ignoré = échauffement) → latence appliquée
 * automatiquement à chaque marquage, ce qui rend la passe « Shift All » inutile.
 */
function LatencyCalibration({ currentLatency, onApply, onCancel }) {
  const [done, setDone] = useState(0);        // nombre de flashs déjà réagis
  const [lit, setLit] = useState(false);      // le cercle est allumé maintenant
  const [tooEarly, setTooEarly] = useState(false);
  const [result, setResult] = useState(null); // latence médiane (ms) une fois terminé

  const litAtRef = useRef(null);
  const samplesRef = useRef([]);
  const timeoutRef = useRef(null);
  const audioCtxRef = useRef(null);
  const finishedRef = useRef(false);

  const beep = useCallback(() => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioCtxRef.current = ctx; }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.13);
    } catch { /* áudio indisponível — o flash visual chega */ }
  }, []);

  const scheduleFlash = useCallback(() => {
    const gap = CAL_MIN_GAP + Math.random() * (CAL_MAX_GAP - CAL_MIN_GAP);
    timeoutRef.current = setTimeout(() => {
      setLit(true);
      // On relève l'instant d'allumage APRÈS le paint (rAF) pour qu'il corresponde à
      // ce que l'œil voit et à l'instant du bip, pas à l'appel setState.
      requestAnimationFrame(() => { litAtRef.current = performance.now(); beep(); });
    }, gap);
  }, [beep]);

  const finish = useCallback(() => {
    finishedRef.current = true;
    const s = samplesRef.current;
    const useful = s.length > 1 ? s.slice(1) : s; // ignore le 1er (échauffement)
    const sorted = useful.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    setResult(Math.max(0, Math.min(MAX_LATENCY, Math.round(median))));
  }, []);

  const retry = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    samplesRef.current = [];
    finishedRef.current = false;
    setDone(0); setResult(null); setLit(false); setTooEarly(false);
    scheduleFlash();
  }, [scheduleFlash]);

  // Démarrage + nettoyage.
  useEffect(() => {
    scheduleFlash();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture d'Espace (phase capture → passe avant le listener principal, doublé du
  // garde isCalibrating côté parent).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat || finishedRef.current || result != null) return;
      if (!lit) { // appui anticipé : on ignore et on signale
        setTooEarly(true);
        setTimeout(() => setTooEarly(false), 500);
        return;
      }
      const delta = performance.now() - (litAtRef.current || performance.now());
      samplesRef.current.push(delta);
      setLit(false);
      const n = samplesRef.current.length;
      setDone(n);
      if (n >= CAL_FLASHES) finish(); else scheduleFlash();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [lit, result, finish, scheduleFlash]);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <button
        onClick={onCancel}
        title="Fechar"
        className="karaoke-focusable absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
      >
        <X size={18} />
      </button>

      {result == null ? (
        <div className="flex w-full max-w-md flex-col items-center gap-6 px-6 text-center">
          <div>
            <h2 className="text-xl font-black text-white">Calibrar tempo de reação</h2>
            <p className="mt-1 text-sm text-gray-400">
              Carrega <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Espaço</kbd> assim que o círculo acender (e apitar).
            </p>
          </div>

          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full text-lg font-bold transition-all duration-75 ${
              lit
                ? 'scale-105 bg-app-yellow text-black shadow-[0_0_60px_20px_rgba(250,204,21,0.55)]'
                : tooEarly
                ? 'bg-red-500/20 text-red-300 ring-2 ring-red-400/60'
                : 'bg-white/5 text-gray-500 ring-1 ring-white/10'
            }`}
          >
            {lit ? 'JÁ!' : tooEarly ? 'Cedo demais' : 'Espera…'}
          </div>

          <div className="flex items-center gap-2">
            {Array.from({ length: CAL_FLASHES }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i < done ? 'bg-emerald-400' : 'bg-white/15'}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">{done}/{CAL_FLASHES} — o 1º é só para aquecer</p>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center gap-5 px-6 text-center">
          <Gauge size={40} className="text-emerald-300" />
          <div>
            <h2 className="text-xl font-black text-white">O teu tempo de reação</h2>
            <p className="mt-2 text-5xl font-black text-app-yellow">{result}<span className="text-2xl text-gray-400"> ms</span></p>
            <p className="mt-2 text-sm text-gray-400">
              Vai ser retirado a cada marcação Espaço/Enter — assim não precisas do ajuste ±100ms.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => onApply(result)}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold hover:bg-purple-700"
            >
              Aplicar {currentLatency > 0 ? `(era ${currentLatency}ms)` : ''}
            </button>
            <button
              onClick={retry}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10"
            >
              <RotateCcw size={14} /> Repetir
            </button>
            <button
              onClick={onCancel}
              className="karaoke-focusable rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Painel « Sincronizar palavras » — extension de la ligne sélectionnée (pas un nouvel
// éditeur) : mini-frise locale (drag début/fin/bloc entier), édition numérique,
// distribuição automática, captura por toque, loop e retorno à sincronização por frase.
function WordSyncPanel({
  lineIndex, line, selectedWordIndex, onSelectWord, onSelectRelative, pxPerSec,
  onWordPointerDown, onWordTimeField, onDistribute, onRevert, onOpenBallStudio, onClose,
  loopActive, onToggleLoop, captureActive, onStartCapture, onStopCapture,
  playbackRate, onSetPlaybackRate, currentTime,
}) {
  const words = Array.isArray(line.words) ? line.words : [];
  const lineStart = line.time ?? 0;
  const width = words.length > 0 ? Math.max(60, (words[words.length - 1].end - lineStart) * pxPerSec) : 0;
  const selected = words[selectedWordIndex];
  const nextToCapture = captureActive ? words[Math.min(selectedWordIndex, Math.max(0, words.length - 1))] : null;

  // Curseur de lecture (comme la boule) dans la mini-frise : position du temps courant
  // par rapport au début de la ligne. Aide à caler les mots à l'oreille / à la vue.
  const playheadPx = Number.isFinite(currentTime) ? (currentTime - lineStart) * pxPerSec : null;
  const playheadVisible = playheadPx != null && playheadPx >= -6 && playheadPx <= width + 6;
  // Mot actuellement « sous » le curseur (surbrillance live pendant la lecture/capture).
  const liveWordIdx = Number.isFinite(currentTime)
    ? words.findIndex((w) => currentTime >= w.start && currentTime < w.end)
    : -1;

  // Auto-défilement de la mini-frise pour garder le curseur visible dans la colonne étroite.
  const trackRef = useRef(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || playheadPx == null) return;
    if (playheadPx < track.scrollLeft + 24 || playheadPx > track.scrollLeft + track.clientWidth - 24) {
      track.scrollLeft = Math.max(0, playheadPx - track.clientWidth * 0.4);
    }
  }, [playheadPx]);

  return (
    <div className="border-t border-violet-400/20 bg-violet-950/20 px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold text-violet-200">
          <Type size={13} /> Sincronizar palavras — Linha {lineIndex + 1}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onOpenBallStudio}
            title="Abrir o estúdio focado: onda, captura por toque e bola rebondissante"
            className="karaoke-focusable inline-flex items-center gap-1 rounded-lg bg-app-yellow px-2.5 py-1 text-[11px] font-black text-black hover:brightness-110"
          >
            <Sparkles size={12} /> Afinar palavras e bola
          </button>
          <button
            onClick={onDistribute}
            title="Recalcular a distribuição automática desta linha (substitui ajustes manuais)"
            className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25"
          >
            <Wand2 size={12} /> Distribuir palavras
          </button>
          <button
            onClick={captureActive ? onStopCapture : onStartCapture}
            title="Espaço captura o início de cada palavra durante a reprodução (Esc cancela sem alterar dados)"
            className={`karaoke-focusable inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
              captureActive ? 'animate-pulse border-red-400/60 bg-red-500/20 text-red-200' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Crosshair size={12} /> {captureActive ? 'A capturar… (Esc)' : 'Capturar tempos'}
          </button>
          <button
            onClick={onToggleLoop}
            title="Repetir esta linha em loop"
            className={`karaoke-focusable inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
              loopActive ? 'border-app-yellow/50 bg-app-yellow/15 text-app-yellow' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Repeat size={12} /> {loopActive ? 'Parar repetição' : 'Reproduzir trecho'}
          </button>
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => onSetPlaybackRate(rate)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${playbackRate === rate ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}
              >
                {rate}×
              </button>
            ))}
          </div>
          <button
            onClick={onRevert}
            title="Voltar para sincronização por frase (remove o timing por palavra desta linha)"
            className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:bg-white/10"
          >
            <RotateCcw size={12} /> Voltar para frase
          </button>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X size={14} /></button>
        </div>
      </div>

      {/* Como funciona o modo por palavra (opcional) — 3 passos */}
      <div className="mb-2 rounded-lg border border-violet-400/20 bg-violet-950/30 px-2.5 py-2 text-[11px] leading-relaxed text-violet-100/90">
        <strong className="text-violet-200">Como funciona (opcional):</strong> a linha já tem tempo de frase.
        <span className="text-white"> 1)</span> «Distribuir palavras» cria um ponto de partida automático (proporcional às letras).
        <span className="text-white"> 2)</span> Afina cada palavra: arrasta os blocos abaixo, edita os números, ou usa «Capturar tempos» (toca Espaço no início de cada palavra a tocar).
        <span className="text-white"> 3)</span> O karaokê passa a mostrar a bola a saltar de palavra em palavra. «Voltar para frase» remove tudo isto e mantém só o tempo de frase.
      </div>

      {captureActive && nextToCapture && (
        <p className="mb-2 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200">
          <Crosshair size={13} className="animate-pulse" />
          Próxima palavra a capturar: <strong>{nextToCapture.text}</strong> — carrega Espaço no início
        </p>
      )}

      {words.length === 0 ? (
        <p className="px-1 py-2 text-xs text-gray-500">Sem palavras ainda. Usa «Distribuir palavras» para começar.</p>
      ) : (
        <>
          <div ref={trackRef} className="mb-2 overflow-x-auto rounded-lg border border-white/10 bg-black/40 pb-2 pt-4">
            <div className="relative h-8" style={{ width }}>
              {/* Curseur de lecture (boule + ligne) — se déplace avec la musique */}
              {playheadVisible && (
                <div className="pointer-events-none absolute -top-3 z-30 h-11 w-0.5 bg-red-500" style={{ left: Math.max(0, Math.min(width, playheadPx)) }}>
                  <span className="absolute -left-[5px] -top-1 h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                </div>
              )}
              {words.map((w, wi) => {
                const isSel = wi === selectedWordIndex;
                const isLive = wi === liveWordIdx;
                const left = (w.start - lineStart) * pxPerSec;
                const wWidth = Math.max(8, (w.end - w.start) * pxPerSec - 2);
                return (
                  <div
                    key={w.id || wi}
                    onPointerDown={(e) => onWordPointerDown(lineIndex, wi, 'move', e)}
                    onClick={(e) => { e.stopPropagation(); onSelectWord(wi); }}
                    title={w.text}
                    className={`group/word absolute top-0 flex h-8 cursor-grab items-center overflow-hidden rounded px-1 text-[10px] font-semibold active:cursor-grabbing ${
                      isSel ? 'z-10 border-2 border-app-yellow bg-app-yellow/20 text-app-yellow'
                        : isLive ? 'border border-red-400/60 bg-red-500/20 text-red-100'
                        : 'border border-violet-400/40 bg-violet-500/15 text-violet-200'
                    }`}
                    style={{ left, width: wWidth }}
                  >
                    <span
                      onPointerDown={(e) => onWordPointerDown(lineIndex, wi, 'start', e)}
                      onClick={(e) => e.stopPropagation()}
                      title="Arrastar para ajustar o início desta palavra"
                      className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/10 opacity-0 transition group-hover/word:opacity-100 hover:!bg-app-yellow/70"
                    />
                    <span className="truncate px-1">{w.text}</span>
                    <span
                      onPointerDown={(e) => onWordPointerDown(lineIndex, wi, 'end', e)}
                      onClick={(e) => e.stopPropagation()}
                      title="Arrastar para ajustar o fim desta palavra"
                      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/10 opacity-0 transition group-hover/word:opacity-100 hover:!bg-app-yellow/70"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => onSelectRelative(-1)}
              disabled={selectedWordIndex <= 0}
              title="Palavra anterior"
              className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-gray-500">Palavra {selectedWordIndex + 1}/{words.length}</span>
            <button
              onClick={() => onSelectRelative(1)}
              disabled={selectedWordIndex >= words.length - 1}
              title="Próxima palavra"
              className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
            <span className="max-w-[10rem] truncate font-semibold text-white">{selected?.text}</span>
            <label className="flex items-center gap-1 text-gray-400">
              Início (s)
              <input
                type="number" step="0.01" min="0"
                value={selected?.start != null ? selected.start.toFixed(2) : ''}
                onChange={(e) => onWordTimeField(lineIndex, selectedWordIndex, 'start', e.target.value)}
                className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-app-yellow outline-none focus:border-app-yellow/50"
              />
            </label>
            <label className="flex items-center gap-1 text-gray-400">
              Fim (s)
              <input
                type="number" step="0.01" min="0"
                value={selected?.end != null ? selected.end.toFixed(2) : ''}
                onChange={(e) => onWordTimeField(lineIndex, selectedWordIndex, 'end', e.target.value)}
                className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-emerald-300 outline-none focus:border-emerald-400/50"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

// Diálogo de atalhos de teclado (referência rápida — desativados durante a edição de texto).
function KeyboardShortcutsDialog({ onClose }) {
  const rows = [
    ['Espaço (manter)', 'Marca início + fim da linha', 'Capturar linhas'],
    ['Espaço (toque)', 'Início da próxima palavra', 'Capturar palavras'],
    ['Espaço', 'Play / Pausa', 'Revisar'],
    ['Enter', 'Marca só o início da linha', 'Capturar linhas'],
    ['Backspace / Ctrl+Z', 'Anular', 'Sempre'],
    ['Ctrl+Shift+Z / Ctrl+Y', 'Refazer', 'Sempre'],
    ['←', 'Recuar 3 segundos', 'Sempre'],
    ['P / K', 'Play / Pausa', 'Sempre'],
    ['S', 'Alternar velocidade', 'Sempre'],
    ['Esc', 'Sair da captura / fechar editor', '—'],
  ];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#161022] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-bold text-white"><Keyboard size={16} /> Atalhos de teclado</span>
          <button onClick={onClose} aria-label="Fechar" className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X size={16} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <table className="w-full text-xs">
            <tbody>
              {rows.map(([key, action, ctx]) => (
                <tr key={key} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pl-2 pr-3"><kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-app-yellow">{key}</kbd></td>
                  <td className="py-2 pr-3 text-gray-200">{action}</td>
                  <td className="py-2 pr-2 text-right text-[10px] text-gray-500">{ctx}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-white/10 px-4 py-2 text-[11px] text-gray-500">Os atalhos ficam desativados enquanto editas um campo de texto ou número.</p>
      </div>
    </div>
  );
}

// Bouton compact de la barre d'outils.
function ToolButton({ onClick, disabled, title, active, recording, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`karaoke-focusable inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 ${
        recording
          ? 'animate-pulse border-red-400/70 bg-red-500/20 text-red-300'
          : active
          ? 'border-app-yellow/50 bg-app-yellow/15 text-app-yellow hover:bg-app-yellow/25'
          : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// Horloge courte HH:MM pour les horodatages de sauvegarde/brouillon.
function formatClock(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Pastille d'état de sauvegarde (états visibles requis, en pt-BR).
function SaveStatusPill({ state, lastSavedAt, draftSavedAt }) {
  let icon = null; let label = ''; let cls = 'text-gray-400';
  if (state === 'saving') { icon = <Loader2 size={12} className="animate-spin" />; label = 'Salvando…'; cls = 'text-purple-300'; }
  else if (state === 'error') { icon = <AlertCircle size={12} />; label = 'Falha ao salvar'; cls = 'text-red-300'; }
  else if (state === 'recovered') { icon = <RotateCcw size={12} />; label = 'Rascunho recuperado'; cls = 'text-amber-300'; }
  else if (state === 'dirty') {
    icon = <Clock size={12} />;
    label = draftSavedAt ? `Alterações não salvas · rascunho ${formatClock(draftSavedAt)}` : 'Alterações não salvas';
    cls = 'text-amber-300';
  } else if (lastSavedAt) { icon = <CheckCircle2 size={12} />; label = `Salvo às ${formatClock(lastSavedAt)}`; cls = 'text-emerald-300'; }
  if (!label) return null;
  return (
    <span className={`hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold sm:inline-flex ${cls}`}>
      {icon} {label}
    </span>
  );
}

// Painel de validação — não destrutivo, agrupado por nível, cada item foca a linha.
function ValidationPanel({ validation, onClose, onFocus }) {
  const { issues, errors, warnings, infos } = validation;
  const iconFor = (level) => (
    level === 'error' ? <AlertCircle size={13} className="shrink-0 text-red-400" />
      : level === 'warning' ? <AlertTriangle size={13} className="shrink-0 text-amber-400" />
      : <Info size={13} className="shrink-0 text-sky-400" />
  );
  return (
    <div className="max-h-[40vh] overflow-y-auto border-b border-white/10 bg-black/60">
      <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur">
        <span className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1 text-red-300"><AlertCircle size={13} /> {errors} erro(s)</span>
          <span className="flex items-center gap-1 text-amber-300"><AlertTriangle size={13} /> {warnings} aviso(s)</span>
          <span className="flex items-center gap-1 text-sky-300"><Info size={13} /> {infos} info</span>
        </span>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X size={15} /></button>
      </div>
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-4 text-sm text-emerald-300"><CheckCircle2 size={15} /> Nenhum problema de timing detetado.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {issues.map((it, k) => (
            <li key={k}>
              <button
                onClick={() => onFocus(it.lineIndex, it.time)}
                className="karaoke-focusable flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs text-gray-300 hover:bg-white/5"
              >
                {iconFor(it.level)}
                <span className="flex-1">{it.message}</span>
                {it.time != null && <span className="shrink-0 font-mono text-[10px] text-gray-500">{formatTimestamp(it.time)}</span>}
                <ChevronRight size={12} className="shrink-0 text-gray-600" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Painel de versões (histórico de timing) — restaurar cria uma nova versão atual.
function VersionsPanel({ versions, loading, unavailable, restoringId, onRestore, onClose }) {
  const sourceLabel = (s) => (
    s === 'restore' ? 'Restauro' : s === 'publish' ? 'Publicação' : s === 'migration' ? 'Migração' : 'Gravação manual'
  );
  return (
    <div className="max-h-[40vh] overflow-y-auto border-b border-white/10 bg-black/60">
      <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur">
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-200"><History size={14} /> Histórico de versões</span>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"><X size={15} /></button>
      </div>
      {unavailable ? (
        <p className="px-4 py-4 text-sm text-amber-300">
          Histórico indisponível — aplica a migração <code className="text-amber-200">20260712170000_add_hybrid_timing.sql</code> no Supabase para ativar as versões.
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400"><Loader2 size={15} className="animate-spin" /> A carregar…</p>
      ) : versions.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-500">Ainda não há versões. Guarda a sincronização para criar a primeira.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center gap-3 px-4 py-2 text-xs">
              <span className="w-10 shrink-0 font-mono font-bold text-purple-300">#{v.version_number}</span>
              <span className="flex-1">
                <span className="text-gray-200">{sourceLabel(v.source)}</span>
                <span className="ml-2 text-gray-500">{v.created_at ? new Date(v.created_at).toLocaleString() : ''}</span>
                <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-gray-400">{v.timing_mode}</span>
                {v.note && <span className="ml-2 text-gray-400">· {v.note}</span>}
              </span>
              <button
                onClick={() => onRestore(v.id, v.version_number)}
                disabled={restoringId != null}
                className="karaoke-focusable inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-40"
              >
                {restoringId === v.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Format court "m:ss" pour la règle de la frise (vs formatTimestamp mm:ss.xx).
function formatShort(seconds) {
  const t = Math.max(0, seconds || 0);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Arrondi à 2 décimales pour l'affichage des champs de temps éditables (secondes).
function round2(seconds) {
  return Math.round((seconds || 0) * 100) / 100;
}

// Compte approximatif de syllabes (groupes de voyelles, pt/fr) — sert de POIDS
// relatif pour répartir le temps entre lignes, pas de valeur absolue. Min 1.
function countSyllables(text) {
  if (!text) return 1;
  const groups = text.toLowerCase().match(/[aeiouyáàâãäéèêëíìîïóòôõöúùûü]+/g);
  return groups ? groups.length : 1;
}

// Quand l'UPDATE renvoie 0 ligne (RLS), trouve la vraie raison pour un message clair.
async function diagnoseZeroRows() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return 'Não estás autenticado. Abre /login e entra com a conta admin, depois reabre o karaokê para guardar.';
    }
    const { data: adminRow } = await supabase
      .from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!adminRow) {
      return `A conta ${session.user.email || ''} não está na lista de admins → o RLS bloqueia a gravação. Entra com a conta admin.`;
    }
    return 'Gravação bloqueada (0 linhas) apesar da sessão admin. Verifica as políticas RLS de UPDATE da tabela songs.';
  } catch {
    return 'Não foi possível guardar (0 linhas). Reconecta-te como admin e tenta de novo.';
  }
}

// Traduit les erreurs d'écriture Supabase en message actionnable.
function describeSaveError(error) {
  if (!error) return 'Erro desconhecido ao guardar.';
  const code = error.code;
  const msg = error.message || '';
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Direitos insuficientes ou sessão expirada. Faz Sair e volta a entrar, depois tenta de novo.';
  }
  if (code === '42703' || /column .*(lrc_content|karaoke_synced_at).* does not exist/i.test(msg)) {
    return 'A coluna lrc_content/karaoke_synced_at ainda não existe. Aplica a migração Supabase 20260708120000_add_karaoke_to_songs.sql.';
  }
  return msg || 'Erro ao guardar.';
}

// Construit les lignes initiales : privilégie le LRC existant, sinon les paroles brutes.
function buildInitialLines(song) {
  // Priorité au timing structuré (Stage 2 — ligne+mot) quand présent et valide,
  // pour charger les blocs de mots existants dans l'éditeur. Sinon comportement
  // historique : LRC, puis paroles brutes non synchronisées.
  const model = parseTimingModel(song?.timing_data);
  if (model) return timingModelToEditorLines(model);
  const parsed = parseLrc(song?.lrc_content);
  if (parsed.length > 0) return parsed.map((l) => ({ text: l.text, time: l.time, endTime: l.endTime ?? null }));
  return splitLyricsLines(song?.lyrics).map((text) => ({ text, time: null, endTime: null }));
}

// Fusionne un nouveau texte (liste de lignes) avec les lignes déjà synchronisées en
// PRÉSERVANT les temps des lignes inchangées. Utilise une plus longue sous-séquence
// commune (LCS) sur le texte : les lignes appariées gardent leur time/endTime, les
// lignes AJOUTÉES reçoivent time:null (à marquer), les lignes SUPPRIMÉES disparaissent.
// Corrige le bug « ajouter une phrase remet toute la synchro à zéro ».
function mergeLinesPreservingTimes(oldLines, newTexts) {
  const oldTexts = oldLines.map((l) => l.text);
  const n = oldTexts.length;
  const m = newTexts.length;
  // dp[i][j] = longueur LCS de oldTexts[i:] et newTexts[j:]
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = oldTexts[i] === newTexts[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result = [];
  let i = 0;
  let j = 0;
  while (j < m) {
    if (i < n && oldTexts[i] === newTexts[j]) {
      const src = oldLines[i];
      result.push({
        text: newTexts[j], time: src.time, endTime: src.endTime ?? null,
        // Le timing par mot (Stage 2) suit la ligne inchangée — seules les lignes
        // AJOUTÉES repartent sans mots (rien à distribuer tant qu'il n'y a pas de temps).
        ...(Array.isArray(src.words) && src.words.length > 0 ? { words: src.words } : {}),
      });
      i += 1; j += 1;
    } else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1; // ancienne ligne supprimée
    } else {
      result.push({ text: newTexts[j], time: null, endTime: null }); // ligne ajoutée
      j += 1;
    }
  }
  return result;
}
