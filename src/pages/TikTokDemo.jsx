// src/pages/TikTokDemo.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TikTokPlayer from '../components/TikTokPlayer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Play, ArrowLeft, Settings } from 'lucide-react';

export default function TikTokDemo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customId, setCustomId] = useState(id || '');
  const [controls, setControls] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // ID par défaut si aucun n'est fourni
  const defaultId = id || '7467353900979424534';
  const currentId = customId || defaultId;

  const handleTestVideo = () => {
    if (customId.trim()) {
      navigate(`/tiktok/${customId.trim()}`);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">
              TikTok Player Demo
            </h1>
            <p className="text-gray-600">
              Teste o player TikTok robusto com mobile-first, autoplay muted, e plein écran
            </p>
          </div>
        </div>

        {/* Contrôles de test */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID da Vídeo TikTok
              </label>
              <Input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="Ex: 7467353900979424534"
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleTestVideo}
                disabled={!customId.trim()}
                className="bg-[#FF0050] hover:bg-[#E6004C] text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Testar Vídeo
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setCustomId(defaultId)}
                className="border-gray-300 text-gray-700"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Options avancées */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={controls === 1}
                  onChange={(e) => setControls(e.target.checked ? 1 : 0)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Controles visíveis</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Autoplay</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Player TikTok */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Player TikTok - {currentId}
            </h2>
            <p className="text-sm text-gray-600">
              ID atual: <code className="bg-gray-100 px-2 py-1 rounded">{currentId}</code>
            </p>
          </div>
          
          {/* Container du player avec aspect-ratio 9:16 */}
          <div className="relative w-full mx-auto" style={{ maxWidth: '350px' }}>
            <div style={{ aspectRatio: '9/16' }}>
              <TikTokPlayer
                postId={currentId}
                controls={controls}
                autoPlay={autoPlay}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Informations techniques */}
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Funcionalidades Técnicas
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">✅ Implementado</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Autoplay muted par défaut</li>
                <li>• Overlay &quot;Activer le son&quot; accessible</li>
                <li>• Loop automatique en fin de vidéo</li>
                <li>• Plein écran mobile (100svh, safe-areas)</li>
                <li>• PostMessage API pour contrôler la lecture</li>
                <li>• Fallback robuste en cas de blocage</li>
                <li>• Mobile-first responsive design</li>
                <li>• Accessibilité ARIA complète</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">🔧 API TikTok v1</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• URL: <code className="bg-gray-100 px-1 rounded">/player/v1/&lbrace;ID&rbrace;</code></li>
                <li>• Paramètres: autoplay, loop, controls, muted</li>
                <li>• PostMessage: onPlayerReady, onStateChange</li>
                <li>• Commands: play, pause, seekTo, unMute</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
