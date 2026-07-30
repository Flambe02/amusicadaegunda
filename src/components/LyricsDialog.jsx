import { Suspense, lazy, useEffect, useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { resolveLyricsText } from '@/lib/lrc';
import { deriveSongSlug, hasLearnContent } from '@/lib/learnContent';

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
}) {
  // Le mode par défaut est TOUJOURS « Letra » : le comportement historique de cet
  // overlay est inchangé, le mode Aprender s'ajoute à côté (§6.1).
  const [mode, setMode] = useState('letra');
  const slug = slugProp || deriveSongSlug(song);
  const learnAvailable = hasLearnContent(slug);

  // Retour à « Letra » si l'overlay change de chanson ou se ferme — le choix n'a pas
  // besoin d'être mémorisé entre les sessions en bêta (§6.1).
  useEffect(() => { setMode('letra'); }, [slug, open]);

  if (!song) return null;
  const lyricsText = resolveLyricsText(song);

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
          {mode === 'aprender' ? (
            <ScrollArea className="h-[55vh]">
              <div className="pr-4">
                <Suspense
                  fallback={(
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Chargement du mode Aprender…
                    </div>
                  )}
                >
                  <LearnPanel song={song} slug={slug} />
                </Suspense>
              </div>
            </ScrollArea>
          ) : mode === 'ficha' ? (
            <ScrollArea className="h-[55vh]">
              <div className="pr-4">
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
              </div>
            </ScrollArea>
          ) : lyricsText ? (
            <ScrollArea className="h-[55vh]">
              <div className="pr-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">
                  {lyricsText}
                </pre>
              </div>
            </ScrollArea>
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
      </DialogContent>
    </Dialog>
  );
}
