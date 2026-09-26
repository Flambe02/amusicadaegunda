# 🔧 Résolution du Problème de Sauvegarde

## ✅ État Actuel

La policy RLS **"Allow admins full access"** existe et permet toutes les opérations (ALL). 

**MAIS** : Il faut vérifier qu'elle a bien les conditions `USING` et `WITH CHECK` correctes.

## 🔍 Diagnostic à Faire

### Étape 1 : Vérifier les Détails de la Policy

Exécuter dans Supabase SQL Editor :
```sql
-- Fichier: supabase/scripts/check_policy_details.sql
```

Ce script va vérifier :
- Si la condition `USING` vérifie bien la table `admins`
- Si la condition `WITH CHECK` est présente (CRITIQUE pour INSERT/UPDATE)
- Si les deux conditions sont correctes

### Étape 2 : Corriger la Policy si Nécessaire

**Si la policy n'a pas de `WITH CHECK` ou si les conditions sont incorrectes**, exécuter :
```sql
-- Fichier: supabase/scripts/fix_allow_admins_policy.sql
```

Ce script va :
- Supprimer la policy existante
- Recréer la policy avec les bonnes conditions

## ⚠️ Problème Probable

Le problème le plus probable est que la policy **"Allow admins full access"** n'a pas de condition `WITH CHECK`, ce qui bloque les opérations INSERT et UPDATE.

### Pourquoi `WITH CHECK` est Important

- `USING` : Détermine quelles lignes peuvent être lues/modifiées
- `WITH CHECK` : Détermine quelles lignes peuvent être insérées/mises à jour

**Sans `WITH CHECK`, les INSERT et UPDATE sont bloqués même si `USING` est correct !**

## 📋 Solution Complète

### Option 1 : Corriger la Policy Existante

Exécuter dans Supabase SQL Editor :
```sql
-- Supprimer et recréer la policy avec WITH CHECK
DROP POLICY IF EXISTS "Allow admins full access" ON public.songs;

CREATE POLICY "Allow admins full access" ON public.songs
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

### Option 2 : Utiliser le Script de Correction

Exécuter le script : `supabase/scripts/fix_allow_admins_policy.sql`

## ✅ Vérifications Finales

Après avoir corrigé la policy, vérifier :

1. **Que vous êtes bien admin** :
```sql
SELECT a.user_id, u.email
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id;
```

2. **Que la policy est correcte** :
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'songs'
  AND policyname = 'Allow admins full access';
```

3. **Tester la sauvegarde** :
   - Créer une nouvelle chanson
   - Vérifier qu'elle est sauvegardée
   - Vérifier qu'elle apparaît dans la liste

## 🎯 Résumé

- ✅ Policy existe et permet ALL
- ⚠️ **Vérifier que WITH CHECK est présent et correct**
- ✅ Code corrigé pour gérer les erreurs de permission
- ✅ Délai de 500ms avant refresh pour finaliser la transaction

**Action immédiate** : Exécuter `supabase/scripts/check_policy_details.sql` pour voir si `WITH CHECK` est présent.

