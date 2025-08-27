import React from 'react';

/**
 * TikTokPlayerUltraSimple - Version ultra-simple pour test
 */
export default function TikTokPlayerUltraSimple({ postId, className = "" }) {
  if (!postId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-500">ID TikTok manquant</p>
      </div>
    );
  }

  const tiktokUrl = `https://www.tiktok.com/@user/video/${postId}`;

  return (
    <div className={`bg-black rounded-2xl overflow-hidden ${className}`}>
      {/* Container 9:16 */}
      <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
        {/* Fond dégradé */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-pink-500 flex items-center justify-center">
          {/* Bouton play */}
          <button
            onClick={() => window.open(tiktokUrl, '_blank')}
            className="bg-white text-black px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">▶</span>
            <span>Assistir</span>
          </button>
        </div>
        
        {/* Bouton TikTok */}
        <button
          onClick={() => window.open(tiktokUrl, '_blank')}
          className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm hover:bg-opacity-90 transition-colors"
        >
          TikTok
        </button>
      </div>
      
      {/* Info */}
      <div className="p-4 bg-gray-900 text-center">
        <p className="text-gray-400 text-xs mb-2">ID: {postId}</p>
        <p className="text-gray-300 text-sm">Clique para abrir no TikTok</p>
      </div>
    </div>
  );
}
