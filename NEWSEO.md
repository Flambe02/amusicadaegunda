# SEO Plan — A Música da Segunda
*Version 2 — corrigée et re-priorisée — 2026-03-15*

---

## Diagnostic central

**Le site envoie un signal "catalogue musical", pas "satire éditoriale sur l'actualité".**

Google reçoit aujourd'hui : un titre opaque (`Itau`), le mot `Letra`, des paroles brutes, un embed YouTube. Il n'a aucun moyen de comprendre que chaque chanson commente un événement d'actualité précis. L'autorité thématique est quasi nulle hors requêtes exact-match sur le titre des chansons.

Le problème n'est pas dans les métadonnées. Il est dans l'architecture éditoriale.

---

## Inventaire technique actuel

| Métrique | État |
|----------|------|
| Pages de chansons | ~39 |
| Pages statiques | 7 |
| Langue | pt-BR |
| JSON-LD actifs | MusicRecording, MusicPlaylist, Organization, BreadcrumbList |
| Stubs HTML statiques | Oui (double couche React + stubs) |
| Alt text images décoratives | Correct (`alt="" aria-hidden="true"`) |
| Alt text images utiles | Partiel — `alt={song.title}` (titre brut opaque) |
| Stub `/sobre/` | H1 + description + lien retour uniquement |
| Contexte éditorial on-page | **Absent** |
| Pages de catégories | **Absentes** |
| Liens croisés entre chansons | **Absents** |

---

## Priorités — vue d'ensemble

```
P0 — Contenu éditorial visible par page (le levier n°1)
P0 — Titre créatif + angle éditorial séparés (H1 + sous-titre)
P1 — Pages de catégories + maillage interne
P1 — Stubs HTML enrichis
P2 — JSON-LD enrichi (about, dateModified, description complète)
P2 — Alt text utile sur les images non décoratives
P3 — Open Graph article:section + published_time
```

---

## STEP 1 — Contexte éditorial visible on-page (P0)

C'est le levier numéro un. Sans texte crawlable qui relie la chanson à l'événement d'actualité, aucune autre optimisation ne compensera.

### Structure cible par page de chanson

```
H1 : [Titre créatif de la chanson]  ← ne pas toucher
     [Sous-titre éditorial]         ← ajouter (balise <p class="song-subtitle">)

[Bloc contexte — 80 à 150 mots — VISIBLE, pas seulement en meta]
"Em setembro de 2025, o Itaú Unibanco anunciou demissões em massa
de funcionários do CEIC e do Centro Tecnológico, alegando baixa
produtividade no regime de home office. A decisão gerou revolta nas
redes sociais e reacendeu o debate sobre trabalho remoto no Brasil.
A Música da Segunda transformou essa polêmica em paródia."

H2 : A Letra
[paroles complètes]

H2 : Assista
[embed YouTube]

H2 : A Notícia por Trás da Música
[Explication éditoriale — 100 à 200 mots]
[3 à 5 liens internes vers chansons du même thème]
```

### Règle E-E-A-T — exactitude factuelle obligatoire

Le sous-titre éditorial et le bloc contexte doivent être **factuellement exacts**.
Un H1 du type "X quitte Y" ou "Nobel da Paz para Z" engage la crédibilité du site.
Toujours vérifier la formulation avant publication. En cas de doute, formuler en
mode satirique assumé ("A Semana em que X…") plutôt qu'affirmatif.

### Implémentation technique

1. Ajouter un champ `context` (text) dans la table `songs` Supabase
2. Ajouter un champ `subtitle` (varchar 120) dans la table `songs`
3. Rendre `subtitle` sous le H1 dans `Song.jsx` (balise `<p>`)
4. Rendre `context` dans un bloc visible avant les paroles dans `Song.jsx`
5. Inclure ces deux champs dans les stubs HTML via `generate-stubs.cjs`
6. Rédiger le contenu pour les 10 chansons les plus récentes en priorité

---

## STEP 2 — Titres : garder la voix, ajouter l'angle (P0)

### Principe

Le titre créatif est la marque du site. Ne pas le remplacer.
L'angle éditorial s'ajoute comme sous-titre ou dans le bloc contexte.

```
H1 : Itaú
<p class="song-subtitle">Demissões por home office — Paródia Musical</p>

H1 : Bonner Sai
<p class="song-subtitle">A saída de William Bonner do Jornal Nacional — Paródia Musical</p>

H1 : Groenlandia
<p class="song-subtitle">Trump quer comprar a Groenlândia — Paródia Musical</p>
```

Ce pattern :
- Préserve le ton et la marque du site
- Donne à Google le contexte thématique via le sous-titre
- Réduit le risque E-E-A-T (le titre créatif n'est pas une affirmation factuelle)
- Permet d'optimiser le `<title>` HTML séparément : `Itaú — Paródia sobre Demissões por Home Office | A Música da Segunda`

### Tableau des sous-titres proposés (39 chansons)

| Slug | Sous-titre éditorial |
|------|---------------------|
| `2025-retro` | O ano de 2025 em paródia musical |
| `50-por-cento` | A reforma tributária em paródia musical |
| `apagao-nao-e-refrao` | O apagão elétrico no Brasil em paródia |
| `as-festas-juninas` | A cultura das festas juninas em sátira musical |
| `banco-master` | A liquidação extrajudicial do Banco Master em paródia |
| `biografia-de-uma-tornozeleira` | Prisão domiciliar de político em paródia musical |
| `bonner-sai` | A saída de William Bonner do Jornal Nacional em paródia |
| `brasil-nos-jogos` | O Brasil nas Olimpíadas em sátira musical |
| `cafe-tarifa-caos` | A crise econômica do café e das tarifas em paródia |
| `carnaval-26` | O Carnaval 2026 e a hipocrisia política em sátira |
| `check-in-da-cop` | A Cúpula do Clima e as promessas vazias em paródia |
| `confissoes-bancarias` | Os escândalos do sistema bancário em paródia musical |
| `debaixo-da-pia` | Os escândalos políticos brasileiros em paródia |
| `enel-nao-e-humano-e-jesus-cristo` | A crise elétrica da ENEL em São Paulo em paródia |
| `escada-travada` | A burocracia e a infraestrutura brasileira em sátira |
| `esse-lugar-chama-ormuz` | A crise no Estreito de Ormuz em paródia musical |
| `gin-de-caminhao` | Consumo e cultura popular brasileira em sátira musical |
| `groenlandia` | Trump quer comprar a Groenlândia — paródia musical |
| `itau` | Demissões por home office no Itaú — paródia musical |
| `ja-e-natal` | O consumo exacerbado de fim de ano em sátira musical |
| `maduro` | A crise política na Venezuela em paródia musical |
| `nobel-prize` | O Nobel da Paz 2025 e a oposição venezuelana em paródia |
| `o-cara-do-golpe` | A tentativa de golpe no Brasil em paródia musical |
| `o-casal-da-traicao-no-show-de-coldplay` | A traição viral no show do Coldplay em paródia |
| `o-croissant` | A polêmica do croissant e a desigualdade no Brasil em sátira |
| `o-nome-dele-e-pedro` | Política e identidade no Brasil em sátira musical |
| `os-3-porquinhos` | Os três pilares do poder político em paródia musical |
| `papudinha` | Um escândalo político brasileiro em paródia musical |
| `pcc-posto-coxinha-e-conveniencia` | O crime organizado e o Estado brasileiro em paródia |
| `prisao-domiciliar` | A prisão domiciliar de figuras políticas em paródia |
| `rio-continua-lindo-so-que-nao` | Violência e infraestrutura no Rio de Janeiro em sátira |
| `ronaldo-na-sapucai` | Ronaldo no Carnaval da Sapucaí — paródia musical |
| `sinfonia-do-vorcaro` | O escândalo Vorcarô em paródia musical |
| `sorteio-da-copa` | O sorteio da Copa do Mundo em paródia musical |
| `ta-na-hora-do-acordo-chegar` | O acordo econômico e a espera sem fim em paródia |
| `uber` | A Operação Rota Falsa e o Uber no Rio em paródia |
| `voler-la-couronne` | Geopolítica e poder internacional em paródia musical |
| `vr-a-carta-gira` | O escândalo VR e a carta cifrada em paródia |
| `william-oh-william` | O jornalismo brasileiro em sátira musical |

---

## STEP 3 — Pages de catégories + maillage interne (P1)

L'architecture en clusters est le deuxième levier. Elle transforme 39 pages isolées
en réseau éditorial thématique que Google peut parcourir et comprendre.

### Hiérarchie cible

```
Homepage
    ↓
/musica/ (archive)    +    /categoria/{topic}/ (7 piliers)
                                   ↓
                      /musica/{slug}/ (pages chansons)
                           ↑↓ (liens croisés)
```

### 7 pages de catégories à créer

| Catégorie | URL | Chansons incluses |
|-----------|-----|-------------------|
| Política Brasileira | `/categoria/politica/` | o-cara-do-golpe, prisao-domiciliar, debaixo-da-pia, carnaval-26, sinfonia-do-vorcaro, vr-a-carta-gira, papudinha, o-nome-dele-e-pedro, os-3-porquinhos, biografia-de-uma-tornozeleira |
| Economia e Finanças | `/categoria/economia/` | itau, banco-master, confissoes-bancarias, 50-por-cento, cafe-tarifa-caos, ta-na-hora-do-acordo-chegar |
| Infraestrutura e Crises | `/categoria/infraestrutura/` | enel-nao-e-humano-e-jesus-cristo, apagao-nao-e-refrao, rio-continua-lindo-so-que-nao, escada-travada |
| Política Internacional | `/categoria/internacional/` | groenlandia, nobel-prize, maduro, voler-la-couronne, check-in-da-cop, esse-lugar-chama-ormuz |
| Cultura e Sociedade | `/categoria/cultura/` | o-casal-da-traicao-no-show-de-coldplay, ronaldo-na-sapucai, as-festas-juninas, gin-de-caminhao, o-croissant, ja-e-natal |
| Esportes | `/categoria/esportes/` | brasil-nos-jogos, sorteio-da-copa |
| Corporações e Tecnologia | `/categoria/corporacoes/` | itau, uber, banco-master, pcc-posto-coxinha-e-conveniencia |

### Structure de chaque page de catégorie

```
<title> : Paródias sobre [Categoria] — A Música da Segunda
H1 : Músicas sobre [Categoria]
[Introduction éditoriale — 150 à 250 mots, crawlable]
H2 : Todas as músicas desta categoria
[Liste des chansons : titre créatif + sous-titre éditorial + lien]
H2 : Categorias relacionadas
[Liens vers 2–3 autres catégories]
```

### Règles de liens internes

**Chaque page de chanson doit lier vers :**
- Sa catégorie principale ("Ver todas as músicas sobre [tema] →")
- 3 à 5 chansons du même cluster ("Outras músicas sobre o mesmo tema")

**Chaque page de catégorie doit lier vers :**
- Toutes les chansons du cluster (titre + sous-titre)
- 2–3 catégories connexes

**La homepage doit lier vers :**
- Les 7 pages de catégories (section dédiée, visible)
- Les 5 chansons les plus récentes

### Clusters de liens croisés prioritaires

**Cluster énergie/infrastructure :**
`enel` ↔ `apagao-nao-e-refrao` ↔ `rio-continua-lindo-so-que-nao` ↔ `escada-travada`

**Cluster bancaire :**
`itau` ↔ `banco-master` ↔ `confissoes-bancarias`

**Cluster politique :**
`o-cara-do-golpe` ↔ `prisao-domiciliar` ↔ `debaixo-da-pia` ↔ `sinfonia-do-vorcaro` ↔ `vr-a-carta-gira`

**Cluster international :**
`groenlandia` ↔ `esse-lugar-chama-ormuz` ↔ `maduro` ↔ `nobel-prize`

### Implémentation technique

1. Ajouter un champ `categories` (array ou table de liaison) dans Supabase
2. Créer `src/pages/Categoria.jsx`
3. Créer les stubs HTML des catégories dans `generate-stubs.cjs`
4. Ajouter les URLs dans `sitemap-pages.xml`
5. Ajouter la section catégories dans `Home.jsx`

---

## STEP 4 — Stubs HTML enrichis (P1)

### Problème actuel

Le stub `/sobre/` ne contient que : `H1 + description + lien retour`.
Le composant React `Sobre.jsx` est riche mais invisible sans JavaScript.
Les bots qui n'exécutent pas JS ne voient rien d'utile.

### Fix `/sobre/`

Ajouter dans `generate-stubs.cjs` un bloc `body` statique pour `/sobre/` :

```html
<h1>A Música da Segunda</h1>
<p>Paródia e sátira musical das notícias do Brasil, publicada toda segunda-feira.</p>
<p>Cada semana, um acontecimento do noticiário brasileiro vira música de humor...</p>
[200+ mots de contenu éditorial statique]
<h2>Por que paródia?</h2>
[...]
<h2>Como funciona?</h2>
[...]
```

### Fix stubs chansons

Chaque stub de chanson doit inclure dans le `body` :
- Le sous-titre éditorial (champ `subtitle`)
- Le bloc contexte (champ `context`)
- Les paroles complètes (champ `lyrics`)
- Les liens croisés vers 3 chansons du même cluster

Ces éléments sont déjà dans Supabase ou à ajouter.
Ils doivent être passés depuis `songs.json` vers `generate-stubs.cjs`.

---

## STEP 5 — JSON-LD enrichi (P2)

### Ajouts dans `musicRecordingJsonLd()`

```json
{
  "@type": "MusicRecording",
  "name": "Itaú",
  "description": "[description complète, sans troncature à 155 chars]",
  "dateModified": "2025-09-15",
  "keywords": ["itaú", "demissão", "home office", "banco", "paródia", "brasil 2025"],
  "about": {
    "@type": "Event",
    "name": "Demissões Itaú por home office",
    "description": "Demissões em massa no Itaú Unibanco por baixa produtividade no regime de home office, setembro 2025"
  }
}
```

### Séparation description meta / JSON-LD

Actuellement, la `description` est tronquée à 155 chars et ce même texte
sert dans le JSON-LD.

**Fix dans `seo-templates.cjs` et `generate-stubs.cjs` :**
- `metaDescription` (≤ 155 chars) → `<meta name="description">`
- `fullDescription` (texte complet) → champ `description` dans JSON-LD

### Fichiers à modifier

- `src/lib/seo-jsonld.js` — ajouter `about`, `keywords`, `dateModified`
- `scripts/seo-templates.cjs` — même ajout, + séparation meta/full description
- `scripts/generate-stubs.cjs` — passer `about`, `keywords`, `subtitle`, `context` depuis `songs.json`

---

## STEP 6 — Alt text utile sur les images non décoratives (P2)

### État réel (après vérification du code)

| Image | État actuel | Verdict |
|-------|-------------|---------|
| Backgrounds floutés (`aria-hidden="true"`) | `alt=""` | **Correct** — images décoratives |
| Artwork principal (`Song.jsx:313`) | `alt={song.title}` | **Insuffisant** — titre brut opaque |
| Logo `Home.jsx:594` | `alt="Logo A Musica da Segunda - Parodias Musicais do Brasil"` | **Correct** |
| Capivara `Home.jsx:969` | `alt="Capivara A Música da Segunda"` | Acceptable |
| Thumbnails liste chansons (`Home.jsx:807,852`) | `alt=""` | **À corriger** — images utiles |

### Corrections ciblées

```jsx
// Song.jsx:313 — artwork principal
alt={`Capa da paródia "${song.title}" — ${song.subtitle || 'A Música da Segunda'}`}

// Home.jsx — thumbnails liste chansons
alt={`Capa de "${song.title}"`}
```

Ne pas toucher aux backgrounds floutés — `alt=""` + `aria-hidden="true"` est la bonne pratique.

---

## STEP 7 — Titres `<title>` HTML et meta description (P2)

### Pattern cible pour les pages de chansons

```
<title> : {Titre créatif} — {Sous-titre éditorial court} | A Música da Segunda
<meta description> : {Bloc contexte tronqué à 155 chars}
```

**Exemples :**

| Page | `<title>` actuel (approx.) | `<title>` proposé |
|------|---------------------------|-------------------|
| `/musica/itau/` | Itaú — A Música da Segunda | Itaú — Paródia sobre Demissões por Home Office \| A Música da Segunda |
| `/musica/bonner-sai/` | Bonner Sai — A Música da Segunda | Bonner Sai — A Saída do Jornal Nacional em Paródia \| A Música da Segunda |
| `/musica/groenlandia/` | Groenlandia — A Música da Segunda | Groenlandia — Trump Quer Comprar a Groenlândia em Paródia \| A Música da Segunda |

### Page d'accueil

```
<title> actuel : A Música da Segunda
<title> proposé : A Música da Segunda — Paródia e Sátira Musical das Notícias do Brasil
```

---

## STEP 8 — Open Graph (P3)

Ajouts secondaires, à faire après les étapes P0–P2 :

```html
<meta property="article:published_time" content="{song.created_at}" />
<meta property="article:section" content="{song.category}" />
<meta property="og:type" content="article" />
```

Ces balises renforcent le signal "contenu éditorial" vs "appli musicale"
dans les aperçus de partage et dans les signaux Google Discover.

---

## Keywords par page (référence)

### Homepage
- sátira musical notícias brasil
- paródia política semanal
- humor musical brasileiro
- música cômica sobre atualidades
- nova música da segunda
- paródia sobre notícias brasil

### `/musica/itau/`
- itaú demissão home office
- demissão banco itaú 2025
- paródia itaú banco
- sátira demissão corporativa brasil
- banco itaú corte funcionários home office

### `/musica/bonner-sai/`
- william bonner jornal nacional saída
- bonner despedida globo
- saída william bonner tv
- sátira jornalismo brasil
- paródia jornal nacional

### `/musica/enel-nao-e-humano-e-jesus-cristo/`
- crise elétrica são paulo 2026
- enel apagão são paulo
- enel falta de luz sp
- paródia enel distribuidora
- sátira crise energética brasil

### `/musica/groenlandia/`
- trump groenlândia comprar
- trump invasão groenlândia dinamarca
- paródia trump geopolítica
- sátira política internacional brasil

### `/musica/o-cara-do-golpe/`
- golpe frustrado brasil
- tentativa golpe 8 janeiro
- paródia golpe brasil
- sátira política brasileira 2025

---

## Roadmap d'exécution

### Phase 1 — Fondations éditoriales ✅ TERMINÉE (2026-03-15)

- [x] Ajouter champ `subtitle` dans Supabase + 39 lignes remplies via SQL
- [x] Rendre `subtitle` sous H1 dans `Song.jsx` (mobile + desktop)
- [x] `description` Supabase = contexte éditorial visible dans React + stubs statiques (pas de champ `context` séparé nécessaire)
- [x] Enrichir stub `/sobre/` — 267 mots, 4 sections H2 ✅
- [x] Corriger `alt` des thumbnails liste sur `Home.jsx`
- [x] Corriger `alt` de l'artwork principal dans `Song.jsx` — pattern `Capa de "${title}" — ${subtitle}`
- [x] Mettre à jour le `<title>` de la homepage — "A Música da Segunda — Paródia e Sátira Musical das Notícias do Brasil" (2026-03-16)
- [x] Séparer `metaDescription` (155 chars) / `fullDescription` (complet dans JSON-LD)

### Phase 2 — Architecture thématique ✅ TERMINÉE (2026-03-15)

- [x] Créer 10 pages de catégories (`Categoria.jsx` + stubs HTML + sitemap)
- [x] Implémenter les liens croisés dans les pages de chansons (mobile + desktop)
- [x] Badge catégorie cliquable sur chaque page chanson → /categoria/
- [x] Section "Explorar por tema" dans `Home.jsx` (desktop)
- [x] Filtres catégorie dans la page Pesquisar
- [x] Catégories dans le sitemap (priority gradient 0.6–0.75)
- [x] Enrichir stubs chansons — subtitle + description complète + liens croisés
- [x] Taxonomie corrigée en Supabase : 39 chansons, 10 catégories cohérentes
- [x] Mettre à jour les `<title>` des 39 pages — format `{titre} — {subtitle} | A Música da Segunda`

### Phase 3 — Enrichissement technique ✅ TERMINÉE (2026-03-15–16)

- [x] Séparer `metaDescription` / `fullDescription` dans `seo-templates.cjs`
- [x] Ajouter `keywords` dans `musicRecordingJsonLd()` (dérivés titre + subtitle + catégorie)
- [x] `musicRecordingJsonLd()` et `seo-jsonld.js` acceptent `about` (prêt, non peuplé)
- [x] Ajouter Open Graph `article:published_time` + `article:section`
- [x] Réviser priorités sitemap — gradient par âge (0.9 / 0.8 / 0.7)
- [x] WebSite + Organization JSON-LD enrichis (description, inLanguage, @id, knowsAbout)
- [x] Homepage static content enrichi dynamiquement (8 songs récentes + 10 catégories)

### Phase 4 — Croissance (mois 4–12)

- [ ] Maintenir la cadence hebdomadaire (52+ chansons/an)
- [ ] Créer une section `/arquivo/` (chansons groupées par année et thème)
- [ ] Cibler les événements saisonniers à fort volume : eleições, copa, carnaval, olimpíadas
- [ ] Publier systématiquement avec `subtitle` + `description` dès la première chanson
- [ ] JSON-LD `about` → peuplement via champ Supabase si besoin (infra prête)

### Phase 4 — Croissance (mois 4–12)

- [ ] Maintenir la cadence hebdomadaire (52+ chansons/an)
- [ ] Créer une section `/arquivo/` (chansons groupées par année et thème)
- [ ] Cibler les événements saisonniers à fort volume : eleições, copa, carnaval, olimpíadas
- [ ] Publier systématiquement avec `subtitle` + `context` dès la première chanson

### Scénario de croissance estimé

| Phase | Horizon | Impressions/mois | Clics/mois |
|-------|---------|------------------|------------|
| Baseline | Maintenant | ~500–2 000 | ~50–200 |
| Après Phase 1 | Mois 1–2 | ~3 000–8 000 | ~200–600 |
| Après Phase 2 | Mois 3–4 | ~10 000–25 000 | ~700–2 000 |
| Après Phase 3–4 | Mois 6–12 | ~40 000–100 000 | ~3 000–10 000 |

---

## Tableau de priorités global

| Priorité | Action | Impact | Effort |
|----------|--------|--------|--------|
| **P0** | Champs `subtitle` + `context` Supabase + rendu React | Très élevé | Moyen |
| **P0** | Rédiger le contenu éditorial pour les 39 pages | Très élevé | Élevé |
| **P0** | Enrichir stubs chansons (subtitle + context + liens) | Très élevé | Moyen |
| **P0** | Enrichir stub `/sobre/` (200+ mots statiques) | Moyen | Faible |
| **P1** | Créer 7 pages catégories (React + stubs + sitemap) | Très élevé | Élevé |
| **P1** | Liens croisés entre chansons du même cluster | Élevé | Moyen |
| **P1** | Mettre à jour les `<title>` (39 pages + homepage) | Élevé | Faible |
| **P2** | Corriger alt text thumbnails + artwork principal | Moyen | Faible |
| **P2** | Séparer metaDescription / fullDescription | Moyen | Faible |
| **P2** | JSON-LD : `about` + `keywords` + `dateModified` | Moyen | Faible |
| **P3** | Open Graph article:section + published_time | Faible | Faible |
| **P3** | Réviser priorités sitemap (gradient par âge) | Faible | Faible |

---

*La croissance organique viendra du trio : contenu éditorial visible + architecture en clusters + maillage interne. Les métadonnées amplifient ce signal — elles ne le créent pas.*
