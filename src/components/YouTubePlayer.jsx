import React, { useEffect, useRef } from 'react';

export default function YouTubePlayer({ videoId, className = "", title = "YouTube Video" }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    console.warn('🎬 YouTubePlayer - videoId reçu:', videoId);
    console.warn('🎬 YouTubePlayer - title:', title);
    
    // Vérifier si l'iframe est bien dans le DOM
    if (iframeRef.current) {
      console.warn('🔍 YouTubePlayer - iframe ref existe:', iframeRef.current);
      console.warn('🔍 YouTubePlayer - iframe src:', iframeRef.current.src);
      console.warn('🔍 YouTubePlayer - iframe computed style:', window.getComputedStyle(iframeRef.current));
      console.warn('🔍 YouTubePlayer - iframe offsetWidth:', iframeRef.current.offsetWidth);
      console.warn('🔍 YouTubePlayer - iframe offsetHeight:', iframeRef.current.offsetHeight);
    }
  }, [videoId, title]);

  if (!videoId) {
    console.warn('❌ YouTubePlayer - videoId est vide ou null');
    return null;
  }

  // Paramètres YouTube selon la documentation officielle:
  // - rel=0: Ne pas montrer de vidéos suggérées à la fin
  // - modestbranding=1: Moins de branding YouTube
  // - playsinline=1: Lecture inline sur iOS (pas de plein écran automatique)
  // - controls=1: Afficher les contrôles (par défaut)
  // - enablejsapi=1: Permet le contrôle via l'API JavaScript (si besoin futur)
  // - origin: Domaine d'origine pour la sécurité
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`;

  console.warn('🎬 YouTubePlayer - URL iframe générée:', src);

  // Gestion du chargement de l'iframe
  const handleLoad = () => {
    console.warn('✅ YouTubePlayer - iframe chargée avec succès');
  };

  const handleError = (e) => {
    console.error('❌ YouTubePlayer - Erreur de chargement iframe:', e);
  };

  return (
    <div 
      className={`${className}`} 
      style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000' }}
    >
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}


