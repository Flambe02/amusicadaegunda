import React, { useEffect, useRef, useState } from 'react';

export default function TikTokEmbed({ tiktokId, className = "" }) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tiktokId || !containerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Clear container
    containerRef.current.innerHTML = '';

    // Create a simple, direct TikTok embed without external scripts
    const createSimpleEmbed = () => {
      if (!containerRef.current) return;

      const embedContainer = document.createElement('div');
      embedContainer.className = 'tiktok-simple-embed';
      embedContainer.style.cssText = `
        width: 100%;
        height: 100%;
        border-radius: 16px;
        overflow: hidden;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      `;

      // Create iframe directly with TikTok embed URL
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.tiktok.com/embed/${tiktokId}`;
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 16px;
      `;
      iframe.title = 'TikTok Video';
      iframe.allowFullscreen = true;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

      // Handle iframe load events
      iframe.onload = () => {
        console.log('TikTok iframe loaded successfully');
        setIsLoading(false);
        setError(null);
      };

      iframe.onerror = () => {
        console.error('TikTok iframe failed to load');
        setError('Erro ao carregar vídeo TikTok');
        setIsLoading(false);
      };

      // Add iframe to container
      embedContainer.appendChild(iframe);
      containerRef.current.appendChild(embedContainer);

      // Clear loading state after iframe is added
      // The iframe will handle its own loading state
      setIsLoading(false);
    };

    createSimpleEmbed();

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tiktokId]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  };

  if (!tiktokId) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="bg-gray-100 rounded-2xl p-6 text-center text-gray-500">
          <p>Vídeo TikTok não disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* TikTok container - optimized dimensions */}
      <div 
        className="relative w-full mx-auto"
        style={{ 
          aspectRatio: '9/16',
          maxWidth: '350px',
          maxHeight: '90vh'
        }}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF0050] mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm font-medium">Carregando TikTok...</p>
              <p className="text-gray-500 text-xs mt-1">Aguarde alguns segundos</p>
            </div>
          </div>
        )}
        
        {/* Error state with retry button */}
        {error && (
          <div className="absolute inset-0 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center text-red-600 p-4">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="font-semibold text-sm mb-2">Erro ao carregar</p>
              <p className="text-xs mb-3">{error}</p>
              <button 
                onClick={handleRetry}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}
        
        {/* TikTok embed container */}
        <div 
          ref={containerRef} 
          className="w-full h-full rounded-2xl overflow-hidden bg-white"
          style={{
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            border: 'none',
            outline: 'none',
            borderRadius: '16px'
          }}
        />
      </div>
    </div>
  );
}