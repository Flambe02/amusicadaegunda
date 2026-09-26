import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Drawer as DrawerPrimitive } from 'vaul';
import { Search as SearchIcon, X } from 'lucide-react';
import { Song } from '@/api/entities';
import { getPublicSlug, monthYearLabel } from '@/components/mobile/feed/feedMedia';
import TileImage from './TileImage';
import {
  RECENT_SUGGESTIONS,
  buildSearchText,
  filterEntries,
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

/**
 * Clavier ouvert (iOS / Android) : hauteur visible et décalage du bas, lus sur
 * `visualViewport`, pour que le panneau tienne au-dessus du clavier. null sans clavier.
 */
function useKeyboardInset(active) {
  const [inset, setInset] = useState(null);
  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!active || !viewport) return undefined;
    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(covered > 80 ? { bottom: covered, height: Math.round(viewport.height - 8) } : null);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      setInset(null);
    };
  }, [active]);
  return inset;
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
  const slug = getPublicSlug(song);

  return (
    <li>
      <Link
        to={`/?musica=${encodeURIComponent(slug)}`}
        onClick={onPick}
        className="relative block aspect-[9/16] touch-manipulation overflow-hidden rounded-xl border border-white/10 bg-[#1b1c22] active:opacity-80"
      >
        <TileImage song={song} />
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

/**
 * Liste compacte pendant la saisie : miniature carrée de 44 px, titre, mois. Elle
 * tient dans la hauteur visible au-dessus du clavier.
 */
function SongList({ songs, onPick }) {
  return (
    <ul data-search-list className="-mx-1 space-y-0.5">
      {songs.map((song) => (
        <li key={song.id ?? song.slug ?? song.title}>
          <Link
            to={`/?musica=${encodeURIComponent(getPublicSlug(song))}`}
            onClick={onPick}
            className="flex min-h-[52px] touch-manipulation items-center gap-3 rounded-xl px-1 py-1 active:bg-white/5"
          >
            <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#1b1c22]">
              <TileImage song={song} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-tight text-white">{song.title}</span>
              {monthYearLabel(song) ? (
                <span className="mt-0.5 block text-[13px] leading-tight text-white/60">{monthYearLabel(song)}</span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SongGrid({ songs, onPick }) {
  return (
    <ul data-search-grid className="grid grid-cols-3 gap-2">
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
 * tête : le champ et « Cancelar ». À l'ouverture, AUCUN focus sur le champ : clavier
 * fermé, on voit mois, thèmes et grille (test iPhone du 2026-09-25 — le clavier ouvert
 * d'emblée cachait tout). Le clavier s'ouvre quand on touche le champ. Sans saisie :
 * pastilles « Por mês » (seuls les mois qui ont des chansons, le plus récent choisi
 * par défaut) et « Por tema », qui se combinent ; grille de vignettes 9:16. Avec une
 * saisie : tout le catalogue, filtres masqués (H.8.3), résultats en liste compacte
 * qui tient au-dessus du clavier (hauteur du panneau = zone visible, visualViewport).
 * Sans résultat : phrase courte + chansons récentes, jamais une liste vide seule.
 * Faire défiler la grille ou la liste ferme le clavier ; la touche « Rechercher » du
 * clavier aussi, en gardant les résultats.
 *
 * Fermeture : Cancelar, glissement vers le bas, Escape. Un tap sur une vignette ouvre
 * le feed sur cette chanson (`/?musica=<slug>`).
 *
 * Anneau de focus : seulement à la navigation clavier. Un champ texte touché au doigt
 * est « focus-visible » pour les navigateurs : on le signale (`data-pointer-focus`)
 * pour retirer l'anneau jaune dans ce cas.
 */
export default function SearchSheet({ open, onOpenChange, returnFocusRef }) {
  const inputRef = useRef(null);
  const contentRef = useRef(null);
  const pointerFocusRef = useRef(false);
  const [pointerFocus, setPointerFocus] = useState(false);
  const touchStartYRef = useRef(null);
  const keyboardInset = useKeyboardInset(open);
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
  /** Un défilement de la grille ou de la liste ferme le clavier. */
  const dismissKeyboard = () => {
    if (document.activeElement === inputRef.current) inputRef.current.blur();
  };
  const loading = songs === null;

  return (
    // repositionInputs={false} : la hauteur au-dessus du clavier est gérée ici (visualViewport).
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} repositionInputs={false}>
      <DrawerPrimitive.Portal>
        {/* Transparente, comme celle du panneau História : pas de voile sur la vidéo du
            feed. Elle ne sert qu'à fermer au tap en dehors du panneau. */}
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-transparent" />
        <DrawerPrimitive.Content
          aria-describedby={undefined}
          data-search-sheet=""
          ref={contentRef}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            // Jamais le champ : clavier fermé à l'ouverture. Le focus va au panneau
            // lui-même (il reste piégé dedans pour la navigation clavier).
            event.preventDefault();
            contentRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef?.current?.focus({ preventScroll: true });
          }}
          // Clavier ouvert : le panneau se pose sur le clavier et prend la hauteur visible.
          style={keyboardInset ? { bottom: keyboardInset.bottom, height: keyboardInset.height } : undefined}
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
                onPointerDown={() => { pointerFocusRef.current = true; }}
                onFocus={() => { setPointerFocus(pointerFocusRef.current); pointerFocusRef.current = false; }}
                onBlur={() => setPointerFocus(false)}
                data-pointer-focus={pointerFocus ? 'true' : undefined}
                aria-label="Buscar por título ou letra"
                placeholder="Título ou trecho da letra"
                // 16 px : en dessous, iOS zoome la page au focus.
                className="h-11 w-full rounded-full bg-white/10 pl-10 pr-10 text-base text-white placeholder:text-white/50 data-[pointer-focus=true]:focus-visible:!shadow-none data-[pointer-focus=true]:focus-visible:!outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {typing ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
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

          <div
            data-search-results
            onTouchStart={(event) => { touchStartYRef.current = event.touches[0]?.clientY ?? null; }}
            onTouchMove={(event) => {
              const start = touchStartYRef.current;
              if (start != null && Math.abs((event.touches[0]?.clientY ?? start) - start) > 8) dismissKeyboard();
            }}
            onWheel={dismissKeyboard}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
          >
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
              typing ? <SongList songs={results} onPick={close} /> : <SongGrid songs={results} onPick={close} />
            ) : (
              <div>
                <p className="pb-4 pt-2 text-base font-semibold text-white">
                  {catalog.length > 0
                    ? typing
                      ? 'Nada com essas palavras. Que tal uma das mais recentes?'
                      : 'Nada com esse filtro. Que tal uma das mais recentes?'
                    : 'As músicas não carregaram agora.'}
                </p>
                {recent.length > 0 ? (
                  typing ? <SongList songs={recent} onPick={close} /> : <SongGrid songs={recent} onPick={close} />
                ) : null}
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
