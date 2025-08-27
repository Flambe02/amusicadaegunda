import React from 'react';

/**
 * Composant VisuallyHidden - Cache visuellement le contenu mais le garde accessible aux lecteurs d'écran
 * Utilisé pour les labels et titres qui doivent être accessibles mais pas visibles
 */
export default function VisuallyHidden({ children, ...props }) {
  return (
    <span
      {...props}
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    >
      {children}
    </span>
  );
}
