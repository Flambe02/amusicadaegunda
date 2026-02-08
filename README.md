# Música da Segunda

> Projet de découverte musicale hebdomadaire - Nova música toda segunda-feira

<!-- Force deploy - GitHub Pages reset -->

![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-70%25-green)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

## 🎵 À propos

Música da Segunda est une application web qui présente une nouvelle musique chaque lundi, avec intégration TikTok, calendrier musical et interface moderne.

## ✨ **Funcionalidades**

- 🎵 **Música da Semana**: Nova música toda segunda-feira
- 📱 **Integração TikTok**: Vídeos integrados diretamente
- 📅 **Calendário Musical**: Visualize todas as músicas lançadas
- 🎨 **Interface Admin**: Gerencie conteúdo facilmente
- 📱 **Design Responsivo**: Funciona em todos os dispositivos
- 🌐 **Backend Cloud**: Supabase (PostgreSQL + APIs)

## 🚀 **Tecnologias**

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS + Radix UI
- **Storage**: Supabase (PostgreSQL) — sem fallback local em produção
- **Icons**: Lucide React
- **Routing**: React Router DOM

## 📦 **Instalação**

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos
```bash
# 1. Clone o repositório
git clone [URL_DO_REPOSITORIO]
cd MusicaDa2nda

# 2. Instale as dependências
npm install

# 3. Execute o projeto
npm run dev

# 4. Acesse no navegador
# http://localhost:5173
```

## 🎯 **Como Usar**

### **Site Público**
- **Homepage**: `/` - Música atual da semana
- **Calendário**: `/Calendar` - Todas as músicas lançadas
- **Sobre**: `/Sobre` - Informações do projeto

### **Interface Admin**
- **URL**: `/Admin`
- **Funcionalidades**:
  - ✅ Criar/editar/deletar músicas
  - ✅ Gerenciar status (rascunho, agendado, publicado)
  - ✅ Adicionar links TikTok, Spotify, Apple Music, YouTube
  - ✅ Inserir letras e descrições
  - ✅ Sistema de hashtags
  - ✅ Exportar/importar dados
  - ✅ Busca e filtros

## 🗂️ **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── SongPlayer.jsx  # Player principal de música
│   ├── CountdownTimer.jsx # Contador para próxima música
│   ├── TikTokEmbed.jsx # Integração TikTok
│   └── ui/             # Componentes UI (Radix)
├── pages/              # Páginas da aplicação
│   ├── Home.jsx        # Página inicial
│   ├── Admin.jsx       # Interface administrativa
│   ├── Calendar.jsx    # Calendário musical
│   └── Sobre.jsx       # Página sobre
├── lib/                # Utilitários e configurações
│   ├── localStorage.js # Sistema de storage local
│   ├── supabase.js     # Configuration Supabase
│   └── migrationService.js # Service de migration
├── api/                # Serviços de données
│   ├── entities.js     # Entités avec fallback automatique
│   └── supabaseService.js # Service Supabase complet
└── hooks/              # Hooks personalizados
```

## 💾 **Sistema de Storage (Cloud)

### **Supabase Cloud Database (production)**
- ✅ Données synchronizadas em tempo real
- ✅ PostgreSQL gerenciado, escalável
- ✅ APIs REST/Realtime prontas
- ✅ Multi-dispositivos

### **Sem fallback local em produção**
- Em produção, todas as leituras/escritas de músicas passam pelo Supabase exclusivamente.
- Ferramentas locais (ex.: `localStorageService`) permanecem apenas para scripts de migração/desenvolvimento.

## 🎨 **Personalização**

### **Cores e Tema**
- Edite `tailwind.config.js` para personalizar cores
- Modifique `src/index.css` para estilos globais

### **Conteúdo**
- Interface admin para gerenciar músicas
- Edite dados diretamente no código se preferir
- Sistema de templates para novas músicas

## 📱 **Responsividade**

- **Mobile First** design
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Componentes adaptativos** para todos os tamanhos
- **Touch-friendly** para dispositivos móveis

## 🚀 **Deploy**

### **Build para Produção**
```bash
npm run build
```

### **Servir Build**
```bash
npm run preview
```

### **Deploy Estático**
- Netlify, Vercel, GitHub Pages
- Qualquer servidor web estático
- **Backend cloud Supabase** (optionnel)

## ☁️ **Configuration Supabase (Optionnel)**

### **1. Créer un projet Supabase**
- Allez sur [https://supabase.com](https://supabase.com)
- Créez un nouveau projet gratuit
- Choisissez la région Europe (Paris)

### **2. Configurer les variables d'environnement**
```bash
# Copiez env-example.txt vers .env
cp env-example.txt .env

# Remplissez vos vraies clés Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon-supabase
```

### **3. Créer la base de données**
- Dans l'éditeur SQL de Supabase
- Exécutez le script `database-schema.sql`
- Vos tables seront créées automatiquement

### **4. Migrer vos données**
- Allez sur `/Admin` dans votre app
- Cliquez sur "Migrar para Supabase"
- Vos données localStorage seront transférées

## 🔧 **Desenvolvimento**

### **Scripts Disponíveis**
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Verificar código
```

## 📱 **Mobile Development (Capacitor)**

### **Pré-requisitos Mobile**
- Android Studio (pour Android)
- Xcode (pour iOS - macOS uniquement)
- Node.js 18+ et npm

### **Scripts Capacitor**
```bash
# Initialisation et configuration
npm run cap:init     # Initialiser Capacitor
npm run cap:add:android  # Ajouter la plateforme Android
npm run cap:add:ios      # Ajouter la plateforme iOS

# Synchronisation et build
npm run cap:sync     # Synchroniser le code web avec les plateformes
npm run cap:copy     # Copier les assets web
npm run cap:open:android  # Ouvrir dans Android Studio
npm run cap:open:ios      # Ouvrir dans Xcode

# Génération d'icônes
npm run icons:android     # Générer les icônes Android
npm run icons:ios         # Générer les icônes iOS

# CI/CD
npm run ci:android        # Build complet pour CI (Android)
```

### **Workflow de développement mobile**
```bash
# 1. Build de l'app web
npm run build

# 2. Synchroniser avec Capacitor
npm run cap:sync

# 3. Ouvrir dans l'IDE natif
npm run cap:open:android  # ou npm run cap:open:ios
```

### **Configuration Appflow (CI/CD)**
- `capacitor.config.json` : Configuration Capacitor
- `appflow.config.json` : Configuration Ionic Appflow
- Les plateformes `android/` et `ios/` sont générées localement
- **Important** : Ne pas committer les dossiers `android/` et `ios/` (ajoutés au .gitignore)

### **Rollback Capacitor**
Si vous devez retirer Capacitor :
```bash
# Supprimer les dépendances
npm uninstall @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios cordova-res

# Supprimer les fichiers de config
rm capacitor.config.json appflow.config.json

# Supprimer les plateformes
rm -rf android/ ios/
```

### **Estrutura de Dados**
```javascript
// Exemplo de música
{
  id: 1,
  title: "Confissões Bancárias",
  artist: "A Música da Segunda",
  description: "Uma música sobre confissões bancárias",
  lyrics: "Letra da música...",
  release_date: "2025-08-25",
  status: "published", // draft, scheduled, published, archived
  tiktok_video_id: "7540762684149517590",
  tiktok_url: "https://www.tiktok.com/@...",
  spotify_url: "https://open.spotify.com/...",
  apple_music_url: "https://music.apple.com/...",
  youtube_url: "https://youtube.com/...",
  cover_image: "url_da_imagem",
  hashtags: ["humor", "musica", "trending"],
  created_at: "2025-01-27T10:00:00.000Z",
  updated_at: "2025-01-27T10:00:00.000Z"
}
```

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 **Suporte**

- **Issues**: Abra uma issue no GitHub
- **Documentação**: Consulte este README
- **Admin**: Use a interface `/Admin` para gerenciar conteúdo

## 🎉 **Status do Projeto**

- ✅ **Site público** funcionando
- ✅ **Interface admin** completa
- ✅ **Sistema de storage hybride** (local + cloud)
- ✅ **Base de données Supabase** configurée
- ✅ **Migration automatique** localStorage → Supabase
- ✅ **Sauvegarde cloud** avec fallback local
- ✅ **Integração TikTok** ativa
- ✅ **Design responsivo** implementado
- ✅ **Calendário musical** funcional
- ✅ **Synchronisation temps réel** (avec Supabase)

---

## 📋 Journal de Développement

> Historique des développements et corrections pour maintenir une mémoire exacte du projet.

### 2026-02-02 - Corrections SEO Google Search Console

#### Problèmes identifiés
1. **"Page with redirect"** (4 pages)
   - `http://amusicadasegunda.com/` → Redirection HTTP normale
   - `https://amusicadasegunda.com/` → Redirection sans-www normale
   - `http://www.amusicadasegunda.com/` → Redirection HTTP normale
   - `/chansons/debaixo-da-pia` → Ancienne URL migrée vers `/musica/`

2. **"Alternate page with proper canonical tag"** (3 pages)
   - `/?q=%7Bsearch_term_string%7D` → Template SearchAction crawlé littéralement
   - `/musica/apagao-nao-e-refrao/` → Version avec/sans trailing slash (informatif)
   - `/chansons/check-in-da-cop/` → Redirection vers `/musica/` (normal)

#### Corrections appliquées

**Fichiers modifiés :**
- `docs/_headers` et `public/_headers`
  - Ajout `X-Robots-Tag: noindex, follow` pour `/chansons/*`, `/home/*`, `/playlist/*`
  - Ajout `Link: </musica/>; rel="canonical"` pour les redirections

- `docs/robots.txt` et `public/robots.txt`
  - Ajout `Disallow: /*?q=*` pour bloquer le template SearchAction
  - Ajout `Disallow: /chansons/` pour bloquer les anciennes URLs

**Actions manuelles GSC :**
- Demande de suppression de `/?q=%7Bsearch_term_string%7D` ✅
- Demande de suppression de `/chansons/debaixo-da-pia` ✅

**Documentation :**
- Création de `CORRECTION_REDIRECTIONS_GSC.md` avec guide complet

#### Commits
```
97ee677 fix(seo): correct GSC redirect and canonical errors
f1c4dbd SEO FIX: Uniformize trailing slash in sitemaps
bff3636 perf(lcp): optimisations Core Web Vitals
b6f41e6 fix(seo): ajouter noindex aux stubs de redirection
```

---

### 2026-02-02 - Correction "Video isn't on a watch page" (tentative 1 - INCOMPLÈTE)

#### Problème identifié
Google Search Console signale 15 vidéos avec l'erreur "Video isn't on a watch page" :
- `/musica/nobel-prize` - VideoObject sur page musicale
- `/musica/o-croissant` - VideoObject + duplication avec/sans trailing slash
- Homepage `/` - Embed YouTube détecté

#### Correction partielle appliquée
- `scripts/generate-stubs.cjs` : VideoObject supprimé des stubs HTML statiques
- **ERREUR** : Le composant React `Song.jsx` continuait d'injecter VideoObject dynamiquement au runtime
- **ERREUR** : Pas de `max-video-preview:0` sur les pages `/musica/` (ni statique ni React)

---

### 2026-02-08 - Correction DÉFINITIVE "Video isn't on a watch page"

#### Problème persistant
Validation GSC échouée le 2/5/26 — 15 vidéos toujours en erreur (2 failed, 13 pending).

#### Causes racines identifiées (3 problèmes)

1. **`Song.jsx` injectait encore VideoObject JSON-LD au runtime** (lignes 222-262)
   - Le commit précédent avait seulement corrigé les stubs statiques (`generate-stubs.cjs`)
   - Mais le composant React continuait d'injecter `videoObjectJsonLd()` dynamiquement dans le DOM
   - Quand Google rend la page avec JavaScript, il voit le VideoObject → erreur

2. **Pas de `max-video-preview:0` sur les pages `/musica/`**
   - Même sans JSON-LD, Google peut auto-détecter les vidéos via les iframes YouTube
   - La directive `max-video-preview:0` dans le meta robots empêche cette détection
   - La homepage l'avait déjà, mais PAS les pages de chansons

3. **Stubs statiques sans `max-video-preview:0`**
   - Le template HTML dans `seo-templates.cjs` avait `robots: "index, follow"` sans `max-video-preview:0`
   - Avant que React s'hydrate, Google voit le stub statique → détecte l'iframe YouTube

#### Critères Google pour une "watch page"
- La vidéo doit être le contenu **principal unique** de la page
- La vidéo doit être visible dans la viewport sans scroll
- La page doit être **dédiée exclusivement** à la vidéo
- Les pages `/musica/` sont des **MusicRecording** → PAS des watch pages

#### Corrections appliquées

**Fichiers modifiés :**

| Fichier | Modification |
|---------|-------------|
| `src/pages/Song.jsx` | Suppression de l'injection `videoObjectJsonLd()` + ajout `robots: 'index, follow, max-video-preview:0'` dans useSEO |
| `src/lib/seo-jsonld.js` | Suppression de la fonction `videoObjectJsonLd()` |
| `scripts/seo-templates.cjs` | Suppression de `videoObjectJsonLd()` + ajout `max-video-preview:0` dans le meta robots du template HTML |

**Approche défensive triple :**
1. **Pas de VideoObject JSON-LD** → Google ne voit pas de données structurées vidéo
2. **`max-video-preview:0` dans meta robots** → Google ne peut pas indexer la vidéo auto-détectée depuis l'iframe
3. **Suppression dans stubs ET React** → Cohérence entre rendu statique et rendu client

#### Leçon apprise
> **IMPORTANT** : Sur un site SPA (Single Page Application) avec SSR/stubs statiques, les corrections SEO doivent être appliquées aux **DEUX** niveaux :
> 1. Les stubs HTML statiques (ce que Google voit au premier rendu)
> 2. Le code React/client (ce que Google voit après exécution JavaScript)
>
> Google exécute JavaScript ! Un correctif uniquement côté statique est insuffisant.

#### Actions GSC
- Relancer la validation dans Video indexing → "Video isn't on a watch page"
- Délai estimé : 2-4 semaines pour revalidation complète

---

### Architecture SEO actuelle

#### Structure des URLs
```
✅ Canonique : https://www.amusicadasegunda.com/musica/{slug}/
❌ Obsolète  : https://www.amusicadasegunda.com/chansons/{slug} → redirige vers /musica/
```

#### Fichiers SEO critiques
| Fichier | Rôle |
|---------|------|
| `docs/robots.txt` | Règles de crawl pour les bots |
| `docs/_headers` | Headers HTTP (Cloudflare) |
| `docs/sitemap-index.xml` | Index des sitemaps |
| `docs/sitemap-songs.xml` | URLs des chansons |
| `docs/sitemap-pages.xml` | URLs des pages statiques |
| `scripts/generate-stubs.cjs` | Génère les pages HTML statiques avec JSON-LD |
| `scripts/seo-templates.cjs` | Templates SEO (meta tags, JSON-LD) |

#### JSON-LD Schemas utilisés
- `Organization` - Identité de la marque
- `WebSite` + `SearchAction` - Recherche sur le site
- `MusicRecording` - Pages de chansons (avec `ListenAction` pour streaming)
- `MusicPlaylist` - Page /musica/
- `BreadcrumbList` - Fil d'Ariane
- ~~`VideoObject`~~ - **SUPPRIMÉ** définitivement (erreur "Video isn't on a watch page")
  - Supprimé des stubs statiques ET du composant React Song.jsx
  - Fonction supprimée de `seo-jsonld.js` et `seo-templates.cjs`

#### Directives meta robots
- **Homepage** : `index, follow, max-video-preview:0` (index.html + useSEO)
- **Pages /musica/{slug}** : `index, follow, max-video-preview:0` (stubs + useSEO)
- **Pages erreur** : `noindex, follow`
- `max-video-preview:0` empêche Google d'indexer les vidéos auto-détectées via iframe YouTube

---

### Commandes de développement SEO

```bash
# Générer les stubs HTML statiques
npm run build
node scripts/generate-stubs.cjs

# Vérifier les sitemaps
curl https://www.amusicadasegunda.com/sitemap-index.xml

# Tester les headers (via Cloudflare)
curl -I https://www.amusicadasegunda.com/chansons/debaixo-da-pia/

# Valider le JSON-LD
# → https://search.google.com/test/rich-results
```

---

## SEO

### Audit complet (2026-02-08)

**Score global : 8.7/10** — Bonne base SEO, avec corrections P0 appliquées.

#### Architecture SEO du site

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Framework | React (Vite) SPA | Rendu client-side |
| Stubs statiques | `scripts/generate-stubs.cjs` | HTML pré-rendu pour crawlers |
| Templates HTML | `scripts/seo-templates.cjs` | Génération des meta + JSON-LD |
| Meta dynamiques | `src/hooks/useSEO.js` | Met à jour title/description/canonical/robots au runtime |
| JSON-LD dynamique | `src/lib/seo-jsonld.js` | MusicRecording, BreadcrumbList, MusicPlaylist |
| Sitemaps | `scripts/generate-sitemap-unified.cjs` | sitemap-index.xml, sitemap-pages.xml, sitemap-songs.xml |
| Déploiement | `docs/` (GitHub Pages) | Fichiers statiques servis |

#### Points forts

- **Dual-layer SEO** : Stubs HTML statiques + composants React — Google voit du contenu avec ET sans JS
- **Structured data complet** : WebSite + SearchAction, Organization, MusicRecording, BreadcrumbList, MusicPlaylist
- **Pas de doublons** : Redirections /chansons/ → /musica/, /home → /, /playlist → /musica/
- **Canonicals cohérents** : Tous en `https://www.amusicadasegunda.com/` (www, https, trailing slash unifié)
- **Sitemaps automatiques** : 40 URLs (6 pages + 34 chansons), générées à chaque build
- **robots.txt propre** : Bloque /admin, /login, hash routes, anciens URLs
- **Service Worker SEO-safe** : Network-first, pas de contenu périmé pour les crawlers

#### Backlog SEO (P0 / P1 / P2)

##### P0 — Appliqué (2026-02-08)

| Fix | Problème | Fichier(s) | Rollback |
|-----|----------|------------|----------|
| H1 statique sur homepage | `<div id="root"></div>` vide — crawlers sans JS ne voyaient aucun contenu | `index.html` (racine Vite) | Supprimer le contenu dans `<div id="root">` |
| H1 + liste de liens sur /musica/ | Stub playlist sans body — aucun contenu indexable | `scripts/generate-stubs.cjs` | Retirer le paramètre `body` de `baseHtml()` pour playlist |
| Fix JSON-LD type Article vs MusicRecording | `useSEO` avec `type: 'article'` générait un `Article` JSON-LD en conflit avec `MusicRecording` | `src/pages/Song.jsx` | Changer `type: 'music.song'` → `type: 'article'` |
| VideoObject supprimé du React (commit précédent) | Song.jsx injectait VideoObject JSON-LD au runtime → erreur GSC | `src/pages/Song.jsx`, `src/lib/seo-jsonld.js` | Restaurer la fonction `videoObjectJsonLd` |
| max-video-preview:0 sur toutes les pages | Google détectait les iframes YouTube comme vidéos | `seo-templates.cjs`, `Song.jsx`, `index.html` | Retirer `max-video-preview:0` du meta robots |

##### P1 — À faire prochainement

| Item | Pourquoi | Fichier(s) |
|------|----------|------------|
| OG images spécifiques par chanson | Toutes les chansons utilisent l'icône PWA générique pour og:image → mauvais CTR sur réseaux sociaux | Uploader des `cover_image` dans Supabase, vérifier `export-songs-from-supabase.cjs` |
| Breadcrumbs en HTML statique | Les breadcrumbs n'existent qu'en JSON-LD, pas en HTML visible | `generate-stubs.cjs` — ajouter un `<nav>` avec breadcrumbs |
| Lyrics dans les stubs statiques | Les paroles ne sont pas dans le HTML pré-rendu (seulement après chargement React) | `generate-stubs.cjs` — exporter `lyrics` dans songs.json puis l'inclure dans le body |

##### P2 — Plus tard

| Item | Pourquoi |
|------|----------|
| FAQPage schema sur la homepage | Eligible pour les rich snippets FAQ dans Google |
| Bundle splitting avancé | Le bundle principal fait 634 KB (minifié), au-dessus du seuil de 500 KB |
| hreflang si traductions | Pas nécessaire tant que le site est PT-BR uniquement |
| Video sitemap | Uniquement si on veut que Google indexe les vidéos YouTube (actuellement bloqué volontairement) |

#### Règle CRITIQUE : Dual-layer

> **TOUJOURS corriger les deux couches quand on touche au SEO :**
> 1. **Stubs statiques** (`scripts/generate-stubs.cjs` + `scripts/seo-templates.cjs`)
> 2. **Composants React** (`src/pages/*.jsx` + `src/lib/seo-jsonld.js` + `src/hooks/useSEO.js`)
>
> Google exécute JavaScript ! Un fix uniquement côté statique est insuffisant.
> Le hook `useSEO` ÉCRASE les meta tags statiques lors de l'hydratation React.

#### Directives meta robots par page

| Page | Robots | Raison |
|------|--------|--------|
| Homepage `/` | `index, follow, max-video-preview:0` | Empêche indexation vidéo iframe YouTube |
| Pages `/musica/{slug}` | `index, follow, max-video-preview:0` | Idem — pas des "watch pages" |
| Playlist `/musica/` | `index, follow, max-video-preview:0` | Template global |
| Redirections (/chansons/, /home, /playlist) | `noindex, follow` | Ne pas indexer les doublons |
| Page 404 | `noindex, follow` | Ne pas indexer les erreurs |

#### JSON-LD schemas

| Schema | Page(s) | Fichier |
|--------|---------|---------|
| WebSite + SearchAction | Homepage, toutes les pages (stubs) | `seo-templates.cjs`, `index.html` |
| Organization | Homepage, toutes les pages (stubs) | `seo-templates.cjs`, `index.html` |
| MusicRecording + ListenAction | Pages `/musica/{slug}` | `seo-templates.cjs` (stubs), `seo-jsonld.js` (React) |
| BreadcrumbList | Pages `/musica/{slug}` | `seo-templates.cjs` (stubs), `seo-jsonld.js` (React) |
| MusicPlaylist | Page `/musica/` | `seo-templates.cjs` |
| ~~VideoObject~~ | **SUPPRIMÉ** | Erreur GSC "Video isn't on a watch page" |

#### Vérification (commandes locales)

```bash
# Vérifier H1 sur les 3 pages clés
grep "<h1" docs/index.html
grep "<h1" docs/musica/index.html
grep "<h1" docs/musica/groenlandia/index.html

# Vérifier aucun VideoObject dans le build
grep -r "VideoObject" docs/

# Vérifier max-video-preview sur toutes les pages
grep "max-video-preview" docs/index.html
grep "max-video-preview" docs/musica/index.html
grep "max-video-preview" docs/musica/groenlandia/index.html

# Vérifier les sitemaps
curl https://www.amusicadasegunda.com/sitemap-index.xml

# Valider le JSON-LD
# → https://search.google.com/test/rich-results
# → https://validator.schema.org/
```

#### Vérification Google Search Console

1. **Indexation** : Coverage → vérifier que toutes les 40 URLs sont indexées
2. **Vidéo** : Video indexing → "Video isn't on a watch page" → relancer validation
3. **Rich results** : Enhancements → vérifier MusicRecording, BreadcrumbList
4. **Sitemaps** : Sitemaps → vérifier que sitemap-index.xml est soumis et sans erreurs
5. **Core Web Vitals** : Experience → vérifier LCP, CLS, INP

#### Routine SEO (hebdomadaire/mensuelle)

**Chaque semaine :**
- Vérifier GSC Coverage pour nouvelles erreurs
- Vérifier que les nouvelles chansons apparaissent dans le sitemap après build

**Chaque mois :**
- Vérifier les performances (Core Web Vitals) dans GSC
- Vérifier les rich results (MusicRecording) dans GSC
- Rechercher "A Música da Segunda" dans Google pour vérifier le positionnement
- Vérifier le rapport "Links" dans GSC pour les backlinks

---

**🎵 Música da Segunda - Descubra música nova toda segunda-feira! 🎵**