import KaraokeWipeLine from '@/components/karaoke/KaraokeWipeLine';
import KaraokeWordLine from '@/components/karaoke/KaraokeWordLine';
import { TV_LINE_ROLES, tvActiveFontSize } from '@/tv/lib/tvLyricsWindow';

/**
 * Fenêtre de paroles TV resserrée : au maximum 4 lignes montées (précédente,
 * active, suivante, sur-suivante), positions verticales fixes (pas de reflow),
 * ligne active à 47 % de hauteur avec taille adaptative selon sa longueur.
 *
 * Ne touche PAS au moteur de synchronisation (displayIdx vient du poll existant
 * dans KaraokePlayer) — seule la présentation change par rapport au rendu
 * mobile/desktop (scrollable, toutes les lignes montées).
 */
export default function TvKaraokeLyricsWindow({
  lines, displayIdx, wipeApiRef, wordApiRef, fontScale, showBall, dueto, lineColor,
  translating = false,
}) {
  if (!lines || lines.length === 0) {
    return (
      <div className="tv-karaoke-lyrics-window" aria-live="polite">
        <p className="tv-karaoke-line tv-karaoke-line--active" style={{ top: '47%' }}>
          Letra sincronizada em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="tv-karaoke-lyrics-window" aria-live="polite">
      {TV_LINE_ROLES.map(({ role, offset, top }) => {
        // Quand la traduction est active, on laisse tomber la 2ᵉ ligne suivante
        // (82 %) : ce créneau est occupé par le sous-titre de traduction, sinon
        // les deux se chevauchent (cf. .tv-karaoke-translation, bug TV 2026-07-14).
        if (translating && role === 'next2') return null;
        const i = displayIdx + offset;
        if (i < 0 || i >= lines.length) return null;
        const line = lines[i];
        const isActive = role === 'active';
        const duetColor = dueto ? lineColor(i) : null;
        return (
          <p
            key={`${i}-${line.time}`}
            className={`tv-karaoke-line tv-karaoke-line--${role}`}
            style={{
              top,
              fontSize: isActive ? `calc(${tvActiveFontSize(line.text)} * ${fontScale})` : undefined,
              color: !isActive && duetColor ? `${duetColor}aa` : undefined,
            }}
          >
            {isActive ? (
              Array.isArray(line.words) && line.words.length > 0 ? (
                <KaraokeWordLine
                  ref={wordApiRef}
                  words={line.words}
                  showBall={showBall}
                  color={dueto ? lineColor(i) : '#FDE047'}
                  unsungColor="rgba(255,255,255,0.6)"
                  className="tv-karaoke-activeline"
                />
              ) : (
                <KaraokeWipeLine
                  ref={wipeApiRef}
                  text={line.text || '♪'}
                  showBall={showBall}
                  color={dueto ? lineColor(i) : '#FDE047'}
                  unsungColor="rgba(255,255,255,0.6)"
                  className="tv-karaoke-activeline"
                />
              )
            ) : (line.text || '♪')}
          </p>
        );
      })}
    </div>
  );
}
