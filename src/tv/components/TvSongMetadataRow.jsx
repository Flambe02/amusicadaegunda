import {
  Volleyball, Landmark, Coins, Globe, Sparkles, UtensilsCrossed, Shield, Zap, Users, Flag, Tag,
} from 'lucide-react';
import TvSongMetadataCard from './TvSongMetadataCard';

// Icône du thème (carte TEMA) par catégorie — à défaut, une étiquette générique.
const THEME_ICON = {
  esporte: Volleyball, politica: Landmark, economia: Coins, internacional: Globe,
  cultura: Sparkles, gastronomia: UtensilsCrossed, saude: Shield, seguranca: Shield,
  policia: Shield, midia: Sparkles, tecnologia: Zap, energia: Zap, outros: Tag,
};

const MODE_LABELS = { solo: 'Solo', duet: 'Dueto', family: 'Família', festa: 'Festa' };

/** Indicateur de difficulté « 3 barres » coloré par niveau (texte + visuel, cf. spec). */
function DifficultyBars({ level, diffKey }) {
  return (
    <span className={`tvd-diff-bars tvd-diff-${diffKey}`} aria-hidden="true">
      <i className={level >= 1 ? 'is-on' : ''} style={{ height: '40%' }} />
      <i className={level >= 2 ? 'is-on' : ''} style={{ height: '70%' }} />
      <i className={level >= 3 ? 'is-on' : ''} style={{ height: '100%' }} />
    </span>
  );
}

/**
 * Rangée de 5 cartes de métadonnées d'aide à la décision : TEMA · DIFICULDADE ·
 * ENERGIA · IDEAL PARA · IDIOMA (cf. référence). La difficulté combine texte + un
 * indicateur 3 barres coloré par niveau (jamais la couleur seule).
 */
export default function TvSongMetadataRow({ vm }) {
  const ThemeIcon = THEME_ICON[vm.category] || Tag;
  const modes = vm.recommendedModes.map((m) => MODE_LABELS[m]).filter(Boolean).slice(0, 2).join(' / ') || 'Solo';

  return (
    <div className="tvd-meta-row">
      <TvSongMetadataCard
        icon={<ThemeIcon size={26} />}
        accent="is-yellow"
        label="Tema"
        value={vm.theme || '—'}
      />
      <TvSongMetadataCard
        icon={<DifficultyBars level={vm.difficultyLevel} diffKey={vm.difficulty} />}
        label="Dificuldade"
        value={vm.difficultyLabel}
      />
      <TvSongMetadataCard
        icon={<Zap size={26} />}
        accent="is-yellow"
        valueAccent
        label="Energia"
        value={vm.energyLabel}
      />
      <TvSongMetadataCard
        icon={<Users size={26} />}
        accent="is-green"
        label="Ideal para"
        value={modes}
      />
      <TvSongMetadataCard
        icon={<Flag size={26} />}
        accent="is-cyan"
        label="Idioma"
        value={vm.language}
      />
    </div>
  );
}
