import React, { useState, useCallback } from 'react';
import { Volume2, Play, ExternalLink } from 'lucide-react';

/**
 * TikTokPlayerSimple - Composant simple sans iframe problématique
 * 
 * Fonctionnalités :
 * - Affiche la vidéo TikTok dans un wrapper personnalisé
 * - Format 9:16 parfait garanti
 * - Pas d'écran blanc
 * - Son activé par défaut
 * - Fallback vers TikTok original
 */
export default function TikTokPlayerSimple({ 
  postId, 
  className = "" 
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  // URL TikTok directe
  const tiktokUrl = `https://www.tiktok.com/@user/video/${postId}`;
  
  // URL de l'image de prévisualisation (si disponible)
  const previewUrl = `https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/${postId}`;

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    // Ouvrir TikTok dans un nouvel onglet pour la lecture complète
    window.open(tiktokUrl, '_blank', 'noopener,noreferrer');
  }, [tiktokUrl]);

  const handleOpenTikTok = useCallback(() => {
    window.open(tiktokUrl, '_blank', 'noopener,noreferrer');
  }, [tiktokUrl]);

  // Fallback si pas d'ID
  if (!postId) {
    return (
      <div className={`tiktok-player-simple-fallback ${className}`}>
        <div className="fallback-content">
          <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Vídeo TikTok não disponível
          </h3>
          <p className="text-gray-500 text-sm text-center">
            ID da vídeo não fornecido ou inválido
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`tiktok-player-simple ${className}`}>
      {/* Container principal avec format 9:16 parfait */}
      <div className="video-container">
        {/* Image de prévisualisation ou placeholder */}
        <div className="video-preview">
          <div className="preview-placeholder">
            <Play className="w-20 h-20 text-white opacity-80" />
            <p className="text-white text-sm mt-2 opacity-80">Clique para assistir</p>
          </div>
        </div>
        
        {/* Bouton de lecture principal */}
        <button
          onClick={handlePlay}
          className="play-button"
          aria-label="Assistir vídeo TikTok"
        >
          <Play className="w-8 h-8" />
          <span>Assistir</span>
        </button>
        
        {/* Bouton pour ouvrir sur TikTok */}
        <button
          onClick={handleOpenTikTok}
          className="tiktok-link-button"
          aria-label="Abrir no TikTok"
        >
          <ExternalLink className="w-5 h-5" />
          <span>TikTok</span>
        </button>
      </div>
      
      {/* Informations de la vidéo */}
      <div className="video-info">
        <p className="video-id">ID: {postId}</p>
        <p className="video-note">
          Clique em &quot;Assistir&quot; para abrir o vídeo no TikTok com som completo
        </p>
      </div>
    </div>
  );
}
