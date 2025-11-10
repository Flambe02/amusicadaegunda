# 🔧 FORCER LA MISE À JOUR DU SERVICE WORKER

## Problème identifié

Le Service Worker actif est encore l'ancien (#850) avec le cache `static-v2.1.0`. Le nouveau Service Worker (v5.0.4) n'a pas été installé.

## Solution immédiate

### Option 1 : Forcer la mise à jour via DevTools (RECOMMANDÉ)

1. **Dans DevTools > Application > Service Workers :**
   - Cliquez sur le bouton **"Update"** à côté du Service Worker actif
   - Attendez que le nouveau Service Worker soit installé
   - Cliquez sur **"skipWaiting"** si disponible

2. **Ou désinscrire et recharger :**
   - Cliquez sur **"Unregister"**
   - Rechargez la page (Ctrl+Shift+R)
   - Le nouveau Service Worker sera installé automatiquement

### Option 2 : Vider le cache manuellement

1. **Dans DevTools > Application > Storage :**
   - Cliquez sur **"Clear site data"**
   - Cochez toutes les options
   - Cliquez sur **"Clear site data"**
   - Rechargez la page

### Option 3 : Attendre le cycle automatique

Le Service Worker se mettra à jour automatiquement lors de la prochaine visite (dans 24h max).

## Vérification

Après la mise à jour, vérifiez :
- Le cache devrait être `static-v5.0.4` (pas `static-v2.1.0`)
- Le Service Worker devrait être #851 ou plus récent
- Les logs dans la console devraient montrer "William, oh William"

## Si le problème persiste

Vérifiez les erreurs dans la console (l'icône rouge avec "4" indique des erreurs).

