/**
 * Modo Aprender — fiches d'apprentissage FR indexées sur les PLAGES DE LIGNES LRC.
 *
 * Source de vérité de la segmentation = le `lrc_content` de la chanson (ou son
 * `timing_data` équivalent, aligné index pour index). Une fiche ne redécoupe JAMAIS
 * les paroles de son côté : elle associe une chaîne FR à une plage `[from, to]`
 * INCLUSIVE d'index de lignes LRC.
 *
 * Pourquoi des plages et pas une ligne par traduction : le LRC est découpé pour le
 * chant, pas pour le sens. « Feijão » / « Limão » / « Meu irmão » sont trois lignes
 * LRC mais une seule idée — elles partagent donc une traduction, affichée pendant
 * toute la plage. Inversement, un refrain répété réutilise la même chaîne FR à
 * chaque occurrence sans dupliquer le contenu éditorial.
 *
 * Ce module est le SEUL endroit qui connaît cette logique : le mode lecture (étape a)
 * et le bandeau de traduction du karaoké (étape b) le consomment tous les deux, pour
 * qu'une correction de fiche se répercute partout d'un coup.
 *
 * Les fiches vivent dans `src/content/learn/<slug>.json` (versionnées dans le repo,
 * pas en base — le générateur de stubs lit des fichiers locaux, et une panne Supabase
 * ne doit pas vider le mode Aprender).
 */

/**
 * Slugs disposant d'une fiche. Déclaré en dur — et non déduit d'un `import.meta.glob`
 * — pour que la décision « afficher ou non le toggle » soit synchrone et n'entraîne
 * aucun chargement réseau sur les chansons non couvertes.
 */
export const LEARN_SLUGS = Object.freeze(['camarada-quer-cpf', 'eu-sou-um-ovo']);

/** true si cette chanson a une fiche Modo Aprender. Synchrone, aucun I/O. */
export function hasLearnContent(slug) {
  return typeof slug === 'string' && LEARN_SLUGS.includes(slug);
}

/**
 * Slug canonique d'une chanson — celui de son URL publique `/musica/<slug>/`.
 *
 * Reproduit à l'identique `generateSlug()` de `scripts/export-songs-from-supabase.cjs`,
 * qui est l'algorithme ayant produit `content/songs.json`, les stubs `docs/musica/…`
 * et le sitemap. Vérifié conforme sur les 59 titres du catalogue.
 *
 * ⚠️ NE PAS remplacer par `titleToSlug()` de `@/lib/utils` : cette fonction-là utilise
 * `[^\w\s-]` et un `.trim()` qui ne retire que les espaces, ce qui laisse un tiret
 * final sur les titres finissant par une ponctuation (« Pô Ancelotti. e eu ? » →
 * `po-ancelotti-e-eu-`). Elle ne correspond donc pas aux URLs réelles.
 *
 * ⚠️ On dérive depuis le TITRE et non depuis `song.slug` : la colonne existe en base
 * mais la plupart des valeurs y sont encore sans tirets (bug de `slugify_title`, corrigé
 * par la migration 20260730120000 mais pas encore appliquée). Quand la base sera
 * réalignée, `song.slug` redeviendra utilisable et cette dérivation pourra tomber.
 *
 * @param {{ title?: string }} song
 * @returns {string|null}
 */
export function deriveSongSlug(song) {
  const title = song?.title;
  if (!title || typeof title !== 'string') return null;
  const slug = title
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || null;
}

/**
 * Charge la fiche d'une chanson. Import dynamique → la fiche part dans son propre
 * chunk et n'alourdit ni le bundle initial ni les pages des autres chansons (§9).
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function loadLearnContent(slug) {
  if (!hasLearnContent(slug)) return null;
  try {
    switch (slug) {
      case 'camarada-quer-cpf':
        return (await import('@/content/learn/camarada-quer-cpf.json')).default;
      case 'eu-sou-um-ovo':
        return (await import('@/content/learn/eu-sou-um-ovo.json')).default;
      default:
        return null;
    }
  } catch {
    return null; // fiche illisible → mode Aprender simplement indisponible
  }
}

/**
 * Valide une fiche contre les lignes réelles de la chanson et construit l'index de
 * consultation.
 *
 * La validation est volontairement STRICTE et fail-closed : si la fiche a été écrite
 * contre une version des paroles qui a depuis été resynchronisée, les plages ne
 * pointent plus sur les bonnes lignes et on afficherait des traductions décalées —
 * pire qu'une absence de traduction. Dans ce cas on renvoie `null` et l'appelant
 * masque le mode Aprender.
 *
 * @param {object|null} entry   fiche chargée par loadLearnContent
 * @param {Array<{text:string}>} lines  lignes issues de resolveSongTiming(song).lines
 * @returns {null | {
 *   segments: Array<{ from:number, to:number, fr:string, expressionId:string|null, texts:string[] }>,
 *   byLine: Array<{ fr:string, expressionId:string|null, segmentIndex:number }|null>,
 *   expressions: Array<object>,
 *   expressionById: Map<string, object>,
 *   culturalContextFr: string,
 *   coveredLines: number,
 * }}
 */
export function buildLearnIndex(entry, lines) {
  if (!entry || !Array.isArray(entry.segments) || !Array.isArray(lines) || lines.length === 0) {
    return null;
  }
  // Garde-fou n°1 : la fiche déclare le nombre de lignes qu'elle a servi à indexer.
  // Un écart = resynchronisation depuis la rédaction de la fiche.
  if (entry.lrcLineCount !== lines.length) return null;

  const byLine = new Array(lines.length).fill(null);
  const segments = [];

  for (const seg of entry.segments) {
    const { from, to } = seg || {};
    // Garde-fou n°2 : plage bien formée et dans les bornes.
    if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
    if (from < 0 || to < from || to >= lines.length) return null;
    if (typeof seg.fr !== 'string' || !seg.fr.trim()) return null;

    const segmentIndex = segments.length;
    const expressionId = seg.expression_id || null;
    for (let i = from; i <= to; i += 1) {
      // Garde-fou n°3 : recouvrement entre deux plages → indexation ambiguë.
      if (byLine[i] !== null) return null;
      byLine[i] = { fr: seg.fr, expressionId, segmentIndex };
    }
    segments.push({
      from,
      to,
      fr: seg.fr,
      expressionId,
      texts: lines.slice(from, to + 1).map((l) => (l?.text || '').trim()),
    });
  }

  const expressions = Array.isArray(entry.expressions) ? entry.expressions : [];
  const expressionById = new Map(expressions.map((e) => [e.id, e]));

  // Garde-fou n°4 : une plage référence une expression inexistante.
  for (const seg of segments) {
    if (seg.expressionId && !expressionById.has(seg.expressionId)) return null;
  }

  return {
    segments,
    byLine,
    expressions,
    expressionById,
    culturalContextFr: entry.cultural_context_fr || '',
    coveredLines: byLine.filter(Boolean).length,
  };
}

/**
 * Traduction curatée d'une ligne LRC, ou null si non couverte.
 * C'est le point d'entrée que le karaoké (étape b) interrogera AVANT de retomber sur
 * l'API de traduction à la volée.
 * @param {ReturnType<typeof buildLearnIndex>} index
 * @param {number} lineIndex
 * @returns {string|null}
 */
export function lookupFr(index, lineIndex) {
  if (!index || !Number.isInteger(lineIndex)) return null;
  return index.byLine[lineIndex]?.fr ?? null;
}

/**
 * Expression collectable attachée à une ligne LRC, ou null.
 * Utilisé par le tap-to-collect du karaoké (étape b) et l'indication visuelle du
 * mode lecture (étape a).
 */
export function lookupExpression(index, lineIndex) {
  if (!index || !Number.isInteger(lineIndex)) return null;
  const id = index.byLine[lineIndex]?.expressionId;
  return id ? index.expressionById.get(id) || null : null;
}

/**
 * Ficha de estudo — validation fail-closed du champ `study_sheet` d'une fiche.
 *
 * Contrairement à `buildLearnIndex`, cette structure n'a AUCUNE dépendance aux
 * lignes LRC (ce n'est pas un découpage des paroles, mais une leçon autonome :
 * objectif, point de grammaire, exercices, résumé) — donc pas de garde-fou de
 * resynchronisation ici, seulement la forme des données elles-mêmes.
 *
 * `choices` sur un exercice `fill_blank` est `null` quand la fiche ne fournit pas
 * de `distractors` (rendu en champ libre par l'appelant), ou le tableau
 * NON MÉLANGÉ `[réponse, ...distractors]` sinon — mélanger revient à l'appelant
 * (au rendu, via `useMemo`), pour que cette fonction reste pure et testable avec
 * une égalité exacte plutôt que de dépendre de `Math.random()`.
 *
 * @param {object|null} entry  fiche chargée par loadLearnContent
 * @returns {null | {
 *   objectiveFr: string,
 *   grammarNote: { titlePt:string, explanationFr:string, examples:string[] },
 *   exercises: Array<
 *     | { type:'multiple_choice', prompt:string, options:{text:string, correct:boolean}[] }
 *     | { type:'fill_blank', prompt:string, answer:string, choices:string[]|null }
 *   >,
 *   summaryTerms: string[],
 * }}
 */
export function buildStudySheet(entry) {
  const sheet = entry?.study_sheet;
  if (!sheet) return null;
  if (typeof sheet.objective_fr !== 'string' || !sheet.objective_fr.trim()) return null;

  const gn = sheet.grammar_note;
  if (!gn || typeof gn.title_pt !== 'string' || !gn.title_pt.trim()) return null;
  if (typeof gn.explanation_fr !== 'string' || !gn.explanation_fr.trim()) return null;
  if (!Array.isArray(gn.examples) || gn.examples.length === 0) return null;
  if (gn.examples.some((e) => typeof e !== 'string' || !e.trim())) return null;

  if (!Array.isArray(sheet.exercises) || sheet.exercises.length === 0) return null;
  const exercises = [];
  for (const ex of sheet.exercises) {
    if (!ex || typeof ex.prompt_pt !== 'string' || !ex.prompt_pt.trim()) return null;

    if (ex.type === 'multiple_choice') {
      if (!Array.isArray(ex.options) || ex.options.length < 2) return null;
      if (ex.options.some((o) => typeof o?.text !== 'string' || !o.text.trim())) return null;
      // Garde-fou : exactement une bonne réponse — zéro ou plusieurs rendrait la
      // correction ambiguë ou impossible.
      if (ex.options.filter((o) => o.correct === true).length !== 1) return null;
      exercises.push({
        type: 'multiple_choice',
        prompt: ex.prompt_pt,
        options: ex.options.map((o) => ({ text: o.text, correct: o.correct === true })),
      });
    } else if (ex.type === 'fill_blank') {
      if (typeof ex.answer !== 'string' || !ex.answer.trim()) return null;
      const distractors = Array.isArray(ex.distractors)
        ? ex.distractors.filter((d) => typeof d === 'string' && d.trim())
        : [];
      exercises.push({
        type: 'fill_blank',
        prompt: ex.prompt_pt,
        answer: ex.answer,
        choices: distractors.length > 0 ? [ex.answer, ...distractors] : null,
      });
    } else if (ex.type === 'true_false') {
      if (typeof ex.answer !== 'boolean') return null;
      exercises.push({
        type: 'true_false',
        prompt: ex.prompt_pt,
        answer: ex.answer,
      });
    } else {
      return null; // type d'exercice inconnu — fail-closed plutôt que de l'ignorer
    }
  }

  if (!Array.isArray(sheet.summary_terms) || sheet.summary_terms.length === 0) return null;
  if (sheet.summary_terms.some((t) => typeof t !== 'string' || !t.trim())) return null;

  return {
    objectiveFr: sheet.objective_fr,
    grammarNote: { titlePt: gn.title_pt, explanationFr: gn.explanation_fr, examples: gn.examples },
    exercises,
    summaryTerms: sheet.summary_terms,
  };
}

/**
 * Compare une réponse tapée par l'utilisateur (exercice `fill_blank` en champ libre)
 * à la réponse attendue, en ignorant la casse, les espaces superflus et les accents
 * portugais (« não » et « nao » comptent également bon) — sinon l'exercice punit une
 * faute de frappe sans rapport avec la compréhension réelle du mot.
 * @param {string} value
 * @returns {string}
 */
export function normalizeAnswer(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Métadonnées de la leçon guidée (`/apprendre/:slug`) — niveau, durée, thème,
 * objectifs, question de compréhension globale et phrases ciblées pour la
 * répétition. Bloc `lesson_meta` OPTIONNEL et additif de la fiche : une fiche sans
 * ce bloc reste utilisable telle quelle par LearnPanel/StudySheetPanel (mode
 * lecture dans LyricsDialog) — elle n'offre juste pas de parcours guidé, et
 * `/apprendre/:slug` la masque alors plutôt que d'afficher un parcours incomplet
 * (même stratégie fail-closed que `buildLearnIndex`/`buildStudySheet`).
 *
 * NON UTILISÉ par l'écran principal du Modo Aprender depuis la simplification
 * « chanson + karaokê + 3 découvertes » (voir `buildLearningMoments` ci-dessous) —
 * conservé tel quel plutôt que supprimé, au cas où un parcours guidé optionnel
 * redevienne pertinent plus tard.
 *
 * Le projet n'a pas de TypeScript strict (pas de tsconfig racine, pas de script
 * typecheck) : les types d'étape/exercice sont documentés en JSDoc plutôt que dans
 * un système de types séparé, pour rester dans la convention déjà en place ici.
 *
 * @typedef {{ prompt:string, options: Array<{ text:string, correct:boolean }> }} ComprehensionQuestion
 * @typedef {{
 *   level:string, durationMinutes:number, theme:string, learningGoals:string[],
 *   comprehensionQuestion: ComprehensionQuestion, repetitionExpressionIds:string[],
 * }} LessonMeta
 *
 * @param {object|null} entry fiche chargée par loadLearnContent
 * @returns {null | LessonMeta}
 */
export function buildLessonMeta(entry) {
  const meta = entry?.lesson_meta;
  if (!meta) return null;
  if (typeof meta.level !== 'string' || !meta.level.trim()) return null;
  if (!Number.isFinite(meta.duration_minutes) || meta.duration_minutes <= 0) return null;
  if (typeof meta.theme !== 'string' || !meta.theme.trim()) return null;

  if (!Array.isArray(meta.learning_goals) || meta.learning_goals.length === 0) return null;
  if (meta.learning_goals.some((g) => typeof g !== 'string' || !g.trim())) return null;

  const cq = meta.comprehension_question;
  if (!cq || typeof cq.prompt_pt !== 'string' || !cq.prompt_pt.trim()) return null;
  if (!Array.isArray(cq.options) || cq.options.length < 2) return null;
  if (cq.options.some((o) => typeof o?.text !== 'string' || !o.text.trim())) return null;
  // Garde-fou : exactement une bonne réponse, comme buildStudySheet pour multiple_choice.
  if (cq.options.filter((o) => o.correct === true).length !== 1) return null;

  // Garde-fou : une phrase de répétition doit référencer une expression réelle de la
  // fiche. À défaut de liste explicite, la répétition porte sur toutes les
  // expressions enseignées (comportement par défaut raisonnable pour la bêta).
  const allExpressionIds = Array.isArray(entry.expressions) ? entry.expressions.map((e) => e.id) : [];
  const explicitIds = Array.isArray(meta.repetition_expression_ids)
    ? meta.repetition_expression_ids.filter((id) => typeof id === 'string' && id.trim())
    : [];
  if (explicitIds.some((id) => !allExpressionIds.includes(id))) return null;
  const repetitionExpressionIds = explicitIds.length > 0 ? explicitIds : allExpressionIds;
  if (repetitionExpressionIds.length === 0) return null;

  return {
    level: meta.level,
    durationMinutes: meta.duration_minutes,
    theme: meta.theme,
    learningGoals: meta.learning_goals,
    comprehensionQuestion: {
      prompt: cq.prompt_pt,
      options: cq.options.map((o) => ({ text: o.text, correct: o.correct === true })),
    },
    repetitionExpressionIds,
  };
}

/**
 * Découvertes musicales (« micro-apprentissages ») d'une fiche, PAR NIVEAU — au plus
 * 3 par chanson et par niveau (`beginner` | `intermediate` | `advanced`).
 *
 * v2 (remplace la version `moment_type` base/vivo/culture attachée à `expressions[]`,
 * conservée mais plus utilisée — voir `MOMENT_TYPES` historique ci-dessus). Les
 * découvertes vivent maintenant dans un tableau top-level `learning_moments[]`,
 * DÉCOUPLÉ de `expressions[]`/`segments[]` : chaque entrée référence directement une
 * plage `[line_from, line_to]` de lignes LRC (même convention que `segments[]`), sans
 * passer par `buildLearnIndex`. Pourquoi découplé : une même ligne doit pouvoir
 * enseigner des choses différentes selon le niveau (ex. « não tem tempero » = structure
 * grammaticale « não tem » au niveau débutant ailleurs dans la chanson, idiome complet
 * au niveau avancé) — le système `expressions[]`/`byLine` impose UN SEUL expression_id
 * par ligne, ce qui rendrait ça impossible sans ce découplage.
 *
 * Fail-closed sur la FORME (id/term/translation/plage manquants ou invalides →
 * découverte ignorée), permissif sur le contenu optionnel (`breakdown`/`explanation_fr`/
 * `interaction` mal formés dégradent sobrement plutôt que de rejeter toute la découverte).
 *
 * @typedef {{
 *   id:string, level:'beginner'|'intermediate'|'advanced', term:string, translation:string,
 *   lineFrom:number, lineTo:number, breakdown:Array<{pt:string,fr:string}>,
 *   explanation:string|null, interaction:{ prompt:string, options:string[] }|null,
 * }} LearningMoment
 *
 * @param {object|null} entry fiche chargée par loadLearnContent
 * @param {'beginner'|'intermediate'|'advanced'|null} [level] filtre par niveau ; sans
 *   filtre, renvoie toutes les découvertes de tous les niveaux (utile pour un aperçu
 *   global, ex. compter le total sur une fiche).
 * @returns {LearningMoment[]} jamais plus de 3 éléments par appel
 */
export function buildLearningMoments(entry, level = null) {
  const raw = Array.isArray(entry?.learning_moments) ? entry.learning_moments : [];
  const scoped = level ? raw.filter((m) => m?.level === level) : raw;
  return scoped
    .filter((m) => m
      && typeof m.id === 'string' && m.id.trim()
      && typeof m.term === 'string' && m.term.trim()
      && typeof m.translation === 'string' && m.translation.trim()
      && Number.isInteger(m.line_from) && Number.isInteger(m.line_to)
      && m.line_from >= 0 && m.line_to >= m.line_from)
    .slice(0, 3)
    .map((m) => {
      const interaction = m.interaction
        && typeof m.interaction.prompt_pt === 'string' && m.interaction.prompt_pt.trim()
        && Array.isArray(m.interaction.options) && m.interaction.options.length > 0
        && m.interaction.options.every((o) => typeof o === 'string' && o.trim())
        ? { prompt: m.interaction.prompt_pt, options: m.interaction.options }
        : null;
      return {
        id: m.id,
        level: m.level,
        term: m.term,
        translation: m.translation,
        lineFrom: m.line_from,
        lineTo: m.line_to,
        breakdown: Array.isArray(m.breakdown)
          ? m.breakdown.filter((b) => b && typeof b.pt === 'string' && typeof b.fr === 'string')
          : [],
        explanation: typeof m.explanation_fr === 'string' && m.explanation_fr.trim() ? m.explanation_fr : null,
        interaction,
      };
    });
}
