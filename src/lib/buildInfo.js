import { BUILD_INFO } from '@/generated/buildInfo';

export function getBuildLabel() {
  const timestamp = BUILD_INFO.generatedAt
    ? BUILD_INFO.generatedAt.slice(0, 16).replace('T', ' ')
    : 'unknown';

  return `${BUILD_INFO.version} (${BUILD_INFO.commit}) ${timestamp}`;
}

export function logBuildInfo() {
  if (typeof window === 'undefined') return;

  window.__APP_BUILD__ = BUILD_INFO;

  if (import.meta.env.DEV) {
    console.info('[build]', BUILD_INFO);
  }
}
