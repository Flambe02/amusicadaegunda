/**
 * SEO de l'accueil `/` — une seule définition pour l'accueil (src/pages/Home.jsx) et
 * l'interface grand écran (src/tv/TvApp.jsx, sur le web).
 */
export const HOME_SEO = {
  title: 'A Musica da Segunda | Parodias Musicais e Humor Inteligente',
  description: 'A Musica da Segunda - Nova musica toda segunda-feira! Parodias musicais inteligentes sobre as noticias do Brasil. Descubra humor e musica para sua semana.',
  keywords: 'musica da segunda, parodias musicais, noticias do brasil, musica brasileira, descoberta musical, nova musica toda segunda, parodias inteligentes',
  url: '/',
  type: 'website',
  // SEO fix: disable video indexing on homepage.
  // Homepage is not a dedicated watch page for a single stable video.
  // Keep max-video-preview:0 here.
  robots: 'index, follow, max-video-preview:0',
};

export const HOME_SEO_IMAGE = 'https://www.amusicadasegunda.com/images/og-caipivara-1200x630.jpg';
