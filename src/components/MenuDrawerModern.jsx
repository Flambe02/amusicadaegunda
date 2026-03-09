import { Link } from 'react-router-dom';
import { FileText, Home, Info, Search, Shuffle } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
} from './ui/drawer';
import { createPageUrl } from '@/utils';

export default function MenuDrawerModern({ open, onOpenChange }) {
  const menuItems = [
    {
      name: 'Inicio',
      url: createPageUrl('Home'),
      icon: Home,
      description: 'Voltar para a musica da semana',
    },
    {
      name: 'Roda',
      url: createPageUrl('Roda'),
      icon: Shuffle,
      description: 'Descobrir uma faixa ao acaso',
    },
    {
      name: 'Blog',
      url: createPageUrl('Blog'),
      icon: FileText,
      description: 'Contexto e historias das musicas',
    },
    {
      name: 'Pesquisa',
      url: createPageUrl('Search'),
      icon: Search,
      description: 'Encontrar uma musica ou tema',
    },
    {
      name: 'Sobre',
      url: createPageUrl('Sobre'),
      icon: Info,
      description: 'Conhecer o projeto',
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[84vh] border-t border-white/14 bg-black/94 text-white backdrop-blur-3xl">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-white/22" />

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
          <div className="grid gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.url}
                  onClick={() => onOpenChange(false)}
                  className="group flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.045] p-4 transition-all duration-200 active:scale-[0.99] hover:bg-white/[0.08]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                    <Icon className="h-5 w-5 text-[#FDE047]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                    <p className="mt-1 text-sm leading-5 text-white/58">{item.description}</p>
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
