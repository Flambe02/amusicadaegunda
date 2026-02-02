# Correction des erreurs SEO - Google Search Console

## Erreur 1 : "Page with redirect"

Google Search Console signale 4 pages avec redirection :

| URL | Problème | Solution |
|-----|----------|----------|
| `http://amusicadasegunda.com/` | HTTP sans www | ✅ Normal - redirection vers HTTPS+www |
| `https://amusicadasegunda.com/` | HTTPS sans www | ✅ Normal - redirection vers www |
| `http://www.amusicadasegunda.com/` | HTTP avec www | ✅ Normal - redirection vers HTTPS |
| `https://www.amusicadasegunda.com/chansons/debaixo-da-pia` | Ancienne URL | ⚠️ À supprimer de l'index |

## Comprendre le problème

### Variantes de domaine (3 premières URLs)
Ces redirections sont **normales et correctes**. Toutes les variantes doivent rediriger vers la version canonique `https://www.amusicadasegunda.com/`.

- `http://` → `https://` (sécurité SSL)
- Sans `www.` → avec `www.` (consistance)

**Action requise** : AUCUNE. Google finira par comprendre et arrêtera de crawler ces variantes.

### Anciennes URLs `/chansons/`
L'URL `/chansons/debaixo-da-pia` a été migrée vers `/musica/debaixo-da-pia/`. La page de redirection a :
- `meta http-equiv="refresh"` (redirection)
- `rel="canonical"` vers la nouvelle URL
- `robots: noindex, follow`

## Actions correctives effectuées

### 1. Headers HTTP améliorés (`_headers`)
```
/chansons/*
  X-Robots-Tag: noindex, follow
  Link: </musica/>; rel="canonical"
```

### 2. Balises meta dans les pages de redirection
```html
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://www.amusicadasegunda.com/musica/debaixo-da-pia/">
```

## Actions manuelles dans Google Search Console

### Étape 1 : Utiliser l'outil "Removals" (Suppressions)

1. Connectez-vous à [Google Search Console](https://search.google.com/search-console)
2. Sélectionnez la propriété `www.amusicadasegunda.com`
3. Dans le menu, cliquez sur **Indexation** → **Suppressions**
4. Cliquez sur **Nouvelle demande**
5. Entrez l'URL : `https://www.amusicadasegunda.com/chansons/debaixo-da-pia`
6. Choisissez **Supprimer uniquement cette URL**
7. Confirmez la demande

### Étape 2 : Demander la réindexation des URLs canoniques

1. Dans Google Search Console, allez dans **Inspection de l'URL**
2. Entrez : `https://www.amusicadasegunda.com/musica/debaixo-da-pia/`
3. Cliquez sur **Demander l'indexation**
4. Répétez pour les autres pages `/musica/` si nécessaire

### Étape 3 : Vérifier la validation

1. Retournez dans **Indexation** → **Pages**
2. Cliquez sur **"Page with redirect"**
3. Cliquez sur **Valider la correction**
4. Google va re-crawler les pages pour vérifier

## Vérification après correction

### Test de l'URL avec l'outil d'inspection

1. Inspectez `https://www.amusicadasegunda.com/chansons/debaixo-da-pia`
2. Vérifiez que :
   - "URL canonique" pointe vers `/musica/debaixo-da-pia/`
   - "Indexation" affiche "Non indexée car noindex"

### Commande curl pour vérifier les headers

```bash
curl -I https://www.amusicadasegunda.com/chansons/debaixo-da-pia/
```

Vérifier la présence de :
- `X-Robots-Tag: noindex, follow`
- `Link: </musica/>; rel="canonical"`

## Délais attendus

| Action | Délai |
|--------|-------|
| Suppression via "Removals" | 24-48 heures |
| Réindexation demandée | 1-2 semaines |
| Disparition automatique des variantes de domaine | 2-4 semaines |
| Validation complète | 4-6 semaines |

## Prévention future

### Lors d'une migration d'URL

1. **Toujours** utiliser des redirections 301 (ou meta refresh avec noindex)
2. **Mettre à jour** le sitemap immédiatement avec les nouvelles URLs
3. **Demander** la suppression des anciennes URLs via GSC
4. **Surveiller** le rapport "Page indexing" pendant 4-6 semaines

### Structure d'URL recommandée

```
https://www.amusicadasegunda.com/musica/{slug}/   ✅ Canonique
https://www.amusicadasegunda.com/chansons/{slug}  ❌ Redirige vers /musica/
```

## Résumé des actions

- [x] Headers `X-Robots-Tag` ajoutés pour `/chansons/*`
- [x] Pages de redirection avec `noindex` + `canonical`
- [ ] Demander la suppression de `/chansons/debaixo-da-pia` via GSC Removals
- [ ] Valider la correction dans GSC
- [ ] Attendre la réindexation (2-4 semaines)

---

## Erreur 2 : "Alternate page with proper canonical tag"

Google Search Console signale 3 pages comme "pages alternatives avec balise canonical correcte" :

| URL | Cause | Solution |
|-----|-------|----------|
| `/?q=%7Bsearch_term_string%7D` | Google a crawlé le template SearchAction JSON-LD | ✅ Bloqué dans robots.txt |
| `/musica/apagao-nao-e-refrao/` | Version avec/sans trailing slash | ℹ️ Informatif, pas d'action |
| `/chansons/check-in-da-cop/` | Redirection vers /musica/ | ✅ Normal, canonical correcte |

### Comprendre cette erreur

"Alternate page with proper canonical tag" n'est **PAS une erreur critique**. C'est un statut informatif qui signifie :
- Google a trouvé la page
- La page a une balise canonical qui pointe vers une autre URL
- Google respecte cette canonical et n'indexera pas cette page

### Correction du template SearchAction

Le problème `/?q=%7Bsearch_term_string%7D` vient du JSON-LD SearchAction :

```json
{
  "@type": "SearchAction",
  "target": "https://www.amusicadasegunda.com/?q={search_term_string}",
  "query-input": "required name=search_term_string"
}
```

Google a crawlé cette URL littéralement au lieu de comprendre que c'est un template.

**Correction appliquée** dans `robots.txt` :
```
Disallow: /*?q=*
Disallow: /?q=
Disallow: /chansons/
```

### Actions dans Google Search Console

1. **Utiliser l'outil "Removals"** pour supprimer :
   - `https://www.amusicadasegunda.com/?q=%7Bsearch_term_string%7D`

2. **Valider la correction** dans Page indexing → "Alternate page with proper canonical tag"

### Note importante

Les pages `/musica/` signalées comme "alternate" sont généralement dues aux versions avec/sans trailing slash. Ce n'est pas un problème - Google choisira la version canonique automatiquement.

---
*Document mis à jour le 2 février 2026*
