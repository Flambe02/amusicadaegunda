import React from 'react';
import { FileText } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';

export default function LyricsDrawer({ 
  open, 
  onOpenChange, 
  lyrics,
  songTitle
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="bg-black/95 backdrop-blur-xl border-t border-white/20 max-h-[85vh]">
        {/* Handle bar */}
        <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-white/30" />
        
        {/* Header avec titre */}
        <DrawerHeader className="px-6 pt-4 pb-2">
          <DrawerTitle className="text-xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            Letras
          </DrawerTitle>
          {songTitle && (
            <DrawerDescription className="text-white/80 text-sm mt-2 drop-shadow-sm">
              {songTitle}
            </DrawerDescription>
          )}
        </DrawerHeader>
        
        {/* Contenu scrollable */}
        <div className="px-6 pb-6 flex-1 overflow-hidden">
          {lyrics && lyrics.trim() ? (
            <ScrollArea className="h-[calc(85vh-120px)]">
              <div className="pr-4">
                <pre className="text-white/95 whitespace-pre-wrap font-sans text-base leading-relaxed drop-shadow-sm">
                  {lyrics}
                </pre>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/90 font-medium text-lg mb-2 drop-shadow-sm">Letras não disponíveis</p>
              <p className="text-white/70 text-sm drop-shadow-sm">
                As letras desta música serão adicionadas em breve.
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

