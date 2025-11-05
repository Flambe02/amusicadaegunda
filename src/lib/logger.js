/**
 * Lightweight logger that respects build environment
 * En production, tous les logs sont supprimés sauf les erreurs critiques
 * Utiliser ce logger au lieu de console.* directement pour éviter les logs en production
 */
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;

export const logger = {
  debug: (...args) => { 
    // eslint-disable-next-line no-console
    if (isDev) console.debug(...args); 
  },
  info: (...args) => { 
    // eslint-disable-next-line no-console
    if (isDev) console.info(...args); 
  },
  warn: (...args) => {
    // En production, on peut désactiver les warnings de debug
    // Garder uniquement les warnings critiques
    if (isDev || !isProd) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // Les erreurs sont toujours loggées, même en production
    // Mais on peut les envoyer vers un service de monitoring
    console.error(...args);
    // TODO: En production, envoyer vers Sentry ou autre service
    if (isProd) {
      // Future: Sentry.captureException(...)
    }
  },
};
