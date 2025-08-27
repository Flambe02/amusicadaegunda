import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import TikTokEmbed from './TikTokEmbed';

export default function SongPlayer({ song }) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);

  if (!song) {
    return (
      <div className="bg-[#f8f5f2] rounded-3xl p-8 shadow-xl text-center">
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
      } catch {}
    }
  };

  const hasAnyPlatform = !!(song.spotify_url || song.apple_music_url || song.youtube_url);

  return (
    <>
      <div className="bg-[#f8f5f2] rounded-3xl shadow-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-teal-100 to-rose-100">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {format(new Date(song.release_date), "dd/MM", { locale: ptBR })}
          </p>
          <h2 className="text-xl font-black text-gray-800 leading-tight">{song.title}</h2>
          <p className="text-base font-semibold text-gray-600">{song.artist}</p>
        </div>

        {/* TikTok */}
        {song.tiktok_video_id && (
          <div className="px-4 pt-4">
            <TikTokEmbed videoId={song.tiktok_video_id} className="mb-4" />
          </div>
        )}

        {/* 3 Ações Principais – sans icônes */}
        <div className="px-4 pb-5">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-xs"
              onClick={() => setShowPlatforms(true)}
            >
              Plataformas
            </Button>

            <Button
              variant="outline"
              className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-xs"
              onClick={() => setShowLyrics(true)}
            >
              Letras
            </Button>

            <Button
              variant="outline"
              className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-xs"
              onClick={shareCurrentSong}
            >
              Compartilhar
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo Plataformas */}
      <Dialog open={showPlatforms} onOpenChange={setShowPlatforms}>
        <DialogContent className="bg-[#f8f5f2] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">Ouvir em outras plataformas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {song.spotify_url && (
              <a href={song.spotify_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-2xl text-sm">
                  Ouvir no Spotify
                </Button>
              </a>
            )}
            {song.apple_music_url && (
              <a href={song.apple_music_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90 text-white font-bold py-3 rounded-2xl text-sm">
                  Ouvir no Apple Music
                </Button>
              </a>
            )}
            {song.youtube_url && (
              <a href={song.youtube_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-2xl text-sm">
                  Assistir no YouTube
                </Button>
              </a>
            )}
            {!hasAnyPlatform && (
              <p className="text-gray-600 text-sm">Links de streaming em breve...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo Letras */}
      <Dialog open={showLyrics} onOpenChange={setShowLyrics}>
        <DialogContent className="bg-[#f8f5f2] max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">{song.title}</DialogTitle>
            <p className="text-gray-600 font-semibold">{song.artist}</p>
          </DialogHeader>
          <ScrollArea className="h-60 mt-4">
            <div className="pr-4">
              <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {song.lyrics || 'Sem letra disponível.'}
              </pre>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}