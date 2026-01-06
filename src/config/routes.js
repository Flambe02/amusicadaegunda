/**
 * Configuration centralisée des routes
 * Source unique de vérité pour React Router et navigation
 * 
 * ✅ PERFORMANCE OPTIMIZATION: Lazy loading des routes
 * Toutes les routes sont chargées à la demande pour réduire le bundle initial
 * Gain estimé: -300 KiB, -1.5s sur FCP
 */

import { lazy } from 'react';

// ✅ QUICK WIN 1: Lazy loading de TOUTES les routes
// Home est chargé normalement car c'est la page d'accueil (toujours nécessaire)
import Home from '../pages/Home';

// Toutes les autres routes sont lazy-loaded
const Calendar = lazy(() => import('../pages/Calendar'));
const AdventCalendar = lazy(() => import('../pages/AdventCalendar'));
const ProtectedAdmin = lazy(() => import('../components/ProtectedAdmin'));
const Sobre = lazy(() => import('../pages/Sobre'));
const ContentForAI = lazy(() => import('../pages/ContentForAI'));
const Blog = lazy(() => import('../pages/Blog'));
const Login = lazy(() => import('../pages/Login'));
const Playlist = lazy(() => import('../pages/Playlist'));
const Song = lazy(() => import('../pages/Song'));
const Youtube = lazy(() => import('../pages/Youtube'));
const YoutubeTest = lazy(() => import('../pages/YoutubeTest'));
const YoutubeSimple = lazy(() => import('../pages/YoutubeSimple'));
const TikTokDemo = lazy(() => import('../pages/TikTokDemo'));

/**
 * Configuration des routes avec métadonnées SEO
 */
export const ROUTES = [
  {
    path: '/',
    component: Home,
    name: 'Home',
    seo: null // SEO géré directement dans Home.jsx pour éviter les doublons
  },
  {
    path: '/home',
    component: Home,
    name: 'Home',
    seo: null // SEO géré directement dans Home.jsx pour éviter les doublons
  },
  {
    path: '/calendar',
    component: Calendar,
    name: 'Calendar',
    seo: {
      title: 'Calendário Musical - A Música da Segunda',
      description: 'Calendário completo de todas as músicas publicadas. Explore a história musical do projeto.',
      keywords: 'calendário musical, músicas, histórico, publicação semanal'
    }
  },
  {
    path: '/adventcalendar',
    component: AdventCalendar,
    name: 'AdventCalendar',
    seo: {
      title: 'Ano 2025 - Calendário do Advento Musical',
      description: 'Calendário do advento musical com todas as músicas de 2025.',
      keywords: 'calendário advento, música 2025, ano novo'
    }
  },
  {
    path: '/sobre',
    component: Sobre,
    name: 'Sobre',
    seo: {
      title: 'Sobre - A Música da Segunda',
      description: 'Conheça a história do projeto A Música da Segunda e descubra como nasceu essa paixão pela música.',
      keywords: 'sobre, história, projeto, música brasileira'
    }
  },
  {
    path: '/api/content-for-ai.json',
    component: ContentForAI,
    name: 'ContentForAI',
    seo: null // Pas de SEO pour les endpoints API
  },
  {
    path: '/blog',
    component: Blog,
    name: 'Blog',
    seo: {
      title: 'Blog - A Música da Segunda',
      description: 'Artigos e notícias sobre música, cultura e atualidades.',
      keywords: 'blog, artigos, notícias, cultura musical'
    }
  },
  {
    path: '/admin',
    component: ProtectedAdmin,
    name: 'Admin',
    seo: null // Pas de SEO pour les pages admin
  },
  {
    path: '/login',
    component: Login,
    name: 'Login',
    seo: null // Pas de SEO pour les pages login
  },
  {
    path: '/playlist',
    component: Playlist,
    name: 'Playlist',
    seo: {
      title: 'Playlist - Todas as Músicas',
      description: 'Lista completa de todas as músicas publicadas no projeto A Música da Segunda.',
      keywords: 'playlist, todas as músicas, lista completa'
    }
  },
  {
    path: '/chansons',
    component: Playlist,
    name: 'Playlist',
    seo: {
      title: 'Canções - Todas as Músicas',
      description: 'Lista completa de todas as canções publicadas no projeto A Música da Segunda.',
      keywords: 'canções, todas as músicas, lista completa'
    }
  },
  {
    path: '/chansons/:slug',
    component: Song,
    name: 'Song',
    seo: null // SEO dynamique basé sur la chanson
  },
  {
    path: '/youtube-test',
    component: YoutubeTest,
    name: 'YoutubeTest',
    seo: null // Pages de test
  },
  {
    path: '/youtube-simple',
    component: YoutubeSimple,
    name: 'YoutubeSimple',
    seo: null // Pages de test
  },
  {
    path: '/youtube',
    component: Youtube,
    name: 'Youtube',
    seo: null // Pages internes
  },
  {
    path: '/tiktokdemo',
    component: TikTokDemo,
    name: 'TikTokDemo',
    seo: null // Pages de démo
  },
  {
    path: '/tiktok/:id',
    component: TikTokDemo,
    name: 'TikTokDemo',
    seo: null // Pages de démo
  }
];

/**
 * Mapping des noms de pages vers les composants (pour backward compatibility)
 */
export const PAGES = ROUTES.reduce((acc, route) => {
  acc[route.name] = route.component;
  return acc;
}, {});

/**
 * Helper pour obtenir la page actuelle basée sur l'URL
 * @param {string} url - URL à analyser
 * @returns {string} Nom de la page
 */
export function getCurrentPage(url) {
  // Pour HashRouter, l'URL commence par #
  if (url.startsWith('#')) {
    url = url.slice(1);
  }
  
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  let urlLastPart = url.split('/').pop();
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }

  // Si on est sur la racine ou une URL vide, retourner Home
  if (!urlLastPart || urlLastPart === 'amusicadaegunda') {
    return 'Home';
  }

  // Gérer les routes TikTok avec paramètres
  if (urlLastPart.startsWith('tiktok')) {
    return 'TikTokDemo';
  }

  // Gérer les routes chansons avec slug (ex: /chansons/nobel-prize)
  if (url.startsWith('/chansons/') && urlLastPart !== 'chansons') {
    return 'Song';
  }

  // Chercher dans les routes configurées
  const route = ROUTES.find(r => {
    const routePath = r.path.split('/').pop();
    return routePath.toLowerCase() === urlLastPart.toLowerCase();
  });

  return route ? route.name : 'Home';
}

/**
 * Obtenir les métadonnées SEO pour une route
 * @param {string} routeName - Nom de la route
 * @returns {Object|null} Métadonnées SEO ou null
 */
export function getRouteSEO(routeName) {
  const route = ROUTES.find(r => r.name === routeName);
  return route ? route.seo : null;
}

