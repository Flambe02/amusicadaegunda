import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Gift, Info, Mail, Search } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { createPageUrl } from '@/utils';

export default function MenuDrawer({ 
  open, 
  onOpenChange 
}) {
  const menuItems = [
    {
      name: 'Pesquisar',
      url: createPageUrl('Search'),
      icon: Search,
      description: 'Encontre uma música'
    },
    {
      name: 'Blog Musical',
      url: createPageUrl('Blog'),
      icon: FileText,
      description: 'Artigos e notícias sobre música'
    },
    {
      name: 'A Roda de Segunda',
      url: createPageUrl('Roda'),
      icon: Gift,
      description: 'Gire a roda e descubra uma música!'
    },
    {
      name: 'Sobre / Nossa Missão',
      url: createPageUrl('Sobre'),
      icon: Info,
      description: 'Descubra nossa história'
    },
    {
      name: 'Contato',
      url: 'mailto:contact@amusicadasegunda.com',
      icon: Mail,
      description: 'Envie-nos uma mensagem',
      isExternal: true
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="bg-black/95 backdrop-blur-xl border-t border-white/20 max-h-[85vh]">
        {/* Handle bar */}
        <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-white/30" />
        
        {/* Header avec titre */}
        <DrawerHeader className="px-6 pt-4 pb-2">
          <DrawerTitle className="text-xl font-bold text-white flex items-center gap-3">
            <span>Menu</span>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Menu principal de navigation mobile.
          </DrawerDescription>
        </DrawerHeader>
        
        {/* Liste des liens */}
        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              
              if (item.isExternal) {
                return (
                  <a
                    key={item.name}
                    href={item.url}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 active:scale-95 touch-manipulation group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                      <Icon className="w-6 h-6 text-white drop-shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base mb-1 drop-shadow-sm">
                        {item.name}
                      </h3>
                      <p className="text-white/70 text-sm drop-shadow-sm">
                        {item.description}
                      </p>
                    </div>
                  </a>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  to={item.url}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 active:scale-95 touch-manipulation group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-base mb-1">
                      {item.name}
                    </h3>
                    <p className="text-white/60 text-sm">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

