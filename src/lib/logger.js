/**
 * Lightweight logger that respects build environment
 * In production builds, debug/info/trace are stripped by esbuild
 * warn/error are always preserved
 */
export const logger = {
  debug: (...args) => { 
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.debug(...args); 
  },
  info: (...args) => { 
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.info(...args); 
  },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
