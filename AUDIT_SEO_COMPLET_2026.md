# 🔍 AUDIT SEO COMPLET — A Música da Segunda

**Date de mise à jour :** 10 mai 2026
**Branche auditée :** `main` @ `c4d5cebc` (après cycle redesign mobile)
**Auditeur :** Analyse SEO technique du code source
**Référentiel :** Comparaison avec `AUDIT_SEO_ANALYSE_ET_RECOMMANDATIONS.md` (2025-01-27) et version précédente de ce fichier (2026-01-06)

---

## 📊 Résumé exécutif

La quasi-totalité des problèmes critiques relevés dans les audits de **janvier 2025** et **janvier 2026** ont été **corrigés**. Le site dispose d'une base SEO technique solide :

- Canonicals harmonisés (`https://www.amusicadasegunda.com`)
- Stubs HTML statiques avec contenu crawlable + JSON-LD
- Sitemaps split (`sitemap-index.xml` → `sitemap-pages.xml` + `sitemap-songs.xml`)
- `MusicRecording`, `BreadcrumbList`, `MusicPlaylist`, `Organization`, `WebSite` injectés
- `max-video-preview:0` correctement appliqué (suite à l'erreur GSC "Video isn't on a watch page")
- Aucun `VideoObject` injecté sur les pages chanson (intentionnel et correct)

**Score estimé :** 9.0 / 10 (contre 7.5 au départ).

Il reste **5 ajustements mineurs** identifiés ci-dessous, principalement dans `scripts/generate-stubs.cjs` (paramètres mal nommés, doublons de stubs, fallback image OG).

---

## ✅ Audit 1 (2025-01-27) — État actuel des findings

| # | Problème initial | Statut | Preuve |
|---|------------------|--------|--------|
| 1 | Canonicals incohérents (www vs non-www) | ✅ Corrigé | [index.html:39](index.html#L39) + [src/hooks/useSEO.js:21](src/hooks/useSEO.js#L21) tous deux sur `https://www.amusicadasegunda.com`. Single source of truth : [scripts/seo.config.json](scripts/seo.config.json) |
| 2 | Canonical hashé sur Playlist | ✅ Corrigé | [src/pages/Playlist.jsx:144-150](src/pages/Playlist.jsx#L144) → `useSEO({ url: '/musica' })`, pas de hash |
| 3 | Doublons meta dans index.html (`theme-color`, `apple-mobile-web-app-*`) | ✅ Corrigé | Une seule déclaration vérifiée dans [index.html:32-37](index.html#L32) et [public/index.html:32-37](public/index.html#L32) |
| 4 | `Song.getBySlug` charge toute la table | ✅ Corrigé | [src/api/entities.js:285-306](src/api/entities.js#L285) appelle `supabaseSongService.getBySlug(slug)` directement (requête `.eq('slug', slug)`) |
| 5 | Logs de debug en production | ✅ Corrigé | `devLog()` gaté par `import.meta.env.DEV && VITE_VERBOSE_LOGS` ([src/api/entities.js:6](src/api/entities.js#L6)). Seuls 2 `console.error` de gestion d'erreur restent dans [Playlist.jsx:106,117](src/pages/Playlist.jsx#L106) (acceptable) |
| 6 | Iframe Spotify 800px | ⚪ Non pertinent | Plus de iframe Spotify pleine hauteur dans le catalogue mobile ; design responsive via stubs et `getSongEmbedSrc()` |
| 7 | Images non optimisées | 🟡 Partiel | `OptimizedImage` utilisé, mais quelques stubs servent encore le brand logo en fallback OG (voir nouvel issue #4) |
| 8 | CSP trop permissive | ⚠️ Hors scope | CSP gérée côté headers HTTP (`public/_headers`) — à valider sur l'hébergeur, pas dans le HTML |
| 9 | JSON-LD `ItemList` incomplet sur Playlist | ✅ Corrigé | `musicPlaylistJsonLd()` génère un array `track[]` complet ([src/lib/seo-jsonld.js:139-172](src/lib/seo-jsonld.js#L139)) |
| 10 | Iframes sans attribut `title` | ✅ Corrigé | Tous les `<iframe>` ont un `title` descriptif (composant `YouTubeEmbed` + [generate-stubs.cjs:379](scripts/generate-stubs.cjs#L379)) |

---

## ✅ Audit 2 (2026-01-06) — État actuel des findings

| # | Problème initial | Statut | Preuve |
|---|------------------|--------|--------|
| 1 | `docs/sitemap.xml` ne contenait qu'une URL | ✅ Corrigé | Remplacé par `sitemap-index.xml` → `sitemap-pages.xml` + `sitemap-songs.xml`, généré par [scripts/generate-sitemap-unified.cjs](scripts/generate-sitemap-unified.cjs) |
| 2 | Faute de frappe `amusicadaegunda` dans `routes.js` ligne 192 | ✅ Corrigé / Non confirmé | [src/config/routes.js:190](src/config/routes.js#L190) contient `'amusicadasegunda'` (orthographe correcte) |
| 3 | `sitemap-index.xml` incomplet | ✅ Corrigé | Référence les 2 sitemaps fils (pages + songs) |
| 4 | JSON-LD `Brand` / `Organization` absent | ✅ Corrigé | [index.html:267-301](index.html#L267) + [public/index.html:275-302](public/index.html#L275) injectent `Organization` + `WebSite` complets (logo, `sameAs` réseaux sociaux) |
| 5 | Meta description ~120 chars sans nom de marque | ✅ Corrigé | [index.html:71](index.html#L71) = 172 chars, contient "A Música da Segunda" |
| 6 | Title tag trop court | ✅ Corrigé | "A Música da Segunda — Paródia e Sátira Musical das Notícias do Brasil" (~70 chars) sur la home |
| 7 | H1 dupliqué mobile/desktop | ✅ Corrigé | Un seul `<h1>A Música da Segunda</h1>` dans `app-shell-fallback` ([index.html:309](index.html#L309)) |

---

## 🆕 Nouveaux problèmes identifiés (non couverts par les audits précédents)

### 1. 🟡 Stubs chansons dupliqués (`.html` + `/index.html`)

**Severity :** Moyenne
**Fichier :** [scripts/generate-stubs.cjs:474-514](scripts/generate-stubs.cjs#L474)

Le script génère **deux fichiers** pour chaque chanson :
- `docs/musica/[slug]/index.html`
- `docs/musica/[slug].html` (variante sans slash)

Les deux répondent en 200 OK avec le même `canonical`. La variante sans slash devrait faire une redirection 301 vers la version `/`, pas servir du contenu dupliqué.

**Impact :** Dilution canonique mineure (Google consolide via canonical), mais ambiguïté URL + gaspillage espace disque.

**Fix :** Supprimer la génération `fileNoSlash` (lignes 476-514).

---

### 2. ⚪ FAUX POSITIF — `breadcrumbsJsonLd` dans les stubs (déjà correct)

**Severity :** Aucune (vérification après tentative de fix)

L'audit initial pensait que `breadcrumbsJsonLd({ songName, songUrl })` dans les stubs était incompatible avec la signature `{ title, slug }` de [src/lib/seo-jsonld.js:91](src/lib/seo-jsonld.js#L91).

**Réalité :** Les stubs CJS importent `breadcrumbsJsonLd` depuis [scripts/seo-templates.cjs:204](scripts/seo-templates.cjs#L204), **pas** depuis le module ESM React. La signature CJS attend bien `{ songName, songUrl }`. Aucun fix nécessaire.

**Dette technique mineure :** Les deux modules (`seo-templates.cjs` côté build et `seo-jsonld.js` côté runtime React) ont des signatures différentes pour la même fonction logique. À unifier lors d'un futur refactor (pas bloquant).

---

### 3. 🟡 Stubs chansons : image OG = logo générique au lieu de la miniature YouTube

**Severity :** Faible (mais visible sur partages sociaux)
**Fichier :** [scripts/generate-stubs.cjs:464](scripts/generate-stubs.cjs#L464)

Les stubs utilisent `s.image || ${siteUrl}${IMAGE}` (= logo de la marque) comme image OpenGraph. La logique runtime (`getYouTubeThumbnailUrl()` dans Song.jsx) génère bien la thumbnail YouTube côté React, mais les crawlers Facebook/Twitter/WhatsApp lisent le HTML statique.

**Impact :** Les partages des pages chanson sur les réseaux affichent le logo "A Música da Segunda" générique au lieu de la cover de la chanson → moins de CTR.

**Fix :** Dans `generate-stubs.cjs`, extraire le `videoId` (déjà fait ligne 343) et construire `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` comme `og:image`.

---

### 4. 🟢 MusicRecording stubs ne contiennent pas `ListenAction` (streaming)

**Severity :** Faible
**Fichier :** [scripts/generate-stubs.cjs:439-450](scripts/generate-stubs.cjs#L439)

Les stubs génèrent un `MusicRecording` JSON-LD basique, sans le `potentialAction.ListenAction` pointant vers Spotify/YouTube/Apple Music. Côté React, le hook est en place mais Google indexe d'abord le HTML statique.

**Impact :** Google Music actions et rich snippets de streaming pas exposés au crawl initial.

**Fix :** Aligner l'appel `musicRecordingJsonLd()` dans `generate-stubs.cjs` pour inclure `potentialAction` avec les URLs streaming (spotify_url, youtube_url, apple_music_url).

---

### 5. 🟢 Pages catégorie sans breadcrumbs JSON-LD

**Severity :** Faible
**Fichier :** [scripts/generate-stubs.cjs:575-584](scripts/generate-stubs.cjs#L575)

Les stubs de catégorie n'injectent que `[org, website]` schemas, pas de `BreadcrumbList`.

**Impact :** Pas de navigation breadcrumb dans les SERP pour les pages `/categoria/politica/`, etc.

**Fix :** Ajouter `breadcrumbsJsonLd({ title: categoryLabel, slug: categorySlug })` dans le block schema des category stubs.

---

## ✅ Ce qui est solide (ne pas casser)

- ✅ **Canonicals** unifiés `https://www.amusicadasegunda.com` (single source : `seo.config.json`)
- ✅ **Static HTML stubs** crawlables (title, description, JSON-LD, OG, body content)
- ✅ **`max-video-preview:0`** sur toutes les pages (suite à erreur GSC "Video isn't on a watch page")
- ✅ **Pas de `VideoObject`** sur les pages chanson (intentionnel et correct)
- ✅ **Sitemap split** : pages + chansons, référencés par `sitemap-index.xml`
- ✅ **`robots.txt`** : pointe vers `sitemap-index.xml`, bloque `/admin`, `/login`, `/#/`, sourcemaps
- ✅ **Pas de canonical hashé**
- ✅ **OG + Twitter Cards** partout via `useSEO` et `seo-templates.cjs`
- ✅ **JSON-LD complet** : Organization, WebSite, MusicRecording, MusicPlaylist, BreadcrumbList
- ✅ **`useSEO` hook** met à jour dynamiquement meta/OG/Twitter/canonical au routing client
- ✅ **`Song.getBySlug`** : requête Supabase directe (plus de table full-load)
- ✅ **Skip link a11y**, lazy loading routes, iframes avec `title`
- ✅ **Logs devLog gatés** par `import.meta.env.DEV`
- ✅ **Pas de `hreflang`** car le site est pt-BR mono-langue (correct)

---

## 🎯 Top 5 recommandations (priorisées)

### 1. ✅ APPLIQUÉ — Image OG dynamique sur stubs chansons
- **Fichier :** [scripts/generate-stubs.cjs:438-441](scripts/generate-stubs.cjs#L438)
- **Change effectué :** quand un `videoId` YouTube est dispo, `og:image` et `MusicRecording.image` utilisent `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`. Fallback vers le logo si pas de vidéo.
- **Vérifié sur 6x1 :** `og:image content="https://img.youtube.com/vi/UCnZ9CJq9Do/hqdefault.jpg"`
- **Impact :** Partages sociaux affichent la thumbnail YouTube de la chanson, plus le logo générique.

### 2. ✅ APPLIQUÉ — `.html` no-slash en redirection 301
- **Fichier :** [scripts/generate-stubs.cjs:477-499](scripts/generate-stubs.cjs#L477)
- **Change effectué :** au lieu de regénérer un stub complet, écrit un HTML court avec `<meta http-equiv="refresh">` + `noindex, follow` + canonical pointant vers `/musica/[slug]/`. Même pattern que `/chansons/[slug]` existant.
- **Impact :** Plus de duplicate content. Bookmarks/backlinks externes sur `.html` continuent de fonctionner (redirection transparente).

### 3. Ajouter breadcrumbs aux stubs catégorie (10 min) — non encore appliqué
- **Fichier :** [scripts/generate-stubs.cjs:575-584](scripts/generate-stubs.cjs#L575)
- **Change suggéré :** ajouter `breadcrumbsJsonLd({ songName: categoryLabel, songUrl: categoryUrl })` dans le block schema. Adapter aussi la fonction (la version CJS actuelle hardcode "Música" comme name fallback — pas adaptée aux pages catégorie).
- **Impact :** Rich snippets navigation sur pages catégorie. À ouvrir comme tâche séparée.

### 4. Validation GSC (URL Inspection)
- **Action :** dans GSC, tester `/musica/`, `/musica/ype-ype/`, `/sobre/`, `/categoria/politica/`
- **Vérifier :** title, description, canonical (www), rich results, pas de "Blocked by robots.txt"
- **Impact :** Confirme que les stubs sont correctement crawlés avant hydration React

**Effort restant :** ~10 min pour ajouter breadcrumbs catégorie (priorité faible).

---

## 📌 Notes / faux positifs GSC à ignorer

Per mémoire projet ([memory/gsc_false_alarms.md](memory/gsc_false_alarms.md)) :

- ⚪ Rapports GSC sur stubs `noindex` (admin, login) → **ignorer**, intentionnel
- ⚪ Redirections `http://` → `https://` → **ignorer**, gérées au niveau hosting

---

## 🔧 Outils de validation

| Outil | Usage |
|-------|-------|
| **Google Search Console** | URL Inspection, sitemaps soumis, Indexing report |
| **Google Rich Results Test** | Vérifier MusicRecording / BreadcrumbList sur pages chanson |
| **PageSpeed Insights** | Core Web Vitals (LCP, CLS, INP) |
| **Mobile-Friendly Test** | UX mobile (devrait être OK après le cycle redesign mobile-app-v1) |
| `curl -A "Googlebot" https://...` | Vérifier que le stub HTML servi a tout le SEO requis avant JS |

---

## 📊 Évolution du score SEO

| Date | Score | Notes |
|------|-------|-------|
| 2025-01-27 | 7.5 / 10 | Audit initial — canonicals cassés, logs verbeux, schema partiel |
| 2026-01-06 | 8.0 / 10 | Sitemaps split, faute de frappe corrigée, meta optimisées |
| **2026-05-10 (actuel)** | **9.0 / 10** | Phase 1-3 SEO complète. Reste 5 ajustements mineurs dans `generate-stubs.cjs` |

---

## 🚀 Prochaine étape

Implémenter les **fixes 1, 2 et 3** ci-dessus (concentrés dans `scripts/generate-stubs.cjs`, ~30 min de travail), puis lancer une validation GSC URL Inspection sur 3-4 URLs représentatives. Aucun bloquant majeur restant.
