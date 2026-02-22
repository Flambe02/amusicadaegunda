-- Add slug support for songs to avoid full-table scans on getBySlug
-- Safe migration: additive changes only

alter table if exists public.songs
  add column if not exists slug text;

create extension if not exists unaccent;

create or replace function public.slugify_title(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(
      lower(unaccent(coalesce(input, ''))),
      '[^a-z0-9\\s-]', '', 'g'
    ),
    '\\s+', '-', 'g'
  ));
$$;

update public.songs
set slug = public.slugify_title(title)
where slug is null and title is not null;

create or replace function public.set_song_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := public.slugify_title(new.title);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_song_slug on public.songs;
create trigger trg_set_song_slug
before insert or update of title, slug on public.songs
for each row
execute function public.set_song_slug();

create index if not exists idx_songs_slug on public.songs(slug);
