/**
 * workshopUi — PRÉSENTATION de l'ateliê de karaokê. Sélecteurs PURS, textes en pt-BR.
 *
 * Ne stocke rien, ne persiste rien, n'écrit nulle part : tout est dérivé de l'état
 * EXISTANT des pistes et de l'atelier. Aucun de ces sélecteurs ne peut modifier un
 * timing, et rien de ce qu'ils renvoient n'entre dans le payload karaokê.
 *
 * ═══ RÔLES INTERNES INCHANGÉS ═══
 * `original` / `instrumental` / `vocals` restent les valeurs internes, et les clés de
 * calibration (`full` / `instrumental` / `vocals`) sont intactes. SEUL l'affichage change :
 * « Áudio original » devient « Música completa », parce que « original » ne dit pas à
 * l'administrateur ce que le fichier contient. Ce module est l'unique endroit où vit
 * cette traduction — aucun composant ne code un libellé de rôle en dur.
 */
import { TRACK_ROLE } from '@/lib/localTracks';

/** Textes de la section « Arquivos de áudio locais ». */
export const SECTION_COPY = {
  title: 'Arquivos de áudio locais',
  intro: 'Selecione os arquivos preparados no UVR5. Eles permanecem neste dispositivo e não são enviados ao servidor.',
  optionalNote: 'A música completa é necessária para começar. O instrumental e a voz isolada são opcionais, mas melhoram a preparação do karaokê.',
  progressTitle: 'Preparação dos áudios',
  advancedTitle: 'Configuração de sincronização',
  advancedSubtitle: 'Escolha a faixa usada para capturar os tempos.',
};

/** Bloc d'aide « Como usar cada faixa ». */
export const HELP_COPY = {
  title: 'Como usar cada faixa',
  body: 'Use a música completa para sincronizar as frases. Para ajustar as palavras com mais precisão, use a voz isolada. O instrumental permite verificar como ficará a versão para cantar.',
};

/** Invitation à comparer, avant de confirmer un alignement. */
export const ALIGNMENT_COPY = 'Compare as duas faixas no mesmo trecho antes de confirmar o alinhamento.';

/** Présentation de chaque rôle. `label` est le seul nom montré à l'utilisateur. */
export const ROLE_UI = {
  [TRACK_ROLE.ORIGINAL]: {
    role: TRACK_ROLE.ORIGINAL,
    label: 'Música completa',
    cardTitle: '1. Música completa',
    description: 'Áudio original com música e voz. Use esta faixa como referência principal da música.',
    purposeBadge: 'Referência de tempo',
    recommendation: 'Recomendada para sincronizar as frases.',
    requirement: 'Necessária para começar',
    required: true,
    readyLabel: 'Música completa pronta',
    sourceHelp: 'Música completa. Recomendada para marcar o início e o fim das frases.',
  },
  [TRACK_ROLE.INSTRUMENTAL]: {
    role: TRACK_ROLE.INSTRUMENTAL,
    label: 'Instrumental',
    cardTitle: '2. Instrumental',
    description: 'Música sem a voz principal. Esta é a faixa usada para cantar no karaokê.',
    purposeBadge: 'Faixa do karaokê',
    recommendation: 'Use para pré-visualizar como ficará a versão para cantar.',
    requirement: 'Opcional, mas recomendada',
    required: false,
    readyLabel: 'Instrumental pronto',
    sourceHelp: 'Instrumental. Útil para revisão, mas normalmente menos preciso para marcar palavras.',
  },
  [TRACK_ROLE.VOCALS]: {
    role: TRACK_ROLE.VOCALS,
    label: 'Voz isolada',
    cardTitle: '3. Voz isolada',
    description: 'Somente a voz. Facilita a identificação do início das frases, sílabas e palavras.',
    purposeBadge: 'Ajuda de sincronização',
    recommendation: 'Recomendada para ajustar as palavras com mais precisão.',
    requirement: 'Opcional, mas recomendada',
    required: false,
    readyLabel: 'Voz isolada pronta',
    sourceHelp: 'Voz isolada. Recomendada para ajustar palavras com precisão.',
  },
};

const YOUTUBE_SOURCE_HELP = 'YouTube. Disponível quando nenhum arquivo local foi selecionado.';

/** Libellé utilisateur d'un rôle interne. */
export function roleLabel(role) {
  return ROLE_UI[role]?.label ?? 'YouTube';
}

/** Ordre d'affichage imposé : música completa → instrumental → voz isolada. */
export function roleOrder() {
  return [TRACK_ROLE.ORIGINAL, TRACK_ROLE.INSTRUMENTAL, TRACK_ROLE.VOCALS];
}

// ─────────────────────── État d'une carte ───────────────────────

const isReady = (t) => t?.loadStatus === 'ready';

/**
 * UN SEUL statut principal par carte, avec texte + icône + ton (jamais la couleur seule).
 * « Usada para sincronizar » et « Em reprodução » sont des indicateurs SECONDAIRES.
 * @returns {{ label:string, tone:string, icon:string, badges:string[] }}
 */
export function trackCardStatus(track, calibrationStatus, verification, opts = {}) {
  const badges = [];
  if (opts.isSync) badges.push('Usada para sincronizar');
  if (opts.isPlaying) badges.push('Em reprodução');

  const wrap = (label, tone, icon) => ({ label, tone, icon, badges });
  if (!track || track.loadStatus === 'empty') return wrap('Arquivo não selecionado', 'neutral', 'empty');
  if (track.loadStatus === 'loading') return wrap('Carregando', 'neutral', 'loading');
  if (track.loadStatus === 'error') return wrap('Arquivo inválido', 'error', 'error');
  if (opts.durationLevel === 'mismatch') return wrap('Duração diferente', 'error', 'warn');
  if (calibrationStatus !== 'calibrated') return wrap('Precisa calibrar', 'action', 'action');
  if (verification === 'pending') return wrap('Alinhamento a verificar', 'action', 'warn');
  if (opts.isPlaying) return wrap('Em reprodução', 'accent', 'playing');
  return wrap('Pronto', 'ready', 'ready');
}

/**
 * L'action PRIMAIRE unique de la carte — une seule mise en avant par carte.
 * @returns {{ label:string, action:string, emphasis:string }}
 */
export function trackPrimaryAction(track, calibrationStatus, verification, isPlaying) {
  const a = (label, action) => ({ label, action, emphasis: 'primary' });
  if (!track || track.loadStatus === 'empty') return a('Selecionar arquivo', 'pick');
  if (track.loadStatus === 'loading') return a('Carregando...', 'busy');
  if (track.loadStatus === 'error') return a('Escolher outro arquivo', 'pick');
  if (calibrationStatus !== 'calibrated') return a('Calibrar', 'calibrate');
  if (verification === 'pending') return a('Verificar alinhamento', 'verify');
  if (isPlaying) return a('Pausar', 'pause');
  return a('Ouvir', 'listen');
}

/**
 * Actions SECONDAIRES (« Mais opções ») — uniquement celles valides dans l'état courant.
 * Aucune fonctionnalité existante n'est retirée : elles sont juste rangées ici.
 */
export function trackSecondaryActions(track, calibrationStatus, verification, opts = {}) {
  if (!isReady(track)) return [];
  const out = [{ label: 'Ouvir', action: 'listen' }];
  const calibrated = calibrationStatus === 'calibrated';
  if (calibrated) {
    out.push({ label: 'Refazer calibração', action: 'recalibrate' });
    if (track.role !== TRACK_ROLE.ORIGINAL) out.push({ label: 'Verificar alinhamento', action: 'verify' });
    if (!opts.isSync) out.push({ label: 'Usar para sincronização', action: 'useForSync' });
  }
  out.push({ label: 'Trocar arquivo', action: 'replace' });
  out.push({ label: 'Remover arquivo', action: 'remove' });
  out.push({ label: 'Ver detalhes técnicos', action: 'details' });
  return out;
}

// ─────────────────────── Progression ───────────────────────

/**
 * Compte les fichiers sélectionnés et ceux réellement PRÊTS (chargés + calibrés).
 * `canSynchronize` ne dépend QUE de la música completa : les stems sont optionnels et ne
 * doivent jamais bloquer une synchronisation par frase.
 */
export function preparationProgress(tracks, calibrationStatusOf) {
  const roles = roleOrder();
  const status = typeof calibrationStatusOf === 'function' ? calibrationStatusOf : () => 'missing';
  let selected = 0;
  let ready = 0;
  roles.forEach((r) => {
    const t = tracks?.[r];
    if (t && t.loadStatus !== 'empty') selected += 1;
    if (isReady(t) && status(r) === 'calibrated') ready += 1;
  });
  const label = selected === 0
    ? 'Nenhum arquivo selecionado'
    : ready === 0
      ? `${selected} de 3 arquivos selecionados`
      : `${ready} de 3 arquivos prontos`;
  const original = tracks?.[TRACK_ROLE.ORIGINAL];
  return {
    selected,
    ready,
    label,
    canSynchronize: Boolean(isReady(original) && status(TRACK_ROLE.ORIGINAL) === 'calibrated'),
  };
}

const STAGE_LABELS = [
  'Selecionar os áudios',
  'Calibrar',
  'Verificar o alinhamento',
  'Escolher a fonte de sincronização',
  'Sincronizar',
];

/**
 * Étape courante, DÉDUITE de l'état existant — ce n'est pas un moteur de workflow
 * persistant, et l'administrateur peut toujours revenir en arrière.
 */
export function preparationStage(tracks, calibrationStatusOf, opts = {}) {
  const status = typeof calibrationStatusOf === 'function' ? calibrationStatusOf : () => 'missing';
  const verif = typeof opts.verificationOf === 'function' ? opts.verificationOf : () => null;
  const roles = roleOrder();
  const loaded = roles.filter((r) => isReady(tracks?.[r]));
  const uncalibrated = loaded.filter((r) => status(r) !== 'calibrated');
  const unverified = loaded.filter((r) => r !== TRACK_ROLE.ORIGINAL
    && status(r) === 'calibrated' && verif(r) === 'pending');

  let current;
  let blockedReason = null;
  if (loaded.length === 0) {
    current = 1;
    blockedReason = 'Selecione a música completa para continuar.';
  } else if (uncalibrated.length > 0) {
    current = 2;
    blockedReason = 'Calibre esta faixa antes de usá-la para sincronizar.';
  } else if (unverified.length > 0) {
    current = 3;
    blockedReason = 'Compare a faixa com a música completa antes de confirmar o alinhamento.';
  } else if (!opts.syncRole) {
    current = 4;
  } else {
    current = 5;
  }

  return {
    current,
    blockedReason,
    stages: STAGE_LABELS.map((label, i) => ({ label, step: i + 1, done: i + 1 < current, active: i + 1 === current })),
  };
}

// ─────────────────────── Prochaine action ───────────────────────

/**
 * UNE seule prochaine action recommandée, déduite de l'état. Un stem optionnel manquant
 * ne bloque jamais le passage à la synchronisation.
 */
export function nextWorkshopAction(tracks, calibrationStatusOf, opts = {}) {
  const status = typeof calibrationStatusOf === 'function' ? calibrationStatusOf : () => 'missing';
  const verif = typeof opts.verificationOf === 'function' ? opts.verificationOf : () => null;
  const original = tracks?.[TRACK_ROLE.ORIGINAL];
  const sourceSummary = opts.syncRole
    ? `Sincronização com: ${roleLabel(opts.syncRole)}`
    : 'Sincronização com: YouTube';
  const make = (label, action, role = null) => ({ label, action, role, sourceSummary });

  if (!isReady(original)) return make('Selecionar música completa', 'pick', TRACK_ROLE.ORIGINAL);
  if (status(TRACK_ROLE.ORIGINAL) !== 'calibrated') return make('Calibrar música completa', 'calibrate', TRACK_ROLE.ORIGINAL);

  const pendingStem = roleOrder().find((r) => r !== TRACK_ROLE.ORIGINAL
    && isReady(tracks?.[r]) && status(r) === 'calibrated' && verif(r) === 'pending');
  if (pendingStem) return make('Verificar alinhamento', 'verify', pendingStem);

  const uncalibratedStem = roleOrder().find((r) => r !== TRACK_ROLE.ORIGINAL
    && isReady(tracks?.[r]) && status(r) !== 'calibrated');
  if (uncalibratedStem) return make(`Calibrar ${roleLabel(uncalibratedStem).toLowerCase()}`, 'calibrate', uncalibratedStem);

  return make(opts.hasDraft ? 'Continuar sincronização' : 'Começar sincronização', 'synchronize');
}

// ─────────────────────── Configuration avancée ───────────────────────

/**
 * Options de source de synchronisation, avec explications et raison de blocage. Les règles
 * de l'étape 5.1/6 sont conservées : une piste non calibrée (ou calibrée mais non
 * vérifiée) reste bloquée, et YouTube n'est proposé que s'il n'y a AUCUN fichier local.
 */
export function syncSourceOptions(tracks, calibrationStatusOf, opts = {}) {
  const status = typeof calibrationStatusOf === 'function' ? calibrationStatusOf : () => 'missing';
  const verif = typeof opts.verificationOf === 'function' ? opts.verificationOf : () => null;
  const anyLocal = roleOrder().some((r) => isReady(tracks?.[r]));

  const local = roleOrder().map((role) => {
    const ui = ROLE_UI[role];
    const track = tracks?.[role];
    let disabled = false;
    let reason = null;
    if (!isReady(track)) {
      disabled = true;
      reason = 'Selecione o arquivo desta faixa primeiro.';
    } else if (status(role) !== 'calibrated') {
      disabled = true;
      reason = 'Calibre esta faixa antes de sincronizar.';
    } else if (role !== TRACK_ROLE.ORIGINAL && verif(role) === 'pending') {
      disabled = true;
      reason = 'Verifique o alinhamento antes de usar esta faixa.';
    }
    return { role, label: ui.label, help: ui.sourceHelp, disabled, reason };
  });

  return [...local, {
    role: null,
    label: 'YouTube',
    help: YOUTUBE_SOURCE_HELP,
    disabled: anyLocal,
    reason: anyLocal ? 'Remova os arquivos locais para voltar ao YouTube.' : null,
  }];
}

// ─────────────────────── Résumé replié ───────────────────────

/** Résumé compact quand la section est refermée. */
export function workshopSummary(tracks, calibrationStatusOf, opts = {}) {
  const status = typeof calibrationStatusOf === 'function' ? calibrationStatusOf : () => 'missing';
  const readyRoles = roleOrder().filter((r) => isReady(tracks?.[r]) && status(r) === 'calibrated');
  const details = readyRoles.map((r) => ROLE_UI[r].readyLabel);
  if (opts.syncRole) details.push(`Sincronização com ${roleLabel(opts.syncRole).toLowerCase()}`);
  const anySelected = roleOrder().some((r) => tracks?.[r] && tracks[r].loadStatus !== 'empty');
  return {
    title: readyRoles.length > 0
      ? `Áudios preparados · ${readyRoles.length} ${readyRoles.length === 1 ? 'faixa' : 'faixas'}`
      : anySelected ? 'Áudios em preparação' : 'Nenhum arquivo selecionado',
    details,
  };
}

// ─────────────────────── Action du catálogo ───────────────────────

/**
 * Action principale d'une ligne du catálogo — TOUJOURS avec un libellé visible : l'accès
 * à l'ateliê ne doit plus dépendre d'une icône à deviner.
 * @param {{hasLyrics:boolean, isSynced:boolean, karaokeState:string}} view
 */
export function catalogPrepAction(view) {
  if (!view?.hasLyrics) return { label: 'Adicionar letra', action: 'editLyrics' };
  if (!view.isSynced) return { label: 'Preparar karaokê', action: 'prepare' };
  if (view.karaokeState === 'active') return { label: 'Revisar karaokê', action: 'review' };
  return { label: 'Continuar preparação', action: 'continue' };
}

/** Statut de préparation lisible, pour la page « Ateliê de karaokê ». */
export function songPrepStatus(view) {
  if (!view?.hasLyrics) return 'Não iniciado';
  if (!view.isSynced) return 'Letra adicionada';
  if (view.karaokeState === 'draft') return 'Pronto para revisar';
  if (view.karaokeState === 'active') return 'Pronto';
  return 'Sincronização em andamento';
}
