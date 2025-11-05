import React from 'react';
import { FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

export default function LyricsDialog({ 
  open, 
  onOpenChange, 
  song, 
  title = "Letras da Música",
  maxHeight = "h-56",
  showIcon = true 
}) {
  if (!song) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#f8f5f2] max-w-md max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {showIcon && <FileText className="w-5 h-5 text-blue-500" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {song.lyrics ? (
            <ScrollArea className={maxHeight}>
              <div className="pr-4">
                <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {song.lyrics}
                </pre>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Letras não disponíveis</p>
              <p className="text-gray-500 text-sm">As letras desta música serão adicionadas em breve.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
