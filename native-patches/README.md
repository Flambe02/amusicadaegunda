# Patches natifs (projet Android hors dépôt)

Le dossier `android/` est volontairement exclu du dépôt (`.gitignore` : dépôt public, fichiers de signature et de configuration locaux). Les modifications natives qu'on veut conserver sont rangées ici sous forme de patchs, à appliquer sur le projet généré par Capacitor. (Le sous-dossier s'appelle `capacitor-android/` et non `android/` : la règle `android/` du `.gitignore` l'exclurait.)

## `capacitor-android/MainActivity.patch`

Deux réglages dans `MainActivity.onCreate`, **sur téléphone seulement** (`!isTelevision()`) — la TV n'est jamais concernée :

1. **Portrait uniquement** :

   ```java
   setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
   ```

   **Pourquoi :** l'app mobile n'a pas d'affichage horizontal (décision du 2026-09-25). La TV reste en paysage. Côté web, la PWA est déjà en `"orientation": "portrait"` (`public/manifest.json`) et un navigateur de téléphone tourné en paysage affiche l'écran « Gire o celular ».

2. **Son sans geste préalable** :

   ```java
   this.getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
   ```

   **Pourquoi :** dans l'app Android, la chanson de la semaine doit démarrer directement avec le son sur l'Início (sans repère « ▶ » à toucher). Le code web le détecte de son côté (`getPlatform() === 'android'` et `!isTV()`, voir `src/components/mobile/feed/MobileFeed.jsx`) et démarre alors le lecteur avec le son. Sans ce réglage, la WebView refuse le son et le feed retombe simplement sur le démarrage muet avec le repère « ▶ ».

Le site web et iOS ne sont pas concernés.

**Appliquer** (depuis la racine du dépôt, après `npx cap add android` ou si `MainActivity.java` a été régénéré) :

```bash
git apply --check native-patches/capacitor-android/MainActivity.patch   # vérifie d'abord
git apply native-patches/capacitor-android/MainActivity.patch
```

Si le patch est déjà appliqué, `--check` échoue et `git apply --check -R` réussit : ne rien faire de plus. (Un patch partiellement appliqué — une ancienne version avec le seul réglage du son — se complète à la main : ajouter l'import `android.content.pm.ActivityInfo` et le bloc portrait en tête de `onCreate`.)

## Check-list de release Android

Avant de compiler un AAB de release (`./gradlew bundleRelease`) :

- [ ] **Appliquer les patchs de ce dossier** (voir ci-dessus) et vérifier qu'ils sont en place :
  `grep -n "SCREEN_ORIENTATION_PORTRAIT\|setMediaPlaybackRequiresUserGesture" android/app/src/main/java/com/amusicadasegunda/app/MainActivity.java` (deux lignes attendues).
