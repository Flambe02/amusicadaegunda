import { Mic, Music } from 'lucide-react';

/**
 * Hero compact « Palco da Segunda ». Le compteur est dynamique.
 * Volontairement court pour ne pas repousser la recherche sous la ligne de flottaison.
 */
export default function KaraokeHero({ count = 0, showCount = true }) {
  return (
    <header className="karaoke-hero text-center">
      <p className="karaoke-eyebrow">
        <Mic className="h-3.5 w-3.5" aria-hidden="true" /> Palco da Segunda
      </p>
      <h1 className="karaoke-neon karaoke-hero-title">KARAOKÊ</h1>
      <p className="karaoke-hero-subtitle">Escolha uma música ou deixe a sorte decidir.</p>
      {showCount && count > 0 && (
        <p className="karaoke-count-pill" aria-live="polite">
          <Music className="h-3.5 w-3.5" aria-hidden="true" />
          {count} música{count > 1 ? 's' : ''} pronta{count > 1 ? 's' : ''} para cantar
        </p>
      )}
    </header>
  );
}
