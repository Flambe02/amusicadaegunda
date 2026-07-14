import { useState } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Play, Loader2 } from 'lucide-react';
import { BRAND_SQUARE_LARGE } from '@/lib/imageAssets';

/**
 * Bande « PRÉVIA DO CLIPE » en bas de l'affiche — focusable (DETAIL_TEASER), OK
 * lance le teaser. Le clip est un contenu SECONDAIRE : petite vignette (image
 * réelle de la vidéo) + icône play + label + durée, jamais plus grand que
 * l'affiche.
 */
function TeaserStrip({ thumb, durationLabel, onPress }) {
  const { ref, focused } = useFocusable({ focusKey: 'DETAIL_TEASER', onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label={`Prévia do clipe, ${durationLabel}`}
      className={`tvd-teaser ${focused ? 'is-focused' : ''}`}
    >
      <span className="tvd-teaser-bg" aria-hidden="true">
        {thumb && <img src={thumb} alt="" loading="lazy" decoding="async" />}
        <span className="tvd-teaser-scrim" />
      </span>
      <span className="tvd-teaser-play"><Play size={26} className="tvd-icon-fill" /></span>
      <span className="tvd-teaser-meta">
        <span className="tvd-teaser-label">Prévia do clipe</span>
        <span className="tvd-teaser-dur">{durationLabel}</span>
      </span>
    </button>
  );
}

/**
 * Colonne visuelle gauche de la fiche : AFFICHE premium (artwork de marque, ratio
 * préservé, object-cover) + bande teaser. PAS de faux téléphone, PAS de fond
 * portrait étiré/flouté. Le cycle de vie du lecteur YouTube est géré par la PAGE
 * (séparation présentation / lecture) : ici on ne fait que monter l'iframe dans
 * `hostRef` quand `playing`, sinon on affiche l'affiche + le teaser.
 *
 * ⚠️ TV — piège focus/crash (bug « coincé dans YouTube + Back plante », 2026-07-14) :
 * `pointer-events:none` ne bloque QUE la souris/tactile, jamais le focus D-pad. Sur
 * une vraie télécommande le focus entrait DANS l'iframe YouTube et le Retour matériel
 * (iframe focalisée) faisait planter la WebView. Parades ici :
 *  - `wrapRef` reçoit l'attribut `inert` (posé par la page pendant la lecture) →
 *    l'iframe qui remplace `.tvd-visual-host` devient non-focusable/non-interactive
 *    (la lecture via postMessage n'est PAS affectée par inert) ;
 *  - `focusHolderRef` = puits de focus (tabindex -1) que la page focalise pour que
 *    l'élément actif ne soit JAMAIS l'iframe ;
 *  - barre d'aide visible : rappelle OK = pausar, ◀▶ = avançar, Voltar = sair.
 */
export default function TvSongVisualPanel({
  artSrc, teaserThumb, durationLabel, hasTeaser,
  playing, loading, error, hostRef, progressRef, onPlayTeaser,
  wrapRef, focusHolderRef, onStopTeaser,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPlayer = playing && !error;

  return (
    <section className="tvd-visual">
      {showPlayer ? (
        <>
          {/* Puits de focus HORS de l'iframe — jamais l'iframe comme élément actif. */}
          <div ref={focusHolderRef} tabIndex={-1} className="tvd-visual-focustrap" aria-hidden="true" />
          <div ref={wrapRef} className="tvd-visual-player">
            <div ref={hostRef} className="tvd-visual-host" />
            {loading && <span className="tvd-visual-loading"><Loader2 size={40} className="tv-spin" /></span>}
            <div className="tvd-visual-progress"><span ref={progressRef} /></div>
          </div>
          <div className="tvd-visual-teaser-bar" role="note">
            <button type="button" className="tvd-visual-close" onClick={onStopTeaser} aria-label="Fechar prévia">
              ✕ Fechar
            </button>
            <span className="tvd-visual-hint">OK: pausar · ◀ ▶: avançar · Voltar: sair</span>
          </div>
        </>
      ) : (
        <>
          <div className="tvd-visual-art">
            {artSrc && !imgFailed
              ? <img src={artSrc} alt="" decoding="async" onError={() => setImgFailed(true)} />
              : <div className="tvd-visual-fallback"><img src={BRAND_SQUARE_LARGE} alt="" /></div>}
            <div className="tvd-visual-art-scrim" aria-hidden="true" />
          </div>
          {error && playing && (
            <p className="tvd-visual-error">Vídeo indisponível para reprodução aqui.</p>
          )}
          {hasTeaser && (
            <TeaserStrip thumb={teaserThumb} durationLabel={durationLabel} onPress={onPlayTeaser} />
          )}
        </>
      )}
    </section>
  );
}
