import { useEffect, useMemo, useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { getPosterCandidates } from '@/components/mobile/feed/feedMedia';
import {
  MAX_VERSE_LINES,
  nextVerseSelection,
  renderVerseImage,
  shareVerseImage,
  songPageUrl,
} from '@/lib/verseImage';

/**
 * Letra du panneau mobile : chaque phrase se touche. 1 à 3 phrases consécutives →
 * « Compartilhar como imagem » (src/lib/verseImage.js).
 *
 * L'image est préparée dès que la sélection change, pas au clic : iOS n'accepte le
 * menu de partage que tout de suite après le toucher, pas après le chargement des
 * images.
 */
export default function VerseShareLyrics({ lyricsText, song, slug }) {
  const lines = useMemo(() => String(lyricsText || '').split(/\r?\n/), [lyricsText]);
  const [selection, setSelection] = useState(null);
  const [image, setImage] = useState({ key: null, blob: null, failed: false });
  const [status, setStatus] = useState(null);

  // Une autre chanson : on repart de zéro.
  useEffect(() => { setSelection(null); setStatus(null); }, [lyricsText]);

  const verses = selection ? lines.slice(selection.start, selection.end + 1).filter((l) => l.trim()) : [];
  const key = selection ? `${selection.start}-${selection.end}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    setImage({ key, blob: null, failed: false });
    const timer = setTimeout(() => {
      renderVerseImage({ verses, title: song?.title, backgrounds: getPosterCandidates(song) }).then(
        (blob) => { if (active) setImage({ key, blob, failed: false }); },
        () => { if (active) setImage({ key, blob: null, failed: true }); }
      );
    }, 150);
    return () => { active = false; clearTimeout(timer); };
    // `verses` découle de `key` et des paroles.
  }, [key, lyricsText, song]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = image.key === key && image.blob;
  const failed = image.key === key && image.failed;

  const onShare = async () => {
    if (!ready) return;
    const result = await shareVerseImage(image.blob, {
      fileName: `${slug || 'a-musica-da-segunda'}.jpg`,
      text: `${song?.title || 'A Música da Segunda'} — ${songPageUrl(slug)}`,
    });
    if (result !== 'cancelled') {
      setStatus(result === 'downloaded' ? 'Imagem baixada' : null);
      window.gtag?.('event', 'share', { method: 'verse_image', content_type: 'song', item_id: slug || '' });
    }
  };

  const onTap = (index) => {
    setStatus(null);
    setSelection((current) => nextVerseSelection(current, index));
  };

  return (
    <div>
      <p className="mb-3 text-xs text-white/55">
        Toque numa frase (até {MAX_VERSE_LINES} seguidas) para compartilhar como imagem.
      </p>
      <ol className="space-y-0.5" aria-label="Letra">
        {lines.map((line, index) => {
          if (!line.trim()) return <li key={index} aria-hidden="true" className="h-4" />;
          const selected = Boolean(selection && index >= selection.start && index <= selection.end);
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onTap(index)}
                aria-pressed={selected}
                data-verse-line={index}
                className={`-mx-2 w-[calc(100%+1rem)] touch-manipulation rounded-lg px-2 py-1 text-left text-[15px] leading-7 transition-colors ${
                  selected ? 'bg-app-yellow text-black font-semibold' : 'text-white/85 active:bg-white/10'
                }`}
              >
                {line}
              </button>
            </li>
          );
        })}
      </ol>

      {selection ? (
        <div className="sticky bottom-0 -mx-6 mt-4 border-t border-white/10 bg-[#111217] px-6 pb-2 pt-3">
          <button
            type="button"
            onClick={onShare}
            disabled={!ready}
            data-verse-share
            className="flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-app-yellow px-5 text-sm font-black text-black disabled:opacity-60"
          >
            {ready ? <Share2 className="h-4 w-4" aria-hidden="true" /> : <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {failed ? 'Não foi possível criar a imagem' : ready ? 'Compartilhar como imagem' : 'Preparando a imagem…'}
          </button>
          {status ? <p className="mt-2 text-center text-xs text-white/60" role="status">{status}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
