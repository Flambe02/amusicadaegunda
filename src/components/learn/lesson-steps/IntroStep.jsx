import { Clock3, GraduationCap, Sparkles, Tag } from 'lucide-react';

/**
 * Étape 1 de la leçon guidée — introduction : niveau, durée, thème, objectifs et
 * expressions principales avant de commencer (§4.4 « Introduction » de la mission).
 */
export default function IntroStep({ song, meta, expressions, onComplete }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/70">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> {meta.level}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/70">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {meta.durationMinutes} min
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/70">
          <Tag className="h-3.5 w-3.5" aria-hidden="true" /> {meta.theme}
        </span>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">Música</p>
        <p className="mt-1 text-lg font-black text-white">{song.title}</p>
      </div>

      <section aria-labelledby="intro-goals-title" className="space-y-2">
        <h3 id="intro-goals-title" className="text-[11px] uppercase tracking-[0.24em] text-white/38">
          O que você vai aprender
        </h3>
        <ul className="space-y-1.5">
          {meta.learningGoals.map((goal) => (
            <li key={goal} className="flex items-start gap-2 text-sm leading-6 text-white/80">
              <Sparkles className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-[#FDE047]/70" aria-hidden="true" />
              {goal}
            </li>
          ))}
        </ul>
      </section>

      {expressions.length > 0 && (
        <section aria-labelledby="intro-expressions-title" className="space-y-2">
          <h3 id="intro-expressions-title" className="text-[11px] uppercase tracking-[0.24em] text-white/38">
            Expressões principais
          </h3>
          <p className="flex flex-wrap gap-1.5">
            {expressions.map((expr) => (
              <span key={expr.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-[#FDE047]">
                {expr.term}
              </span>
            ))}
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={onComplete}
        className="w-full rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
      >
        Começar a aula
      </button>
    </div>
  );
}
