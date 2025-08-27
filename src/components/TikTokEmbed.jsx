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
      
      // Create a stable container with fixed dimensions
      const videoContainer = document.createElement('div');
      videoContainer.className = 'tiktok-video-container';
      videoContainer.style.cssText = `
        width: 100%;
        height: 100%;
        position: relative;
        background: #000;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      `;
      
      // Create iframe with fixed positioning
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.tiktok.com/embed/v2/${tiktokId}?lang=pt_BR&loop=1&autoplay=0`;
      iframe.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 16px;
        background: #000;
        transform: scale(1);
        transform-origin: center center;
      `;
      iframe.allowFullscreen = true;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      
      // Handle iframe load
      iframe.onload = () => {
        setIsLoading(false);
        // Ensure the iframe is properly positioned after load
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.style.transform = 'scale(1)';
          }
        }, 100);
      };
      
      // Handle iframe error
      iframe.onerror = () => {
        setIsLoading(false);
        setError('Erro ao carregar o vídeo TikTok');
      };
      
      videoContainer.appendChild(iframe);
      containerRef.current.appendChild(videoContainer);
      
      // Cleanup function
      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
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
      {/* Fixed container with stable aspect ratio - smaller size */}
      <div 
        className="relative w-full mx-auto"
        style={{ 
          aspectRatio: '9/16', 
          maxWidth: '280px',
          maxHeight: '50vh'
        }}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#32a2dc] mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm font-medium">Carregando TikTok...</p>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="absolute inset-0 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center text-red-600 p-4">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="font-semibold mb-2">Erro ao carregar</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {/* Stable video container */}
        <div 
          ref={containerRef} 
          className="w-full h-full rounded-2xl overflow-hidden"
          style={{
            position: 'relative',
            backgroundColor: '#000',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}
        />
      </div>
    </div>
  );
}