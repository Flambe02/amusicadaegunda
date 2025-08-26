import React, { useEffect, useRef, useState } from 'react';

export default function TikTokEmbed({ videoId, embedId, className = "" }) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use either videoId or embedId, with videoId taking precedence
  const tiktokId = videoId || embedId;

  useEffect(() => {
    if (tiktokId && containerRef.current) {
      setIsLoading(true);
      setError(null);
      
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      // Create iframe for better control
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.tiktok.com/embed/v2/${tiktokId}?lang=pt_BR&loop=1&autoplay=0`;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.frameBorder = '0';
      iframe.allowFullscreen = true;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.style.cssText = `
        border: none;
        border-radius: 16px;
        background: #000;
      `;
      
      // Handle iframe load
      iframe.onload = () => {
        setIsLoading(false);
      };
      
      // Handle iframe error
      iframe.onerror = () => {
        setIsLoading(false);
        setError('Erro ao carregar o vídeo TikTok');
      };
      
      containerRef.current.appendChild(iframe);
    }
  }, [tiktokId]);

  if (!tiktokId) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="bg-gray-100 rounded-2xl p-8 text-center text-gray-500">
          <p>Vídeo TikTok não disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Optimized aspect ratio for TikTok videos */}
      <div className="relative w-full" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 rounded-2xl flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#32a2dc]"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
            <div className="text-center text-red-600">
              <p className="font-semibold mb-2">Erro ao carregar</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          className="w-full h-full rounded-2xl overflow-hidden shadow-xl bg-black"
        />
      </div>
    </div>
  );
}