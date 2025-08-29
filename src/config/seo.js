// Configuration SEO centralisée pour Música da Segunda

export const SEO_CONFIG = {
  // Informations du site
  site: {
    name: 'Música da Segunda',
    url: 'https://amusicadaegunda.com',
    description: 'Descubra uma nova música incrível toda segunda-feira. Sua dose semanal de descobertas musicais.',
    logo: 'https://amusicadaegunda.com/images/Logo.png',
    language: 'pt-BR',
    locale: 'pt_BR',
  },

  // Métadonnées par défaut
  default: {
    title: 'Música da Segunda - Nova música toda segunda-feira',
    description: 'Descubra uma nova música incrível toda segunda-feira. Sua dose semanal de descobertas musicais, playlists Spotify e conteúdo exclusivo.',
    keywords: 'música, segunda-feira, descobertas musicais, nova música, playlist semanal, música brasileira, indie music, spotify, tiktok',
    image: 'https://amusicadaegunda.com/images/Logo.png',
    type: 'website',
  },

  // Métadonnées par page
  pages: {
    home: {
      title: 'Música da Segunda - Nova música toda segunda-feira',
      description: 'Descubra uma nova música incrível toda segunda-feira. Sua dose semanal de descobertas musicais, playlists Spotify e conteúdo exclusivo.',
      keywords: 'música, segunda-feira, descobertas musicais, nova música, playlist semanal, música brasileira, indie music',
      type: 'website',
    },
    
    calendar: {
      title: 'Calendário - Música da Segunda',
      description: 'Explore o calendário de músicas da Música da Segunda. Descubra todas as músicas lançadas e suas datas de publicação.',
      keywords: 'calendário, músicas, datas, lançamentos, música da segunda, cronologia',
      type: 'website',
    },
    
    playlist: {
      title: 'Playlist Spotify - Música da Segunda',
      description: 'Ouça todas as músicas da Música da Segunda em uma playlist curada no Spotify. Descobertas musicais semanais.',
      keywords: 'playlist, spotify, música da segunda, descobertas musicais, streaming',
      type: 'website',
    },
    
    blog: {
      title: 'Blog - Música da Segunda',
      description: 'Artigos, notícias e conteúdo exclusivo sobre música, descobertas e o projeto Música da Segunda.',
      keywords: 'blog, artigos, notícias, música, conteúdo, música da segunda',
      type: 'website',
    },
    
    adventCalendar: {
      title: 'Calendário do Advento - Música da Segunda',
      description: 'Calendário do advento musical com surpresas diárias. Uma nova música a cada dia de dezembro.',
      keywords: 'calendário do advento, dezembro, surpresas musicais, música da segunda',
      type: 'website',
    },
    
    sobre: {
      title: 'Sobre - Música da Segunda',
      description: 'Conheça mais sobre o projeto Música da Segunda, sua história e missão de descobrir novas músicas.',
      keywords: 'sobre, história, missão, projeto, música da segunda',
      type: 'website',
    },
  },

  // Données structurées Schema.org
  structuredData: {
    organization: {
      '@type': 'Organization',
      name: 'Música da Segunda',
      url: 'https://amusicadaegunda.com',
      logo: 'https://amusicadaegunda.com/images/Logo.png',
      description: 'Projeto musical que lança uma nova música toda segunda-feira',
      sameAs: [
        'https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH',
      ],
    },
    
    musicGroup: {
      '@type': 'MusicGroup',
      name: 'A Música da Segunda',
      description: 'Projeto musical que lança uma nova música toda segunda-feira',
      url: 'https://amusicadaegunda.com',
      image: 'https://amusicadaegunda.com/images/Logo.png',
      genre: ['Indie', 'Música Brasileira', 'Pop'],
      sameAs: [
        'https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH',
      ],
    },
    
    website: {
      '@type': 'WebSite',
      name: 'Música da Segunda',
      url: 'https://amusicadaegunda.com',
      description: 'Descubra uma nova música incrível toda segunda-feira',
      publisher: {
        '@type': 'Organization',
        name: 'Música da Segunda',
        logo: {
          '@type': 'ImageObject',
          url: 'https://amusicadaegunda.com/images/Logo.png',
          width: 512,
          height: 512,
        },
      },
    },
  },

  // Configuration des réseaux sociaux
  social: {
    facebook: {
      appId: '', // À configurer si nécessaire
      type: 'website',
    },
    
    twitter: {
      card: 'summary_large_image',
      site: '@amusicadasegunda', // À configurer
      creator: '@amusicadasegunda', // À configurer
    },
    
    instagram: {
      username: 'amusicadasegunda', // À configurer
    },
  },

  // Configuration des performances
  performance: {
    preload: [
      '/images/Logo.png',
      '/manifest.json',
    ],
    
    prefetch: [
      '/calendar',
      '/playlist',
      '/blog',
    ],
    
    dnsPrefetch: [
      'https://www.tiktok.com',
      'https://open.spotify.com',
      'https://music.apple.com',
    ],
  },
};

// Fonction utilitaire pour obtenir les métadonnées d'une page
export const getPageSEO = (pageName) => {
  return SEO_CONFIG.pages[pageName] || SEO_CONFIG.default;
};

// Fonction utilitaire pour obtenir les données structurées
export const getStructuredData = (type) => {
  return SEO_CONFIG.structuredData[type];
};
