import { useState } from 'react';
import { ArrowDown, Music, Volume2 } from 'lucide-react';

/**
 * Zone basse « J'apprends ce que je viens d'entendre » — Modo Aprender simplifié (v2).
 *
 * Remplace la pastille + popup comme interaction principale (retour de test réel :
 * la pastille bas-droite n'était pas assez visible). La découverte apparaît
 * AUTOMATIQUEMENT ici quand sa ligne devient active dans le karaokê — aucun tap requis
 * pour la voir. Une seule interaction FACULTATIVE (deviner/confirmer), jamais bloquante.
 *
 * `moment` est la dernière découverte rencontrée (sticky) : reste affichée, dans un
 * style plus discret, jusqu'à la suivante — §13 de la mission, pas de deuxième
 * minuteur, tout dérive de `active` (calculé par le parent depuis `displayIdx`).
 *
 * Root DIRECT enfant de `.karaoke-overlay` (mobile/web) : DOIT garder `relative` +
 * un z-index explicite, sinon `.karaoke-clean-bg` (gradient opaque, z-index:0, cf.
 * karaoke.css) le peint par-dessus et son contenu devient invisible (bug réel constaté
 * en test visuel réel — même classe de bug déjà documentée pour .km-controls/.km-translation).
 * Le fond (#11110D) + le trait jaune discret en haut existent pour que cette zone reste
 * une VRAIE deuxième moitié de l'écran, jamais une bande noire qui se confond avec le
 * karaokê au-dessus — objectif produit explicite, ne pas revenir à un fond quasi
 * transparent (bg-white/[0.02]) même « pour faire plus discret ».
 */
export default function LearningZone({ moment, active, currentLine, currentTranslation, onReplay, onInteractionComplete }) {
  if (!moment) {
    return (
      <div
        data-testid="learning-zone"
        className="relative z-20 flex flex-[1] min-h-0 flex-col items-center justify-center gap-2 border-t border-app-yellow/20 bg-[#11110D] px-6 text-center md:px-10"
      >
        {currentLine ? (
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-1.5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/35">🇫🇷 Agora</p>
            <p className="text-lg font-black leading-snug text-white md:text-2xl">{currentLine}</p>
            {currentTranslation && (
              <p className="text-sm font-semibold leading-snug text-app-yellow/80 md:text-base">{currentTranslation}</p>
            )}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-white/30">
              <Music className="h-3.5 w-3.5" aria-hidden="true" /> Continua a ouvir…
            </p>
          </div>
        ) : (
          <>
            <Music className="h-5 w-5 text-white/25" aria-hidden="true" />
            <p className="text-sm text-white/40">Continua a escutar…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="learning-zone"
      className={`relative z-20 flex flex-[1] min-h-0 flex-col justify-center overflow-hidden border-t px-6 py-3 text-center transition-colors md:px-10 ${
        active ? 'border-app-yellow/35 bg-app-yellow/[0.07]' : 'border-app-yellow/20 bg-[#11110D]'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[860px] flex-col items-center gap-2.5">
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${active ? 'text-app-yellow' : 'text-white/40'}`}>
          💡 Entender
        </p>

        {moment.breakdown.length > 0 ? (
          <>
            <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-2">
              {moment.breakdown.map((chunk, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-2xl font-black leading-tight text-white md:text-4xl">{chunk.pt}</span>
                  <ArrowDown className="my-1 h-3.5 w-3.5 text-white/30" aria-hidden="true" />
                  <span className="text-sm font-semibold leading-tight text-app-yellow/90 md:text-lg">{chunk.fr}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-white/45 md:text-sm">
              {moment.term.toUpperCase()} = {moment.translation.toUpperCase()}
            </p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-2xl font-black text-white md:text-4xl">{moment.term}</p>
            <p className="mt-1 text-base font-semibold text-app-yellow/90 md:text-lg">{moment.translation}</p>
          </div>
        )}

        {moment.explanation && (
          <p className="line-clamp-2 text-center text-xs leading-5 text-white/50">{moment.explanation}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-white/24"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Reouvir
            </button>
          )}
          {moment.interaction && (
            <MomentInteraction key={moment.id} moment={moment} onInteractionComplete={onInteractionComplete} />
          )}
        </div>
      </div>
    </div>
  );
}

function MomentInteraction({ moment, onInteractionComplete }) {
  const [picked, setPicked] = useState(null);

  if (picked) {
    return (
      <p className="text-xs font-bold text-emerald-400">
        ✨ Isso! {moment.term.toUpperCase()} = {moment.translation.toUpperCase()}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="text-xs font-semibold text-white/45">👂 {moment.interaction.prompt}</span>
      {moment.interaction.options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => { setPicked(option); onInteractionComplete?.(moment); }}
          className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-white/75 transition hover:border-app-yellow/50 hover:text-app-yellow"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
