import KaraokeSongCard from './KaraokeSongCard';

/**
 * Un groupe mensuel : en-tête (mois + compteur) + grille responsive de cartes.
 */
export default function KaraokeMonthSection({ label, songs, onSelect }) {
  return (
    <section className="karaoke-month" aria-label={label}>
      <div className="karaoke-month-header">
        <h2 className="karaoke-month-title">{label}</h2>
        <span className="karaoke-month-count">
          {songs.length} música{songs.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="karaoke-grid">
        {songs.map((song) => (
          <KaraokeSongCard key={song.id} song={song} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
