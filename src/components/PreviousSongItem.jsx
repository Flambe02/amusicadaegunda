import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play } from 'lucide-react';

export default function PreviousSongItem({ song, onSelect }) {
  if (!song) return null;

  return (
    <div 
      className="flex-shrink-0 w-32 text-center cursor-pointer group"
      onClick={() => onSelect(song)}
    >
      <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-md mb-2">
        <img src={song.cover_image} alt={song.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white" />
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-600">
        {format(new Date(song.release_date), "dd 'de' MMMM", { locale: ptBR })}
      </p>
    </div>
  );
}