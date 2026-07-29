# Contrôle de version distant (Android mobile + Android TV)

Système de mise à jour forcée/recommandée piloté depuis Supabase, actif
**uniquement dans l'app native Android** (mobile et TV). Le web/PWA/desktop
n'est jamais concerné — `Capacitor.isNativePlatform()` coupe tout le système
en dehors du natif (cf. `src/hooks/useAppUpdate.jsx`).

## 1. Où se trouve la migration

`supabase/migrations/20260716090000_create_app_update_config.sql`

Crée `public.app_update_config` (une ligne par plateforme, clé primaire
`platform`), active RLS, lecture publique (`anon`), écriture réservée aux
admins (`public.admins`, même pattern que `songs_admin_full_access`). Seed
initial avec `versionCode 13 / versionName 1.4.4` (constatés dans
`android/app/build.gradle` au moment d'écrire cette migration — **à vérifier**
avant tout déploiement, cf. §5).

## 2. Comment l'état est calculé

Fonction pure `computeUpdateState(currentVersionCode, config)` dans
`src/services/appUpdateService.ts` :

```
currentVersionCode >= latestVersionCode           → 'none'
minimumVersionCode <= currentVersionCode < latest  → 'recommended'
currentVersionCode < minimumVersionCode            → 'required'
config manquant / désactivé / version locale illisible → 'none' (jamais bloquant)
```

`versionCode` (pas `versionName`) est la seule valeur comparée — lu via
`@capacitor/app` (`App.getInfo().build`, casté en entier).

## 3. Publier une mise à jour recommandée

Version de production actuelle = 24. Dans `app_update_config` (dashboard
Supabase ou `/admin/atualizacoes`) :

```
latest_version_code  = 25
minimum_version_code = 24   -- inchangé
```

Résultat : la 24 voit la recommandation (dismissible, « Mais tarde »), la 25
ouvre normalement.

## 4. Rendre une mise à jour obligatoire

```
latest_version_code  = 25
minimum_version_code = 25
```

Toute version < 25 est bloquée par l'écran plein écran (aucun accès à
l'accueil, au catálogo, au karaokê, à l'historique du navigateur ou à un deep
link — l'écran est rendu **avant** le routeur, cf. `src/App.jsx`).

## 5. Annuler un blocage accidentel

Redescendre `minimum_version_code` à la valeur précédemment supportée. Effet
immédiat au prochain `check()` (démarrage ou retour au premier plan) — aucune
republication d'app nécessaire, c'est une donnée distante.

**Pourquoi modifier `minimum_version_code` avec prudence :** chaque
utilisateur en dessous de ce code est instantanément coupé de l'app (écran
bloquant, sans « Mais tarde »). Une erreur de saisie (ex. confondre
`versionCode` et `versionName`) bloque potentiellement 100 % des utilisateurs
tant que la ligne n'est pas corrigée. L'UI admin demande une confirmation
explicite avant toute **augmentation** de ce champ (cf. `AppUpdatesPage.jsx`).

## 6. Distinction Android mobile / Android TV

Réutilise la détection TV existante — **aucune deuxième détection créée** :
`detectAppUpdatePlatform()` (`appUpdateService.ts`) appelle `isTV()`
(`src/tv/platform.js`, UA + signal natif sans tactile + écran large paysage).
`android_tv` si `isTV()` est vrai, `android_mobile` sinon — jamais `android_tv`
par erreur si la détection échoue (repli sûr).

## 7. Comment fonctionne le fail-safe

- Une requête réseau réussie écrit dans le cache local
  (`localStorage['app_update_config_v1_<platform>']`) et pilote l'état.
- Une configuration en cache est **toujours** utilisée immédiatement au
  démarrage (jamais d'attente réseau si un cache valide existe) — le
  rafraîchissement se fait en arrière-plan si `check_interval_minutes` est
  dépassé.
- Sans cache (1er lancement) : on attend **une seule** réponse réseau, bornée
  par le timeout global Supabase (~7 s, `src/lib/supabase.js`), avant de
  décider — pour ne jamais afficher l'accueil puis le remplacer soudainement
  par l'écran bloquant.
- Réseau indisponible **et** aucun cache → l'app s'ouvre normalement
  (`status: 'error'`, jamais `'required'`).
- Une ligne malformée (types invalides, `minimum > latest`, plateforme
  inconnue…) est **rejetée** par `normalizeAppUpdateConfig` → traitée comme
  « pas de configuration », jamais comme obligatoire.
- Une configuration `required` valide en cache **reste `required`** même si
  le réseau est indisponible au moment du check suivant.

## 8. Comment tester en local

```bash
npm run test:run -- src/services/__tests__/appUpdateService.test.ts   # logique pure
npm run lint
npm run build && npx cap sync android
```

Pour simuler un état côté navigateur (dev web, sans Android) : le système ne
s'active pas hors natif — utiliser un appareil/émulateur Android réel pour
observer l'UI de blocage/recommandation (cf. §9/§10 pour les scénarios
manuels).

## 9. Activer une mise à jour recommandée (test manuel)

1. Noter le `versionCode` installé (ex. 24, cf. `android/app/build.gradle` ou
   Google Play Console).
2. Dans Supabase (dashboard ou `/admin/atualizacoes`) : `latest_version_code = 25`,
   `minimum_version_code = 24` pour la plateforme testée.
3. Rouvrir l'app (ou revenir au premier plan) → le dialogue « Nova versão
   disponível » apparaît, non bloquant. « Mais tarde » le ferme (mémorisé par
   `latestVersionCode` — republier `latest_version_code = 26` le fait
   réapparaître).

## 10. Activer une mise à jour obligatoire (test manuel)

1. `latest_version_code = 25`, `minimum_version_code = 25`.
2. Rouvrir l'app avec un `versionCode` installé < 25 → écran plein écran
   bloquant. Retour matériel : absorbé (jamais de sortie, jamais d'accès à
   l'app). « Atualizar agora » ouvre la Google Play (`market://` puis repli
   HTTPS).
3. Remettre `minimum_version_code` à la valeur d'origine pour débloquer.

## 11. Mettre à jour l'URL Google Play

L'`applicationId` (`com.amusicadasegunda.app`) est lu depuis
**une seule source** : `src/lib/playStore.js` (`PLAY_STORE_APP_ID`), réutilisée
par `getPlayStoreUrl()` (déjà utilisé par `src/pages/Tv.jsx`) et
`getPlayStoreMarketUri()`. Ne jamais dupliquer ce package name ailleurs.
`app_update_config.store_url` (optionnel) peut surcharger le lien HTTPS de
repli (ex. campagne UTM) — doit être une URL `https://` valide, sinon ignorée.

---

## Architecture

| Rôle | Fichier |
|---|---|
| Types + logique pure (état, validation, cache, dismissal, `market://`) | `src/services/appUpdateService.ts` |
| Orchestration React (démarrage, resume, analytics) | `src/hooks/useAppUpdate.jsx` (`AppUpdateProvider`, `useAppUpdate`) |
| Point de montage (avant le routeur) | `src/App.jsx` (gate `checking`/`required`), `src/main.jsx` (`AppUpdateProvider`) |
| Écran bloquant mobile | `src/components/AppUpdate/RequiredUpdateScreen.jsx` |
| Dialogue recommandé mobile (Radix) | `src/components/AppUpdate/RecommendedUpdateDialog.jsx` |
| Écran bloquant TV (autonome, remplace `TvApp`) | `src/tv/TvRequiredUpdateScreen.jsx` |
| Dialogue recommandé TV (overlay dans `TvApp`) | `src/tv/components/TvRecommendedUpdateDialog.jsx` |
| Admin (optionnel) | `src/components/admin/AppUpdatesPage.jsx` (`/admin/atualizacoes`) |
| Source unique du package name / lien Play | `src/lib/playStore.js` |
| Migration + RLS + seed | `supabase/migrations/20260716090000_create_app_update_config.sql` |

**Pourquoi le dialogue « recommended » TV vit dans `TvApp.jsx`** (et pas dans
`App.jsx` comme son équivalent mobile) : il doit partager le même abonnement
Retour matériel que le reste de la TV (`onBackPress`, cf.
`src/tv/adapters/backButton.js`) — deux abonnements indépendants
déclencheraient chacun leur propre action au même appui. L'écran « required »
TV, lui, remplace `TvApp` entièrement (jamais monté en même temps) : il gère
son propre Retour (no-op) sans conflit possible.

## Limites connues

- La détection du succès/échec de `market://` (Play Store absent) repose sur
  une heuristique `visibilitychange` + délai (~1,2 s) — pas de callback natif
  fiable en environnement WebView pur. Comportement standard pour les apps
  Capacitor, mais pas garanti à 100 % sur tous les OEM.
- Aucune intégration Play Core / In-App Updates (mobile) n'est ajoutée — hors
  périmètre demandé, l'architecture (service découplé de l'UI) permet de la
  brancher plus tard sans réécrire le calcul d'état.
- Le champ `updated_at` n'a pas de trigger automatique (le projet n'a pas de
  pattern `set_updated_at()` partagé) — l'admin UI le met à jour explicitement
  à chaque sauvegarde.
