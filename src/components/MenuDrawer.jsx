import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Info, Search, Home, Gift, ListMusic } from 'lucide-react';
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
      name: 'Início',
      url: createPageUrl('Home'),
      icon: Home,
      description: 'Voltar para a música da semana'
    },
    {
      name: 'Roda',
      url: createPageUrl('Roda'),
      icon: Gift,
      description: 'Descobrir uma música ao acaso'
    },
    {
      name: 'Playlist',
      url: createPageUrl('Playlist'),
      icon: ListMusic,
      description: 'Ouvir todo o catálogo'
    },
    {
      name: 'Blog',
      url: createPageUrl('Blog'),
      icon: FileText,
      description: 'Histórias por trás das músicas'
    },
    {
      name: 'Pesquisa',
      url: createPageUrl('Search'),
      icon: Search,
      description: 'Encontrar uma música'
    },
    {
      name: 'Quem Somos',
      url: createPageUrl('Sobre'),
      icon: Info,
      description: 'Conhecer a história do projeto'
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[85vh] border-t border-white/20 bg-black/95 backdrop-blur-xl">
        <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-white/30" />

        <DrawerHeader className="px-6 pb-2 pt-4">
          <DrawerTitle className="flex items-center gap-3 text-xl font-bold text-white">
            <span>Menu</span>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Menu principal de navegação mobile.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.url}
                  onClick={() => onOpenChange(false)}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-200 active:scale-95 touch-manipulation hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-white/20">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-base font-semibold text-white">
                      {item.name}
                    </h3>
                    <p className="text-sm text-white/60">
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
