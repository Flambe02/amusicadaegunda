# 🔧 Résolution du Problème de Contraintes UNIQUE

## Problème Identifié

L'erreur "Une chanson avec cette URL/ID existe déjà" se produit même quand il n'y a pas vraiment de doublon, ce qui indique qu'une **contrainte UNIQUE ou un index UNIQUE** bloque l'insertion.

## Solution : Supprimer les Contraintes UNIQUE sur `youtube_url`

Le schéma original (`database-schema.sql`) montre que :
- ✅ `tiktok_video_id` a une contrainte UNIQUE (c'est normal et souhaité)
- ❌ `youtube_url` ne devrait **PAS** avoir de contrainte UNIQUE (c'est un champ TEXT simple)

## Étapes pour Résoudre

### Étape 1 : Identifier les Contraintes/Index UNIQUE

Exécutez dans Supabase SQL Editor :
```sql
-- Script: supabase/scripts/check_unique_constraints.sql
```

Cela affichera :
- Toutes les contraintes UNIQUE
- Tous les index UNIQUE
- Les doublons existants

### Étape 2 : Supprimer les Contraintes UNIQUE sur `youtube_url`

Exécutez dans Supabase SQL Editor :
```sql
-- Script: supabase/scripts/fix_unique_constraints.sql
```

Ce script va :
- ✅ Supprimer toutes les contraintes UNIQUE sur `youtube_url`
- ✅ Supprimer tous les index UNIQUE sur `youtube_url`
- ✅ Conserver la contrainte UNIQUE sur `tiktok_video_id` (normal)
- ✅ Vérifier l'état après suppression

### Étape 3 : Vérifier le Résultat

Après l'exécution du script, vous devriez voir :
- ✅ "Aucune contrainte UNIQUE sur youtube_url"
- ✅ "Aucun index UNIQUE sur youtube_url"
- ✅ "Contrainte UNIQUE tiktok_video_id existe (normal)"

### Étape 4 : Tester la Sauvegarde

1. Rechargez la page admin
2. Essayez de créer une nouvelle chanson
3. La sauvegarde devrait maintenant fonctionner

## Pourquoi Supprimer la Contrainte UNIQUE sur `youtube_url` ?

1. **Le schéma original ne prévoit pas de contrainte UNIQUE** sur `youtube_url`
2. **Permet la flexibilité** : plusieurs chansons peuvent partager la même URL YouTube (par exemple, des versions différentes)
3. **La vérification de doublon est gérée au niveau applicatif** : le code vérifie déjà les doublons avant l'insertion
4. **Évite les erreurs 23505** quand la vérification applicative ne trouve pas le doublon (problème de RLS)

## Si Vous Voulez Quand Même une Contrainte UNIQUE

Si vous voulez vraiment empêcher les doublons au niveau base de données, vous pouvez créer un **index UNIQUE partiel** qui permet plusieurs NULL :

```sql
-- Créer un index UNIQUE partiel (permet plusieurs NULL mais pas de doublons)
CREATE UNIQUE INDEX IF NOT EXISTS songs_youtube_url_unique 
ON public.songs(youtube_url) 
WHERE youtube_url IS NOT NULL AND youtube_url != '';
```

**Mais attention :** Cela bloquera toujours l'insertion si une URL existe déjà, même si la vérification applicative ne la trouve pas.

## Résultat Attendu

Après avoir exécuté `fix_unique_constraints.sql` :
- ✅ Plus d'erreur 23505 sur `youtube_url`
- ✅ La sauvegarde fonctionne normalement
- ✅ La vérification de doublon au niveau applicatif continue de fonctionner
- ✅ La contrainte UNIQUE sur `tiktok_video_id` est conservée

## Notes Importantes

- ⚠️ **Ne supprimez PAS la contrainte UNIQUE sur `tiktok_video_id`** : elle est nécessaire et fait partie du schéma original
- ✅ La vérification de doublon au niveau applicatif continue de fonctionner même sans contrainte UNIQUE
- ✅ Vous pouvez toujours nettoyer les doublons manuellement si nécessaire

