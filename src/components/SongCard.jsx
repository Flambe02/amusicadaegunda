import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Music2, Play, FileText, Share2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import TikTokDirect from './TikTokDirect';
import { cleanTikTokId } from '@/lib/parseTikTokId';

export default function SongCard({ song }) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const shareSong = async () => {
    if (navigator.share && song) {
      try {
        await navigator.share({
          title: `${song.title} - ${song.artist}`,
          text: `Confira esta música incrível da Música da Segunda!`,
          url: song.tiktok_url || window.location.href,
        });
      } catch (error) {
        console.log("Compartilhamento falhou:", error);
      }
    }
  };

  if (!song) return null;

  return (
    <>
      <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-2xl shadow-cyan-500/10">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-4">
          <Music2 className="w-5 h-5 text-gray-500" />
          <p className="font-semibold text-gray-700">
            Música da Segunda - {format(new Date(song.release_date), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Imagem de Capa */}
        <div 
          className="relative aspect-video rounded-2xl overflow-hidden mb-5 cursor-pointer group"
          onClick={() => setShowVideo(true)}
        >
          <img src={song.cover_image} alt={`Capa de ${song.title}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Play className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
        </div>
        
        {/* Botões */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Button 
            className="col-span-2 bg-[#32a2dc] hover:bg-[#2a8abf] text-white font-bold text-base py-6 rounded-xl"
            onClick={() => setShowVideo(true)}
          >
            <Play className="w-5 h-5 mr-2"/>
            Reproduzir
          </Button>
          {song.lyrics && (
            <Button 
              variant="outline" 
              className="bg-[#e7f1f7] hover:bg-[#dbe7ed] text-[#32a2dc] font-bold border-[#d1e4f0] py-6 rounded-xl"
              onClick={() => setShowLyrics(true)}
            >
              <FileText className="w-5 h-5 mr-2" />
              Letra
            </Button>
          )}
          <Button 
            variant="outline" 
            className="bg-[#e7f1f7] hover:bg-[#dbe7ed] text-[#32a2dc] font-bold border-[#d1e4f0] py-6 rounded-xl"
            onClick={shareSong}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>
      
      {/* Diálogo das Letras */}
      <Dialog open={showLyrics} onOpenChange={setShowLyrics}>
        <DialogContent className="bg-[#f8f5f2]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">{song.title}</DialogTitle>
            <DialogDescription>{song.artist}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-72">
            <pre className="text-gray-600 whitespace-pre-wrap font-sans text-base leading-relaxed p-1">
              {song.lyrics}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo do Vídeo - Refactorisé avec intégration parfaite */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-md p-0 border-0 bg-transparent">
          <div className="relative">
            {/* Header avec titre et bouton de fermeture */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" />
                <span className="text-white font-semibold">{song.title}</span>
              </div>
              <button
                onClick={() => setShowVideo(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Container TikTok avec intégration parfaite */}
            <div className="mt-16"> {/* Espace pour le header */}
              {(() => {
                const normalizedId = cleanTikTokId(song.tiktok_video_id) || cleanTikTokId(song.tiktok_url);
                if (!normalizedId) {
                  return (
                    <div className="bg-gray-100 rounded-2xl p-8 text-center">
                      <p className="text-gray-500">Vídeo TikTok não disponível</p>
                    </div>
                  );
                }
                
                return (
                  <TikTokDirect
                    postId={normalizedId}
                    className="w-full"
                  />
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}