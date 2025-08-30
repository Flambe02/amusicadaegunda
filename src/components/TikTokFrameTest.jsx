import React, { useState } from 'react';
import TikTokEmbedOptimized from './TikTokEmbedOptimized';

export default function TikTokFrameTest() {
  const [selectedSong, setSelectedSong] = useState('confissoes');
  
  const testSongs = {
    confissoes: {
      title: "Confissões Bancárias",
      tiktok_video_id: "7540762684149517590",
      description: "Test du frame TikTok pour Confissões Bancárias"
    },
    cafe: {
      title: "Café Tarifa Caos",
      tiktok_video_id: "7540762684149517591",
      description: "Test du frame TikTok pour Café Tarifa Caos"
    },
    blues: {
      title: "Segunda-feira Blues",
      tiktok_video_id: "7540762684149517592",
      description: "Test du frame TikTok pour Segunda-feira Blues"
    }
  };

  const currentSong = testSongs[selectedSong];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-blue-800 text-white p-4 rounded-lg shadow-lg">
        <h3 className="text-sm font-bold mb-3">🧪 Test Frame TikTok (DEV)</h3>
        
        {/* Sélecteur de chanson */}
        <div className="mb-3">
          <label className="block text-xs mb-1">Choisir une chanson:</label>
          <select 
            value={selectedSong} 
            onChange={(e) => setSelectedSong(e.target.value)}
            className="w-full p-2 text-xs bg-blue-700 border border-blue-600 rounded text-white"
          >
            <option value="confissoes">Confissões Bancárias</option>
            <option value="cafe">Café Tarifa Caos</option>
            <option value="blues">Segunda-feira Blues</option>
          </select>
        </div>
        
        {/* Informations de la chanson */}
        <div className="mb-3 text-xs">
          <div><strong>Chanson:</strong> {currentSong.title}</div>
          <div><strong>ID TikTok:</strong> {currentSong.tiktok_video_id}</div>
          <div><strong>Composant:</strong> TikTokEmbedOptimized</div>
        </div>
        
        {/* Frame TikTok de test */}
        <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '9/16' }}>
          <TikTokEmbedOptimized
            postId={currentSong.tiktok_video_id}
            className="w-full"
            song={currentSong}
          />
        </div>
        
        <div className="mt-2 text-xs text-blue-200">
          ✅ Toutes les chansons utilisent le même composant TikTokEmbedOptimized
        </div>
      </div>
    </div>
  );
}
