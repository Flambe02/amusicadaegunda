# A Música da Segunda — Vue d’ensemble produit et technique

> Document de référence destiné aux équipes IT, produit, design, QA et exploitation.  
> Audit du dépôt réalisé le 11 juillet 2026. Version applicative déclarée : `2.0.12`.

## 1. Objet et périmètre du document

Ce document décrit l’état réellement observable du produit **A Música da Segunda** dans le dépôt : objectif, architecture, technologies, services externes, modèle de données, fonctionnalités, différences entre supports, chaîne de livraison, sécurité, tests, limites et priorités d’évolution.

L’audit est fondé sur le code source et les configurations locales. Il ne constitue pas un audit dynamique de la production, des consoles Supabase/GitHub/Google Play/Apple, des coûts, des données réelles ni des secrets déployés. Toute information nécessitant ces consoles est signalée comme « à vérifier ».

### Statuts utilisés

- **Actif** : implémentation reliée au flux applicatif courant.
- **Partiel** : implémentation présente mais dépendante d’une configuration, incomplète ou peu testée.
- **Historique** : artefact encore versionné, mais distinct de la chaîne actuelle.
- **À vérifier** : impossible à certifier à partir du dépôt seul.

## 2. Résumé exécutif

**A Música da Segunda** est une plateforme éditoriale et de divertissement musical en portugais brésilien. Elle publie une nouvelle chanson/parodie chaque lundi, organise un catalogue consultable, distribue les contenus vers des plateformes externes et propose des expériences interactives : roue aléatoire, paroles, karaoké synchronisé et mode fête piloté par téléphones autour d’un écran TV.

Le produit partage un socle React unique entre quatre surfaces principales :

| Surface | Implémentation | Statut |
|---|---|---|
| Web desktop/mobile | SPA React responsive, hébergée statiquement | Actif |
| PWA | Manifest, service worker, installation, offline, Web Push | Actif, push dépendant de la configuration |
| App mobile Android/iOS | WebView native Capacitor 8, deep links et assets natifs | Android actif ; iOS présent, publication à vérifier |
| Android TV / Google TV | Même binaire Capacitor Android, interface « 10-foot » dédiée et navigation D-pad | Actif dans le code ; validation Play Console à vérifier |

Le backend principal est **Supabase** : PostgreSQL, Auth, API REST, RLS, Realtime et Edge Functions. Le front est déployé sur **GitHub Pages** via GitHub Actions. Les médias restent majoritairement hébergés ou diffusés par des plateformes tierces (YouTube, Spotify, Apple Music, TikTok, Instagram), tandis que les métadonnées éditoriales résident dans Supabase et dans un export statique de secours.

### Diagnostic global

Le produit dispose d’un périmètre fonctionnel avancé et d’une bonne base SEO/PWA/TV, mais sa maintenabilité est freinée par :

- de gros composants monolithiques (`Home`, `Song`, `Admin`, `KaraokePlayer`, `KaraokeSyncTool`) ;
- une coexistence d’artefacts Android Capacitor et TWA qui crée un risque de confusion ;
- un schéma de données documenté de façon fragmentée entre scripts initiaux, migrations et code ;
- des politiques de sécurité historiques contradictoires avec les migrations plus récentes ;
- une observabilité applicative encore minimale ;
- une couverture de tests faible au regard du nombre de parcours et de plateformes ;
- plusieurs systèmes de repli et fichiers générés qui exigent une discipline stricte de build.

## 3. Objectif du projet

### 3.1 Proposition de valeur

Le produit vise à créer un rendez-vous musical hebdomadaire : une chanson originale ou parodique liée à l’actualité, accessible sur le site et relayée sur les plateformes sociales et musicales. Il combine :

- publication éditoriale régulière ;
- découverte et consultation d’un catalogue historique ;
- lecture vidéo/audio via les plateformes de diffusion ;
- accès aux paroles, métadonnées et contexte ;
- participation ludique sur mobile et TV ;
- acquisition organique via SEO, contenus structurés et partage social.

### 3.2 Utilisateurs cibles

- visiteurs web découvrant la chanson de la semaine ;
- auditeurs récurrents consultant le catalogue ;
- utilisateurs installant la PWA ou l’application ;
- groupes, familles ou soirées utilisant le karaoké et le mode Festa ;
- administrateurs éditoriaux publiant et synchronisant les chansons ;
- moteurs de recherche et assistants IA consommant les pages statiques, JSON-LD, sitemaps et contenu dédié.

### 3.3 Indicateurs produit recommandés

Le dépôt ne définit pas de référentiel KPI. Pour piloter l’évolution, suivre au minimum : visiteurs actifs, rétention hebdomadaire, lecture vidéo démarrée/terminée, clics vers plateformes, recherches, installation PWA/app, opt-in push, ouverture des notifications, utilisation karaoké, sessions Festa créées/rejointes, profondeur du catalogue consulté et Core Web Vitals.

## 4. Architecture générale

```text
Utilisateurs Web / PWA / iOS / Android / Android TV
                         │
                         ▼
             Application React 18 + Vite 6
        ┌────────────────┼─────────────────┐
        │                │                 │
 UI responsive     UI TV dédiée      Service worker
 React Router      D-pad/10-foot      cache/offline/push
        │                │                 │
        └────────────────┼─────────────────┘
                         ▼
                Client Supabase JS
        ┌────────────────┼──────────────────┐
        │                │                  │
 PostgreSQL + RLS   Auth administrateur   Realtime/Edge Functions
 chansons/festa    sessions/recovery      push/sous-titres
        │
        ├── export build-time → content/songs.json
        └── génération SEO → stubs HTML, JSON-LD, sitemaps

Médias externes : YouTube / YouTube Music / Spotify / Apple Music /
                  TikTok / Instagram

Livraison web : GitHub Actions → GitHub Pages → domaine personnalisé
Livraison native : Vite build → Capacitor sync → Android Studio / Xcode
```

### 4.1 Principes structurants

- **Socle UI partagé** : une seule application React alimente web, PWA et WebViews natives.
- **Bascule TV précoce** : `App.jsx` détecte la TV et monte un bundle TV isolé, sans shell web/mobile.
- **SPA avec routes propres** : `BrowserRouter` et génération de stubs HTML pour rendre les routes compatibles avec l’hébergement statique et le SEO.
- **Backend-as-a-Service** : le navigateur communique directement avec Supabase au moyen de la clé anonyme ; la sécurité doit donc être garantie par RLS et RPC.
- **Contenu dynamique + secours statique** : Supabase est la source opérationnelle ; `content/songs.json`, généré au build, permet une lecture dégradée si Supabase échoue.
- **Médias délégués** : les lecteurs intègrent ou redirigent vers les plateformes, ce qui limite l’hébergement média interne mais introduit une dépendance externe.

## 5. Technologies et bibliothèques

### 5.1 Frontend

| Domaine | Technologie | Usage |
|---|---|---|
| Framework | React 18 | Composants et état UI |
| Bundler | Vite 6 | Développement, build et découpage des bundles |
| Routage | React Router DOM 7 | Routes publiques, admin, redirections legacy et deep links |
| Styles | Tailwind CSS 3, CSS dédié | Design responsive, accessibilité, UI TV |
| Composants | Radix UI, composants de type shadcn/ui | Dialogues, drawers, formulaires, menus, navigation |
| Animation | Framer Motion | Transitions et interactions |
| Icônes | Lucide React | Iconographie |
| Validation | Zod, React Hook Form | Formulaires et validation |
| SEO dynamique | React Helmet Async | Titres, métadonnées et balises sociales |
| Graphiques | Recharts | Dashboard de performance |
| Navigation TV | Norigin Spatial Navigation | Focus D-pad et navigation spatiale |
| Mesure web | `web-vitals` | Collecte Core Web Vitals côté navigateur |

### 5.2 Mobile et TV

- Capacitor 8 (`core`, `android`, `ios`, `app`, `splash-screen`) ;
- projets natifs Gradle/Android Studio et Xcode/Swift Package Manager ;
- Android App Links et deep links internes ;
- receiver Android pour widget « dernière chanson » ;
- launcher Leanback et bannière TV dans le manifeste Android ;
- ancienne Trusted Web Activity Bubblewrap conservée sous `app/`.

### 5.3 Backend et données

- Supabase JavaScript 2.x ;
- PostgreSQL géré ;
- Supabase Auth pour l’administration ;
- Row Level Security ;
- Supabase Realtime pour le mode Festa ;
- Edge Functions Deno pour le push et la génération de sous-titres ;
- Web Push avec VAPID ;
- API push Vercel historique/alternative sous `push-api/`.

### 5.4 Qualité et outillage

- ESLint 9 ;
- Vitest 4, Testing Library et jsdom ;
- Playwright pour les tests E2E Chromium ;
- Husky et lint-staged ;
- Sharp pour génération/optimisation d’images ;
- scripts Node pour export de contenu, SEO, icons et vérifications production.

## 6. Systèmes et services utilisés

### 6.1 Supabase

Supabase est le système central :

- stockage des chansons et métadonnées ;
- authentification des administrateurs et récupération de mot de passe ;
- autorisation par RLS ;
- file temps réel du mode Festa ;
- abonnements Web Push ;
- fonctions serveur pour push et génération de sous-titres ;
- API REST consommée directement par le frontend.

Variables frontend attendues : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et, selon la migration de la base, `VITE_SUPABASE_HAS_SLUG`. Les valeurs ne doivent jamais être documentées ni commitées. Une clé anonyme Supabase est publique par nature ; elle ne remplace pas des politiques RLS correctes.

### 6.2 GitHub Pages et GitHub Actions

Le workflow `main.yml` déploie automatiquement `main` : installation Node 20, création du `.env` à partir des secrets GitHub, build, copie vers `docs/`, upload Pages et déploiement. Le domaine public référencé par l’application est `www.amusicadasegunda.com`.

Le workflow `tests.yml` exécute Vitest et Playwright sur les pushes/PR. Il utilise Node 22, alors que la livraison utilise Node 20 ; harmoniser les versions réduirait les écarts de comportement.

### 6.3 Plateformes média et sociales

Le modèle de chanson prévoit des liens ou embeds YouTube/YouTube Music, Spotify, Apple Music, TikTok et Instagram. Point critique : dans l’état actuel du code, les noms de colonnes YouTube sont historiquement trompeurs :

- `youtube_music_url` désigne la vidéo/Short utilisée pour image et lecture vidéo ;
- `youtube_url` désigne la source musicale utilisée notamment pour le karaoké.

Cette dette doit être résolue par une migration explicite ou encapsulée dans un modèle de domaine pour éviter les erreurs futures.

### 6.4 Notifications push

La PWA enregistre des abonnements Web Push et le service worker affiche les notifications. La configuration s’appuie sur `VITE_VAPID_PUBLIC_KEY`, `VITE_VAPID_KEY_VERSION` et potentiellement `VITE_PUSH_API_BASE`. Deux implémentations serveur coexistent :

- Edge Function Supabase `supabase/functions/push` ;
- API Vercel historique/alternative `push-api/`, plus un utilitaire `push-sender/`.

La source officielle à conserver doit être décidée et l’autre retirée ou clairement marquée obsolète.

### 6.5 Mesure et indexation

- Google Analytics est appelé via `window.gtag` pour les changements de route ; son chargement/configuration est défini dans le HTML public.
- Core Web Vitals est chargé en production.
- IndexNow est pingé après build.
- Les sitemaps, robots, JSON-LD et pages statiques sont générés par scripts.
- Aucune intégration Sentry active : le gestionnaire d’erreurs ne fait qu’anticiper une future connexion.

## 7. Modèle de données

### 7.1 `songs` — entité principale

Le schéma initial et les migrations indiquent les champs fonctionnels suivants :

- identité : `id`, `slug`, `title`, `artist` ;
- éditorial : `description`, `subtitle`, `lyrics`, `category`, `hashtags` ;
- cycle de vie : `release_date`, `status` (`draft`, `scheduled`, `published`, `archived`) ;
- diffusion : URLs TikTok, Spotify, Apple Music, YouTube/YouTube Music ;
- visuel : `cover_image` ;
- karaoké : `lrc_content`, `karaoke_synced_at` ;
- audit : `created_at`, `updated_at`.

Le slug est généré automatiquement par fonction/trigger PostgreSQL et indexé de manière unique lorsqu’il est non nul. Le client garde néanmoins un fallback qui charge jusqu’à 500 chansons publiées et recalcule le slug si la colonne n’est pas déclarée disponible : utile pour compatibilité, mais coûteux et à supprimer après certification de la migration.

### 7.2 Administration

La table `admins` est utilisée en complément de Supabase Auth pour vérifier le droit administrateur. Le modèle exact n’est pas consolidé dans une migration canonique du dépôt ; il doit être exporté depuis la production et ajouté aux migrations.

### 7.3 Notifications

`push_subscriptions` conserve les endpoints et clés de souscription. Les migrations récentes activent RLS et ajoutent des contraintes d’unicité/correctifs. La rétention, la purge des endpoints expirés et la fonction serveur officielle restent à formaliser.

### 7.4 Mode Festa

`festa_sessions` contient le code partagé, le statut actif, la chanson courante et l’activité récente. `festa_queue` contient la chanson, le nom du chanteur, le statut (`waiting`, `playing`, `done`, `skipped`) et les scores applaudissements/tomates.

Des RPC atomiques incrémentent les réactions. Realtime publie les changements des deux tables. Une fonction ferme les sessions inactives après six heures, mais aucun cron automatique n’est configuré dans la migration : le nettoyage est manuel tant que `pg_cron` ou un scheduler n’est pas ajouté.

Limite de sécurité assumée : le mode Festa est anonyme et fondé sur la connaissance d’un code court. Les contrôles « ma propre entrée » sont principalement UI, pas une isolation forte en base.

### 7.5 Tables historiques ou secondaires

Le script initial définit aussi `albums` et `settings`, mais aucun usage significatif n’a été identifié dans le flux applicatif courant. Leur présence réelle en production et leur avenir sont à vérifier.

## 8. Fonctionnalités générales

### 8.1 Contenu et découverte

- mise en avant de la chanson publiée la plus récente ;
- catalogue complet trié par date ;
- fiches chanson avec description, paroles, hashtags, catégorie, vidéo et liens plateforme ;
- recherche textuelle ;
- navigation par catégorie et archives annuelles ;
- blog et guide éditorial ;
- page « Sobre » et politique de confidentialité ;
- roue aléatoire « Roda da Segunda » ;
- historique local de consultation/écoute ;
- partage et redirection vers les plateformes externes.

### 8.2 Lecture média

- embeds YouTube avec façade légère avant chargement de l’iframe ;
- lecteur et playlist YouTube ;
- embeds Instagram ;
- intégrations/liens Spotify, Apple Music et TikTok ;
- protections de performance autour des médias tiers ;
- affichage des paroles en dialogue/drawer selon le support.

La lecture hors ligne des médias tiers n’est pas garantie : le cache PWA couvre le shell, les images et métadonnées, pas les vidéos/audio YouTube ou Spotify.

### 8.3 Karaoké

- catalogue filtré sur les chansons disposant de LRC et d’une source média ;
- lecture YouTube synchronisée avec les lignes LRC ;
- options de mode solo/duo ;
- réglages de lignes et présentation ;
- outil admin de synchronisation manuelle ;
- sauvegarde du LRC et date de synchronisation ;
- vues adaptées mobile, desktop et TV.

### 8.4 Mode Festa

- création d’une session depuis la TV ;
- affichage QR code + code court ;
- participation depuis `/festa` sur téléphone ;
- choix d’un nom et ajout de chansons à la file ;
- synchronisation temps réel avec l’écran TV ;
- changement de statuts de file ;
- applaudissements et tomates ;
- énergie/grade de performance calculé côté interface ;
- poursuite avec un catalogue de secours lorsque la file distante est vide.

### 8.5 Administration éditoriale

- connexion Supabase Auth et contrôle dans `admins` ;
- récupération et mise à jour de mot de passe ;
- liste, création, édition et suppression de chansons ;
- gestion des statuts et dates de publication ;
- saisie des URLs de diffusion et métadonnées ;
- génération de hashtags ;
- génération de sous-titre via Edge Function ;
- synchronisation karaoké manuelle ;
- notification push lors de la publication selon le flux de sauvegarde ;
- protections contre les colonnes manquantes d’anciens schémas.

### 8.6 SEO et visibilité IA

- métadonnées par route et par chanson ;
- canonical, Open Graph et cartes sociales ;
- JSON-LD ;
- sitemaps index/pages/chansons ;
- `robots.txt` ;
- stubs HTML statiques pour chaque route importante ;
- redirections des anciennes routes `/chansons`, `/playlist`, `/home` et `/calendar` ;
- endpoint de contenu pour assistants IA ;
- vérifications JSON-LD/sitemap et ping IndexNow.

L’architecture est « double couche » : métadonnées HTML pré-générées pour les robots et mise à jour React pour les utilisateurs. Toute évolution SEO doit préserver les deux couches.

## 9. Fonctionnalités par support

### 9.1 Desktop web

Le desktop utilise le shell React standard et les pages responsive. Il fournit le catalogue, les fiches, la recherche, le blog, la roue, le karaoké, les paroles, les embeds, l’administration et les pages institutionnelles. Le layout desktop dispose de son propre shell visuel. Clavier/souris sont les modes d’entrée principaux.

Points à vérifier : accessibilité complète clavier/lecteur d’écran, responsive sur très grands écrans, compatibilité Safari/Firefox et comportement des embeds bloqués par consentement ou extensions.

### 9.2 Web mobile et PWA

Le mobile dispose d’une home immersive, d’une navigation basse et de composants adaptés. La PWA ajoute :

- installation Android/desktop via `beforeinstallprompt` ;
- tutoriel et incitation d’installation iOS ;
- manifest standalone, icônes maskable et raccourcis ;
- service worker avec pré-cache du shell ;
- navigation network-first avec page offline ;
- images cache-first ;
- données chanson network-first avec repli cache ;
- assets stale-while-revalidate ;
- bannière de mise à jour et gestion de version ;
- notifications Web Push ;
- indicateur offline et stockage local des préférences/historique.

Le manifest force actuellement l’orientation portrait. Cela convient au mobile, mais doit être reconsidéré si la PWA doit servir de client tablette/paysage.

### 9.3 Application mobile Android

L’application actuelle est emballée avec Capacitor (`com.amusicadasegunda.app`) et embarque le build `dist`. Elle fournit :

- WebView plein écran avec splash natif contrôlé ;
- Android App Links sur `www.amusicadasegunda.com` ;
- deep links vers les routes React ;
- widget écran d’accueil « dernière chanson » ;
- même expérience fonctionnelle que la PWA, hors différences de disponibilité des API navigateur ;
- compatibilité mobile et TV dans le même manifeste.

L’app ne déclare que la permission Internet dans le manifeste Capacitor actuel. Les notifications natives ne sont donc pas implémentées comme plugin Capacitor ; le comportement Web Push dans une WebView native doit être testé explicitement et ne doit pas être supposé équivalent à la PWA Chrome.

### 9.4 Application iOS

Un projet Capacitor iOS est présent, avec icônes, splash et contenu synchronisé. L’interface utilise le même code React et le tutoriel PWA iOS reste pertinent pour Safari hors App Store.

À vérifier dans Xcode/App Store Connect : bundle ID et signature, capabilities, Universal Links, politique de confidentialité, support réel des notifications, versions minimales iOS, conformité App Store et statut de publication. Aucun pipeline CI iOS n’est visible.

### 9.5 Android TV / Google TV

Le projet Capacitor Android déclare `LEANBACK_LAUNCHER`, une bannière TV, l’absence d’exigence tactile et une détection TV logicielle. Sur TV, l’application charge un shell séparé :

- interface 10-foot sombre et lisible à distance ;
- navigation spatiale et focus D-pad ;
- gestion du bouton Retour et sortie native ;
- accueil avec hero et rails de contenus ;
- catalogue, catégories, regroupements clips par mois/année/thème ;
- détail chanson et lecture ;
- karaoké solo, duo et Festa ;
- paroles TV et options dédiées ;
- invitation Festa par QR/code ;
- file temps réel pilotée par téléphones ;
- réactions et passage automatique à la chanson suivante.

La détection combine override `?tv=1`, User-Agent TV et signal natif Android sans tactile sur grand écran paysage. La classe native ajoute normalement un marqueur UA fiable. L’override est persisté dans `localStorage` jusqu’à `?tv=0`.

Risques à tester sur appareils réels : faux positifs/faux négatifs de détection, focus après fermeture d’overlay, retour matériel, autoplay YouTube, overscan, résolutions 720p/1080p/4K, reprise après veille, perte réseau, performances sur appareils bas de gamme et exigences Play Store TV.

**Corrections du 2026-07-11** (suite à des tests sur TV réelle) : overlay « Ver explicação completa » coupé/rogné par l’overscan (fond opaque + marge de sécurité) ; impossible de remonter au clavier/D-pad après avoir défilé vers le bas sur l’accueil/les landings (`FocusableButton` ne recentrait pas la vue au focus) ; cartes superposées dans la grille « Escolha a primeira música » (bug `aspect-ratio` sur WebView Android TV ancienne, remplacé par un hack `padding-bottom`) ; bouton « Sair » manquant dans la barre de contrôle du karaoké TV ; piège YouTube — le D-pad/clic pouvait entrer dans l’iframe du clip et faire naviguer la WebView vers youtube.com, avec crash au retour matériel (fix : `pointer-events:none` + `tabindex=-1` sur l’iframe + `controls:0`) ; ajout d’un écran de secours dédié TV (`TvErrorFallback`) avec compte à rebours de 5 s et sortie navigable au D-pad en cas de crash React, remplaçant le fallback web non utilisable à la télécommande.

### 9.6 Ancienne TWA Android

Le répertoire `app/`, `twa-manifest.json`, les APK/AAB à la racine et le package `com.amusicadasegunda.www.twa` correspondent à une Trusted Web Activity Bubblewrap historique. Cette application ouvre le site dans Chrome et possède son propre système de notifications/digital asset links.

Elle ne doit pas être confondue avec l’application Capacitor sous `android/`. Décision nécessaire : archiver officiellement la TWA si elle n’est plus distribuée, ou documenter son canal de maintenance, package Play Store, signature et stratégie de migration utilisateurs.

### 9.7 Matrice synthétique

| Capacité | Desktop | PWA/mobile web | App mobile | Android TV |
|---|:---:|:---:|:---:|:---:|
| Catalogue/recherche/fiches | Oui | Oui | Oui | Catalogue/fiches adaptés |
| Blog/guide/institutionnel | Oui | Oui | Oui | Non prioritaire |
| Installation | Non | Oui | Store/sideload | Play TV/sideload |
| Offline shell/métadonnées | PWA si installée/SW actif | Oui | Build embarqué + données réseau | Build embarqué + données réseau |
| Web Push | Navigateur compatible | Oui | À vérifier en WebView | Non documenté |
| Deep links | URLs web | URLs web | Android App Links | App/launcher |
| Karaoké | Oui | Oui | Oui | Oui, UI dédiée |
| Mode Festa invité | Oui | Oui | Oui | Hôte principal |
| Administration | Oui | Possible mais peu ergonomique | Techniquement possible | Non |
| Navigation D-pad | Non requise | Non requise | Non requise | Oui |
| Widget dernière chanson | Non | Non | Android | Non pertinent |

## 10. Routage public

| Route | Fonction |
|---|---|
| `/` | Chanson de la semaine / accueil |
| `/musica` | Catalogue |
| `/musica/:slug` | Fiche chanson |
| `/search` | Recherche |
| `/categoria/:slug` | Catalogue par catégorie |
| `/arquivo/:year` | Archive annuelle |
| `/roda` | Roue de découverte |
| `/karaoke` | Karaoké |
| `/festa` | Client téléphone d’une session Festa |
| `/youtube` | Expérience YouTube interne |
| `/blog` | Blog |
| `/guia` | Guide sur la parodie musicale |
| `/sobre` | À propos |
| `/privacy` | Politique de confidentialité |
| `/tv` | Page de présentation TV, distincte du shell TV auto-détecté |
| `/login` | Authentification/récupération |
| `/admin` | Administration protégée |
| `/api/content-for-ai.json` | Contenu structuré pour consommation IA |

Les routes debug YouTube ne sont incluses qu’en développement. Les redirections React sont des remplacements côté client ; sur GitHub Pages, les stubs générés et la configuration de domaine doivent assurer la résolution initiale correcte.

## 11. Build, génération et déploiement

### 11.1 Développement local

Prérequis : Node.js `>=18.17`, npm et un `.env` valide. Commandes principales :

```bash
npm install
npm run dev
npm run lint
npm run test:run
npm run test:e2e
npm run build
```

Vite écoute sur le port `3000`, avec HMR désactivé dans la configuration actuelle.

### 11.2 Pipeline de build web

`npm run build` déclenche :

1. export des chansons depuis Supabase ;
2. génération des informations de build ;
3. génération de l’illustration de la chanson actuelle ;
4. optimisation des images de marque ;
5. compilation Vite dans `dist/` ;
6. génération du manifeste d’assets du service worker ;
7. génération des stubs HTML SEO ;
8. génération des sitemaps ;
9. copie vers `docs/` ;
10. ping IndexNow.

Conséquence : un build nécessite un accès Supabase valide et peut produire des modifications dans plusieurs répertoires versionnés/générés. Les builds reproductibles exigent de fixer clairement quels fichiers générés doivent être commitées.

### 11.3 Build natif

```bash
npm run build
npx cap sync android
npx cap open android

npm run build
npx cap sync ios
npx cap open ios
```

Android dispose aussi de `npm run android:build`. La signature release ne doit jamais dépendre d’un keystore stocké dans le dépôt.

## 12. Stratégie de cache et résilience

Le service worker versionne un cache applicatif, précharge le shell et supprime les anciennes versions à l’activation. Stratégies :

- documents navigués : network-first, puis page cachée/offline ;
- images : cache-first ;
- `content/*` : network-first ;
- assets et JSON/API same-origin : stale-while-revalidate ;
- autres GET same-origin : network-first.

Le frontend tente Supabase puis charge l’export statique `content/songs.json` si la liste est vide ou en erreur. Ce mécanisme améliore la continuité de lecture, mais l’admin, Realtime/Festa, l’auth et les écritures restent indisponibles hors ligne.

## 13. Sécurité, confidentialité et conformité

### 13.1 Points positifs

- secrets de build injectés via GitHub Secrets ;
- clé Supabase anonyme utilisée côté client, sans service role dans le front ;
- RLS activée par les migrations récentes ;
- routes admin protégées par Auth + vérification admin ;
- DOMPurify et fonctions de validation/sécurité présentes ;
- politique de confidentialité publique ;
- domaine unique `www` utilisé pour les Android App Links.

### 13.2 Risques prioritaires

1. **Secrets sensibles versionnés** : des fichiers `.env`, keystores, certificats, APK et AAB sont présents dans l’arborescence. Il faut considérer toute clé privée commitée comme compromise, la révoquer/faire tourner, supprimer ces fichiers du suivi Git et éventuellement purger l’historique.
2. **Schéma RLS non canonique** : `database-schema.sql` contient une policy historique « gestion complète » ouverte, tandis que des migrations plus récentes la corrigent. La sécurité réelle dépend de l’ordre appliqué en production. Exporter et auditer les policies effectives.
3. **Mode Festa anonyme** : un code deviné donne accès à une session active et les updates ne sont pas liés à une identité d’invité. Ajouter jetons de session/invité et rate limiting si l’usage dépasse un cercle de confiance.
4. **Multiples backends push** : risque de clés divergentes, endpoints oubliés et logique non maintenue.
5. **Absence d’observabilité sécurité** : pas de suivi centralisé des erreurs, abus, échecs d’auth ou volume des RPC.
6. **Dépendances média** : les plateformes tierces peuvent tracer les utilisateurs lors du chargement d’iframes ; documenter consentement/cookies et politique CSP.

### 13.3 Contrôles recommandés

- rotation immédiate des clés de signature et secrets exposés ;
- inventaire GitHub/Supabase/Google/Apple des accès administrateurs ;
- export versionné du schéma avec migrations complètes ;
- audit RLS automatisé en CI ;
- Content Security Policy, headers de sécurité et revue des iframes ;
- analyse de dépendances (`npm audit`/Dependabot) ;
- politique de rétention des abonnements push et sessions Festa ;
- revue LGPD : finalités, consentement analytics/push, suppression et sous-traitants.

## 14. Qualité, tests et observabilité

### 14.1 Tests présents

- tests unitaires de composants : countdown, erreurs, layout, lecteurs YouTube ;
- validation JSON-LD ;
- E2E Playwright : accueil, navigation, lecteur, recherche, FAQ ;
- workflows CI séparés unitaires/coverage et E2E.

### 14.2 Lacunes

- aucun test automatisé significatif de l’admin CRUD, Auth/RLS ou récupération de mot de passe ;
- pas de tests Realtime/Festa multi-clients ;
- pas de tests karaoké synchronisé complets ;
- pas de tests Android/iOS natifs ni TV/D-pad ;
- pas de budget de performance bloquant ;
- coverage générée mais aucun seuil minimal visible ;
- collecte Web Vitals présente sans destination/SLI clairement documenté ;
- pas de centralisation d’erreurs active.

### 14.3 Pyramide de tests cible

- unitaires : normalisation chanson, LRC, slugs, énergie, validation et stratégies de cache ;
- intégration : services Supabase sur environnement éphémère, Auth et policies RLS ;
- composants : Admin, Karaoke, Festa et états offline ;
- E2E web : publication → page publique → recherche → lecture ;
- E2E multi-contexte : TV crée une session, téléphone rejoint, ajoute, réagit, TV avance ;
- natif : deep links, widget, splash, back, rotation et reprise ;
- TV réelle : matrice d’appareils et parcours D-pad.

## 15. Dette technique et risques d’évolution

### Priorité P0 — avant extension importante

- retirer/faire tourner secrets, certificats et keystores versionnés ;
- certifier les RLS et consolider le schéma de production en migrations ;
- décider officiellement Capacitor vs TWA et isoler les artefacts historiques ;
- sécuriser les builds pour qu’ils ne dépendent pas de fichiers secrets locaux ;
- sauvegarder Supabase et tester une restauration.

### Priorité P1 — stabilisation produit

- découper les composants monolithiques en domaines : catalogue, publication, média, karaoké, Festa ;
- introduire des types de domaine partagés, notamment pour les URLs YouTube ;
- centraliser la couche data et éliminer les accès Supabase directs dans les pages ;
- rendre unique le backend push ;
- automatiser le nettoyage Festa ;
- installer une observabilité erreurs/performance et des événements produit documentés ;
- compléter les tests des parcours critiques ;
- harmoniser Node 20/22 en CI et développement.

### Priorité P2 — industrialisation

- formaliser environnements dev/staging/prod ;
- ajouter preview deployments et données de test ;
- documenter release mobile/TV, versioning et rollback ;
- automatiser builds/signatures via coffre de secrets ;
- mettre en place feature flags pour les évolutions à risque ;
- définir SLO, budgets Web Vitals et alertes ;
- nettoyer les nombreux rapports historiques de la racine vers une archive documentaire.

## 16. Architecture cible recommandée

Une évolution progressive, sans réécriture brutale, peut converger vers :

```text
src/
  app/              # bootstrap, router, providers, shells par plateforme
  domains/
    songs/          # modèle, service, queries, composants
    playback/       # lecteurs et plateformes
    karaoke/        # LRC, player, sync admin
    festa/          # sessions, queue, realtime, réactions
    admin/           # auth, publication, formulaires
  platforms/
    web/
    mobile/
    tv/
  shared/           # UI, validation, analytics, erreurs
```

Le modèle `Song` devrait être typé en TypeScript, avec des propriétés métier non ambiguës (`videoUrl`, `karaokeAudioUrl`) mappées vers les colonnes historiques dans un repository unique. Les pages ne devraient plus appeler directement `supabase.from(...)`.

## 17. Gouvernance produit et technique

Pour faire évoluer le produit avec plusieurs équipes, maintenir :

- un propriétaire produit et un propriétaire technique ;
- un backlog priorisé par impact, risque et effort ;
- des ADR (Architecture Decision Records) pour les décisions structurantes ;
- une définition de terminé incluant tests, accessibilité, SEO, analytics et documentation ;
- une matrice de compatibilité par navigateur/appareil ;
- un runbook incident et un processus de rollback ;
- un calendrier de publication et une checklist éditoriale ;
- une revue trimestrielle sécurité/coûts/dépendances.

## 18. Runbook opérationnel minimal

### Publication d’une chanson

1. Se connecter à `/admin`.
2. Créer ou éditer la chanson, compléter contenu, catégorie, hashtags, médias et date.
3. Vérifier l’unicité des URLs/slug et les embeds.
4. Synchroniser le karaoké si disponible.
5. Passer au statut publié au moment prévu.
6. Déclencher/vérifier la notification push.
7. Relancer le pipeline afin de mettre à jour export statique, stubs et sitemaps.
8. Vérifier la home, la fiche, la recherche, le JSON-LD et les plateformes.

### Incident Supabase

- le contenu public peut retomber sur `content/songs.json` ;
- vérifier statut Supabase, variables, RLS et journaux Edge Functions ;
- ne pas republier un build si l’export récupère un contenu vide sans en comprendre la cause ;
- Auth, admin et Festa resteront dégradés jusqu’au retour du backend.

### Incident de cache/PWA

- comparer `build-info.json`, assets déployés et version du service worker ;
- vérifier l’activation du nouveau worker et les anciens caches ;
- tester navigation fraîche, mise à jour d’une installation existante et mode offline ;
- augmenter la version de cache uniquement avec un build cohérent.

### Incident TV

- confirmer la détection `isTV`, puis tester temporairement avec `?tv=1` ;
- remettre à zéro avec `?tv=0` après diagnostic ;
- vérifier D-pad, bouton Retour, réseau, YouTube et Supabase Realtime ;
- tester sur appareil réel avant toute release Play TV.

## 19. Fichiers de référence

| Sujet | Fichiers principaux |
|---|---|
| Bootstrap | `src/main.jsx`, `src/App.jsx` |
| Routes | `src/config/routes.js`, `src/pages/index.jsx` |
| Pages produit | `src/pages/` |
| Données chanson | `src/api/entities.js`, `src/api/supabaseService.js`, `src/lib/supabase.js` |
| Admin | `src/pages/Admin.jsx`, `src/components/ProtectedAdmin.jsx`, `src/pages/Login.jsx` |
| Karaoké | `src/components/karaoke/`, `src/lib/lrc.js` |
| Festa | `src/lib/festa.js`, `src/hooks/useFestaSession.js`, `src/pages/Festa.jsx` |
| TV | `src/tv/`, `src/styles/tv*.css` |
| PWA | `public/manifest.json`, `public/sw.js`, hooks `usePWAInstall`/`useServiceWorker` |
| Capacitor | `capacitor.config.json`, `android/`, `ios/` |
| TWA historique | `twa-manifest.json`, `app/` |
| Base | `supabase/migrations/`, `database-schema.sql` (historique) |
| Edge Functions | `supabase/functions/` |
| SEO/build | `scripts/`, `vite.config.js`, `index.html` |
| CI/CD | `.github/workflows/` |
| Tests | `src/**/__tests__/`, `tests/`, `playwright.config.js`, `vitest.config.js` |

## 20. Points à confirmer hors dépôt

- environnements Supabase et schéma/policies réellement déployés ;
- sauvegardes, restauration, quotas, coûts et alertes Supabase ;
- backend push officiellement actif et rotation VAPID ;
- propriété et configuration du domaine/DNS ;
- Google Analytics/Search Console/IndexNow actifs ;
- statut Google Play mobile/TV et package actuellement publié ;
- statut App Store/TestFlight ;
- empreintes `assetlinks.json` et signatures effectives ;
- conformité LGPD/cookies/consentement ;
- métriques d’usage, crashs et performance réels ;
- procédure de release et personnes disposant des accès critiques.

## 21. Checklist de reprise par une nouvelle équipe

- [ ] Obtenir les accès GitHub, Supabase, DNS, Analytics, Search Console, Google Play et Apple.
- [ ] Faire tourner tous les secrets potentiellement exposés.
- [ ] Reconstituer un `.env` local depuis un exemple sans recopier de secrets dans la documentation.
- [ ] Installer, lancer, tester et construire le projet sur une machine vierge.
- [ ] Exporter le schéma Supabase réel et comparer aux migrations.
- [ ] Tester toutes les policies avec rôles anonyme, authentifié, admin et service.
- [ ] Identifier l’application Android publiée : Capacitor ou TWA.
- [ ] Tester PWA, Android, iOS et TV sur appareils réels.
- [ ] Valider le pipeline de publication d’une chanson de bout en bout.
- [ ] Valider une session Festa TV + deux téléphones.
- [ ] Mesurer les Core Web Vitals et établir une baseline.
- [ ] Créer le backlog P0/P1/P2 et les ADR manquants.

---

**Règle de maintenance de ce document** : mettre à jour `Overview.md` à chaque changement d’architecture, nouveau service externe, nouvelle surface de distribution, migration de données ou modification importante du parcours de publication. Les détails opérationnels volatils (secrets, personnes, mots de passe, identifiants de signature) ne doivent jamais y figurer.
