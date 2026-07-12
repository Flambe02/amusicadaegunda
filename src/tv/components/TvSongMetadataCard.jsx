/**
 * Carte de métadonnée de la fiche (TEMA / DIFICULDADE / ENERGIA / IDEAL PARA /
 * IDIOMA) — icône colorée en haut, label en capitales, valeur lisible. Purement
 * présentationnelle, JAMAIS focusable (info d'aide à la décision, pas une action).
 * `accent` = classe de couleur d'icône (jaune/rose/vert/cyan…) ; `valueAccent`
 * colore aussi la valeur (ex. ENERGIA « Alta » en jaune comme la référence).
 */
export default function TvSongMetadataCard({ icon, label, value, accent = '', valueAccent = false }) {
  return (
    <div className="tvd-meta-card">
      <span className={`tvd-meta-icon ${accent}`}>{icon}</span>
      <span className="tvd-meta-label">{label}</span>
      <span className={`tvd-meta-value ${valueAccent ? accent : ''}`}>{value}</span>
    </div>
  );
}
