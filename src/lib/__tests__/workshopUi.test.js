/**
 * Régression — PRÉSENTATION de l'ateliê (sélecteurs PURS, pt-BR).
 *
 * Problème résolu : l'interface exposait un vocabulaire d'ingénieur (« Áudio original »,
 * « Fonte de reprodução », « Fonte de sincronização », offsets, identités de fichier,
 * comparaison de durée…) tous en même temps, et l'accès à l'ateliê depuis le catálogo
 * passait par des icônes sans texte.
 *
 * Ce module ne fait QUE de la présentation : il dérive des libellés et un « prochain
 * pas » depuis l'état EXISTANT des pistes. Il ne stocke rien, ne persiste rien, et ne
 * peut modifier aucun timing. Les rôles INTERNES (`original`, `instrumental`, `vocals`)
 * et les clés de calibration restent inchangés — seul leur affichage change.
 */
import { describe, it, expect } from 'vitest';
import {
  ROLE_UI, roleLabel, roleOrder, trackCardStatus, trackPrimaryAction,
  trackSecondaryActions, preparationProgress, preparationStage, nextWorkshopAction,
  workshopSummary, syncSourceOptions, catalogPrepAction, HELP_COPY, SECTION_COPY,
} from '@/lib/workshopUi';
import { TRACK_ROLE, CALIBRATION_KEY_FOR_ROLE, emptyTrack } from '@/lib/localTracks';

const ready = (role, over = {}) => ({
  ...emptyTrack(role), fileName: `${role}.wav`, fileSize: 1000, lastModified: 1,
  fileIdentity: `s1|${role}.wav|1000|1`, duration: 184.2, loadStatus: 'ready', ...over,
});
const loading = (role) => ({ ...emptyTrack(role), fileName: `${role}.wav`, loadStatus: 'loading' });
const broken = (role) => ({ ...emptyTrack(role), fileName: 'x.zip', loadStatus: 'error', error: 'Não foi possível ler este arquivo de áudio.' });

const tracksOf = (o = {}) => ({
  [TRACK_ROLE.ORIGINAL]: o.original ?? emptyTrack(TRACK_ROLE.ORIGINAL),
  [TRACK_ROLE.INSTRUMENTAL]: o.instrumental ?? emptyTrack(TRACK_ROLE.INSTRUMENTAL),
  [TRACK_ROLE.VOCALS]: o.vocals ?? emptyTrack(TRACK_ROLE.VOCALS),
});

// ═══════════════════ C. PRÉSENTATION DES RÔLES ═══════════════════
describe('C. les rôles internes ne changent pas, seul l’affichage change', () => {
  it('`original` s’affiche « Música completa »', () => {
    expect(roleLabel(TRACK_ROLE.ORIGINAL)).toBe('Música completa');
    expect(roleLabel('original')).toBe('Música completa');
  });
  it('`instrumental` et `vocals` gardent leurs noms', () => {
    expect(roleLabel(TRACK_ROLE.INSTRUMENTAL)).toBe('Instrumental');
    expect(roleLabel(TRACK_ROLE.VOCALS)).toBe('Voz isolada');
  });

  it('les VALEURS internes et les clés de calibration sont intactes', () => {
    expect(TRACK_ROLE.ORIGINAL).toBe('original');
    expect(TRACK_ROLE.INSTRUMENTAL).toBe('instrumental');
    expect(TRACK_ROLE.VOCALS).toBe('vocals');
    expect(CALIBRATION_KEY_FOR_ROLE.original).toBe('full');
    expect(CALIBRATION_KEY_FOR_ROLE.vocals).toBe('vocals');
    expect(CALIBRATION_KEY_FOR_ROLE.instrumental).toBe('instrumental');
  });

  it('l’ordre d’affichage est música completa → instrumental → voz', () => {
    expect(roleOrder()).toEqual(['original', 'instrumental', 'vocals']);
  });

  it('chaque rôle porte titre numéroté, description, badge et obligation', () => {
    const o = ROLE_UI.original;
    expect(o.cardTitle).toBe('1. Música completa');
    expect(o.description).toContain('Áudio original com música e voz');
    expect(o.purposeBadge).toBe('Referência de tempo');
    expect(o.recommendation).toBe('Recomendada para sincronizar as frases.');
    expect(o.requirement).toBe('Necessária para começar');
    expect(o.required).toBe(true);

    const i = ROLE_UI.instrumental;
    expect(i.cardTitle).toBe('2. Instrumental');
    expect(i.description).toContain('Música sem a voz principal');
    expect(i.purposeBadge).toBe('Faixa do karaokê');
    expect(i.requirement).toBe('Opcional, mas recomendada');
    expect(i.required).toBe(false);

    const v = ROLE_UI.vocals;
    expect(v.cardTitle).toBe('3. Voz isolada');
    expect(v.description).toContain('Somente a voz');
    expect(v.purposeBadge).toBe('Ajuda de sincronização');
    expect(v.requirement).toBe('Opcional, mas recomendada');
    expect(v.required).toBe(false);
  });

  it('ne laisse pas entendre que l’app génère les fichiers ou fait tourner UVR5', () => {
    const all = JSON.stringify(ROLE_UI) + SECTION_COPY.intro + SECTION_COPY.optionalNote + HELP_COPY.body;
    expect(all).not.toMatch(/gera(r|mos)? (os )?arquivos|separa(r|ção) automática|automaticamente/i);
    expect(SECTION_COPY.intro).toContain('preparados no UVR5');
    expect(SECTION_COPY.intro).toContain('não são enviados ao servidor');
  });
});

// ═══════════════════ D. ÉTATS DE CARTE ═══════════════════
describe('D. un seul état principal et une seule action primaire par carte', () => {
  const cases = [
    ['aucun fichier', emptyTrack('vocals'), 'missing', null, false, 'Arquivo não selecionado', 'Selecionar arquivo'],
    ['chargement', loading('vocals'), 'missing', null, false, 'Carregando', 'Carregando...'],
    ['fichier invalide', broken('vocals'), 'missing', null, false, 'Arquivo inválido', 'Escolher outro arquivo'],
    ['non calibré', ready('vocals'), 'missing', null, false, 'Precisa calibrar', 'Calibrar'],
    ['calibration copiée', ready('vocals'), 'calibrated', 'pending', false, 'Alinhamento a verificar', 'Verificar alinhamento'],
    ['prêt', ready('vocals'), 'calibrated', 'verified', false, 'Pronto', 'Ouvir'],
    ['en lecture', ready('vocals'), 'calibrated', 'verified', true, 'Em reprodução', 'Pausar'],
  ];

  it.each(cases)('%s', (_n, track, cal, verif, playing, status, action) => {
    expect(trackCardStatus(track, cal, verif, { isPlaying: playing }).label).toBe(status);
    expect(trackPrimaryAction(track, cal, verif, playing).label).toBe(action);
  });

  it('l’action primaire est unique et porte une clé exploitable', () => {
    const a = trackPrimaryAction(ready('vocals'), 'missing', null, false);
    expect(a.action).toBe('calibrate');
    expect(Object.keys(a).sort()).toEqual(['action', 'emphasis', 'label']);
    expect(a.emphasis).toBe('primary');
  });

  it('le statut ne repose jamais sur la couleur seule : texte + icône + ton', () => {
    const s = trackCardStatus(ready('vocals'), 'missing', null);
    expect(s.label.length).toBeGreaterThan(0);
    expect(s.icon).toBeTruthy();
    expect(['neutral', 'action', 'ready', 'error', 'accent']).toContain(s.tone);
  });

  it('« Duração diferente » remonte quand les durées divergent', () => {
    const s = trackCardStatus(ready('vocals', { duration: 120 }), 'calibrated', 'verified', { durationLevel: 'mismatch' });
    expect(s.label).toBe('Duração diferente');
    expect(s.tone).toBe('error');
  });

  it('« Usada para sincronizar » est un indicateur SECONDAIRE, pas le statut principal', () => {
    const s = trackCardStatus(ready('vocals'), 'calibrated', 'verified', { isSync: true });
    expect(s.label).toBe('Pronto');
    expect(s.badges).toContain('Usada para sincronizar');
    expect(s.badges).not.toContain('Fonte de reprodução');
  });

  it('les actions secondaires ne proposent que ce qui est valide', () => {
    const empty = trackSecondaryActions(emptyTrack('vocals'), 'missing', null, { isSync: false, isPlaying: false });
    expect(empty).toEqual([]);

    const uncal = trackSecondaryActions(ready('vocals'), 'missing', null, {});
    expect(uncal.map((a) => a.action)).toEqual(['listen', 'replace', 'remove', 'details']);
    expect(uncal.map((a) => a.action)).not.toContain('useForSync'); // non calibrée

    const okVocals = trackSecondaryActions(ready('vocals'), 'calibrated', 'verified', {});
    expect(okVocals.map((a) => a.action)).toContain('useForSync');
    expect(okVocals.map((a) => a.action)).toContain('recalibrate');
    expect(okVocals.map((a) => a.action)).toContain('verify');

    // L'original n'a pas à être vérifié contre lui-même.
    const okOriginal = trackSecondaryActions(ready('original'), 'calibrated', 'verified', {});
    expect(okOriginal.map((a) => a.action)).not.toContain('verify');
  });

  it('les libellés secondaires sont en pt-BR', () => {
    const labels = trackSecondaryActions(ready('vocals'), 'calibrated', 'verified', {}).map((a) => a.label);
    expect(labels).toEqual(expect.arrayContaining([
      'Ouvir', 'Trocar arquivo', 'Remover arquivo', 'Refazer calibração',
      'Verificar alinhamento', 'Usar para sincronização', 'Ver detalhes técnicos',
    ]));
  });
});

// ═══════════════════ E. PROGRESSION ═══════════════════
describe('E. progression de préparation', () => {
  const st = (o) => (r) => o[r] ?? 'missing';

  it('compte les fichiers sélectionnés et les fichiers prêts', () => {
    expect(preparationProgress(tracksOf(), st({})).label).toBe('Nenhum arquivo selecionado');
    expect(preparationProgress(tracksOf({ original: ready('original') }), st({})).label)
      .toBe('1 de 3 arquivos selecionados');
    expect(preparationProgress(tracksOf({ original: ready('original') }), st({ original: 'calibrated' })).label)
      .toBe('1 de 3 arquivos prontos');
    expect(preparationProgress(
      tracksOf({ original: ready('original'), vocals: ready('vocals') }),
      st({ original: 'calibrated', vocals: 'calibrated' }),
    ).label).toBe('2 de 3 arquivos prontos');
    const all = preparationProgress(
      tracksOf({ original: ready('original'), instrumental: ready('instrumental'), vocals: ready('vocals') }),
      st({ original: 'calibrated', instrumental: 'calibrated', vocals: 'calibrated' }),
    );
    expect(all.label).toBe('3 de 3 arquivos prontos');
    expect(all.selected).toBe(3);
    expect(all.ready).toBe(3);
  });

  it('les stems optionnels ne bloquent PAS la synchronisation de base', () => {
    const p = preparationProgress(tracksOf({ original: ready('original') }), st({ original: 'calibrated' }));
    expect(p.canSynchronize).toBe(true);
  });

  it('sans música completa prête, la synchronisation locale n’est pas possible', () => {
    const p = preparationProgress(tracksOf({ vocals: ready('vocals') }), st({ vocals: 'calibrated' }));
    expect(p.canSynchronize).toBe(false);
  });

  it('n’affirme jamais que les trois fichiers sont obligatoires', () => {
    expect(SECTION_COPY.optionalNote).toContain('opcionais');
    expect(SECTION_COPY.optionalNote).toContain('necessária para começar');
  });
});

// ═══════════════════ Étapes guidées ═══════════════════
describe('étape courante déduite de l’état existant', () => {
  const st = (o) => (r) => o[r] ?? 'missing';

  it('sans fichier : étape 1', () => {
    const s = preparationStage(tracksOf(), st({}), { syncRole: null, hasDraft: false });
    expect(s.current).toBe(1);
    expect(s.stages[0].label).toBe('Selecionar os áudios');
    expect(s.blockedReason).toBe('Selecione a música completa para continuar.');
  });

  it('fichier présent non calibré : étape 2', () => {
    const s = preparationStage(tracksOf({ original: ready('original') }), st({}), { syncRole: null });
    expect(s.current).toBe(2);
    expect(s.blockedReason).toBe('Calibre esta faixa antes de usá-la para sincronizar.');
  });

  it('stem calibré mais non vérifié : étape 3', () => {
    const s = preparationStage(
      tracksOf({ original: ready('original'), vocals: ready('vocals') }),
      st({ original: 'calibrated', vocals: 'calibrated' }),
      { syncRole: null, verificationOf: (r) => (r === 'vocals' ? 'pending' : 'verified') },
    );
    expect(s.current).toBe(3);
    expect(s.blockedReason).toBe('Compare a faixa com a música completa antes de confirmar o alinhamento.');
  });

  it('calibré et vérifié, sans source choisie : étape 4', () => {
    const s = preparationStage(
      tracksOf({ original: ready('original') }), st({ original: 'calibrated' }),
      { syncRole: null, verificationOf: () => 'verified' },
    );
    expect(s.current).toBe(4);
  });

  it('source choisie : étape 5', () => {
    const s = preparationStage(
      tracksOf({ original: ready('original') }), st({ original: 'calibrated' }),
      { syncRole: 'original', verificationOf: () => 'verified' },
    );
    expect(s.current).toBe(5);
    expect(s.stages).toHaveLength(5);
    expect(s.stages[4].label).toBe('Sincronizar');
    expect(s.stages.slice(0, 4).every((x) => x.done)).toBe(true);
  });

  it('les cinq étapes portent les libellés attendus', () => {
    const s = preparationStage(tracksOf(), st({}), {});
    expect(s.stages.map((x) => x.label)).toEqual([
      'Selecionar os áudios', 'Calibrar', 'Verificar o alinhamento',
      'Escolher a fonte de sincronização', 'Sincronizar',
    ]);
  });
});

// ═══════════════════ H. PROCHAINE ACTION ═══════════════════
describe('H. une seule prochaine action, déduite de l’état', () => {
  const st = (o) => (r) => o[r] ?? 'missing';

  it('propose de sélectionner la música completa en premier', () => {
    expect(nextWorkshopAction(tracksOf(), st({}), {}).label).toBe('Selecionar música completa');
  });
  it('puis de la calibrer', () => {
    expect(nextWorkshopAction(tracksOf({ original: ready('original') }), st({}), {}).label)
      .toBe('Calibrar música completa');
  });
  it('puis de vérifier un stem en attente', () => {
    const a = nextWorkshopAction(
      tracksOf({ original: ready('original'), vocals: ready('vocals') }),
      st({ original: 'calibrated', vocals: 'calibrated' }),
      { verificationOf: (r) => (r === 'vocals' ? 'pending' : 'verified') },
    );
    expect(a.label).toBe('Verificar alinhamento');
    expect(a.role).toBe('vocals');
  });
  it('puis de commencer la synchronisation', () => {
    const a = nextWorkshopAction(
      tracksOf({ original: ready('original') }), st({ original: 'calibrated' }),
      { verificationOf: () => 'verified', syncRole: 'original', hasDraft: false },
    );
    expect(a.label).toBe('Começar sincronização');
  });
  it('et de la CONTINUER si un brouillon existe', () => {
    const a = nextWorkshopAction(
      tracksOf({ original: ready('original') }), st({ original: 'calibrated' }),
      { verificationOf: () => 'verified', syncRole: 'original', hasDraft: true },
    );
    expect(a.label).toBe('Continuar sincronização');
  });
  it('résume la source délibérée à côté de la CTA', () => {
    expect(nextWorkshopAction(
      tracksOf({ original: ready('original') }), st({ original: 'calibrated' }),
      { verificationOf: () => 'verified', syncRole: 'vocals' },
    ).sourceSummary).toBe('Sincronização com: Voz isolada');
  });
  it('un stem optionnel manquant ne bloque pas la synchronisation', () => {
    const a = nextWorkshopAction(
      tracksOf({ original: ready('original') }), st({ original: 'calibrated' }),
      { verificationOf: () => 'verified', syncRole: 'original' },
    );
    expect(a.action).toBe('synchronize');
  });
});

// ═══════════════════ G. CONFIGURATION AVANCÉE ═══════════════════
describe('G. options de source de synchronisation', () => {
  const st = (o) => (r) => o[r] ?? 'missing';

  it('propose les pistes locales plus YouTube, avec explications', () => {
    const opts = syncSourceOptions(tracksOf({ original: ready('original') }), st({ original: 'calibrated' }), { verificationOf: () => 'verified' });
    expect(opts.map((o) => o.label)).toEqual(['Música completa', 'Instrumental', 'Voz isolada', 'YouTube']);
    expect(opts[0].help).toContain('Recomendada para marcar o início e o fim das frases');
    expect(opts[2].help).toContain('ajustar palavras com precisão');
    expect(opts[1].help).toContain('menos preciso');
    expect(opts[3].help).toContain('nenhum arquivo local');
  });

  it('bloque une piste non calibrée avec la bonne raison', () => {
    const opts = syncSourceOptions(tracksOf({ vocals: ready('vocals') }), st({}), {});
    const v = opts.find((o) => o.role === 'vocals');
    expect(v.disabled).toBe(true);
    expect(v.reason).toBe('Calibre esta faixa antes de sincronizar.');
  });

  it('bloque une piste calibrée mais NON vérifiée', () => {
    const opts = syncSourceOptions(
      tracksOf({ vocals: ready('vocals') }), st({ vocals: 'calibrated' }),
      { verificationOf: () => 'pending' },
    );
    const v = opts.find((o) => o.role === 'vocals');
    expect(v.disabled).toBe(true);
    expect(v.reason).toBe('Verifique o alinhamento antes de usar esta faixa.');
  });

  it('un zéro calibré reste accepté', () => {
    const opts = syncSourceOptions(
      tracksOf({ original: ready('original') }), st({ original: 'calibrated' }),
      { verificationOf: () => 'verified', offsetOf: () => 0 },
    );
    expect(opts.find((o) => o.role === 'original').disabled).toBe(false);
  });

  it('YouTube n’est proposé que si AUCUN fichier local n’est chargé', () => {
    const none = syncSourceOptions(tracksOf(), st({}), {});
    expect(none.find((o) => o.role === null).disabled).toBe(false);
    const some = syncSourceOptions(tracksOf({ original: ready('original') }), st({ original: 'calibrated' }), { verificationOf: () => 'verified' });
    expect(some.find((o) => o.role === null).disabled).toBe(true);
  });
});

// ═══════════════════ Résumé compact ═══════════════════
describe('résumé compact de la section repliée', () => {
  const st = () => 'calibrated';
  it('annonce le nombre de faixas et la source', () => {
    const s = workshopSummary(
      tracksOf({ original: ready('original'), instrumental: ready('instrumental'), vocals: ready('vocals') }),
      st, { syncRole: 'vocals', verificationOf: () => 'verified' },
    );
    expect(s.title).toBe('Áudios preparados · 3 faixas');
    expect(s.details).toEqual([
      'Música completa pronta', 'Instrumental pronto', 'Voz isolada pronta',
      'Sincronização com voz isolada',
    ]);
  });
  it('sans fichier, invite à en sélectionner', () => {
    expect(workshopSummary(tracksOf(), () => 'missing', {}).title).toBe('Nenhum arquivo selecionado');
  });
});

// ═══════════════════ B. ACTION DU CATÁLOGO ═══════════════════
describe('B. action principale du catálogo, en TEXTE', () => {
  it('sans préparation → « Preparar karaokê »', () => {
    expect(catalogPrepAction({ hasLyrics: true, isSynced: false, karaokeState: 'pending' }).label)
      .toBe('Preparar karaokê');
  });
  it('en cours (rascunho de karaokê) → « Continuar preparação »', () => {
    expect(catalogPrepAction({ hasLyrics: true, isSynced: true, karaokeState: 'draft' }).label)
      .toBe('Continuar preparação');
  });
  it('publié → « Revisar karaokê »', () => {
    expect(catalogPrepAction({ hasLyrics: true, isSynced: true, karaokeState: 'active' }).label)
      .toBe('Revisar karaokê');
  });
  it('sans letra, invite à ajouter la letra', () => {
    const a = catalogPrepAction({ hasLyrics: false, isSynced: false, karaokeState: 'unconfigured' });
    expect(a.label).toBe('Adicionar letra');
    expect(a.action).toBe('editLyrics');
  });
  it('l’action porte toujours un libellé visible (jamais une icône seule)', () => {
    for (const v of [
      { hasLyrics: false, isSynced: false, karaokeState: 'unconfigured' },
      { hasLyrics: true, isSynced: false, karaokeState: 'pending' },
      { hasLyrics: true, isSynced: true, karaokeState: 'draft' },
      { hasLyrics: true, isSynced: true, karaokeState: 'active' },
    ]) {
      const a = catalogPrepAction(v);
      expect(typeof a.label).toBe('string');
      expect(a.label.length).toBeGreaterThan(3);
    }
  });
});

// ═══════════════════ J. AUCUNE FUITE POSSIBLE ═══════════════════
describe('J. ces sélecteurs ne peuvent rien écrire ni faire fuir', () => {
  it('ne renvoient jamais d’URL d’objet ni d’identité de fichier', () => {
    const tracks = tracksOf({ original: ready('original', { objectUrl: 'blob:secret' }) });
    const blob = JSON.stringify([
      trackCardStatus(tracks.original, 'calibrated', 'verified'),
      trackPrimaryAction(tracks.original, 'calibrated', 'verified', false),
      trackSecondaryActions(tracks.original, 'calibrated', 'verified', {}),
      preparationProgress(tracks, () => 'calibrated'),
      preparationStage(tracks, () => 'calibrated', { verificationOf: () => 'verified' }),
      nextWorkshopAction(tracks, () => 'calibrated', { verificationOf: () => 'verified', syncRole: 'original' }),
      workshopSummary(tracks, () => 'calibrated', { verificationOf: () => 'verified' }),
    ]);
    expect(blob).not.toContain('blob:');
    expect(blob).not.toContain('secret');
    expect(blob).not.toContain('fileIdentity');
    expect(blob).not.toContain('s1|');
  });

  it('ne modifient pas les pistes reçues', () => {
    const tracks = tracksOf({ original: ready('original') });
    const before = JSON.parse(JSON.stringify(tracks));
    preparationProgress(tracks, () => 'calibrated');
    preparationStage(tracks, () => 'calibrated', {});
    nextWorkshopAction(tracks, () => 'calibrated', {});
    workshopSummary(tracks, () => 'calibrated', {});
    expect(tracks).toEqual(before);
  });
});
