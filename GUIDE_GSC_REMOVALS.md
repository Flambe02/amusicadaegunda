# 📋 Guide : Supprimer les URLs avec hash de Google Search Console

**Date:** 2026-01-18  
**Objectif:** Supprimer temporairement les 55 URLs avec hash (`#/musica/...`) de l'index Google

---

## 🔍 Qu'est-ce que GSC ?

**GSC = Google Search Console**

C'est l'outil gratuit de Google qui permet de :
- Surveiller la présence de votre site dans Google Search
- Voir quelles pages sont indexées
- Identifier les erreurs d'indexation
- Demander la suppression d'URLs de l'index

**URL:** https://search.google.com/search-console

---

## 🎯 Pourquoi supprimer les URLs avec hash ?

### Problème actuel
- **55 URLs** avec hash sont "découvertes" par Google mais **non indexées**
- Exemples: `https://www.amusicadasegunda.com/#/musica/2025-retro/`
- Ces URLs **ne peuvent pas être indexées** par Google (les fragments `#` sont ignorés)
- Elles **gaspillent le budget de crawl** de Google

### Solution
- Demander à Google de **supprimer temporairement** ces URLs de son index
- Cela libère le budget de crawl pour les **vraies URLs** (`/musica/2025-retro/`)
- Google ne les découvrira plus (grâce au `Disallow: /#/` dans `robots.txt`)

---

## 📝 Étapes détaillées : Supprimer les URLs avec hash

### ÉTAPE 1 : Accéder à Google Search Console

1. Aller sur https://search.google.com/search-console
2. Sélectionner la propriété **`amusicadasegunda.com`** (ou `www.amusicadasegunda.com`)

---

### ÉTAPE 2 : Accéder à la section "Removals"

**Option A : Via le menu latéral**
1. Dans le menu de gauche, cliquer sur **"Removals"** (ou "Suppressions" en français)
2. Si vous ne voyez pas "Removals", chercher dans **"Index"** → **"Removals"**

**Option B : Via l'URL directe**
- Aller sur : `https://search.google.com/search-console/removals?resource_id=https%3A%2F%2Fwww.amusicadasegunda.com%2F`

---

### ÉTAPE 3 : Demander une suppression temporaire

1. Cliquer sur le bouton **"New Request"** (ou "Nouvelle demande")
2. Sélectionner **"Remove this URL"** (ou "Supprimer cette URL")

---

### ÉTAPE 4 : Entrer le pattern d'URL avec hash

**Option recommandée : Supprimer toutes les URLs avec hash**

Dans le champ "URL", entrer :
```
https://www.amusicadasegunda.com/#/
```

**Explication :**
- Le pattern `/#/` correspond à toutes les URLs commençant par `https://www.amusicadasegunda.com/#/`
- Cela inclut toutes les URLs comme :
  - `https://www.amusicadasegunda.com/#/musica/2025-retro/`
  - `https://www.amusicadasegunda.com/#/musica/50-por-cento/`
  - etc.

---

### ÉTAPE 5 : Confirmer la suppression

1. Google va vérifier que l'URL existe bien
2. Cliquer sur **"Request removal"** (ou "Demander la suppression")
3. **Important :** La suppression est **temporaire** (environ 90 jours)
   - Après 90 jours, Google peut réindexer si l'URL est toujours accessible
   - Mais comme nous avons ajouté `Disallow: /#/` dans `robots.txt`, Google ne les découvrira plus

---

## 🔄 Alternative : Supprimer les URLs une par une

Si Google ne permet pas de supprimer un pattern (`/#/`), vous pouvez :

### Option A : Supprimer via l'API
1. Aller dans **"Removals"** → **"Temporary removals"**
2. Utiliser le bouton **"Bulk removal"** si disponible
3. Coller la liste des 55 URLs (une par ligne)

### Option B : Supprimer les plus importantes
Si vous ne pouvez pas tout supprimer d'un coup, supprimez au moins :
- Les URLs les plus anciennes (crawled il y a longtemps)
- Les URLs avec le plus de trafic potentiel

---

## ⚠️ Important : Limitations de Google

### Ce que Google peut faire :
- ✅ Supprimer temporairement une URL de l'index
- ✅ Supprimer plusieurs URLs individuelles
- ✅ Bloquer l'indexation via `robots.txt`

### Ce que Google ne peut pas faire :
- ❌ Supprimer un pattern d'URL (`/#/`) directement
- ❌ Supprimer définitivement (toujours temporaire, max 90 jours)

---

## 📊 Vérification après suppression

### Dans Google Search Console

1. **Removals** → **"Temporary removals"**
   - Vous devriez voir la liste des URLs supprimées
   - Statut : "Removed" (Supprimée)

2. **Page indexing** → **"Discovered - currently not indexed"**
   - Le nombre devrait **diminuer** après quelques jours
   - De 55 → vers 0 (idéalement)

---

## 🎯 Résultat attendu

### Avant
- 55 URLs avec hash découvertes mais non indexées
- Budget de crawl gaspillé sur des URLs non indexables

### Après (2-7 jours)
- ✅ URLs avec hash supprimées de l'index Google
- ✅ Budget de crawl libéré pour les vraies URLs
- ✅ Google découvre uniquement les URLs propres (`/musica/...`)

---

## 🔗 Références

- [Google Search Console - Removals](https://support.google.com/webmasters/answer/9689846)
- [Google - Remove outdated content](https://support.google.com/webmasters/answer/1663419)
- [Google - Block URLs with robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)

---

## 💡 Astuce

**Si vous ne trouvez pas "Removals" dans GSC :**

1. Vérifier que vous êtes sur la bonne propriété (www.amusicadasegunda.com)
2. Chercher dans le menu **"Index"** → **"Removals"**
3. Ou utiliser l'URL directe mentionnée ci-dessus

**Note :** La fonctionnalité "Removals" peut avoir des noms différents selon la langue de votre interface GSC :
- 🇬🇧 English: "Removals"
- 🇫🇷 Français: "Suppressions"
- 🇵🇹 Português: "Remoções"
