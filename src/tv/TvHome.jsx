import { useEffect, useMemo } from 'react';
import { Mic } from 'lucide-react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';
import TvRow from './components/TvRow';
import FocusRow from './components/FocusRow';
import FocusableButton from './components/FocusableButton';
import TvSidebar from './components/TvSidebar';
import TvTopBar from './components/TvTopBar';

const CATEGORY_ORDER = [
  'politica', 'esporte', 'internacional', 'economia', 'midia',
  'cultura', 'tecnologia', 'gastronomia', 'saude', 'seguranca', 'policia', 'energia', 'outros',
];
const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};
const CATEGORY_COLOR = {
  politica: '#2563eb', esporte: '#16a34a', gastronomia: '#dc2626', internacional: '#0d9488',
  economia: '#d97706', midia: '#7c3aed', cultura: '#db2777', tecnologia: '#4f46e5',
  saude: '#0891b2', seguranca: '#b45309', policia: '#334155', energia: '#ca8a04', outros: '#525252',
};
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/**
 * Accueil TV — sidebar d'icônes, wordmark + mascotte, barre de recherche, et rangées
 * façon Netflix : Últimas paródias, Por categoria (tiles), Por mês (pills), Modo Karaokê.
 * Filtres (catégorie / mês / catálogo) ouvrent un écran grille via onOpenGrid.
 */
export default function TvHome({
  songs, getThumb, getCat, getHasKaraoke, onSelectSong, onOpenKaraoke, onOpenGrid, onExitTv,
}) {
  const currentMonth = new Date().getMonth();

  const { latest, karaokeSongs, byCategory, byMonth } = useMemo(() => {
    const groups = {};
    const months = Array.from({ length: 12 }, () => []);
    for (const s of songs) {
      const cat = s.category || 'outros';
      (groups[cat] ||= []).push(s);
      const d = s.release_date ? new Date(s.release_date) : null;
      if (d && !Number.isNaN(d.getTime())) months[d.getMonth()].push(s);
    }
    return {
      latest: songs.slice(0, 18),
      karaokeSongs: songs.filter(getHasKaraoke),
      byCategory: groups,
      byMonth: months,
    };
  }, [songs, getHasKaraoke]);

  const categories = CATEGORY_ORDER.filter((c) => byCategory[c]?.length);

  useEffect(() => {
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('ROW_LATEST'); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  const rowProps = { getThumb, getCat, getHasKaraoke };

  const openCatalog = () => onOpenGrid('Catálogo', songs);

  return (
    <div className="tv-home">
      <TvSidebar
        onHome={() => SpatialNavigation.setFocus('ROW_LATEST')}
        onSearch={openCatalog}
        onCatalog={openCatalog}
        onSettings={onExitTv}
      />

      {/* Colonne marque : wordmark + mascotte */}
      <div className="tv-brandcol">
        <h1 className="tv-wordmark">A MÚSICA<br />DA SEGUNDA</h1>
        <img src={BRAND_SQUARE_MEDIUM} alt="" className="tv-mascot" />
      </div>

      {/* Contenu */}
      <div className="tv-content">
        <TvTopBar onSearch={openCatalog} />

        <div className="tv-rows">
          <TvRow focusKey="ROW_LATEST" title="Últimas paródias" songs={latest} onSelect={onSelectSong} {...rowProps} />

          {/* Por categoria (tiles) */}
          {categories.length > 0 && (
            <section className="tv-row">
              <h2 className="tv-row-title">Por categoria</h2>
              <FocusRow className="tv-tiles" focusKey="ROW_CAT">
                {categories.map((cat) => (
                  <FocusableButton
                    key={cat}
                    className="tv-cat-tile"
                    style={{ '--tile': CATEGORY_COLOR[cat] || '#525252' }}
                    ariaLabel={CATEGORY_LABELS[cat] || cat}
                    onPress={() => onOpenGrid(CATEGORY_LABELS[cat] || cat, byCategory[cat])}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </FocusableButton>
                ))}
              </FocusRow>
            </section>
          )}

          {/* Por mês (pills) */}
          <section className="tv-row">
            <h2 className="tv-row-title">Por mês</h2>
            <FocusRow className="tv-months" focusKey="ROW_MONTH">
              {MONTHS.map((m, i) => (
                <FocusableButton
                  key={m}
                  className={`tv-month-pill ${i === currentMonth ? 'is-current' : ''}`}
                  ariaLabel={`Mês ${m}`}
                  onPress={() => onOpenGrid(m, byMonth[i])}
                >
                  {m}
                </FocusableButton>
              ))}
            </FocusRow>
          </section>

          {karaokeSongs.length > 0 && (
            <TvRow
              accent
              cardVariant="karaoke"
              title={<span className="tv-row-karaoke-title"><Mic size={22} /> Modo Karaokê</span>}
              songs={karaokeSongs}
              onSelect={onOpenKaraoke}
              {...rowProps}
            />
          )}
        </div>
      </div>
    </div>
  );
}
