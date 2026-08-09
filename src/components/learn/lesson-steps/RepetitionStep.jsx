import { useState } from 'react';
import { Check, Mic } from 'lucide-react';
import YouTubeEmbed from '@/components/YouTubeEmbed';

/**
 * Étape 5 de la leçon guidée — répétition (§4.4 « Répétition », version MVP) :
 * écouter la chanson en fond, afficher les phrases ciblées, permettre de les marquer
 * comme répétées à voix haute.
 *
 * Pas d'enregistrement micro ni de score de prononciation dans cette version — la
 * mission ne les demande que « si simple et robuste », et ni `YouTubeEmbed` ni
 * `KaraokePlayer` n'exposent aujourd'hui de lecture précise d'un segment (start/end)
 * sans risque pour le lecteur existant. Reporté, voir docs/apprendre-implementation-status.md.
 */
export default function RepetitionStep({ song, expressions, repeatedIds, onToggleRepeated, onComplete }) {
  const [localRepeated, setLocalRepeated] = useState(() => new Set(repeatedIds));

  const toggle = (expressionId) => {
    setLocalRepeated((prev) => {
      const next = new Set(prev);
      if (!next.has(expressionId)) {
        next.add(expressionId);
        onToggleRepeated(expressionId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-white/70">
        Ouça a música de novo e repita cada frase em voz alta, no seu ritmo. Marque cada uma quando se sentir confortável com ela.
      </p>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <YouTubeEmbed
          youtubeMusicUrl={song.youtube_music_url}
          youtubeUrl={song.youtube_url}
          title={song.title}
          useFacade
          autoplayOnActivate
          thumbnailQuality="hqdefault"
        />
      </div>

      <ul className="space-y-2.5">
        {expressions.map((expr) => {
          const done = localRepeated.has(expr.id);
          return (
            <li
              key={expr.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition ${
                done ? 'border-emerald-400/40 bg-emerald-400/[0.06]' : 'border-white/8 bg-white/[0.03]'
              }`}
            >
              <div className="min-w-0">
                <p className="font-bold text-[#FDE047]">{expr.term}</p>
                <p className="mt-0.5 text-sm leading-5 text-white/65">{expr.meaning_fr}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(expr.id)}
                disabled={done}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                  done
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/12 bg-white/[0.04] text-white/70 hover:border-white/24'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Mic className="h-3.5 w-3.5" aria-hidden="true" />}
                {done ? 'Repetida' : 'Já repeti'}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onComplete}
        className="w-full rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
      >
        Continuar para o karaokê
      </button>
    </div>
  );
}
