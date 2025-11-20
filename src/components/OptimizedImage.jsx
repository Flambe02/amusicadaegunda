import { useState, useEffect } from 'react';

/**
 * OptimizedImage - Composant d'image optimisé avec support WebP et fallback
 * 
 * Amélioration: Vérifie si le WebP existe avant de l'utiliser pour éviter les 404
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
  const [webpAvailable, setWebpAvailable] = useState(null); // null = vérification en cours, true = disponible, false = indisponible

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

  // Vérifier si le WebP existe (seulement si WebP est disponible)
  useEffect(() => {
    if (!webpSrc) {
      setWebpAvailable(false);
      return;
    }

    // Vérifier si le fichier WebP existe en essayant de le charger
    const img = new Image();
    img.onload = () => {
      setWebpAvailable(true);
    };
    img.onerror = () => {
      // WebP n'existe pas, utiliser l'image originale
      setWebpAvailable(false);
    };
    img.src = webpSrc;
  }, [webpSrc]);

  // Gérer l'erreur de l'image de fallback (image originale)
  const handleImageError = () => {
    setImageError(true);
  };

  // Si erreur totale (même l'image originale a échoué), afficher placeholder
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

  // Si WebP n'est pas disponible ou n'existe pas, utiliser directement l'image originale
  // On attend aussi que la vérification soit terminée (webpAvailable !== null)
  if (!webpSrc || webpAvailable === false) {
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

  // Si WebP est disponible (webpAvailable === true) ou vérification en cours (webpAvailable === null)
  // Utiliser <picture> avec WebP et fallback
  // Le navigateur essaiera WebP d'abord, puis basculera automatiquement sur l'image originale si nécessaire
  return (
    <picture>
      {/* Source WebP - utilisée si disponible et supportée par le navigateur */}
      {webpAvailable === true && (
        <source
          srcSet={webpSrc}
          type="image/webp"
        />
      )}

      {/* Image de fallback - utilisée si WebP n'est pas supporté, n'existe pas, ou vérification en cours */}
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

