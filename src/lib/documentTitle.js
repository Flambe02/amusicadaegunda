const DEFAULT_SITE_NAME = 'A M\u00fasica da Segunda';
const DEFAULT_PWA_TITLE = 'Inicio';

const APP_NAME_VARIANT = 'm(?:\\u00fasica|usica|\\u00c3\\u00basica)';
const APP_NAME_EXACT_PATTERN = new RegExp(`^a ${APP_NAME_VARIANT} da segunda$`, 'i');
const APP_NAME_PREFIX_PATTERN = new RegExp(`^a ${APP_NAME_VARIANT} da segunda\\s*[-|:]\\s*`, 'i');
const APP_NAME_SUFFIX_PATTERN = new RegExp(`\\s*[-|:]\\s*a ${APP_NAME_VARIANT} da segunda$`, 'i');

export function titleContainsAppName(title) {
  const normalizedTitle = String(title || '').trim();

  return APP_NAME_EXACT_PATTERN.test(normalizedTitle)
    || APP_NAME_PREFIX_PATTERN.test(normalizedTitle)
    || APP_NAME_SUFFIX_PATTERN.test(normalizedTitle);
}

export function buildFullTitle(title, siteName = DEFAULT_SITE_NAME) {
  const normalizedTitle = String(title || '').trim();

  if (!normalizedTitle) {
    return siteName;
  }

  if (normalizedTitle.includes('|') || titleContainsAppName(normalizedTitle)) {
    return normalizedTitle;
  }

  return `${normalizedTitle} | ${siteName}`;
}

export function isStandalonePwa() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const matchesDisplayMode = typeof window.matchMedia === 'function' && (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: window-controls-overlay)').matches
  );

  return matchesDisplayMode
    || window.navigator?.standalone === true
    || document.referrer.startsWith('android-app://');
}

export function stripAppNameFromTitle(title, fallback = DEFAULT_PWA_TITLE) {
  const normalizedTitle = String(title || '')
    .trim()
    .replace(APP_NAME_PREFIX_PATTERN, '')
    .replace(APP_NAME_SUFFIX_PATTERN, '')
    .trim();

  if (!normalizedTitle || APP_NAME_EXACT_PATTERN.test(normalizedTitle)) {
    return fallback;
  }

  return normalizedTitle;
}

export function getDocumentTitle(title, siteName = DEFAULT_SITE_NAME, fallback = DEFAULT_PWA_TITLE) {
  const fullTitle = buildFullTitle(title, siteName);

  return isStandalonePwa()
    ? stripAppNameFromTitle(fullTitle, fallback)
    : fullTitle;
}
