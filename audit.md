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

### 11. Page pilier "définitive" — *effort : demi-journée*
**"Paródia musical no Brasil: história e guia"**
- Les guides définitifs = ~27 % des citations IA
- Y intégrer stats sourcées + citations d'experts (+37–40 % de boost mesuré)
- Seul type de contenu pouvant faire du site LA source sur le sujet (les pages chanson individuelles ne le peuvent pas)

### 12. Capitaliser sur l'actualité — *effort : éditorial continu*
Les pages chanson sont du commentaire original d'événements ("escala 6x1", PEC 221/19…) — exactement ce que Perplexity cite sur les requêtes fraîches.
- Toujours mettre le nom de l'événement dans title/H2/subtitle dès la publication du lundi

### 13. `/arquivo/` par année — *effort : moyen, priorité basse*
Déjà identifié en Phase 4. Utile mais derrière tout le reste.

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
| 1 | Bing IndexNow | ✅ FAIT |
| 2 | llms.txt + FAQPage /sobre + E-E-A-T + date visible + RSS | TODO |
| 3 | Profils Letras.mus.br + Vagalume + descriptions YouTube | TODO |
| 4 | Couverture presse → Wikipédia | Long terme |
| 5 | Page pilier "Paródia musical no Brasil" | Long terme |

---

## Monitoring mensuel

Tester 10 requêtes clés dans ChatGPT, Perplexity, Google AI Overviews :
- "música da segunda"
- "paródia musical brasil"
- "paródia sobre [notícia récente]"
- "sátira musical brasileira"

Noter : qui est cité ? quelle page ? évolution mois/mois.
