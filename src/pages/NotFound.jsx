import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';

/**
 * Adresse inconnue (route « * ») : avant, un écran noir. GitHub Pages renvoie ces
 * adresses vers l'app (public/404.html), qui arrive ici. Jamais indexée.
 */
export default function NotFound() {
  useSEO({
    title: 'Página não encontrada',
    description: 'Esta página não existe. Ouça a música da semana ou veja todas as paródias.',
    robots: 'noindex, follow',
  });

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center text-white">
      <img
        src="/images/caipivara-3d-head-256.webp"
        alt=""
        width="96"
        height="96"
        className="h-24 w-24 rounded-full"
      />
      <h1 className="mt-6 text-2xl font-black tracking-tight">Página não encontrada</h1>
      <p className="mt-2 max-w-xs text-sm leading-6 text-white/70">
        Essa música não tocou aqui. Que tal a da semana?
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link
          to="/"
          className="flex min-h-[48px] items-center justify-center rounded-full bg-app-yellow px-5 text-sm font-black text-black"
        >
          Ouvir a música da semana
        </Link>
        <Link
          to="/musica/"
          className="flex min-h-[48px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white"
        >
          Ver todas as músicas
        </Link>
      </div>
    </div>
  );
}
