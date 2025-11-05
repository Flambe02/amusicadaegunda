import { useState, useEffect } from 'react';

/**
 * Hook pour détecter le support WebP et optimiser les images
 * @returns {{ supportsWebP: boolean, isLoading: boolean }}
 */
export function useOptimizedImage() {
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkWebPSupport = () => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        setSupportsWebP(webP.height === 2);
        setIsLoading(false);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    };

    checkWebPSupport();
  }, []);

  return { supportsWebP, isLoading };
}

/**
 * Génère le chemin optimisé pour une image
 * @param {string} originalPath - Chemin original de l'image
 * @param {boolean} useWebP - Utiliser WebP si disponible
 * @returns {string} - Chemin optimisé
 */
export function getOptimizedImagePath(originalPath, useWebP = true) {
  if (!originalPath) return '';
  
  // Si c'est une URL externe, ne pas modifier
  if (originalPath.startsWith('http://') || originalPath.startsWith('https://')) {
    return originalPath;
  }
  
  // Si WebP est supporté, convertir l'extension
  if (useWebP) {
    const webpPath = originalPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    // Si le chemin a changé, c'est qu'on peut utiliser WebP
    if (webpPath !== originalPath) {
      return webpPath;
    }
  }
  
  return originalPath;
}

