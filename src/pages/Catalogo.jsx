import { useEffect, useState } from 'react';
import MobileRedirect from '@/components/mobile/MobileRedirect';
import CaipivaraStage from '@/components/mobile/catalogo/CaipivaraStage';
import { Song } from '@/api/entities';
import { useSEO } from '@/hooks/useSEO';

/**
 * /catalogo — onglet Catálogo de la nav mobile : la scène de la Caipivara (étape 9).
 * La recherche (panneau qui monte du bas) arrive à l'étape 10.
 * Desktop (≥ 768 px) : redirection vers /musica, la page indexée (addendum §G.2).
 * Toujours `noindex` (stub noindex, hors sitemap).
 */
export default function Catalogo() {
  const [songs, setSongs] = useState([]);

  useSEO({
    title: 'Catálogo — A Música da Segunda',
    description: 'Toque na Caipivara e ela escolhe uma paródia de A Música da Segunda pra você.',
    url: '/catalogo',
    robots: 'noindex, follow',
  });

  // Toutes les chansons publiées ; Song.list retombe sur content/songs.json si
  // Supabase est indisponible — la scène et le tirage fonctionnent quand même.
  useEffect(() => {
    let alive = true;
    Song.list('-release_date')
      .then((list) => {
        if (alive) setSongs(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <MobileRedirect to="/musica" when="desktop">
      <CaipivaraStage songs={songs} />
    </MobileRedirect>
  );
}
