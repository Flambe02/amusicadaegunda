import { useEffect, useState } from 'react';

/**
 * Téléphone tenu en paysage (décision du 2026-09-25 : pas d'affichage horizontal sur
 * mobile). Un TÉLÉPHONE = pointeur grossier (tactile) et, en paysage, une hauteur
 * d'écran de téléphone : les tablettes (plus hautes) et le desktop ne sont pas
 * concernés. L'app Android est déjà bloquée en portrait (MainActivity) et la PWA l'est
 * par son manifeste ; ceci couvre le navigateur mobile.
 */
export const PHONE_LANDSCAPE_QUERY = '(pointer: coarse) and (orientation: landscape) and (max-height: 500px)';

/** Événement diffusé à chaque bascule : les lecteurs se mettent en pause / reprennent. */
export const ORIENTATION_BLOCK_EVENT = 'amds:orientation-block';

function matchesPhoneLandscape() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PHONE_LANDSCAPE_QUERY).matches
    : false;
}

export function usePhoneLandscape() {
  const [blocked, setBlocked] = useState(matchesPhoneLandscape);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(PHONE_LANDSCAPE_QUERY);
    const onChange = () => setBlocked(query.matches);
    onChange();
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(ORIENTATION_BLOCK_EVENT, { detail: { blocked } }));
  }, [blocked]);
  return blocked;
}
