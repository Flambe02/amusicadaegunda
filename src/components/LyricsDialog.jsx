import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { AlertCircle, FileText, Loader2, RefreshCw, X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { resolveLyricsText } from '@/lib/lrc';
import { deriveSongSlug, hasLearnContent } from '@/lib/learnContent';
import { useFullSong } from '@/hooks/useFullSong';
import VerseShareLyrics from '@/components/lyrics/VerseShareLyrics';

// Modo Aprender — chargé à la demande, et seulement pour les chansons qui ont une
// fiche. Aucune des 55 autres chansons ne télécharge ce code (§9 de la spec).
const LearnPanel = lazy(() => import('@/components/learn/LearnPanel'));
// Ficha de estudo — même principe, chunk séparé de LearnPanel : un utilisateur qui ne
// visite jamais l'onglet Ficha ne télécharge jamais ce composant non plus.
const StudySheetPanel = lazy(() => import('@/components/learn/StudySheetPanel'));

export default function LyricsDialog({
  open,
  onOpenChange,
  song,
  title = "Letras da Música",
  showIcon = true,
  // Slug de la route quand l'appelant en a un (page /musica/:slug). Sinon on dérive
  // le slug canonique du titre — voir deriveSongSlug : `song.slug` n'est pas fiable
  // tant que la base n'est pas réalignée.
  slug: slugProp = null,
  // Feed et Catálogo mobiles : panneau qui monte du bas, comme « História »
  // (FeedStorySheet), au lieu de la fenêtre centrée.
  asSheet = false,
}) {
  // Le mode par défaut est TOUJOURS « Letra » : le comportement historique de cet
  // overlay est inchangé, le mode Aprender s'ajoute à côté (§6.1).
  const [mode, setMode] = useState('letra');
  const slug = slugProp || deriveSongSlug(song);
  const learnAvailable = hasLearnContent(slug);

  // Retour à « Letra » si l'overlay change de chanson ou se ferme — le choix n'a pas
  // besoin d'être mémorisé entre les sessions en bêta (§6.1).
  useEffect(() => { setMode('letra'); }, [slug, open]);

  // L'accueil ne charge qu'un résumé des chansons : la letra arrive à l'ouverture.
  const { song: fullSong, isLoading: lyricsLoading, error: loadError, retry } = useFullSong(song, open);

  if (!song) return null;
  const lyricsText = resolveLyricsText(fullSong);
  const body = (
    <LyricsBody
      mode={mode}
      setMode={setMode}
      learnAvailable={learnAvailable}
      loadError={loadError}
      retry={retry}
      fullSong={fullSong}
      slug={slug}
      lyricsText={lyricsText}
      lyricsLoading={lyricsLoading}
      scrollClass={asSheet ? '' : 'h-[55vh]'}
      shareVerses={asSheet}
      song={song}
    />
  );

  if (asSheet) {
    return <LyricsSheet open={open} onOpenChange={onOpenChange} song={song} body={body} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-xl overflow-hidden border-white/10 bg-[#111111]/95 p-0 text-white [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            {showIcon && <FileText className="h-5 w-5 text-[#FDE047]" />}
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Song info strip */}
        {song.title && (
          <div className="border-b border-white/8 px-6 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">Música</p>
            <p className="mt-0.5 font-semibold text-white">{song.title}</p>
          </div>
        )}

        {body}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Version panneau : même style et même fermeture que « História » (FeedStorySheet) —
 * monte du bas, poignée, glissement vers le bas, Escape, tap en dehors, aucun voile
 * sur la vidéo. Le texte défile dans le panneau.
 */
function LyricsSheet({ open, onOpenChange, song, body }) {
  const closeRef = useRef(null);
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-transparent" />
        <DrawerPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus();
          }}
          className="fixed inset-x-0 bottom-0 z-[200] flex max-h-[85svh] flex-col rounded-t-[26px] border-t border-white/10 bg-[#111217] pb-[max(env(safe-area-inset-bottom),0.5rem)] text-white shadow-app-float outline-none motion-reduce:!animate-none motion-reduce:!transition-none"
        >
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 flex-shrink-0 rounded-full bg-white/20" />
          <div className="flex items-start gap-3 px-5 pb-1 pt-4">
            <div className="min-w-0 flex-1">
              <DrawerPrimitive.Title className="text-lg font-bold leading-tight tracking-tight">
                {song?.title}
              </DrawerPrimitive.Title>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">Letra</p>
            </div>
            <DrawerPrimitive.Close
              ref={closeRef}
              aria-label="Fechar"
              className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 active:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DrawerPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {body}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

// `className` vide (panneau) : c'est le panneau qui défile, pas une zone interne.
function LyricsScroll({ className, children }) {
  if (!className) return <div>{children}</div>;
  return (
    <ScrollArea className={className}>
      <div className="pr-4">{children}</div>
    </ScrollArea>
  );
}

/** Bascule Letra / Aprender / Ficha et corps (letra, chargement, erreur, vide). */
function LyricsBody({ mode, setMode, learnAvailable, loadError, retry, fullSong, slug, lyricsText, lyricsLoading, scrollClass, shareVerses = false, song }) {
  return (
    <>
      {/* Toggle Letra / Aprender / Ficha — discret, jamais auto-activé, absent des
          chansons sans fiche pour ne rien promettre qui n'existe pas. */}
      {learnAvailable && (
        <div className="border-b border-white/8 px-6 py-3">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5" role="group" aria-label="Mode de lecture des paroles">
            {[
              { value: 'letra', label: 'Letra' },
              { value: 'aprender', label: 'Aprender' },
              { value: 'ficha', label: 'Ficha' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  mode === value
                    ? 'bg-[#FDE047] text-black'
                    : 'text-white/55 hover:text-white/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {(mode === 'aprender' || mode === 'ficha') && (
            <p className="mt-2 text-[11px] text-white/35">
              Bêta · apprentissage du portugais brésilien pour francophones
            </p>
          )}
        </div>
      )}

      {/* Corps */}
      <div className="px-6 pb-6 pt-4">
        {loadError && mode !== 'ficha' ? (
          // Échec de chargement ≠ chanson sans letra : on le dit, et on peut réessayer.
          <div className="flex flex-col items-center py-12 text-center" role="alert">
            <AlertCircle className="mb-4 h-12 w-12 text-red-400/80" aria-hidden="true" />
            <p className="font-semibold text-white/80">Não foi possível carregar a letra</p>
            <p className="mt-1 text-sm text-white/45">Verifique a conexão e tente de novo.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        ) : mode === 'aprender' ? (
          <LyricsScroll className={scrollClass}>
            <Suspense
              fallback={(
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Chargement du mode Aprender…
                </div>
              )}
            >
              <LearnPanel song={fullSong} slug={slug} />
            </Suspense>
          </LyricsScroll>
        ) : mode === 'ficha' ? (
          <LyricsScroll className={scrollClass}>
            <Suspense
              fallback={(
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Chargement da ficha…
                </div>
              )}
            >
              <StudySheetPanel slug={slug} />
            </Suspense>
          </LyricsScroll>
        ) : lyricsText && shareVerses ? (
          // Panneau mobile : phrases à toucher → « Compartilhar como imagem ».
          <VerseShareLyrics lyricsText={lyricsText} song={fullSong || song} slug={slug} />
        ) : lyricsText ? (
          <LyricsScroll className={scrollClass}>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">
              {lyricsText}
            </pre>
          </LyricsScroll>
        ) : lyricsLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando a letra…
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-white/20" />
            <p className="font-semibold text-white/60">Letras não disponíveis</p>
            <p className="mt-1 text-sm text-white/38">
              As letras desta música serão adicionadas em breve.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
