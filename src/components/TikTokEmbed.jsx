import React, { useEffect, useRef, useState } from 'react';

export default function TikTokEmbed({ tiktokId, className = "" }) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [embedHtml, setEmbedHtml] = useState('');

  useEffect(() => {
    if (!tiktokId || !containerRef.current) return;

    setIsLoading(true);
    setError(null);
    setEmbedHtml('');

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Use TikTok's official oEmbed API for better embed
    const fetchTikTokEmbed = async () => {
      try {
        // Construct TikTok video URL from ID
        const videoUrl = `https://www.tiktok.com/@user/video/${tiktokId}`;
        
        // Use TikTok's oEmbed API
        const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch TikTok embed');
        }

        const data = await response.json();
        
        if (data.html) {
          // Use the official TikTok embed HTML
          setEmbedHtml(data.html);
          setIsLoading(false);
        } else {
          throw new Error('No embed HTML received');
        }
      } catch (error) {
        console.error('TikTok oEmbed error:', error);
        
        // Fallback to manual iframe if oEmbed fails
        const fallbackHtml = `
          <blockquote 
            class="tiktok-embed" 
            cite="https://www.tiktok.com/@user/video/${tiktokId}" 
            data-video-id="${tiktokId}" 
            data-embed-from="manual" 
            style="max-width: 100%; min-width: 100%; border: none; outline: none;" 
          > 
            <section style="border: none; outline: none;"> 
              <a target="_blank" title="TikTok Video" href="https://www.tiktok.com/@user/video/${tiktokId}?refer=embed" style="border: none; outline: none;">
                TikTok Video
              </a> 
            </section> 
          </blockquote>
        `;
        
        setEmbedHtml(fallbackHtml);
        setIsLoading(false);
      }
    };

    fetchTikTokEmbed();

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tiktokId]);

  // Load TikTok embed script when embedHtml is ready
  useEffect(() => {
    if (!embedHtml || !containerRef.current) return;

    // Insert the embed HTML
    containerRef.current.innerHTML = embedHtml;

    // Load TikTok's official embed script
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.onload = () => {
      console.log('TikTok embed script loaded successfully');
      setIsLoading(false);
      
      // Try to enable autoplay and unmute after script loads
      setTimeout(() => {
        try {
          // Look for TikTok iframe and try to enable autoplay
          const tiktokIframe = containerRef.current?.querySelector('iframe');
          if (tiktokIframe) {
            // Add autoplay parameters to iframe URL if possible
            const currentSrc = tiktokIframe.src;
            if (currentSrc && !currentSrc.includes('autoplay')) {
              const separator = currentSrc.includes('?') ? '&' : '?';
              tiktokIframe.src = `${currentSrc}${separator}autoplay=1&muted=0`;
            }
          }
        } catch (e) {
          console.log('Could not modify TikTok iframe for autoplay');
        }
      }, 1000);
    };
    script.onerror = () => {
      console.error('TikTok embed script failed to load');
      setIsLoading(false);
      setError('Erro ao carregar o script TikTok');
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [embedHtml]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setEmbedHtml('');
    // Force re-render
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
      {/* TikTok container - extended height to show 100% of video */}
      <div 
        className="relative w-full mx-auto tiktok-container tiktok-scroll-hide"
        style={{ 
          aspectRatio: '9/16',  // TikTok format: 9/16 (portrait vertical)
          maxWidth: '350px',     // Optimal width to prevent scrolling
          maxHeight: '90vh'      // Extended height to show full video content
        }}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF0050] mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm font-medium">Carregando TikTok...</p>
              <p className="text-gray-500 text-xs mt-1">Usando embed oficial TikTok</p>
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
        
        {/* TikTok container - using official embed with extended height */}
        <div 
          ref={containerRef} 
          className="w-full h-full rounded-2xl overflow-hidden bg-white tiktok-video-container tiktok-content-fit"
          style={{
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            // Ensure absolutely no scrolling
            overflow: 'hidden',
            // Force content to fit within bounds
            maxHeight: '100%',
            maxWidth: '100%',
            // Remove all borders and ensure rounded corners
            border: 'none',
            outline: 'none',
            borderRadius: '16px'
          }}
        />
      </div>
    </div>
  );
}