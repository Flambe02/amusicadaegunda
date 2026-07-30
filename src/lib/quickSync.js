/**
 * quickSync — QUICK SYNC : capture simplifiée des frases (« un maintien = une frase »).
 * Fonctions PURES + une machine à états, sans DOM, sans réseau, sans stockage.
 *
 * ═══ UNE SEULE SOURCE DE VÉRITÉ ═══
 * L'audit a établi que le brouillon de timing (`lines` + `useTimingDraft`), le transport,
 * la calibration et la source de synchronisation vivent DANS `KaraokeSyncTool` : il n'y a
 * aucun magasin en dehors. Quick Sync est donc un MODE DE PRÉSENTATION de ce composant,
 * pas un second écran ni une seconde route — c'est la seule façon de garantir qu'ouvrir
 * l'ateliê après Quick Sync montre exactement les mêmes timings.
 *
 * Ce module ne stocke AUCUN timing : l'écriture passe par `beginCapture`/`completeCapture`
 * (@/lib/phraseCapture) et l'instant vient de l'horloge canonique existante. Rien de ce
 * qu'il renvoie n'entre dans le payload karaokê.
 *
 * V1 = frases uniquement. Pas de capture par mot.
 */
import { CAPTURE_SOURCE } from '@/lib/karaokeWorkshop';

/** États de présentation/capture. Jamais persistés. */
export const QS = {
  IDLE: 'idle',
  READY: 'ready',
  CAPTURING: 'capturing',
  COMMITTING: 'committing',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
};

/** Tous les textes utilisateur, en pt-BR. */
export const QS_LABELS = {
  feature: 'QUICK SYNC',
  hint: 'Sincronize as frases ouvindo a música.',
  entryNew: 'QUICK SYNC',
  entryContinue: 'Continuar Quick Sync',
  entryReview: 'Revisar Quick Sync',
  openWorkshop: 'Abrir ateliê',
  advanced: 'Abrir modo avançado',
  back: 'Voltar',
  play: 'Reproduzir',
  pause: 'Pausar',
  back3: 'Voltar 3 segundos',
  fwd3: 'Avançar 3 segundos',
  beforePlay: 'Clique em reproduzir para começar.',
  waiting: 'Mantenha ESPAÇO pressionado quando a frase começar.',
  capturing: 'Sincronizando esta frase…',
  captured: 'Linha sincronizada.',
  cancelled: 'Captura cancelada.',
  holdDesktop: 'SEGURE ESPAÇO PARA SINCRONIZAR',
  holdTouch: 'SEGURE PARA SINCRONIZAR',
  release: 'SOLTE QUANDO A FRASE TERMINAR',
  undo: 'Desfazer última linha',
  repeat: 'Repetir esta linha',
  previous: 'Voltar à linha anterior',
  restart: 'Recomeçar Quick Sync',
  completedTitle: 'Sincronização concluída',
  completedBody: 'Todas as frases possuem início e fim. Revise o resultado antes de guardar.',
  review: 'Revisar resultado',
  save: 'Guardar sincronização',
  noLyrics: 'Adicione a letra antes de iniciar a sincronização.',
  noSource: 'Prepare uma fonte de áudio antes de sincronizar.',
  needCalibration: 'Calibre esta faixa antes de sincronizar.',
  needVerification: 'Verifique o alinhamento antes de usar esta faixa.',
  hasWords: 'Esta música já possui palavras sincronizadas.',
  hasWordsDetail: 'Para proteger esses ajustes, use o modo avançado.',
  prepareAudio: 'Preparar áudio',
  invalidCapture: 'A frase não foi registada: o fim precisa vir depois do início.',
  help: ['Espaço: sincronizar', 'Backspace: desfazer', '← →: mudar de linha', 'Esc: cancelar'],
};

const usable = (l) => Boolean(l && typeof l.text === 'string' && l.text.trim());

/** Une frase est complète quand elle a un début ET une fin postérieure. */
export function isLineComplete(line) {
  return Boolean(line && Number.isFinite(line.time) && Number.isFinite(line.endTime) && line.endTime > line.time);
}

/**
 * Y a-t-il un timing par mot SIGNIFICATIF ? Si oui, Quick Sync V1 passe en lecture seule :
 * remplacer une frase pourrait invalider des mots, et il n'existe pas d'opération testée
 * pour nettoyer proprement les mots dépendants. On ne touche donc à rien.
 */
export function hasMeaningfulWordTiming(lines) {
  return Array.isArray(lines) && lines.some((l) => Array.isArray(l?.words) && l.words.length > 0);
}

/**
 * Quick Sync est-il bloqué, et pourquoi ? Aucun repli silencieux : une source locale
 * délibérément choisie mais invalide bloque, elle ne retombe pas sur YouTube.
 * @returns {{blocked:boolean, readOnly:boolean, title:string|null, detail:string|null,
 *            primary:string|null, secondary:string|null}}
 */
export function quickSyncBlock({ hasLyrics, lines, captureSource, sourceIssue } = {}) {
  const free = { blocked: false, readOnly: false, title: null, detail: null, primary: null, secondary: null };
  if (!hasLyrics || !Array.isArray(lines) || !lines.some(usable)) {
    return { ...free, blocked: true, title: QS_LABELS.noLyrics, primary: QS_LABELS.advanced, secondary: QS_LABELS.back };
  }
  if (hasMeaningfulWordTiming(lines)) {
    return {
      blocked: true, readOnly: true,
      title: QS_LABELS.hasWords, detail: QS_LABELS.hasWordsDetail,
      primary: QS_LABELS.advanced, secondary: QS_LABELS.back,
    };
  }
  if (captureSource === CAPTURE_SOURCE.BLOCKED) {
    const title = sourceIssue === 'calibration' ? QS_LABELS.needCalibration
      : sourceIssue === 'verification' ? QS_LABELS.needVerification
      : QS_LABELS.noSource;
    return {
      ...free, blocked: true, title,
      detail: 'Selecione e prepare uma fonte de áudio antes de sincronizar.',
      primary: QS_LABELS.prepareAudio, secondary: QS_LABELS.back,
    };
  }
  return free;
}

/** Libellé (et blocage) du bouton d'entrée sur l'écran de détail de la música. */
export function quickSyncEntry({ hasLyrics, lines } = {}) {
  if (!hasLyrics || !Array.isArray(lines) || !lines.some(usable)) {
    return { label: QS_LABELS.entryNew, hint: QS_LABELS.hint, disabled: true, reason: QS_LABELS.noLyrics };
  }
  const list = lines.filter(usable);
  const done = list.filter(isLineComplete).length;
  // « Aucun timing » = aucune frase n'a même un DÉBUT. Un début sans fin compte déjà
  // comme un travail commencé → « Continuar ».
  const anyStarted = list.some((l) => Number.isFinite(l.time));
  const label = !anyStarted ? QS_LABELS.entryNew
    : done === list.length ? QS_LABELS.entryReview
    : QS_LABELS.entryContinue;
  return { label, hint: QS_LABELS.hint, disabled: false, reason: null };
}

/**
 * Ligne active à l'entrée : la première INCOMPLÈTE, sinon (tout valide → revue) la
 * première ligne utilisable. -1 s'il n'y a aucune parole utilisable.
 */
export function initialQuickLine(lines) {
  const list = Array.isArray(lines) ? lines : [];
  const firstUsable = list.findIndex(usable);
  if (firstUsable === -1) return -1;
  const incomplete = list.findIndex((l) => usable(l) && !isLineComplete(l));
  return incomplete === -1 ? firstUsable : incomplete;
}

/**
 * Ligne suivante à capturer : la prochaine INCOMPLÈTE après `fromIndex` — les frases déjà
 * complètes ne sont jamais écrasées automatiquement. Repart du début si nécessaire, et
 * renvoie null quand tout est complet.
 */
export function nextIncompleteLine(lines, fromIndex) {
  const list = Array.isArray(lines) ? lines : [];
  const hit = (i) => usable(list[i]) && !isLineComplete(list[i]);
  for (let i = (fromIndex ?? -1) + 1; i < list.length; i += 1) if (hit(i)) return i;
  for (let i = 0; i <= (fromIndex ?? -1) && i < list.length; i += 1) if (hit(i)) return i;
  return null;
}

/** Progression sur les lignes UTILISABLES uniquement. */
export function quickProgress(lines, activeIndex) {
  const list = (Array.isArray(lines) ? lines : []).filter(usable);
  const total = list.length;
  const done = list.filter(isLineComplete).length;
  const current = Number.isFinite(activeIndex) ? Math.max(0, activeIndex) + 1 : 0;
  return { total, done, current, label: `Linha ${current} de ${total}`, complete: total > 0 && done === total };
}

// ─────────────────────── Machine à états ───────────────────────

const EMPTY = {
  status: QS.IDLE, owner: null, pointerId: null,
  lastCommittedIndex: null, message: null, error: null,
};

export function quickInitial({ blocked } = {}) {
  return { ...EMPTY, status: blocked ? QS.BLOCKED : QS.IDLE };
}

/**
 * Machine à états UNIQUE, partagée par le clavier et le pointeur — il n'existe pas deux
 * logiques de capture. Elle ne contient AUCUN timing : elle ne fait que dire *quand* et
 * *sur quelle ligne* le composant doit appeler le moteur de frases existant.
 *
 * L'identité de ligne est GELÉE dans `owner` à l'appui : un relâchement tardif, après une
 * navigation, ne peut donc jamais écrire sur une autre frase.
 */
export function quickReduce(state, event) {
  const s = state || quickInitial({});
  switch (event?.type) {
    case 'ready':
      if (s.status === QS.BLOCKED) return s;
      if (s.status === QS.CAPTURING || s.status === QS.COMMITTING) return s;
      return { ...s, status: QS.READY, owner: null, pointerId: null, error: null };

    case 'block':
      return { ...EMPTY, status: QS.BLOCKED };

    case 'complete':
      if (s.status === QS.CAPTURING || s.status === QS.COMMITTING) return s;
      return { ...s, status: QS.COMPLETED, owner: null, pointerId: null };

    case 'press': {
      // Un seul début : auto-repeat clavier et pointeurs supplémentaires sont ignorés.
      if (s.status !== QS.READY && s.status !== QS.COMPLETED) return s;
      if (!Number.isInteger(event.index) || event.index < 0) return s;
      return {
        ...s, status: QS.CAPTURING, owner: { index: event.index },
        pointerId: event.pointerId ?? null, message: null, error: null,
      };
    }

    case 'release': {
      if (s.status !== QS.CAPTURING) return s;
      // Seul le pointeur initiateur peut terminer (null = clavier).
      const want = s.pointerId ?? null;
      const got = event.pointerId ?? null;
      if (want !== got) return s;
      return { ...s, status: QS.COMMITTING };
    }

    case 'commit': {
      if (s.status !== QS.COMMITTING) return s;
      if (event.ok) {
        return {
          ...s, status: QS.READY, owner: null, pointerId: null,
          lastCommittedIndex: s.owner?.index ?? null,
          message: QS_LABELS.captured, error: null,
        };
      }
      return {
        ...s, status: QS.READY, owner: null, pointerId: null,
        message: null, error: QS_LABELS.invalidCapture,
      };
    }

    case 'cancel':
      if (s.status !== QS.CAPTURING && s.status !== QS.COMMITTING) return s;
      return { ...s, status: QS.READY, owner: null, pointerId: null, message: QS_LABELS.cancelled, error: null };

    // La navigation ne touche jamais au propriétaire gelé.
    case 'select':
      return s;

    default:
      return s;
  }
}

/** La capture est-elle possible maintenant ? */
export function canCapture({ status, blocked, source, activeIndex } = {}) {
  if (blocked) return false;
  if (status !== QS.READY && status !== QS.COMPLETED) return false;
  if (source !== CAPTURE_SOURCE.LOCAL && source !== CAPTURE_SOURCE.YOUTUBE) return false;
  return Number.isInteger(activeIndex) && activeIndex >= 0;
}

/** Instruction affichée sous les paroles. */
export function instructionFor({ status, isPlaying, message, error } = {}) {
  if (error) return error;
  if (status === QS.CAPTURING || status === QS.COMMITTING) return QS_LABELS.capturing;
  if (message) return message;
  return isPlaying ? QS_LABELS.waiting : QS_LABELS.beforePlay;
}

/** Libellé du grand contrôle de capture — même machine, deux formulations. */
export function captureButtonLabel({ status, touch } = {}) {
  if (status === QS.CAPTURING || status === QS.COMMITTING) return QS_LABELS.release;
  return touch ? QS_LABELS.holdTouch : QS_LABELS.holdDesktop;
}
