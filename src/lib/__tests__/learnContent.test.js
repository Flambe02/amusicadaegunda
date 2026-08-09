import { describe, expect, it } from 'vitest';
import camarada from '@/content/learn/camarada-quer-cpf.json';
import ovo from '@/content/learn/eu-sou-um-ovo.json';
import {
  buildLearningMoments,
  buildLearnIndex,
  buildLessonMeta,
  buildStudySheet,
  deriveSongSlug,
  hasLearnContent,
  lookupExpression,
  lookupFr,
  normalizeAnswer,
} from '@/lib/learnContent';

/** Fabrique des lignes factices { text } comme en renvoie resolveSongTiming. */
const makeLines = (n) => Array.from({ length: n }, (_, i) => ({ text: `linha ${i}` }));

describe('deriveSongSlug', () => {
  it('reproduit le slug canonique des URLs publiques', () => {
    expect(deriveSongSlug({ title: 'Camarada Quer CPF' })).toBe('camarada-quer-cpf');
    expect(deriveSongSlug({ title: 'Eu Sou um ovo' })).toBe('eu-sou-um-ovo');
  });

  it('gère accents, ponctuation et espaces parasites comme le fait le build', () => {
    expect(deriveSongSlug({ title: 'Confissões bancárias' })).toBe('confissoes-bancarias');
    expect(deriveSongSlug({ title: 'PCC : Posto, Coxinha e Conveniência' }))
      .toBe('pcc-posto-coxinha-e-conveniencia');
    // Titre finissant par une ponctuation : aucun tiret final (le piège de titleToSlug)
    expect(deriveSongSlug({ title: 'Pô Ancelotti. e eu ?' })).toBe('po-ancelotti-e-eu');
    expect(deriveSongSlug({ title: ' Já é Natal ' })).toBe('ja-e-natal');
  });

  it('renvoie null sans titre exploitable', () => {
    expect(deriveSongSlug(null)).toBeNull();
    expect(deriveSongSlug({ title: '' })).toBeNull();
    expect(deriveSongSlug({ title: '!!!' })).toBeNull();
  });
});

describe('hasLearnContent', () => {
  it('ne reconnaît que les deux chansons pilotes', () => {
    expect(hasLearnContent('camarada-quer-cpf')).toBe(true);
    expect(hasLearnContent('eu-sou-um-ovo')).toBe(true);
    expect(hasLearnContent('banco-master')).toBe(false);
    expect(hasLearnContent(null)).toBe(false);
  });
});

describe('buildLearnIndex — fiches réelles', () => {
  it('Camarada Quer CPF couvre les 62 lignes LRC sans trou', () => {
    const index = buildLearnIndex(camarada, makeLines(62));
    expect(index).not.toBeNull();
    expect(index.coveredLines).toBe(62);
    expect(index.byLine.every(Boolean)).toBe(true);
  });

  it('Eu Sou um Ovo couvre les 86 lignes LRC sans trou', () => {
    const index = buildLearnIndex(ovo, makeLines(86));
    expect(index).not.toBeNull();
    expect(index.coveredLines).toBe(86);
    expect(index.byLine.every(Boolean)).toBe(true);
  });

  it('une plage multi-lignes partage une seule traduction', () => {
    const index = buildLearnIndex(ovo, makeLines(86));
    // « Feijão » / « Limão » / « Meu irmão » = LRC 54-56, une seule idée
    expect(lookupFr(index, 54)).toBe('Haricots, citron, mon frère');
    expect(lookupFr(index, 55)).toBe('Haricots, citron, mon frère');
    expect(lookupFr(index, 56)).toBe('Haricots, citron, mon frère');
    expect(lookupFr(index, 57)).toBe("C'est un œuf ?");
  });

  it('un refrain répété rejoue la même traduction à chaque occurrence', () => {
    const index = buildLearnIndex(camarada, makeLines(62));
    const refrain = 'Le camarade veut son CPF';
    for (const i of [22, 27, 44, 49]) expect(lookupFr(index, i)).toBe(refrain);
  });

  it('expose l\'expression collectable attachée à une ligne', () => {
    const index = buildLearnIndex(camarada, makeLines(62));
    expect(lookupExpression(index, 1)?.term).toBe('jeitinho brasileiro');
    expect(lookupExpression(index, 47)?.term).toBe('malandro');
    expect(lookupExpression(index, 0)).toBeNull();
  });

  it('regroupe le texte réel des lignes de la plage', () => {
    const index = buildLearnIndex(ovo, makeLines(86));
    const seg = index.segments.find((s) => s.from === 54);
    expect(seg.texts).toEqual(['linha 54', 'linha 55', 'linha 56']);
  });
});

describe('buildLearnIndex — garde-fous (fail-closed)', () => {
  it('refuse une fiche dont le compte de lignes ne correspond plus', () => {
    // Cas réel visé : la chanson a été resynchronisée depuis la rédaction de la fiche.
    expect(buildLearnIndex(camarada, makeLines(61))).toBeNull();
    expect(buildLearnIndex(ovo, makeLines(87))).toBeNull();
  });

  it('refuse une plage hors bornes', () => {
    const bad = { lrcLineCount: 3, segments: [{ from: 1, to: 5, fr: 'x' }] };
    expect(buildLearnIndex(bad, makeLines(3))).toBeNull();
  });

  it('refuse une plage inversée ou négative', () => {
    expect(buildLearnIndex({ lrcLineCount: 3, segments: [{ from: 2, to: 1, fr: 'x' }] }, makeLines(3))).toBeNull();
    expect(buildLearnIndex({ lrcLineCount: 3, segments: [{ from: -1, to: 1, fr: 'x' }] }, makeLines(3))).toBeNull();
  });

  it('refuse deux plages qui se recouvrent', () => {
    const bad = {
      lrcLineCount: 4,
      segments: [{ from: 0, to: 2, fr: 'a' }, { from: 2, to: 3, fr: 'b' }],
    };
    expect(buildLearnIndex(bad, makeLines(4))).toBeNull();
  });

  it('refuse une traduction vide', () => {
    expect(buildLearnIndex({ lrcLineCount: 2, segments: [{ from: 0, to: 1, fr: '  ' }] }, makeLines(2))).toBeNull();
  });

  it('refuse une expression_id qui ne correspond à aucune expression', () => {
    const bad = {
      lrcLineCount: 2,
      segments: [{ from: 0, to: 1, fr: 'a', expression_id: 'fantome' }],
      expressions: [{ id: 'reel', term: 'reel', meaning_fr: 'x' }],
    };
    expect(buildLearnIndex(bad, makeLines(2))).toBeNull();
  });

  it('renvoie null sans fiche ou sans lignes', () => {
    expect(buildLearnIndex(null, makeLines(3))).toBeNull();
    expect(buildLearnIndex(camarada, [])).toBeNull();
  });
});

describe('lookupFr / lookupExpression — robustesse', () => {
  it('tolèrent un index absent ou un index nul', () => {
    const index = buildLearnIndex(camarada, makeLines(62));
    expect(lookupFr(null, 0)).toBeNull();
    expect(lookupFr(index, 999)).toBeNull();
    expect(lookupExpression(null, 0)).toBeNull();
  });
});

describe('buildStudySheet — fiches réelles', () => {
  it('valide la ficha de Camarada Quer CPF (fill_blank avec/sans distractors + multiple_choice)', () => {
    const sheet = buildStudySheet(camarada);
    expect(sheet).not.toBeNull();
    expect(sheet.objectiveFr).toMatch(/virar/i);
    expect(sheet.grammarNote).toEqual({
      titlePt: 'virar + nome',
      explanationFr: expect.stringContaining('tornar-se'),
      examples: ['virar brasileiro', 'virar cria'],
    });
    expect(sheet.exercises).toHaveLength(3);

    const [ex1, ex2, ex3] = sheet.exercises;
    expect(ex1).toEqual({ type: 'fill_blank', prompt: 'Ele quis ____ brasileiro.', answer: 'virar', choices: ['virar', 'ser', 'estar'] });
    expect(ex2).toEqual({ type: 'fill_blank', prompt: 'Sem ____, você não abre conta no banco.', answer: 'CPF', choices: null });
    expect(ex3.type).toBe('multiple_choice');
    expect(ex3.options.filter((o) => o.correct)).toHaveLength(1);
    expect(ex3.options.find((o) => o.correct).text).toBe('a arte de contornar regras com charme');

    expect(sheet.summaryTerms).toEqual(['virar', 'CPF', 'jeitinho', 'malandro']);
  });

  it('valide la ficha de Eu Sou um Ovo (fill_blank sans distractors des deux côtés)', () => {
    const sheet = buildStudySheet(ovo);
    expect(sheet).not.toBeNull();
    expect(sheet.exercises).toHaveLength(3);
    expect(sheet.exercises[0]).toMatchObject({ type: 'fill_blank', answer: 'Cadê', choices: null });
    expect(sheet.exercises[2]).toMatchObject({ type: 'fill_blank', answer: 'vitrine', choices: null });
    expect(sheet.exercises[1].type).toBe('multiple_choice');
  });
});

describe('buildStudySheet — garde-fous (fail-closed)', () => {
  const VALID = {
    study_sheet: {
      objective_fr: 'x',
      grammar_note: { title_pt: 'x', explanation_fr: 'x', examples: ['x'] },
      exercises: [{ type: 'fill_blank', prompt_pt: 'x ____', answer: 'x' }],
      summary_terms: ['x'],
    },
  };

  it('renvoie null sans study_sheet', () => {
    expect(buildStudySheet({})).toBeNull();
    expect(buildStudySheet(null)).toBeNull();
  });

  it('renvoie null si objective_fr, grammar_note ou summary_terms manque ou est vide', () => {
    expect(buildStudySheet({ study_sheet: { ...VALID.study_sheet, objective_fr: '' } })).toBeNull();
    expect(buildStudySheet({ study_sheet: { ...VALID.study_sheet, grammar_note: null } })).toBeNull();
    expect(buildStudySheet({ study_sheet: { ...VALID.study_sheet, summary_terms: [] } })).toBeNull();
  });

  it('renvoie null si grammar_note.examples est vide', () => {
    const bad = { study_sheet: { ...VALID.study_sheet, grammar_note: { ...VALID.study_sheet.grammar_note, examples: [] } } };
    expect(buildStudySheet(bad)).toBeNull();
  });

  it('renvoie null si un exercise a un type inconnu', () => {
    const bad = { study_sheet: { ...VALID.study_sheet, exercises: [{ type: 'drag_drop', prompt_pt: 'x' }] } };
    expect(buildStudySheet(bad)).toBeNull();
  });

  it('renvoie null si un multiple_choice n\'a pas exactement une bonne réponse', () => {
    const noCorrect = { study_sheet: { ...VALID.study_sheet, exercises: [{ type: 'multiple_choice', prompt_pt: 'x', options: [{ text: 'a', correct: false }, { text: 'b', correct: false }] }] } };
    const twoCorrect = { study_sheet: { ...VALID.study_sheet, exercises: [{ type: 'multiple_choice', prompt_pt: 'x', options: [{ text: 'a', correct: true }, { text: 'b', correct: true }] }] } };
    expect(buildStudySheet(noCorrect)).toBeNull();
    expect(buildStudySheet(twoCorrect)).toBeNull();
  });

  it('renvoie null si un multiple_choice a moins de deux options', () => {
    const bad = { study_sheet: { ...VALID.study_sheet, exercises: [{ type: 'multiple_choice', prompt_pt: 'x', options: [{ text: 'a', correct: true }] }] } };
    expect(buildStudySheet(bad)).toBeNull();
  });

  it('renvoie null si un fill_blank n\'a pas de réponse', () => {
    const bad = { study_sheet: { ...VALID.study_sheet, exercises: [{ type: 'fill_blank', prompt_pt: 'x', answer: '  ' }] } };
    expect(buildStudySheet(bad)).toBeNull();
  });

  it('ignore les distractors vides/non-string sans planter', () => {
    const sheet = buildStudySheet({
      study_sheet: {
        ...VALID.study_sheet,
        exercises: [{ type: 'fill_blank', prompt_pt: 'x', answer: 'virar', distractors: ['ser', '', null, 42, 'estar'] }],
      },
    });
    expect(sheet.exercises[0].choices).toEqual(['virar', 'ser', 'estar']);
  });

  it('accepte la fiche minimale valide', () => {
    expect(buildStudySheet(VALID)).not.toBeNull();
  });
});

describe('buildStudySheet — true_false', () => {
  const base = {
    study_sheet: {
      objective_fr: 'x',
      grammar_note: { title_pt: 'x', explanation_fr: 'x', examples: ['x'] },
      summary_terms: ['x'],
    },
  };

  it('accepte un exercice true_false avec answer=true et answer=false', () => {
    const sheetTrue = buildStudySheet({
      study_sheet: { ...base.study_sheet, exercises: [{ type: 'true_false', prompt_pt: 'x é y.', answer: true }] },
    });
    expect(sheetTrue.exercises[0]).toEqual({ type: 'true_false', prompt: 'x é y.', answer: true });

    const sheetFalse = buildStudySheet({
      study_sheet: { ...base.study_sheet, exercises: [{ type: 'true_false', prompt_pt: 'x é y.', answer: false }] },
    });
    expect(sheetFalse.exercises[0]).toEqual({ type: 'true_false', prompt: 'x é y.', answer: false });
  });

  it('refuse un true_false sans answer booléen', () => {
    const bad = { study_sheet: { ...base.study_sheet, exercises: [{ type: 'true_false', prompt_pt: 'x' }] } };
    expect(buildStudySheet(bad)).toBeNull();
    const badString = { study_sheet: { ...base.study_sheet, exercises: [{ type: 'true_false', prompt_pt: 'x', answer: 'true' }] } };
    expect(buildStudySheet(badString)).toBeNull();
  });
});

describe('buildLessonMeta — fiche réelle (Eu Sou um Ovo)', () => {
  it('valide le lesson_meta réel de la leçon pilote', () => {
    const meta = buildLessonMeta(ovo);
    expect(meta).toEqual({
      level: 'A1-A2',
      durationMinutes: 8,
      theme: 'nourriture, prix, frustration',
      learningGoals: expect.arrayContaining([expect.stringContaining('cadê')]),
      comprehensionQuestion: {
        prompt: 'Sobre o que fala a música, principalmente?',
        options: expect.any(Array),
      },
      repetitionExpressionIds: ['eu-sou', 'cade', 'tempero', 'vitrine'],
    });
    expect(meta.comprehensionQuestion.options.filter((o) => o.correct)).toHaveLength(1);
  });

  it('renvoie null pour une chanson sans lesson_meta (Camarada Quer CPF, pour le moment)', () => {
    expect(buildLessonMeta(camarada)).toBeNull();
  });
});

describe('buildLessonMeta — garde-fous (fail-closed)', () => {
  const VALID = {
    expressions: [{ id: 'e1', term: 'x', meaning_fr: 'x' }],
    lesson_meta: {
      level: 'A1',
      duration_minutes: 5,
      theme: 'x',
      learning_goals: ['x'],
      comprehension_question: { prompt_pt: 'x?', options: [{ text: 'a', correct: true }, { text: 'b', correct: false }] },
    },
  };

  it('renvoie null sans lesson_meta', () => {
    expect(buildLessonMeta({})).toBeNull();
    expect(buildLessonMeta(null)).toBeNull();
  });

  it('renvoie null si niveau/durée/thème/objectifs manquent', () => {
    expect(buildLessonMeta({ ...VALID, lesson_meta: { ...VALID.lesson_meta, level: '' } })).toBeNull();
    expect(buildLessonMeta({ ...VALID, lesson_meta: { ...VALID.lesson_meta, duration_minutes: 0 } })).toBeNull();
    expect(buildLessonMeta({ ...VALID, lesson_meta: { ...VALID.lesson_meta, theme: '' } })).toBeNull();
    expect(buildLessonMeta({ ...VALID, lesson_meta: { ...VALID.lesson_meta, learning_goals: [] } })).toBeNull();
  });

  it('renvoie null si la question de compréhension n\'a pas exactement une bonne réponse', () => {
    const noCorrect = {
      ...VALID,
      lesson_meta: { ...VALID.lesson_meta, comprehension_question: { prompt_pt: 'x?', options: [{ text: 'a', correct: false }, { text: 'b', correct: false }] } },
    };
    expect(buildLessonMeta(noCorrect)).toBeNull();
  });

  it('renvoie null si repetition_expression_ids référence une expression inexistante', () => {
    const bad = {
      ...VALID,
      lesson_meta: { ...VALID.lesson_meta, repetition_expression_ids: ['fantome'] },
    };
    expect(buildLessonMeta(bad)).toBeNull();
  });

  it('replie sur toutes les expressions si repetition_expression_ids est absent', () => {
    const meta = buildLessonMeta(VALID);
    expect(meta.repetitionExpressionIds).toEqual(['e1']);
  });
});

describe('buildLearningMoments — fiches réelles (v2, par niveau, découplé des expressions[])', () => {
  it('extrait exactement 3 découvertes par niveau pour Eu Sou um Ovo', () => {
    expect(buildLearningMoments(ovo, 'beginner').map((m) => m.id)).toEqual(['eu-sou', 'eu-tenho', 'nao-tem']);
    expect(buildLearningMoments(ovo, 'intermediate').map((m) => m.id)).toEqual(['cade', 'fiquei-caro', 'nao-deu']);
    expect(buildLearningMoments(ovo, 'advanced').map((m) => m.id)).toEqual(['tempero', 'vitrine', 'virou-miragem']);
  });

  it('une découverte porte level/term/translation/plage de lignes/breakdown', () => {
    const [euSou] = buildLearningMoments(ovo, 'beginner');
    expect(euSou).toMatchObject({
      id: 'eu-sou', level: 'beginner', term: 'eu sou', translation: 'je suis', lineFrom: 0, lineTo: 1,
    });
    expect(euSou.breakdown).toEqual([
      { pt: 'eu', fr: 'je' }, { pt: 'sou', fr: 'suis' }, { pt: 'um ovo', fr: 'un œuf' },
    ]);
    expect(euSou.interaction).toEqual({ prompt: 'EU SOU = ?', options: ['je suis', "j'ai", 'je veux'] });
  });

  it('les découvertes avancées (idiomes) n\'ont pas d\'interaction obligatoire', () => {
    const [tempero] = buildLearningMoments(ovo, 'advanced');
    expect(tempero.interaction).toBeNull();
    expect(tempero.explanation).toMatch(/manque d.âme/i);
  });

  it('une même ligne peut enseigner des choses différentes selon le niveau (Camarada, ligne 22)', () => {
    const beginnerQuer = buildLearningMoments(camarada, 'beginner').find((m) => m.id === 'quer');
    const intermediateCpf = buildLearningMoments(camarada, 'intermediate').find((m) => m.id === 'cpf');
    expect(beginnerQuer).toMatchObject({ lineFrom: 22, lineTo: 22, term: 'quer' });
    expect(intermediateCpf).toMatchObject({ lineFrom: 22, lineTo: 22, term: 'CPF' });
  });

  it('Camarada Quer CPF n\'a que 2 découvertes de qualité au niveau avancé (contenu insuffisant pour 3, assumé)', () => {
    const advanced = buildLearningMoments(camarada, 'advanced');
    expect(advanced.map((m) => m.id)).toEqual(['jeitinho', 'malandro']);
    expect(advanced).toHaveLength(2);
  });

  it('sans niveau précisé, renvoie toutes les découvertes de toutes les niveaux (plafonnées à 3 par appel)', () => {
    // slice(0,3) global sans filtre — utile seulement pour un aperçu grossier, pas la
    // liste consommée par l'écran principal (toujours appelée avec un niveau précis).
    const all = buildLearningMoments(ovo);
    expect(all).toHaveLength(3);
    expect(all.map((m) => m.id)).toEqual(['eu-sou', 'eu-tenho', 'nao-tem']);
  });

  it('renvoie un tableau vide sans learning_moments ou sans fiche', () => {
    expect(buildLearningMoments(null, 'beginner')).toEqual([]);
    expect(buildLearningMoments({}, 'beginner')).toEqual([]);
    expect(buildLearningMoments({ learning_moments: [] }, 'beginner')).toEqual([]);
  });

  it('ignore une découverte mal formée (id/term/translation/plage manquants ou invalides)', () => {
    const bad = {
      learning_moments: [
        { level: 'beginner', term: 'x', translation: 'x', line_from: 0, line_to: 0 }, // id manquant
        { id: 'x', level: 'beginner', translation: 'x', line_from: 0, line_to: 0 }, // term manquant
        { id: 'x', level: 'beginner', term: 'x', line_from: 0, line_to: 0 }, // translation manquante
        { id: 'x', level: 'beginner', term: 'x', translation: 'x', line_from: 2, line_to: 1 }, // plage inversée
        { id: 'x', level: 'beginner', term: 'x', translation: 'x', line_from: -1, line_to: 0 }, // plage négative
      ],
    };
    expect(buildLearningMoments(bad, 'beginner')).toEqual([]);
  });

  it('plafonne à 3 même si la fiche en marque plus pour un même niveau', () => {
    const entry = {
      learning_moments: Array.from({ length: 5 }, (_, i) => ({
        id: `m${i}`, level: 'beginner', term: `t${i}`, translation: `f${i}`, line_from: i, line_to: i,
      })),
    };
    expect(buildLearningMoments(entry, 'beginner')).toHaveLength(3);
  });

  it('dégrade sobrement les champs optionnels mal formés sans rejeter la découverte', () => {
    const entry = {
      learning_moments: [{
        id: 'x', level: 'beginner', term: 'x', translation: 'x', line_from: 0, line_to: 0,
        breakdown: 'pas un tableau',
        explanation_fr: 42,
        interaction: { prompt_pt: 'x', options: 'pas un tableau' },
      }],
    };
    const [moment] = buildLearningMoments(entry, 'beginner');
    expect(moment.breakdown).toEqual([]);
    expect(moment.explanation).toBeNull();
    expect(moment.interaction).toBeNull();
  });
});

describe('normalizeAnswer', () => {
  it('ignore la casse, les espaces superflus et les accents portugais', () => {
    expect(normalizeAnswer('Não')).toBe(normalizeAnswer('nao'));
    expect(normalizeAnswer('  Virar  ')).toBe('virar');
    expect(normalizeAnswer('CPF')).toBe(normalizeAnswer('cpf'));
    expect(normalizeAnswer('café  com   leite')).toBe('cafe com leite');
  });

  it('distingue tout de même deux mots réellement différents', () => {
    expect(normalizeAnswer('virar')).not.toBe(normalizeAnswer('ser'));
  });

  it('ne plante jamais sur une valeur absente', () => {
    expect(normalizeAnswer(undefined)).toBe('');
    expect(normalizeAnswer(null)).toBe('');
  });
});
