import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertCircle } from 'lucide-react';

/**
 * TikTokEmbedReal - Vrai embed TikTok intégré avec API oEmbed
 */
export default function TikTokEmbedReal({ postId, className = "" }) {
  const [embedHtml, setEmbedHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!postId) return;

    const fetchTikTokEmbed = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Utiliser l'API oEmbed officielle de TikTok
        const response = await fetch(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/@user/video/${postId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.html) {
          // Nettoyer et sécuriser le HTML
          const cleanHtml = data.html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Supprimer les scripts
            .replace(/on\w+="[^"]*"/g, '') // Supprimer les événements inline
            .replace(/on\w+='[^']*'/g, ''); // Supprimer les événements inline avec apostrophes
          
          setEmbedHtml(cleanHtml);
        } else {
          throw new Error('Pas de HTML dans la réponse TikTok');
        }
      } catch (err) {
        console.error('Erro ao carregar TikTok:', err);
        setError('Erro ao carregar vídeo TikTok');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTikTokEmbed();
  }, [postId]);

  // Injecter le HTML TikTok dans le container
  useEffect(() => {
    if (embedHtml && containerRef.current) {
      containerRef.current.innerHTML = embedHtml;
      
      // Appliquer des styles CSS pour forcer le format 9:16
      const iframe = containerRef.current.querySelector('iframe');
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '16px';
        iframe.style.background = '#000';
        iframe.style.overflow = 'hidden';
      }
    }
  }, [embedHtml]);

  if (!postId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-500">ID TikTok manquant</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-black rounded-2xl overflow-hidden flex items-center justify-center ${className}`} style={{ aspectRatio: '9/16' }}>
        <div className="text-center text-white">
          <RotateCcw className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
          <p>Carregando TikTok...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-2xl p-6 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.open(`https://www.tiktok.com/@user/video/${postId}`, '_blank')}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Abrir no TikTok
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-black rounded-2xl overflow-hidden ${className}`}>
      {/* Container avec format 9:16 forcé */}
      <div 
        ref={containerRef}
        className="w-full"
        style={{ 
          aspectRatio: '9/16',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
      
      {/* Info en bas */}
      <div className="p-3 bg-gray-900 text-center">
        <p className="text-gray-400 text-xs">ID: {postId}</p>
      </div>
    </div>
  );
}
