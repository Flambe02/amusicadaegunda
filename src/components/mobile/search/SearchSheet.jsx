import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Drawer as DrawerPrimitive } from 'vaul';
import { Search as SearchIcon, X } from 'lucide-react';
import { Song } from '@/api/entities';
import { YT_PLACEHOLDER_MAX_WIDTH, getPublicSlug } from '@/components/mobile/feed/feedMedia';
import {
  RECENT_SUGGESTIONS,
  buildSearchText,
  filterEntries,
  getTileCandidates,
  monthChipLabel,
  monthOptions,
  publishedNewestFirst,
  themeOptions,
} from './searchCatalog';

// Une seule lecture du catalogue par visite : Song.list retombe sur content/songs.json
// si Supabase est indisponible (addendum §B « Données »). Un échec n'est pas mémorisé.
let catalogPromise = null;
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = Song.list('-release_date')
      .then((list) => (Array.isArray(list) ? list : []))
      .catch(() => []);
    catalogPromise.then((list) => {
      if (!list.length) catalogPromise = null;
    });
  }
  return catalogPromise;
}

const CHIP = 'flex h-9 flex-shrink-0 touch-manipulation items-center rounded-full px-4 text-sm font-semibold transition-colors';
const CHIP_ON = 'bg-white text-black';
const CHIP_OFF = 'border border-white/15 bg-white/5 text-white/80 active:bg-white/10';

/**
 * Vignette 9:16 : miniature (chaîne de replis de `getTileCandidates`), titre en bas sur
 * un dégradé (la vignette n'est pas la vidéo : la règle « pas de voile » ne s'y applique
 * pas). Si aucune image ne charge, la case reste sombre avec son titre.
 */
function SongTile({ song, onPick }) {
  const candidates = useMemo(() => getTileCandidates(song), [song]);
  const [index, setIndex] = useState(0);
  const slug = getPublicSlug(song);
  const src = candidates[index];

  const next = () => setIndex((i) => i + 1);
  const onLoad = (event) => {
    const width = event.currentTarget.naturalWidth || 0;
    if (width > 0 && width < YT_PLACEHOLDER_MAX_WIDTH) next(); // vignette grise de YouTube
  };

  return (
    <li>
      <Link
        to={`/?musica=${encodeURIComponent(slug)}`}
        onClick={onPick}
        className="relative block aspect-[9/16] touch-manipulation overflow-hidden rounded-xl border border-white/10 bg-[#1b1c22] active:opacity-80"
      >
        {src ? (
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={onLoad}
            onError={next}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
        />
        <span className="absolute inset-x-0 bottom-0 line-clamp-3 px-2 pb-2 text-[13px] font-bold leading-tight text-white">
          {song.title}
        </span>
      </Link>
    </li>
  );
}

function SongGrid({ songs, onPick }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {songs.map((song) => (
        <SongTile key={song.id ?? song.slug ?? song.title} song={song} onPick={onPick} />
      ))}
    </ul>
  );
}

/**
 * Panneau de recherche mobile (étape 10, addendum catálogo §B « Recherche »), ouvert
 * par l'onglet « Buscar » depuis n'importe quel écran. Monté dans la coquille mobile
 * de `Layout`.
 *
 * Il monte du bas (≈ 94 % de la hauteur), fond #111217, coins de 26 px, poignée. En
 * tête : le champ (le clavier s'ouvre directement) et « Cancelar ». Sans saisie :
 * pastilles « Por mês » (seuls les mois qui ont des chansons, le plus récent choisi
 * par défaut) et « Por tema », qui se combinent ; grille de vignettes 9:16. Avec une
 * saisie : tout le catalogue, filtres masqués (H.8.3). Sans résultat : phrase courte
 * + chansons récentes, jamais une grille vide seule.
 *
 * Fermeture : Cancelar, glissement vers le bas, Escape. Un tap sur une vignette ouvre
 * le feed sur cette chanson (`/?musica=<slug>`).
 *
 * Clavier iOS : Safari n'ouvre le clavier que si le focus est donné DANS le geste.
 * `Layout` donne donc le focus à un champ relais invisible au tap sur « Buscar » ;
 * à l'ouverture, le focus passe du relais à notre champ et le clavier reste ouvert.
 */
export default function SearchSheet({ open, onOpenChange, returnFocusRef }) {
  const inputRef = useRef(null);
  const [songs, setSongs] = useState(null); // null = en cours de chargement
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(null);
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    loadCatalog().then((list) => {
      if (alive) setSongs(list);
    });
    return () => { alive = false; };
  }, [open]);

  const entries = useMemo(
    () => publishedNewestFirst(songs).map((song) => ({ song, searchText: buildSearchText(song) })),
    [songs]
  );
  const catalog = useMemo(() => entries.map((entry) => entry.song), [entries]);
  const months = useMemo(() => monthOptions(catalog), [catalog]);
  const themes = useMemo(() => themeOptions(catalog), [catalog]);

  // À chaque ouverture : champ vide, le mois le plus récent, aucun thème.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTheme(null);
    setMonth(null);
  }, [open]);
  const monthsReady = months.length > 0;
  useEffect(() => {
    if (open && monthsReady) setMonth((current) => current ?? months[0]);
  }, [open, monthsReady, months]);

  const typing = query.trim().length > 0;
  const results = useMemo(() => filterEntries(entries, { query, month, theme }), [entries, query, month, theme]);
  const recent = useMemo(() => catalog.slice(0, RECENT_SUGGESTIONS), [catalog]);
  const latestYear = months[0]?.slice(0, 4);
  const shownYear = (month || months[0] || '').slice(0, 4);

  const close = () => onOpenChange(false);
  const loading = songs === null;

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerPrimitive.Portal>
        {/* Transparente, comme celle du panneau História : pas de voile sur la vidéo du
            feed. Elle ne sert qu'à fermer au tap en dehors du panneau. */}
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-transparent" />
        <DrawerPrimitive.Content
          aria-describedby={undefined}
          data-search-sheet=""
          onOpenAutoFocus={(event) => {
            // vaul coupe le focus automatique de Radix : on le donne au champ nous-mêmes.
            event.preventDefault();
            inputRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            // Radix rendrait le focus au champ relais (le dernier focus avant l'ouverture),
            // ce qui rouvrirait le clavier : on le rend au bouton « Buscar ».
            event.preventDefault();
            returnFocusRef?.current?.focus({ preventScroll: true });
          }}
          className="fixed inset-x-0 bottom-0 z-[200] flex h-[94svh] flex-col rounded-t-[26px] border-t border-white/10 bg-[#111217] text-white shadow-app-float outline-none motion-reduce:!animate-none motion-reduce:!transition-none"
        >
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 flex-shrink-0 rounded-full bg-white/20" />
          <DrawerPrimitive.Title className="sr-only">Buscar músicas</DrawerPrimitive.Title>

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              inputRef.current?.blur(); // « Buscar » du clavier : range le clavier
            }}
            className="flex flex-shrink-0 items-center gap-2 px-4 pb-3 pt-3"
          >
            <label className="relative flex min-w-0 flex-1 items-center">
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 h-5 w-5 text-white/60" />
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar por título ou letra"
                placeholder="Título ou trecho da letra"
                // 16 px : en dessous, iOS zoome la page au focus.
                className="h-11 w-full rounded-full bg-white/10 pl-10 pr-10 text-base text-white placeholder:text-white/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {typing ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Limpar a busca"
                  className="absolute right-0 flex h-11 w-11 touch-manipulation items-center justify-center text-white/60"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </label>
            <button
              type="button"
              onClick={close}
              className="flex h-11 flex-shrink-0 touch-manipulation items-center px-2 text-base font-semibold text-white active:opacity-70"
            >
              Cancelar
            </button>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
            {!typing && months.length > 0 ? (
              <section aria-label="Filtros" className="space-y-4 pb-4">
                <div>
                  <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/60">
                    Por mês · {shownYear}
                  </h2>
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                    {months.map((key) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={month === key}
                        onClick={() => setMonth(month === key ? null : key)}
                        className={`${CHIP} ${month === key ? CHIP_ON : CHIP_OFF}`}
                      >
                        {monthChipLabel(key, latestYear)}
                      </button>
                    ))}
                  </div>
                </div>
                {themes.length > 0 ? (
                  <div>
                    <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/60">Por tema</h2>
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                      {themes.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          aria-pressed={theme === item.value}
                          onClick={() => setTheme(theme === item.value ? null : item.value)}
                          className={`${CHIP} ${theme === item.value ? CHIP_ON : CHIP_OFF}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {loading ? (
              <ul aria-hidden="true" className="grid grid-cols-3 gap-2">
                {Array.from({ length: RECENT_SUGGESTIONS }, (_, i) => (
                  <li key={i} className="aspect-[9/16] rounded-xl bg-white/5 motion-safe:animate-pulse" />
                ))}
              </ul>
            ) : results.length > 0 ? (
              <SongGrid songs={results} onPick={close} />
            ) : (
              <div>
                <p className="pb-4 pt-2 text-base font-semibold text-white">
                  {catalog.length > 0
                    ? typing
                      ? 'Nada com essas palavras. Que tal uma das mais recentes?'
                      : 'Nada com esse filtro. Que tal uma das mais recentes?'
                    : 'As músicas não carregaram agora.'}
                </p>
                {recent.length > 0 ? <SongGrid songs={recent} onPick={close} /> : null}
              </div>
            )}

            <p aria-live="polite" className="sr-only">
              {loading ? '' : results.length > 0 ? `${results.length} ${results.length > 1 ? 'músicas' : 'música'}` : 'Nenhum resultado'}
            </p>

            <Link
              to="/musica"
              onClick={close}
              className="mt-5 flex min-h-[48px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white active:bg-white/10"
            >
              Ver todas as músicas
            </Link>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
