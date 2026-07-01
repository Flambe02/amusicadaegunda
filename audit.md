# Audit SEO + AEO — amusicadasegunda.com
*Réalisé le 2026-07-01*

## Objectif
Devenir LA référence brésilienne pour "música da segunda", "paródia musical", "sátira musical sobre notícias do Brasil" — et être cité par ChatGPT, Perplexity, Google AI Overviews.

---

## Ce qui est déjà bon — NE PAS RETOUCHER

- **Pages chanson crawlables sans JS** : titre, sous-titre, ~400 mots de contexte éditorial, paroles complètes, 4 liens croisés par thème (vérifié en live sur `/musica/6x1/`)
- **Homepage** : définition claire au 1er paragraphe + 11 catégories + 8 chansons récentes en HTML statique
- **JSON-LD complet** : MusicRecording (keywords, ListenAction), MusicPlaylist, BreadcrumbList, Organization avec `knowsAbout` + `sameAs` incluant Wikidata Q140379813
- **robots.txt** : aucun bot IA bloqué (GPTBot, ClaudeBot, PerplexityBot, Google-Extended passent tous)
- **Sitemap** : 70 URLs avec `lastmod` à jour (dernière : 2026-06-29)
- **IndexNow** : fichier clé déployé + script `scripts/ping-indexnow.cjs` intégré au `postbuild` (HTTP 202 confirmé le 2026-07-01)

---

## Priorité 1 — Présence hors-site (~80 % de l'enjeu)

> Les IA citent 6,5× plus souvent les marques via des sources tierces que via leur propre domaine.

### 1. ~~Bing Webmaster Tools + IndexNow~~ ✅ FAIT (2026-07-01)
- Fichier clé : `https://www.amusicadasegunda.com/1e485b1ec532463ba5ac658bc52e977b.txt`
- Script : `scripts/ping-indexnow.cjs` — pinge 72 URLs à chaque `npm run build`
- Endpoint : `https://www.bing.com/indexnow` (HTTP 202 confirmé)

### 2. Profils artiste sur Letras.mus.br et Vagalume — *impact : élevé, effort : moyen*
Ces deux sites dominent toutes les requêtes cibles et sont massivement cités par les IA.
- Créer un profil artiste "A Música da Segunda" sur chacun
- Soumettre les paroles de chaque chanson avec lien vers `amusicadasegunda.com/musica/[slug]/`
- Gain : backlinks d'autorité + présence sur "letra + paródia" + sources lues par les IA

### 3. YouTube et Spotify — *impact : élevé, effort : faible*
- **YouTube** : description de chaque vidéo/Short → lien `amusicadasegunda.com/musica/[slug]/` + phrase "Paródia musical sobre [notícia]. Nova música toda segunda em amusicadasegunda.com"
- **Spotify for Artists** : bio avec définition canonique + lien site
- YouTube est très cité par Google AI Overviews

### 4. Wikipédia pt.wikipedia.org — *impact : très élevé, effort : long terme*
- Wikidata Q140379813 existe déjà (bon signal d'entité)
- 7,8 % des citations ChatGPT viennent de Wikipédia
- Prérequis : 2–3 mentions presse (Splash UOL, F5 Folha, podcasts, newsletters política)
- Angle : "o projeto que transforma a notícia da semana em paródia toda segunda-feira"
- Sans couverture presse, article Wikipédia impossible

### 5. Communautés Reddit — *impact : moyen, effort : continu*
- r/brasil, r/brasilivre — participation authentique quand une chanson colle à l'actu
- Reddit = 1,8 % des citations ChatGPT (en croissance)

---

## Priorité 2 — AEO on-site (pipeline stubs)

### 6. `llms.txt` — *effort : 30 min* — TODO
Créer `public/llms.txt` : définition du projet en 3 lignes, liens `/sobre/`, `/musica/`, liste des catégories. Standard émergent lu par les crawlers IA.

### 7. FAQPage sur /sobre — *effort : 1 h* — TODO
Dans `scripts/generate-stubs.cjs` (sobreBody) + schema `FAQPage` :
- "O que é A Música da Segunda ?"
- "Quando sai música nova ?"
- "Quem faz as paródias ?"
- "Onde ouvir ?"

Les blocs Q&R en langage naturel sont le format le plus extractible par les IA. Seul schema majeur manquant.

### 8. E-E-A-T sur /sobre — *effort : 1–2 h* — TODO (point faible)
La page `/sobre` (~330 mots) n'a **aucune date de lancement, aucun chiffre, aucun créateur nommé**.
- Ajouter : "Desde [ano], já são mais de 55 paródias publicadas"
- Nombre d'écoutes/vues Spotify si disponible
- Une identité assumée (même pseudonyme + ligne de bio)
- Un projet anonyme sans dates est structurellement moins citable par les IA

### 9. Date visible "Publicado em [data]" sur pages chanson — *effort : faible* — TODO
`datePublished` est dans le JSON-LD mais pas affiché visuellement. Les IA privilégient le contenu daté visiblement (freshness signal).

### 10. Flux RSS `/feed.xml` — *effort : 2 h* — TODO
Générer dans le pipeline de stubs. Accélère la découverte des nouvelles chansons par Google et Perplexity (qui favorise le contenu récent).

---

## Priorité 3 — Contenu (Phase 4 orientée IA)

### 11. ~~Page pilier "Paródia Musical no Brasil"~~ ✅ FAIT (2026-07-01)
- URL : `https://www.amusicadasegunda.com/guia/`
- Stub statique : ~1 000 mots pt-BR (histoire marchinha → samba de breque → télévision → YouTube → Shorts)
- Article JSON-LD avec `dateModified`, `author`, `keywords`
- Composant React `src/pages/Guia.jsx`
- Route `/guia` ajoutée dans `routes.js`
- Ajouté au sitemap (priorité 0.8, mensuel)
- Ajouté dans `llms.txt`

### 12. Capitaliser sur l'actualité — *éditorial continu*

**Formule de publication recommandée pour chaque lundi :**

| Champ | Format recommandé |
|-------|-------------------|
| **Titre de la page** | `{Nom événement} — {Angle satirique} \| A Música da Segunda` |
| **H1** (champ `name` en base) | Le titre complet avec le nom de l'événement |
| **Subtitle** | `Paródia sobre {Descrição do evento em 1 linha}` |
| **Description** (champ `description`) | 2-3 phrases : événement + angle + ce qu'on entend dans la musique |
| **Slug** | `{nom-evenement-sans-acentos}` — le slug doit contenir le nom de l'événement |

**Exemples de bons titres :**
- `Escala 6x1 — A jornada que não para | A Música da Segunda`
- `PEC 221 — Direitos na guilhotina | A Música da Segunda`
- `Copa do Mundo 2026 — Gol ou vexame? | A Música da Segunda`

**Pourquoi ça marche :** Perplexity et Google AI Overviews citent massivement le contenu qui contient le nom exact d'un événement frais. Une page avec "PEC 221" dans le titre et le slug sera trouvée par les IA qui cherchent des sources sur "PEC 221" dans les 48 h suivant la publication.

### 13. ~~`/arquivo/` par année~~ ✅ FAIT (2026-07-01)
- Stubs générés dynamiquement depuis `songs.json` dans `generate-stubs.cjs`
- 2 pages créées : `/arquivo/2025/` (28 paródias) et `/arquivo/2026/` (27 paródias)
- Liste ordonnée par date décroissante avec titre, sous-titre et date visible
- Ajoutées au sitemap (priorité 0.65, annuel pour 2025 / mensuel pour 2026)
- Ajoutées dans `llms.txt`

---

## Cadrage mots-clés

"Chanson du lundi" = requête française hors cible. Le marché cherche :
- `música da segunda`
- `paródia musical`
- `paródia sobre [notícia]`
- `sátira musical`

Tout l'éditorial doit rester ancré sur ces termes pt-BR (déjà le cas).

---

## Ordre d'exécution recommandé

| Étape | Action | Statut |
|-------|--------|--------|
| 1 | Bing IndexNow | ✅ FAIT (2026-07-01) |
| 2 | llms.txt + FAQPage /sobre + E-E-A-T + date visible + RSS | ✅ FAIT (2026-07-01) |
| 3 | Page pilier /guia + archives /arquivo/[year]/ | ✅ FAIT (2026-07-01) |
| 4 | Profils Letras.mus.br + Vagalume + descriptions YouTube | TODO (manuel) |
| 5 | Couverture presse → Wikipédia | Long terme |

---

## Monitoring mensuel

Tester 10 requêtes clés dans ChatGPT, Perplexity, Google AI Overviews :
- "música da segunda"
- "paródia musical brasil"
- "paródia sobre [notícia récente]"
- "sátira musical brasileira"

Noter : qui est cité ? quelle page ? évolution mois/mois.
