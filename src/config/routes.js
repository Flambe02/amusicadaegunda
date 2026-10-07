/**
 * Configuration centralisée des routes
 * Source unique de vérité pour React Router et navigation
 * 
 * ✅ PERFORMANCE OPTIMIZATION: Lazy loading des routes
 * Toutes les routes sont chargées à la demande pour réduire le bundle initial
 * Gain estimé: -300 KiB, -1.5s sur FCP
 */

import { lazy } from 'react';
import { pageSeo } from '@/lib/pageSeo';

// ✅ QUICK WIN 1: Lazy loading de TOUTES les routes
// Home est chargé normalement car c'est la page d'accueil (toujours nécessaire)
import Home from '../pages/Home';

// Toutes les autres routes sont lazy-loaded
// /roda et /search : pages desktop inchangées, redirigées vers /catalogo sous 768 px
// (nav mobile à 4 onglets — addendum catálogo, étape 8).
const RodaDaSegunda = lazy(() => import('../pages/mobileRoutes').then((m) => ({ default: m.RodaRoute })));
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
const SearchPage = lazy(() => import('../pages/mobileRoutes').then((m) => ({ default: m.SearchRoute })));
const Catalogo = lazy(() => import('../pages/Catalogo'));
const Karaoke = lazy(() => import('../pages/Karaoke'));
const Categoria = lazy(() => import('../pages/Categoria'));
const Guia = lazy(() => import('../pages/Guia'));
const Privacy = lazy(() => import('../pages/Privacy'));
const Tv = lazy(() => import('../pages/Tv'));
const Festa = lazy(() => import('../pages/Festa'));
const Apprender = lazy(() => import('../pages/Apprender'));
const ApprenderLesson = lazy(() => import('../pages/ApprenderLesson'));
const includeDebugRoutes = import.meta.env.DEV;

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
    path: '/roda',
    component: RodaDaSegunda,
    name: 'Roda',
    seo: pageSeo('/roda')
  },
  {
    path: '/sobre',
    component: Sobre,
    name: 'Sobre',
    seo: null // titre et description : useSEO de la page (scripts/seo.pages.json)
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
    seo: null // titre et description : useSEO de la page (scripts/seo.pages.json)
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
    seo: null // même page que /musica
  },
  {
    path: '/musica',
    component: Playlist,
    name: 'Playlist',
    seo: null // titre et description : useSEO de la page (scripts/seo.pages.json)
  },
  {
    path: '/musica/:slug',
    component: Song,
    name: 'Song',
    seo: null // SEO dynamique basé sur la chanson
  },
  ...(includeDebugRoutes ? [
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
    }
  ] : []),
  {
    path: '/youtube',
    component: Youtube,
    name: 'Youtube',
    seo: null // Pages internes
  },
  {
    path: '/search',
    component: SearchPage,
    name: 'Search',
    seo: null // noindex géré dans le composant
  },
  {
    path: '/catalogo',
    component: Catalogo,
    name: 'Catalogo',
    seo: null // noindex géré dans Catalogo.jsx ; pas de stub ni de sitemap (addendum §G.2)
  },
  {
    path: '/karaoke',
    component: Karaoke,
    name: 'Karaoke',
    seo: null // SEO géré via useSEO dans Karaoke.jsx
  },
  {
    path: '/categoria/:slug',
    component: Categoria,
    name: 'Categoria',
    seo: null // SEO dynamique basé sur la catégorie
  },
  {
    path: '/guia',
    component: Guia,
    name: 'Guia',
    seo: null // titre et description : useSEO de la page (scripts/seo.pages.json)
  },
  {
    path: '/arquivo/:year',
    component: Playlist,
    name: 'Arquivo',
    seo: null
  },
  {
    path: '/privacy',
    component: Privacy,
    name: 'Privacy',
    seo: null // titre et description : useSEO de la page (scripts/seo.pages.json)
  },
  {
    path: '/tv',
    component: Tv,
    name: 'Tv',
    seo: null // SEO géré via useSEO dans Tv.jsx
  },
  {
    path: '/festa',
    component: Festa,
    name: 'Festa',
    seo: null // noindex géré via useSEO dans Festa.jsx — page publique mais utile seulement via code/QR partagé en direct
  },
  {
    path: '/apprendre',
    component: Apprender,
    name: 'Apprender',
    seo: null // SEO géré via useSEO dans Apprender.jsx — landing bêta du Modo Aprender
  },
  {
    path: '/apprendre/:slug',
    component: ApprenderLesson,
    name: 'ApprenderLesson',
    seo: null // SEO dynamique géré via useSEO dans ApprenderLesson.jsx — leçon guidée
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
  if (!urlLastPart || urlLastPart === 'amusicadasegunda') {
    return 'Home';
  }

  // Gérer les routes musica avec slug (ex: /musica/nobel-prize)
  if (url.startsWith('/musica/') && urlLastPart !== 'musica') {
    return 'Song';
  }

  // Gérer les routes categoria avec slug (ex: /categoria/politica)
  if (url.startsWith('/categoria/') && urlLastPart !== 'categoria') {
    return 'Categoria';
  }

  // Gérer les routes de leçon avec slug (ex: /apprendre/eu-sou-um-ovo)
  if (url.startsWith('/apprendre/') && urlLastPart !== 'apprendre') {
    return 'ApprenderLesson';
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


