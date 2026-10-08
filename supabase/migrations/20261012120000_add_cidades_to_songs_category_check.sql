-- Catégorie « cidades » (2026-10-08) : ajoutée à la contrainte songs_category_check.
--
-- Appliquée à la main dans le tableau de bord Supabase par Florent Lambert avant le
-- reclassement de dix chansons ; ce fichier fait refléter la base par le dépôt.
-- La contrainte n'était écrite dans aucune migration du dépôt : la liste ci-dessous
-- reprend les 13 catégories existantes, plus « cidades ». « energia » reste permise
-- (plus aucune chanson ne l'utilise ; sa page redirige vers « cidades »).
-- Une valeur NULL reste acceptée, comme avec toute contrainte CHECK.
ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_category_check;
ALTER TABLE public.songs ADD CONSTRAINT songs_category_check CHECK (
  category IN (
    'politica', 'economia', 'policia', 'midia', 'internacional', 'energia', 'saude',
    'esporte', 'tecnologia', 'seguranca', 'cultura', 'gastronomia', 'outros', 'cidades'
  )
);
