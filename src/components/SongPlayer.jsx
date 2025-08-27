import React, { useState } from 'react';
import { Share2, Music, ExternalLink, AlertCircle } from 'lucide-react';
import TikTokEmbed from './TikTokEmbed';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export default function SongPlayer({ song }) {
  const [showDescription, setShowDescription] = useState(false);

  if (!song) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center text-gray-500">
        <p>Nenhuma música selecionada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main TikTok Video Block */}
      <div className="bg-white rounded-2xl shadow-lg">
        {/* TikTok Video */}
        {song.tiktok_video_id && (
          <div className="px-4 pt-4">
            <TikTokEmbed
              tiktokId={song.tiktok_video_id}
              className="mb-4"
            />
          </div>
        )}
      </div>

      {/* Independent Action Buttons Block */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="space-y-3">
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2">
            <Music className="w-5 h-5" />
            <span>Plataformas</span>
          </button>
          
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2">
            <ExternalLink className="w-5 h-5" />
            <span>Letras</span>
          </button>
          
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2">
            <Share2 className="w-5 h-5" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Description Dialog */}
      <Dialog open={showDescription} onOpenChange={setShowDescription}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              <span>Descrição da Música</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-gray-700 leading-relaxed">
              {song.description || 'Nenhuma descrição disponível para esta música.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}