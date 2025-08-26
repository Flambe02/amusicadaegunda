import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Share2, ExternalLink, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import TikTokEmbed from './TikTokEmbed';

export default function SongPlayer({ song }) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!song) {
    return (
      <div className="bg-[#f8f5f2] rounded-3xl p-8 shadow-xl text-center">
        <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-500 mb-2">Nenhuma música selecionada</h3>
        <p className="text-gray-400">Aguardando a próxima segunda-feira...</p>
      </div>
    );
  }

  const shareCurrentSong = async () => {
    if (navigator.share) {
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

  return (
    <>
      <div className="bg-[#f8f5f2] rounded-3xl shadow-xl overflow-hidden">
        {/* Cabeçalho Compacto */}
        <div className="p-4 bg-gradient-to-r from-teal-100 to-rose-100">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-gray-600" />
            <p className="text-sm font-bold text-gray-700">
              {format(new Date(song.release_date), "dd/MM", { locale: ptBR })}
            </p>
          </div>
          <h2 className="text-xl font-black text-gray-800 leading-tight">{song.title}</h2>
          <p className="text-base font-semibold text-gray-600">{song.artist}</p>
        </div>

        {/* Vídeo TikTok - Centralizado e Completo */}
        {song.tiktok_video_id && (
          <div className="px-4 pt-4">
            <TikTokEmbed videoId={song.tiktok_video_id} className="mb-4" />
          </div>
        )}

        {/* Seção de Detalhes Colapsável */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span className="text-sm font-semibold">
              {showDetails ? 'Ocultar detalhes' : 'Ver mais detalhes'}
            </span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              {/* Descrição da Música */}
              {song.description && (
                <div className="bg-white/60 rounded-2xl p-4">
                  <p className="text-gray-700 text-sm leading-relaxed">{song.description}</p>
                </div>
              )}

              {/* Hashtags */}
              {song.hashtags && song.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {song.hashtags.slice(0, 4).map((tag, index) => (
                    <span key={index} className="bg-[#32a2dc]/10 text-[#32a2dc] px-3 py-1 rounded-full text-xs font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3">
                {song.lyrics && (
                  <Button 
                    variant="outline" 
                    className="bg-white/60 hover:bg-white/80 text-gray-700 font-bold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => setShowLyrics(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Letra
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="bg-white/60 hover:bg-white/80 text-gray-700 font-bold border-gray-300 py-3 rounded-2xl text-sm"
                  onClick={shareCurrentSong}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
              </div>

              {/* Links das Plataformas de Streaming */}
              <div className="space-y-2">
                {song.spotify_url && (
                  <a href={song.spotify_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-2xl text-sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Spotify
                    </Button>
                  </a>
                )}
                
                {song.apple_music_url && (
                  <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90 text-white font-bold py-3 rounded-2xl text-sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apple Music
                    </Button>
                  </a>
                )}
                
                {song.youtube_url && (
                  <a href={song.youtube_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-2xl text-sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      YouTube
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo das Letras */}
      <Dialog open={showLyrics} onOpenChange={setShowLyrics}>
        <DialogContent className="bg-[#f8f5f2] max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">{song.title}</DialogTitle>
            <p className="text-gray-600 font-semibold">{song.artist}</p>
          </DialogHeader>
          <ScrollArea className="h-60 mt-4">
            <div className="pr-4">
              <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {song.lyrics}
              </pre>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}