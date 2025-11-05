import { useState } from 'react';

/**
 * OptimizedImage - Composant d'image optimisé avec support WebP et fallback
 * 
 * @param {string} src - Source de l'image (chemin vers l'image)
 * @param {string} alt - Texte alternatif
 * @param {string} className - Classes CSS
 * @param {string} loading - Lazy loading ('lazy' ou 'eager')
 * @param {string} decoding - Décodage asynchrone ('async' ou 'sync')
 * @param {Object} props - Autres props HTML img
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  loading = 'lazy',
  decoding = 'async',
  ...props 
}) {
  const [imageError, setImageError] = useState(false);
  const [webpError, setWebpError] = useState(false);

  // Générer le chemin WebP
  const getWebpPath = (imagePath) => {
    if (!imagePath) return null;
    
    // Si c'est déjà une URL externe, ne pas convertir
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return null;
    }
    
    // Convertir l'extension en .webp
    const webpPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    return webpPath !== imagePath ? webpPath : null;
  };

  const webpSrc = getWebpPath(src);
  const fallbackSrc = src;

  const handleWebpError = () => {
    setWebpError(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Si erreur totale, afficher une image placeholder
  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-gray-400 text-sm">Imagem não disponível</span>
      </div>
    );
  }

  // Si WebP n'est pas disponible, utiliser directement l'image
  if (!webpSrc || webpError) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        onError={handleImageError}
        {...props}
      />
    );
  }

  return (
    <picture>
      {/* Source WebP */}
      <source 
        srcSet={webpSrc} 
        type="image/webp"
      />
      
      {/* Image de fallback */}
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        onError={handleImageError}
        {...props}
      />
    </picture>
  );
}

