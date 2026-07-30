import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookOpen, Music, Sparkles } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { LEARN_SLUGS, loadLearnContent } from '@/lib/learnContent';
import ButtondownSignupForm from '@/components/learn/ButtondownSignupForm';

/**
 * Landing bêta du Modo Aprender — §6.5 de la spec.
 *
 * Liste les chansons pilotes à partir de `LEARN_SLUGS` (source de vérité déjà utilisée
 * par LyricsDialog/KaraokePlayer pour décider où le mode Aprender existe) : si un jour
 * une seule chanson reste, ou qu'une troisième s'ajoute, cette page suit sans code à
 * changer ici (§7 — gérer un nombre variable d'entrées).
 */
export default function Apprender() {
  const [songs, setSongs] = useState([]); // [{ slug, title, expressions }]

  useSEO({
    title: 'Modo Aprender — Aprenda português brasileiro com paródias | A Música da Segunda',
    description: 'Beta: aprenda expressões reais do português brasileiro a partir das paródias de A Música da Segunda. Tradução linha a linha, karaokê e caderno de vocabulário.',
    url: '/apprendre',
    type: 'website',
    robots: 'index, follow',
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all(LEARN_SLUGS.map((slug) => loadLearnContent(slug))).then((entries) => {
      if (cancelled) return;
      setSongs(
        entries
          .filter(Boolean)
          .map((entry) => ({
            slug: entry.slug,
            title: entry.title,
            expressions: entry.expressions || [],
          })),
      );
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white lg:py-12">
      <Helmet><html lang="pt-BR" /></Helmet>

      <header className="mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE047]/30 bg-[#FDE047]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#FDE047]">
          <Sparkles className="h-3 w-3" aria-hidden="true" /> Beta
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-white lg:text-4xl">
          Aprenda português brasileiro cantando
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-white/70">
          Duas paródias de A Música da Segunda viram aulas de português real — o que se
          diz na rua, não no livro. Tradução linha a linha, karaokê com legendas em
          francês e um caderno para guardar o vocabulário.
        </p>
      </header>

      <section aria-labelledby="apprender-songs-title" className="mb-10 space-y-3">
        <h2 id="apprender-songs-title" className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
          As duas músicas da beta
        </h2>

        {songs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
            A carregar as músicas…
          </div>
        ) : (
          <ul className="space-y-3">
            {songs.map((song) => (
              <li key={song.slug}>
                <Link
                  to={`/musica/${song.slug}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#FDE047]/30 hover:bg-white/[0.05]"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-black text-white">
                      <Music className="h-4 w-4 shrink-0 text-[#FDE047]" aria-hidden="true" />
                      {song.title}
                    </p>
                    {song.expressions.length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {song.expressions.map((expr) => (
                          <span
                            key={expr.id}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-white/60"
                          >
                            {expr.term}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <BookOpen className="h-5 w-5 shrink-0 text-white/25" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="apprender-signup-title" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 id="apprender-signup-title" className="mb-1.5 font-black text-white">
          Entra na beta
        </h2>
        <p className="mb-4 text-sm leading-6 text-white/60">
          Avisamos por email quando novas músicas entrarem no Modo Aprender.
        </p>
        <ButtondownSignupForm />
      </section>
    </div>
  );
}
