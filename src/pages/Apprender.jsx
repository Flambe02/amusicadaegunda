import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Music, Play } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { LEARN_SLUGS, buildLearningMoments, loadLearnContent } from '@/lib/learnContent';
import { LEARN_LEVELS } from '@/lib/learnLevel';
import { trackEvent } from '@/lib/analytics';
import ButtondownSignupForm from '@/components/learn/ButtondownSignupForm';

/**
 * Landing do Modo Aprender simplificado (« chanson + niveau + karaokê + traduction +
 * 3 découvertes adaptées au niveau ») — le choix du niveau et l'aperçu des découvertes
 * qui en dépendent vivent maintenant sur l'écran d'intro de `KaraokePlayer`
 * (`learningMode`), pas ici : cette landing reste volontairement minimale (§14 de la
 * mission d'origine), elle affiche juste le NOMBRE total de découvertes disponibles
 * (tous niveaux confondus) pour donner un aperçu sans présumer d'un niveau non choisi.
 *
 * Liste les chansons pilotes à partir de `LEARN_SLUGS` (source de vérité déjà utilisée
 * par LyricsDialog/KaraokePlayer pour décider où le mode Aprender existe).
 */
export default function Apprender() {
  const [lessons, setLessons] = useState([]); // [{ slug, title, momentsCount }]

  useSEO({
    title: 'Aprender português — Aprenda português brasileiro com as músicas | A Música da Segunda',
    description: 'Escute, entenda e descubra expressões reais do português brasileiro cantando as paródias de A Música da Segunda.',
    url: '/apprendre',
    type: 'website',
    robots: 'index, follow',
  });

  useEffect(() => {
    trackEvent('learning_landing_viewed');
    trackEvent('signup_prompt_viewed');
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(LEARN_SLUGS.map((slug) => loadLearnContent(slug))).then((entries) => {
      if (cancelled) return;
      setLessons(
        entries
          .filter(Boolean)
          .map((entry) => ({
            slug: entry.slug,
            title: entry.title,
            momentsCount: LEARN_LEVELS.reduce((sum, level) => sum + buildLearningMoments(entry, level).length, 0),
          })),
      );
    });
    return () => { cancelled = true; };
  }, []);

  const featured = lessons.find((l) => l.slug === 'eu-sou-um-ovo') || lessons[0] || null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 text-white lg:py-12">
      <Helmet><html lang="pt-BR" /></Helmet>

      <header className="mb-10 text-center">
        <p className="text-4xl" aria-hidden="true">🇧🇷🎵</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-4xl">
          Aprenda português com as músicas
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-white/70">
          Escute. Entenda. Jogue com as expressões. O português do Brasil, em música.
        </p>
      </header>

      {lessons.length === 0 ? (
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/50">
          A carregar as músicas…
        </div>
      ) : (
        <>
          {featured && (
            <section aria-labelledby="apprender-featured-title" className="mb-8">
              <h2 id="apprender-featured-title" className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
                Música da semana
              </h2>
              <FeaturedCard lesson={featured} />
            </section>
          )}

          <section aria-labelledby="apprender-songs-title" className="mb-10 space-y-3">
            <h2 id="apprender-songs-title" className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
              Escolha uma música
            </h2>
            <ul className="space-y-3">
              {lessons.map((lesson) => <LessonCard key={lesson.slug} lesson={lesson} />)}
            </ul>
          </section>
        </>
      )}

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

function FeaturedCard({ lesson }) {
  const { slug, title, momentsCount } = lesson;
  return (
    <Link
      to={`/apprendre/${slug}`}
      onClick={() => trackEvent('lesson_card_clicked', { lesson_slug: slug, featured: true })}
      className="flex items-center gap-4 rounded-2xl border border-[#FDE047]/25 bg-[#FDE047]/[0.06] p-5 transition hover:border-[#FDE047]/45 hover:bg-[#FDE047]/[0.09]"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#FDE047]/15 text-3xl" aria-hidden="true">
        🎵
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-white">{title}</p>
        {momentsCount > 0 && (
          <p className="mt-1 text-sm text-white/55">{momentsCount} coisas para descobrir</p>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#FDE047] px-4 py-2 text-sm font-black text-black">
        <Play className="h-4 w-4 fill-current" aria-hidden="true" /> Aprender
      </span>
    </Link>
  );
}

function LessonCard({ lesson }) {
  const { slug, title, momentsCount } = lesson;
  return (
    <li>
      <Link
        to={`/apprendre/${slug}`}
        onClick={() => trackEvent('lesson_card_clicked', { lesson_slug: slug, featured: false })}
        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#FDE047]/30 hover:bg-white/[0.05]"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-black text-white">
            <Music className="h-4 w-4 shrink-0 text-[#FDE047]" aria-hidden="true" />
            {title}
          </p>
          {momentsCount > 0 && (
            <p className="mt-1 text-sm text-white/50">{momentsCount} coisas para descobrir</p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white/70">
          Aprender
        </span>
      </Link>
    </li>
  );
}
