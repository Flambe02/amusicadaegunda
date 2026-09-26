# Guide d'Actualisation Automatique des Chansons pour le SEO

## 🎯 Objectif

Assurer que **chaque nouvelle chanson ajoutée dans Supabase** soit automatiquement crawlable par Google avec un stub HTML optimisé SEO.

---

## ✅ Système Automatique (Nouveau)

### Workflow Complet

Quand tu ajoutes une nouvelle chanson dans Supabase (via l'interface Admin) :

1. **La chanson apparaît immédiatement sur le site** (React frontend)
2. **Pour que Google puisse la crawler**, tu dois lancer :

```bash
npm run build
git add .
git commit -m "feat: Ajouter nouvelle chanson [nom de la chanson]"
git push origin main
```

### Processus Automatisé (dans `npm run build`)

Le build exécute automatiquement ces étapes :

#### 1. **Prebuild** (Automatique)
```bash
# S'exécute automatiquement avant le build
node scripts/export-songs-from-supabase.cjs
```
- ✅ Se connecte à Supabase
- ✅ Récupère toutes les chansons publiées
- ✅ Génère automatiquement les slugs depuis les titres (si absents dans la BDD)
- ✅ Exporte vers `content/songs.json`

#### 2. **Build** (Automatique)
```bash
vite build
```
- Compile le code React
- Génère les assets dans `dist/`

#### 3. **Postbuild** (Automatique)
```bash
node scripts/generate-stubs.cjs         # Génère stubs HTML SEO
node scripts/generate-sitemap.cjs       # Met à jour sitemaps
node scripts/copy-to-docs.cjs           # Copie vers docs/ pour GitHub Pages
```

---

## 📋 Instructions Détaillées

### Étape 1 : Ajouter une nouvelle chanson

1. Va sur `/admin`
2. Ajoute la chanson avec tous les champs :
   - Titre
   - Cover image
   - Spotify URL
   - YouTube URL
   - TikTok URL
   - Description
   - Lyrics
   - Release date
   - Status: `published`

3. **Important** : Le **slug** sera automatiquement généré depuis le titre si tu ne le remplis pas

### Étape 2 : Build et Déploiement

```bash
# 1. Lancer le build (exporte automatiquement depuis Supabase)
npm run build

# 2. Vérifier que la nouvelle chanson est dans content/songs.json
# (Optionnel - juste pour confirmer)
cat content/songs.json

# 3. Commit et push
git add .
git commit -m "feat: Ajouter chanson [Nom de la Chanson]"
git push origin main
```

### Étape 3 : Attendre le déploiement GitHub Pages

- ⏱️ **Délai** : 2-5 minutes pour que GitHub Pages déploie
- 🔍 **Vérifier** : Ouvre `https://www.amusicadasegunda.com/musica/[slug-de-la-chanson]`

### Étape 4 : Demander l'indexation Google

1. Va sur [Google Search Console](https://search.google.com/search-console)
2. Clique sur "Inspection d'URL"
3. Entre l'URL : `https://www.amusicadasegunda.com/musica/[slug]`
4. Clique sur "Demander l'indexation"

---

## 🛠️ Commandes Utiles

### Forcer un export manuel (sans build)
```bash
npm run export:songs
```
**Usage** : Si tu veux juste mettre à jour `content/songs.json` sans rebuilder

### Build complet avec export
```bash
npm run build
```
**Usage** : Export Supabase + Build + Génération stubs + Sitemaps + Copie docs/

### Tester le Rich Results de Google
```bash
# Ouvre dans ton navigateur :
https://search.google.com/test/rich-results

# Puis teste :
https://www.amusicadasegunda.com/musica/[slug-de-la-chanson]
```

---

## 🔧 Dépannage

### Problème : "Aucune chanson exportée"

**Cause** : Les variables d'environnement Supabase ne sont pas configurées

**Solution** :
```bash
# Vérifie que .env contient :
VITE_SUPABASE_URL=https://efnzmpzkzeuktqkghwfa.supabase.co
VITE_SUPABASE_ANON_KEY=[ta-clé-ici]
```

### Problème : "Slug manquant dans Supabase"

**Cause** : Les anciennes chansons n'ont pas de slug dans la BDD

**Solution** : Le script génère automatiquement les slugs depuis les titres
- Pas besoin de remplir manuellement le champ `slug` dans l'admin
- Le slug est normalisé : minuscules, sans accents, tirets au lieu d'espaces

**Exemple** :
- Titre : `"Nobel Prize"` → Slug : `"nobel-prize"`
- Titre : `"Já é Natal"` → Slug : `"ja-e-natal"`

### Problème : "Build échoue si Supabase est indisponible"

**Cause** : Connexion Supabase temporairement indisponible

**Solution** : Le script utilise automatiquement le `content/songs.json` existant
- ⚠️ Le build continuera avec les données existantes
- ✅ Relance `npm run export:songs` quand Supabase est de retour

---

## 📊 Résumé du Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Ajouter chanson dans Supabase (via /admin)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. npm run build                                            │
│    ├─ Prebuild: Export Supabase → content/songs.json       │
│    ├─ Build: Vite build → dist/                            │
│    └─ Postbuild: Stubs + Sitemaps + Copie docs/            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. git add . && git commit && git push                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GitHub Pages déploie automatiquement (2-5 min)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Chanson crawlable par Google + Rich Results             │
│    https://www.amusicadasegunda.com/musica/[slug]           │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Post-Ajout

Après avoir ajouté une nouvelle chanson et déployé :

- [ ] ✅ La chanson apparaît sur `/musica`
- [ ] ✅ L'URL `/musica/[slug]` fonctionne
- [ ] ✅ Le Rich Results Test Google détecte **MusicRecording** + **BreadcrumbList**
- [ ] ✅ Demander l'indexation dans Google Search Console
- [ ] ✅ Vérifier que le sitemap inclut la nouvelle URL :
  ```
  https://www.amusicadasegunda.com/sitemap-songs.xml
  ```

---

## 🎉 Avantages du Système Automatique

1. ✅ **Export automatique** depuis Supabase à chaque build
2. ✅ **Génération automatique des slugs** si absents
3. ✅ **Stubs HTML SEO** créés automatiquement
4. ✅ **Sitemaps** mis à jour automatiquement
5. ✅ **JSON-LD enrichi** (MusicRecording, BreadcrumbList, ListenAction)
6. ✅ **Crawlable par Google** immédiatement après déploiement

---

## 📝 Notes Importantes

- Le **slug** est crucial pour l'URL de la chanson
- Si le slug n'est pas dans Supabase, il est généré depuis le titre
- Les slugs générés sont **normalisés** (lowercase, no accents, hyphens)
- Chaque chanson génère **2 fichiers HTML** :
  - `/musica/[slug]/index.html` (avec trailing slash)
  - `/musica/[slug].html` (sans trailing slash)
- Le stub HTML contient :
  - Meta tags (title, description, OG, Twitter)
  - JSON-LD **MusicRecording** (avec genre, inLanguage, potentialAction)
  - JSON-LD **BreadcrumbList** (Início > Músicas > [Titre])
  - Redirection JavaScript vers la SPA pour les navigateurs

---

## 🔗 Ressources

- **Google Search Console** : https://search.google.com/search-console
- **Google Rich Results Test** : https://search.google.com/test/rich-results
- **Schema.org MusicRecording** : https://schema.org/MusicRecording
- **Schema.org MusicPlaylist** : https://schema.org/MusicPlaylist

---

**Dernière mise à jour** : 2026-01-09
