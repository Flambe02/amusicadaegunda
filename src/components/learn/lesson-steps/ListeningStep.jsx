import { useState } from 'react';
import { Check, X } from 'lucide-react';
import YouTubeEmbed from '@/components/YouTubeEmbed';

/**
 * Étape 2 de la leçon guidée — première écoute sans traduction complète, suivie
 * d'une question de compréhension globale (§4.4 « Première écoute »).
 */
export default function ListeningStep({ song, question, onComplete }) {
  const [answer, setAnswer] = useState(null);
  const [checked, setChecked] = useState(false);

  const isCorrect = (text) => question.options.find((o) => o.text === text)?.correct === true;

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-white/70">
        Escute a música uma primeira vez, sem se preocupar em entender cada palavra. Depois, responda à pergunta abaixo.
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

      <section aria-labelledby="listening-question-title" className="space-y-3 rounded-xl border border-[#FDE047]/20 bg-[#FDE047]/[0.05] px-3.5 py-3.5">
        <p id="listening-question-title" className="text-sm font-semibold text-white/85">{question.prompt}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={question.prompt}>
          {question.options.map((option) => {
            const selected = answer === option.text;
            const showCorrect = checked && isCorrect(option.text);
            const showWrong = checked && selected && !isCorrect(option.text);
            return (
              <button
                key={option.text}
                type="button"
                onClick={() => { setAnswer(option.text); setChecked(false); }}
                aria-pressed={selected}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                  showCorrect
                    ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300'
                    : showWrong
                      ? 'border-red-400/60 bg-red-400/15 text-red-300'
                      : selected
                        ? 'border-[#FDE047]/50 bg-[#FDE047]/10 text-[#FDE047]'
                        : 'border-white/12 bg-white/[0.04] text-white/75 hover:border-white/24'
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>
        {checked && (
          isCorrect(answer)
            ? <p className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Certo!</p>
            : <p className="flex items-center gap-1 text-xs font-semibold text-red-400"><X className="h-3.5 w-3.5" aria-hidden="true" /> Quase — continue para entender melhor a letra.</p>
        )}
      </section>

      {!checked ? (
        <button
          type="button"
          disabled={!answer}
          onClick={() => setChecked(true)}
          className="w-full rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98] disabled:opacity-40"
        >
          Verificar resposta
        </button>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          className="w-full rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
        >
          Continuar
        </button>
      )}
    </div>
  );
}
