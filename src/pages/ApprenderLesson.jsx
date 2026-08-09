import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { Song } from '@/api/entities';
import { useSEO } from '../hooks/useSEO';
import { hasLearnContent } from '@/lib/learnContent';
import { getLearnLevel, setLearnLevel } from '@/lib/learnLevel';
import KaraokePlayer from '@/components/karaoke/KaraokePlayer';

/**
 * Leçon guidée du Modo Aprender (`/apprendre/:slug`) — MVP simplifié
 * « chanson + niveau + karaokê + traduction + 3 découvertes adaptées au niveau ».
 * Un seul écran principal : cette page ne fait que charger la chanson puis monter le
 * `KaraokePlayer` existant en `learningMode`, exactement comme `Song.jsx` le fait
 * pour le karaokê normal. Le niveau lui-même (sélecteur + aperçu des découvertes)
 * vit dans l'écran d'intro DE `KaraokePlayer` — cette page se contente de le
 * mémoriser localement (`learnLevel.js`, isolé, prêt pour un futur Profil/Réglages
 * sans réécriture — §7/§19 de la mission) et de le lui transmettre en composant contrôlé.
 *
 * Ancienne version : un parcours obligatoire en 7 étapes (intro → écoute →
 * compréhension → exercices → répétition → karaokê → résultat), jugé trop scolaire.
 * Ses fichiers (`src/components/learn/lesson-steps/*`, `src/lib/learnProgress.js`)
 * restent dans le repo — simplement plus importés ici — au cas où un parcours guidé
 * optionnel redevienne pertinent plus tard (cf. docs/apprendre-implementation-status.md).
 */
export default function ApprenderLesson() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(undefined); // undefined = en cours, null = absent
  const [learningLevel, setLearningLevelState] = useState(() => getLearnLevel());

  const handleLearningLevelChange = (level) => {
    setLearningLevelState(level);
    setLearnLevel(level);
  };

  useSEO({
    title: song ? `${song.title} — Aprender português | A Música da Segunda` : 'Aprender português | A Música da Segunda',
    description: 'Escute, entenda e descubra expressões reais do português brasileiro cantando.',
    url: `/apprendre/${slug}`,
    type: 'website',
    robots: 'index, follow',
  });

  useEffect(() => {
    let cancelled = false;
    setSong(undefined);

    if (!hasLearnContent(slug)) {
      setSong(null);
      return () => { cancelled = true; };
    }

    Song.getBySlug(slug).then((songData) => {
      if (!cancelled) setSong(songData || null);
    });

    return () => { cancelled = true; };
  }, [slug]);

  if (song === undefined) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-24 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-white">
        <BookOpen className="mx-auto mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
        <p className="font-semibold text-white/60">Música indisponível</p>
        <p className="mt-1 text-sm text-white/38">Esta música ainda não tem uma versão para aprender.</p>
        <Link to="/apprendre" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#FDE047]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
        </Link>
      </div>
    );
  }

  return (
    <KaraokePlayer
      song={song}
      learningMode
      translationLanguage="fr"
      learningLevel={learningLevel}
      onLearningLevelChange={handleLearningLevelChange}
      onClose={() => navigate('/apprendre')}
    />
  );
}
