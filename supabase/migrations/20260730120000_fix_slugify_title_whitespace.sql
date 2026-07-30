-- Correctif de `public.slugify_title` — les slugs générés perdaient leurs tirets.
--
-- BUG (migration 20260222093000_add_slug_to_songs) :
--   regexp_replace(..., '[^a-z0-9\\s-]', '', 'g')
-- À l'INTÉRIEUR d'une classe de caractères entre crochets, PostgreSQL ne traite pas
-- `\s` comme un raccourci « espace » : la classe excluait littéralement `\`, `s` et `-`.
-- L'espace n'y figurant pas, il était SUPPRIMÉ à cette étape — si bien que le
-- `regexp_replace(..., '\\s+', '-', 'g')` suivant ne trouvait plus rien à convertir.
--   « Camarada Quer CPF » → `camaradaquercpf`   au lieu de   `camarada-quer-cpf`
--
-- Impact : 53 des 59 chansons avaient un slug sans tirets, divergent des URLs
-- publiques (`/musica/camarada-quer-cpf/`) et du slug dérivé côté JS
-- (`generateSlug()` dans scripts/export-songs-from-supabase.cjs). Comme cet export
-- privilégie `song.slug` quand il est renseigné, le prochain build complet aurait
-- régénéré `content/songs.json`, les stubs `docs/musica/<slug>/` et le sitemap sur
-- les slugs sans tirets → 53 URLs indexées cassées.
--
-- CORRECTIF : l'espace devient un membre littéral de la classe conservée
-- (`[^a-z0-9 -]`), et `\s+` reste HORS crochets, où PostgreSQL l'interprète bien.
-- La fonction converge alors exactement avec `generateSlug()` côté JS — vérifié sur
-- les 59 titres : 0 divergence, 0 collision.
--
-- Le trigger `trg_set_song_slug` appelle cette même fonction : le corriger ici
-- suffit à réparer aussi les insertions/renommages futurs.

create or replace function public.slugify_title(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(
      lower(unaccent(coalesce(input, ''))),
      '[^a-z0-9 -]', '', 'g'
    ),
    '\s+', '-', 'g'
  ));
$$;

-- Backfill ciblé : les lignes dont le slug diffère de ce que produit la fonction
-- corrigée. Les lignes déjà correctes ne sont pas touchées, donc `updated_at` n'y
-- bouge pas.
--
-- ⚠️ NE PAS filtrer sur une FORME de slug (ex. `slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'`) :
-- un slug amputé de ses tirets comme `camaradaquercpf` satisfait ce motif — c'est un
-- groupe `[a-z0-9]+` suivi de zéro groupe `-…`. Un tel filtre ne sélectionne aucune
-- des lignes à réparer et l'update passe en silence sans rien corriger. La seule
-- comparaison fiable est celle au résultat de la fonction elle-même.
update public.songs
set slug = public.slugify_title(title)
where slug is distinct from public.slugify_title(title);

-- Garde-fou : l'index unique partiel `idx_songs_slug_unique` (créé par la migration
-- d'origine) refuserait tout doublon introduit par le backfill. Vérifié en amont :
-- aucune collision sur les 59 titres actuels.
