/**
 * Icônes pleines façon TikTok (décision du 2026-09-25). lucide-react n'a que des
 * icônes en contour : celles-ci sont dessinées ici, grille 24 × 24, `currentColor`.
 * Les « trous » (lignes de texte, colonnes) passent par `fillRule="evenodd"`.
 */

function FilledIcon({ children, className = 'h-6 w-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className} {...props}>
      {children}
    </svg>
  );
}

/** Som : haut-parleur plein et deux ondes. */
export function SpeakerFilled(props) {
  return (
    <FilledIcon {...props}>
      <path d="M11.1 4.3 6.6 8H3.8A1.8 1.8 0 0 0 2 9.8v4.4A1.8 1.8 0 0 0 3.8 16h2.8l4.5 3.7a1.1 1.1 0 0 0 1.8-.9V5.2a1.1 1.1 0 0 0-1.8-.9Z" />
      <path
        d="M16 8.5a5 5 0 0 1 0 7M18.8 5.8a9 9 0 0 1 0 12.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </FilledIcon>
  );
}

/** Letra : feuille de texte, coin plié, lignes évidées. */
export function LyricsSheetFilled(props) {
  return (
    <FilledIcon {...props}>
      <path
        fillRule="evenodd"
        d="M6.5 2h7.2c.5 0 1 .2 1.4.6l4.3 4.3c.4.4.6.9.6 1.4v11.2a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Zm7 1.8v3.4c0 .7.6 1.3 1.3 1.3h3.4ZM7.5 11.2a.9.9 0 0 0 0 1.8h9a.9.9 0 0 0 0-1.8Zm0 3.6a.9.9 0 0 0 0 1.8h9a.9.9 0 0 0 0-1.8Zm0 3.6a.9.9 0 0 0 0 1.8h5a.9.9 0 0 0 0-1.8Z"
      />
    </FilledIcon>
  );
}

/** História : journal, bloc de titre et colonnes évidés. */
export function NewspaperFilled(props) {
  return (
    <FilledIcon {...props}>
      <path
        fillRule="evenodd"
        d="M4.5 3h11A1.5 1.5 0 0 1 17 4.5V7h2.5A1.5 1.5 0 0 1 21 8.5v9a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 17.5v-13A1.5 1.5 0 0 1 4.5 3ZM17 8.8v8.7a1.7 1.7 0 0 0 2.2 1.6V8.8ZM6.5 6.2a.8.8 0 0 0-.8.8v3.6c0 .4.4.8.8.8h7c.4 0 .8-.4.8-.8V7a.8.8 0 0 0-.8-.8Zm0 7.3a.85.85 0 0 0 0 1.7h7a.85.85 0 0 0 0-1.7Zm0 3.3a.85.85 0 0 0 0 1.7h7a.85.85 0 0 0 0-1.7Z"
      />
    </FilledIcon>
  );
}

/** Cantar : liste musicale (trois lignes et une note). */
export function MusicListFilled(props) {
  return (
    <FilledIcon {...props}>
      <path d="M3 5.3c0-.6.5-1.1 1.1-1.1h9.3a1.1 1.1 0 1 1 0 2.2H4.1C3.5 6.4 3 5.9 3 5.3Zm0 5c0-.6.5-1.1 1.1-1.1h9.3a1.1 1.1 0 1 1 0 2.2H4.1c-.6 0-1.1-.5-1.1-1.1Zm0 5c0-.6.5-1.1 1.1-1.1h5.4a1.1 1.1 0 1 1 0 2.2H4.1c-.6 0-1.1-.5-1.1-1.1Z" />
      <path d="M17.2 3.6a1 1 0 0 1 1.3-.9l2.8.9a1 1 0 0 1 .7.9v1.9a.8.8 0 0 1-1 .8l-1.6-.5v9.8a3.4 3.4 0 1 1-2.2-3.2Z" />
    </FilledIcon>
  );
}

/** Compartilhar : flèche courbe pleine, façon TikTok. */
export function ShareArrowFilled(props) {
  return (
    <FilledIcon {...props}>
      <path d="M13.6 3.9a1 1 0 0 1 1.7-.7l6.8 6.5c.4.4.4 1.1 0 1.5l-6.8 6.5a1 1 0 0 1-1.7-.7v-3.4c-4.6.1-7.9 1.6-10.6 5.1-.3.4-.9.1-.8-.4C3.3 12 7 8.2 13.6 7.5Z" />
    </FilledIcon>
  );
}

/** Ouvir : casque, arceau et deux écouteurs pleins. */
export function HeadphonesFilled(props) {
  return (
    <FilledIcon {...props}>
      <path d="M12 3a9 9 0 0 0-9 9v5.5A2.5 2.5 0 0 0 5.5 20H7a1.2 1.2 0 0 0 1.2-1.2v-5.1A1.2 1.2 0 0 0 7 12.5H5.1a6.9 6.9 0 0 1 13.8 0H17a1.2 1.2 0 0 0-1.2 1.2v5.1A1.2 1.2 0 0 0 17 20h1.5a2.5 2.5 0 0 0 2.5-2.5V12a9 9 0 0 0-9-9Z" />
    </FilledIcon>
  );
}

/** Clipe : écran vidéo arrondi, triangle de lecture évidé. */
export function ClipFilled(props) {
  return (
    <FilledIcon {...props}>
      <path
        fillRule="evenodd"
        d="M5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3Zm4.4 5.2v7.6c0 .6.7 1 1.2.7l5.9-3.8a.8.8 0 0 0 0-1.4l-5.9-3.8c-.5-.3-1.2.1-1.2.7Z"
      />
    </FilledIcon>
  );
}

/** Nav — Início actif : maison pleine, porte évidée. */
export function HomeFilled(props) {
  return (
    <FilledIcon {...props}>
      <path
        fillRule="evenodd"
        d="M10.6 2.6a2.2 2.2 0 0 1 2.8 0l7 5.8c.4.4.6.9.6 1.4v9.4a2.3 2.3 0 0 1-2.3 2.3h-3.4a1 1 0 0 1-1-1v-5.2a1 1 0 0 0-1-1h-2.6a1 1 0 0 0-1 1v5.2a1 1 0 0 1-1 1H5.3A2.3 2.3 0 0 1 3 19.2V9.8c0-.5.2-1 .6-1.4Z"
      />
    </FilledIcon>
  );
}

/** Nav — Buscar actif : loupe au trait épais (une loupe « pleine » ne se lit pas). */
export function SearchFilled(props) {
  return (
    <FilledIcon {...props}>
      <circle cx="10.5" cy="10.5" r="6.3" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="m15.4 15.4 5 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </FilledIcon>
  );
}

/** Nav — Menu actif : trois traits épais. */
export function MenuFilled(props) {
  return (
    <FilledIcon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </FilledIcon>
  );
}
