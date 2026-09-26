# 🧹 Guide de Nettoyage des Doublons

## Objectif

Nettoyer les doublons existants dans la table `songs` pour éviter les erreurs lors de la création de nouvelles chansons.

## Étape 1 : Identifier les Doublons

Exécutez dans Supabase SQL Editor :
```sql
-- Script: supabase/scripts/cleanup_duplicates.sql
```

Ce script affichera :
- ✅ Les doublons sur `youtube_url` avec leurs IDs et titres
- ✅ Les doublons sur `tiktok_video_id` avec leurs IDs et titres
- ✅ Des recommandations sur quelle chanson conserver

## Étape 2 : Examiner les Résultats

Pour chaque doublon, le script indique :
- **✅ CONSERVER (publiée)** : Chanson avec `status = 'published'` - À CONSERVER
- **✅ CONSERVER (plus ancienne)** : Chanson la plus ancienne - À CONSERVER
- **⚠️ CANDIDAT POUR SUPPRESSION** : Doublon plus récent - Peut être supprimé

## Étape 3 : Nettoyage Manuel (Recommandé)

### Option A : Suppression Manuelle

Pour chaque doublon identifié, supprimez les chansons en double :

```sql
-- Remplacer ID_DU_DOUBLON par l'ID réel de la chanson à supprimer
DELETE FROM public.songs WHERE id = ID_DU_DOUBLON;
```

**Exemple :**
Si vous avez deux chansons avec la même URL YouTube :
- Chanson 1 : ID = 5, créée le 2025-01-01, status = 'published'
- Chanson 2 : ID = 10, créée le 2025-01-15, status = 'draft'

Supprimez la chanson 2 :
```sql
DELETE FROM public.songs WHERE id = 10;
```

### Option B : Nettoyage Automatique

Si vous avez beaucoup de doublons, vous pouvez utiliser le script automatique dans `cleanup_duplicates.sql`.

**⚠️ ATTENTION :** 
- Le script automatique garde la chanson la plus ancienne
- Il ne supprime JAMAIS les chansons avec `status = 'published'`
- Vérifiez d'abord les résultats avant d'exécuter

Pour activer le nettoyage automatique :
1. Ouvrez `supabase/scripts/cleanup_duplicates.sql`
2. Décommentez les lignes après `-- 5. Script pour supprimer automatiquement`
3. Exécutez le script

## Règles de Conservation

### Priorité 1 : Chansons Publiées
**Toujours conserver** les chansons avec `status = 'published'`, même si elles sont plus récentes.

### Priorité 2 : Chansons les Plus Anciennes
Si aucune n'est publiée, conserver la chanson créée en premier (`created_at` le plus ancien).

### Priorité 3 : Chansons avec Plus de Données
Si les dates sont identiques, conserver celle qui a le plus de données (description, lyrics, etc.).

## Exemple de Nettoyage

### Cas 1 : Doublon Simple
```
Chanson A : ID=1, youtube_url='https://youtube.com/watch?v=abc', created_at='2025-01-01', status='draft'
Chanson B : ID=2, youtube_url='https://youtube.com/watch?v=abc', created_at='2025-01-15', status='draft'
```
**Action :** Supprimer la chanson B (plus récente)
```sql
DELETE FROM public.songs WHERE id = 2;
```

### Cas 2 : Doublon avec Chanson Publiée
```
Chanson A : ID=1, youtube_url='https://youtube.com/watch?v=abc', created_at='2025-01-01', status='draft'
Chanson B : ID=2, youtube_url='https://youtube.com/watch?v=abc', created_at='2025-01-15', status='published'
```
**Action :** Supprimer la chanson A (même si plus ancienne, B est publiée)
```sql
DELETE FROM public.songs WHERE id = 1;
```

### Cas 3 : Plusieurs Doublons
```
Chanson A : ID=1, youtube_url='https://youtube.com/watch?v=abc', created_at='2025-01-01', status='draft'
Chanson B : ID=2, youtube_url='https://youtube.com/watch?v=abc', created_at='2025-01-10', status='draft'
Chanson C : ID=3, youtube_url='https://youtube.com/watch?v=abc', created_at='2025-01-20', status='draft'
```
**Action :** Supprimer B et C, garder A (la plus ancienne)
```sql
DELETE FROM public.songs WHERE id IN (2, 3);
```

## Vérification Après Nettoyage

Après avoir nettoyé les doublons, exécutez à nouveau `cleanup_duplicates.sql` pour vérifier :
- ✅ "Aucun doublon youtube_url"
- ✅ "Aucun doublon tiktok_video_id"

## Prévention des Doublons Futurs

Après le nettoyage, la vérification de doublon au niveau applicatif devrait fonctionner correctement. Si vous voulez ajouter une protection supplémentaire au niveau base de données :

```sql
-- Créer un index UNIQUE partiel (optionnel)
CREATE UNIQUE INDEX IF NOT EXISTS songs_youtube_url_unique 
ON public.songs(youtube_url) 
WHERE youtube_url IS NOT NULL AND youtube_url != '';
```

**Mais attention :** Cela peut causer des erreurs 23505 si la vérification applicative ne trouve pas le doublon (problème de RLS).

## Résultat Attendu

Après le nettoyage :
- ✅ Plus de doublons dans la base de données
- ✅ La création de nouvelles chansons fonctionne sans erreur
- ✅ Les chansons importantes (publiées) sont conservées

