# 🔍 Analyse du Problème de Sauvegarde

## Problème Identifié

L'erreur "Une chanson avec cette URL/ID existe déjà" apparaît même quand `existingSong` est `null`, ce qui indique que :

1. **La vérification préalable des doublons ne trouve pas la chanson existante**
2. **L'insertion échoue avec une erreur 23505 (duplicate key)**
3. **La recherche après l'erreur ne trouve toujours pas la chanson**

## Causes Possibles

### 1. **RLS Policies Limitant les SELECT**

Les RLS policies peuvent limiter les résultats des requêtes SELECT, même pour les admins. Si la policy `songs_admin_full_access` ne permet pas de voir toutes les chansons (par exemple, seulement les chansons `published`), alors la vérification préalable ne trouvera pas les doublons dans les chansons `draft`.

**Solution :** Vérifier que la policy admin permet bien de voir TOUTES les chansons :
```sql
-- La policy doit avoir USING sans restriction de status
CREATE POLICY "songs_admin_full_access" ON public.songs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
);
```

### 2. **Contrainte UNIQUE sur un Autre Champ**

Il peut y avoir une contrainte UNIQUE sur un champ autre que `youtube_url` ou `tiktok_video_id` (par exemple, sur `title` ou un autre champ).

**Solution :** Exécuter `supabase/scripts/check_unique_constraints.sql` pour identifier toutes les contraintes UNIQUE.

### 3. **Index UNIQUE Partiel**

Il peut y avoir un index UNIQUE partiel (par exemple, sur `youtube_url` seulement pour les valeurs non-null) qui bloque l'insertion.

**Solution :** Vérifier les index avec le script `check_unique_constraints.sql`.

## Corrections Apportées

### 1. **Vérification Admin Avant la Vérification des Doublons**

La vérification admin est maintenant faite AVANT la vérification des doublons, ce qui garantit que les requêtes SELECT utilisent les bonnes permissions.

### 2. **Gestion Améliorée des Erreurs 23505**

- Extraction du champ en conflit depuis le message d'erreur
- Recherche ciblée de la chanson existante basée sur le champ en conflit
- Message d'erreur plus clair avec le champ en conflit

### 3. **Logs Améliorés**

Ajout de logs pour diagnostiquer les problèmes :
- Logs des erreurs de recherche de doublons
- Logs du champ en conflit lors d'une erreur 23505

## Étapes de Diagnostic

### Étape 1 : Vérifier les RLS Policies

Exécutez dans Supabase SQL Editor :
```sql
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'songs';
```

**Vérifiez que :**
- La policy `songs_admin_full_access` existe
- Elle a `cmd = 'ALL'`
- Le `USING` ne limite pas par `status` (pas de `status = 'published'`)

### Étape 2 : Vérifier les Contraintes UNIQUE

Exécutez `supabase/scripts/check_unique_constraints.sql` pour voir toutes les contraintes UNIQUE.

### Étape 3 : Tester la Sauvegarde avec Logs

1. Ouvrez la console du navigateur (F12)
2. Essayez de créer une chanson
3. Regardez les logs :
   - `✅ Vérification admin OK` doit apparaître
   - `✅ Vérification des doublons OK` doit apparaître
   - Si erreur 23505, regardez `⚠️ Champ en conflit:`

### Étape 4 : Vérifier les Doublons Existants

Si l'erreur persiste, vérifiez s'il y a vraiment des doublons :
```sql
-- Vérifier les doublons youtube_url
SELECT youtube_url, COUNT(*) 
FROM public.songs 
WHERE youtube_url IS NOT NULL 
GROUP BY youtube_url 
HAVING COUNT(*) > 1;
```

## Solutions Possibles

### Solution 1 : Corriger les RLS Policies

Si la policy admin limite les SELECT, modifiez-la pour permettre de voir toutes les chansons :
```sql
DROP POLICY IF EXISTS "songs_admin_full_access" ON public.songs;

CREATE POLICY "songs_admin_full_access" ON public.songs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  )
);
```

### Solution 2 : Supprimer une Contrainte UNIQUE Problématique

Si une contrainte UNIQUE bloque inutilement :
```sql
-- Remplacer nom_de_la_contrainte par le nom trouvé dans check_unique_constraints.sql
ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS nom_de_la_contrainte;
```

### Solution 3 : Permettre les Doublons Temporairement

Si vous voulez permettre les doublons pour tester :
```sql
-- Supprimer la contrainte UNIQUE sur youtube_url (si elle existe)
ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_youtube_url_key;
DROP INDEX IF EXISTS songs_youtube_url_unique;
```

## Résultat Attendu

Après les corrections :
- ✅ La vérification admin se fait avant la vérification des doublons
- ✅ Les erreurs 23505 sont mieux gérées avec des messages clairs
- ✅ Les logs permettent de diagnostiquer les problèmes
- ✅ La sauvegarde fonctionne si les RLS policies sont correctes

