/**
 * subtitleGenerator.js
 *
 * Génère un subtitle SEO court à partir du title + description d'une chanson.
 *
 * Stratégie :
 * 1. Appel à l'Edge Function `generate-subtitle` (OpenAI gpt-4o-mini)
 * 2. Fallback local rule-based si la fonction est down/erreur
 *
 * Le subtitle généré est éditable par l'utilisateur — c'est un brouillon.
 */

import { supabase } from './supabase';

const FUNCTION_URL = `${import.meta.env?.VITE_SUPABASE_URL || ''}/functions/v1/generate-subtitle`;

const SUBTITLE_SUFFIX = 'em paródia musical';
const MAX_SUBTITLE_LEN = 100;

/**
 * Fallback local : extrait la 1ère phrase utile de la description,
 * tronque à ~70 chars sur frontière de mot, suffixe "em paródia musical".
 */
export function generateSubtitleLocal({ title = '', description = '' }) {
  const source = (description || title || '').trim();
  if (!source) return '';

  // 1ère phrase utile (split sur . ! ? — ignorer phrases trop courtes)
  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 15);

  let core = sentences[0] || source;

  // Si déjà mention de "paródia"/"sátira", on ne re-suffixe pas
  const hasParody = /par[oó]dia|s[aá]tira/i.test(core);

  // Cible de longueur pour le coeur du subtitle (sans le suffixe)
  const targetCoreLen = hasParody ? MAX_SUBTITLE_LEN : MAX_SUBTITLE_LEN - (SUBTITLE_SUFFIX.length + 1);

  if (core.length > targetCoreLen) {
    // Tronquer à la dernière frontière de mot avant la cible
    const truncated = core.slice(0, targetCoreLen);
    const lastSpace = truncated.lastIndexOf(' ');
    core = lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated;
  }

  // Retirer ponctuation finale parasite
  core = core.replace(/[.,;:!?\s]+$/g, '').trim();

  if (!core) return '';
  if (hasParody) return core;
  return `${core} ${SUBTITLE_SUFFIX}`;
}

/**
 * Génère un subtitle via l'Edge Function (OpenAI). Fallback local si erreur.
 *
 * @param {{ title?: string, description?: string }} input
 * @returns {Promise<{ subtitle: string, source: 'ai' | 'local' }>}
 */
export async function generateSubtitle({ title = '', description = '' }) {
  const trimmedTitle = (title || '').trim();
  const trimmedDescription = (description || '').trim();

  if (!trimmedTitle && !trimmedDescription) {
    return { subtitle: '', source: 'local' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // Pas connecté → on utilise direct le fallback
      return { subtitle: generateSubtitleLocal({ title, description }), source: 'local' };
    }

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: trimmedTitle, description: trimmedDescription }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const subtitle = (data?.subtitle || '').trim();
    if (!subtitle) {
      return { subtitle: generateSubtitleLocal({ title, description }), source: 'local' };
    }

    return { subtitle: subtitle.slice(0, MAX_SUBTITLE_LEN), source: 'ai' };
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn('[subtitleGenerator] Edge function failed, using local fallback:', err);
    }
    return { subtitle: generateSubtitleLocal({ title, description }), source: 'local' };
  }
}
