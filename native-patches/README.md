# Patches natifs (projet Android hors dépôt)

Le dossier `android/` est volontairement exclu du dépôt (`.gitignore` : dépôt public, fichiers de signature et de configuration locaux). Les modifications natives qu'on veut conserver sont rangées ici sous forme de patchs, à appliquer sur le projet généré par Capacitor. (Le sous-dossier s'appelle `capacitor-android/` et non `android/` : la règle `android/` du `.gitignore` l'exclurait.)

## `capacitor-android/MainActivity-autoplay.patch`

**Quoi :** dans `MainActivity.onCreate`, autorise la WebView à lire un média **avec le son sans geste préalable** :

```java
this.getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
```

**Pourquoi :** dans l'app Android, la chanson de la semaine doit démarrer directement avec le son sur l'Início (sans repère « ▶ » à toucher). Le code web le détecte de son côté (`getPlatform() === 'android'` et `!isTV()`, voir `src/components/mobile/feed/MobileFeed.jsx`) et démarre alors le lecteur avec le son. Sans ce patch, la WebView refuse le son et le feed retombe simplement sur le démarrage muet avec le repère « ▶ ».

**Sauf sur TV :** le réglage est appliqué seulement si `isTelevision()` est faux, pour que l'interface Android TV reste identique. Le site web et iOS ne sont pas concernés.

**Appliquer** (depuis la racine du dépôt, après `npx cap add android` ou si `MainActivity.java` a été régénéré) :

```bash
git apply --check native-patches/capacitor-android/MainActivity-autoplay.patch   # vérifie d'abord
git apply native-patches/capacitor-android/MainActivity-autoplay.patch
```

Si le patch est déjà appliqué, `--check` échoue : vérifier que `setMediaPlaybackRequiresUserGesture(false)` est présent dans `MainActivity.java`, et ne rien faire de plus.

## Check-list de release Android

Avant de compiler un AAB de release (`./gradlew bundleRelease`) :

- [ ] **Appliquer les patchs de ce dossier** (voir ci-dessus) et vérifier qu'ils sont en place : `grep -n "setMediaPlaybackRequiresUserGesture" android/app/src/main/java/com/amusicadasegunda/app/MainActivity.java`.
