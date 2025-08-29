import React, { useEffect } from 'react';

export default function PerformanceOptimizer() {
  useEffect(() => {
    // Lazy loading des images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));

    // Preload des ressources critiques
    const preloadCriticalResources = () => {
      const criticalResources = [
        '/images/Logo.png',
        '/manifest.json'
      ];

      criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = resource.endsWith('.png') ? 'image' : 'fetch';
        link.href = resource;
        document.head.appendChild(link);
      });
    };

    // Preload des polices si nécessaire
    const preloadFonts = () => {
      const fontLinks = document.querySelectorAll('link[rel="preload"][as="font"]');
      fontLinks.forEach(link => {
        link.rel = 'stylesheet';
      });
    };

    // Optimisation du scroll
    const optimizeScroll = () => {
      let ticking = false;
      
      const updateScroll = () => {
        // Optimisations de scroll ici
        ticking = false;
      };

      const requestTick = () => {
        if (!ticking) {
          requestAnimationFrame(updateScroll);
          ticking = true;
        }
      };

      window.addEventListener('scroll', requestTick, { passive: true });
    };

    // Initialisation des optimisations
    preloadCriticalResources();
    preloadFonts();
    optimizeScroll();

    // Cleanup
    return () => {
      imageObserver.disconnect();
    };
  }, []);

  return null; // Ce composant n'a pas de rendu visuel
}

// Hook pour l'optimisation des images
export const useImageOptimization = (src, alt, className = '') => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => setError(true);

  return {
    imgProps: {
      src,
      alt,
      className: `${className} ${isLoaded ? 'loaded' : 'loading'}`,
      onLoad: handleLoad,
      onError: handleError,
      loading: 'lazy',
    },
    isLoaded,
    error,
  };
};

// Hook pour l'optimisation des composants
export const useLazyComponent = (importFunc) => {
  const [Component, setComponent] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    importFunc()
      .then(module => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar componente:', err);
        setLoading(false);
      });
  }, [importFunc]);

  return { Component, loading };
};
