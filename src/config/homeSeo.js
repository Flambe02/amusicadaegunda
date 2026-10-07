import { pageSeo } from '@/lib/pageSeo';

/**
 * SEO de l'accueil `/` — une seule définition pour l'accueil (src/pages/Home.jsx) et
 * l'interface grand écran (src/tv/TvApp.jsx, sur le web).
 */
export const HOME_SEO = {
  // Les mêmes titre et description que index.html (scripts/seo.pages.json).
  ...pageSeo('/'),
  url: '/',
  type: 'website',
  // SEO fix: disable video indexing on homepage.
  // Homepage is not a dedicated watch page for a single stable video.
  // Keep max-video-preview:0 here.
  robots: 'index, follow, max-video-preview:0',
};

export const HOME_SEO_IMAGE = 'https://www.amusicadasegunda.com/images/og-caipivara-1200x630.jpg';
