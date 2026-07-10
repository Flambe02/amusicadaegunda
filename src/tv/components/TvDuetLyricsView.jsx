import KaraokeWipeLine from '@/components/karaoke/KaraokeWipeLine';
import { TV_LINE_ROLES, tvActiveFontSize } from '@/tv/lib/tvLyricsWindow';

const SINGER_A_COLOR = '#FDE047';
const SINGER_B_COLOR = '#7dd3fc';

function colorFor(singer) {
  if (singer === 'A') return SINGER_A_COLOR;
  if (singer === 'B') return SINGER_B_COLOR;
  return '#ffffff';
}

function alignClassFor(singer) {
  if (singer === 'A') return 'tv-duet-line--left';
  if (singer === 'B') return 'tv-duet-line--right';
  return 'tv-duet-line--center';
}

/**
 * Duet View (LOT B) : paroles alternées par chanteur, sur la MÊME fenêtre à 4 lignes
 * et les mêmes ancres de position que TvKaraokeLyricsWindow (aucune duplication du
 * moteur de synchronisation — seul le displayIdx fourni par KaraokePlayer pilote ceci).
 *
 * N'est monté QUE quand la chanson a des tags réels ({A}/{B}) — cf. hasDuetTags dans
 * KaraokePlayer, qui bascule vers ce composant au lieu du rendu solo/dueto historique.
 */
export default function TvDuetLyricsView({
  lines, displayIdx, wipeApiRef, fontScale, showBall, speakerNames,
}) {
  return (
    <div className="tv-karaoke-lyrics-window" aria-live="polite">
      {speakerNames && (speakerNames.A || speakerNames.B) && (
        <p className="tv-duet-speakers">
          Modo Dueto · {speakerNames.A || 'Cantor 1'} × {speakerNames.B || 'Cantor 2'}
        </p>
      )}
      {TV_LINE_ROLES.map(({ role, offset, top }) => {
        const i = displayIdx + offset;
        if (i < 0 || i >= lines.length) return null;
        const line = lines[i];
        const isActive = role === 'active';
        const color = colorFor(line.singer);
        return (
          <p
            key={`${i}-${line.time}`}
            className={`tv-karaoke-line tv-karaoke-line--${role} ${alignClassFor(line.singer)}`}
            style={{
              top,
              fontSize: isActive ? `calc(${tvActiveFontSize(line.text)} * ${fontScale})` : undefined,
              color: !isActive ? `${color}aa` : undefined,
            }}
          >
            {isActive ? (
              <KaraokeWipeLine
                ref={wipeApiRef}
                text={line.text || '♪'}
                showBall={showBall}
                color={color}
                unsungColor="rgba(255,255,255,0.6)"
                className="tv-karaoke-activeline"
              />
            ) : (line.text || '♪')}
          </p>
        );
      })}
    </div>
  );
}
