import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { init, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Loader2 } from 'lucide-react';
import { Song } from '@/api/entities';
import { hasLrcContent } from '@/lib/lrc';
import { getYouTubeThumbnailUrl } from '@/lib/utils';
import { onBackPress, exitApp } from './adapters/backButton';
import { applyTvFlag } from './platform';
import TvHome from './TvHome';
import TvGrid from './TvGrid';
import TvSongDetail from './TvSongDetail';
import TvKaraokeScreen from './TvKaraokeScreen';
import '@/styles/tv.css';

// Initialise la navigation spatiale une seule fois (au chargement du bundle TV).
init({ debug: false, visualDebug: false });

const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};

/**
 * Application TV (« 10-foot UI ») — isolée du mobile/web (montée par App.jsx quand
 * isTV()). Pile d'écrans maison (home → detail → watch/karaoke), Retour matériel via
 * l'adaptateur, nav spatiale mise en pause pendant les overlays plein écran.
 */
export default function TvApp() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stack, setStack] = useState([{ name: 'home' }]);
  const top = stack[stack.length - 1];

  useEffect(() => { applyTvFlag(true); return () => applyTvFlag(false); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await Song.list('-release_date');
        if (!cancelled) setSongs(all || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const push = useCallback((screen) => setStack((s) => [...s, screen]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  // Sortie du mode TV (utile en test navigateur / tablette faux-positif). Sur une vraie
  // TV avec UA TV, l'app reviendra en mode TV au rechargement — comportement attendu.
  const exitTv = useCallback(() => {
    try {
      localStorage.removeItem('force-tv');
      const u = new URL(window.location.href);
      u.searchParams.set('tv', '0');
      window.location.href = u.toString();
    } catch { /* ignore */ }
  }, []);

  const goHome = useCallback(() => setStack([{ name: 'home' }]), []);
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const openCatalog = useCallback(() => setStack((s) => [...s, { name: 'grid', title: 'Catálogo', songs: songsRef.current }]), []);

  // Un écran peut « intercepter » le Back (ex. fiche en lecture vidéo → couper la vidéo
  // au lieu de quitter l'écran). L'intercepteur retourne true s'il a consommé le Back.
  const backInterceptorRef = useRef(null);

  // Retour matériel/télécommande — un seul abonnement, dispatch selon la pile.
  const stackRef = useRef(stack);
  stackRef.current = stack;
  useEffect(() => onBackPress(() => {
    if (backInterceptorRef.current?.()) return; // l'écran courant a géré le Back
    if (stackRef.current.length > 1) pop();
    else exitApp();
  }), [pop]);

  // Overlays plein écran (watch/karaoke) : on met la nav spatiale en pause pour
  // laisser flèches/OK au lecteur, puis on la réactive au retour.
  const isOverlay = top.name === 'karaoke';
  useEffect(() => {
    if (isOverlay) SpatialNavigation.pause(); else SpatialNavigation.resume();
    return () => SpatialNavigation.resume();
  }, [isOverlay]);

  // Miniature = image de la VIDÉO YouTube. ⚠️ Colonnes Supabase (noms trompeurs) :
  // `youtube_music_url` = la VIDÉO (Short) → à utiliser pour la miniature/lecture ;
  // `youtube_url` = la MUSIQUE (source karaoké). La pochette cover_image en dernier recours.
  const getThumb = useCallback(
    (s) => getYouTubeThumbnailUrl(s.youtube_music_url, 'hqdefault')
      || getYouTubeThumbnailUrl(s.youtube_url, 'hqdefault')
      || s.cover_image
      || '',
    [],
  );
  const getCat = useCallback((s) => (s.category ? (CATEGORY_LABELS[s.category] || s.category) : ''), []);
  const getHasKaraoke = useCallback(
    (s) => hasLrcContent(s.lrc_content) && Boolean(s.youtube_url || s.youtube_music_url),
    [],
  );

  const content = useMemo(() => {
    if (top.name === 'grid') {
      return (
        <TvGrid
          title={top.title}
          songs={top.songs}
          getThumb={getThumb}
          getCat={getCat}
          getHasKaraoke={getHasKaraoke}
          onSelect={(s) => push({ name: 'detail', song: s })}
        />
      );
    }
    if (top.name === 'detail') {
      return (
        <TvSongDetail
          key={top.song.id}
          song={top.song}
          thumb={getThumb(top.song)}
          categoryLabel={getCat(top.song)}
          hasKaraoke={getHasKaraoke(top.song)}
          onKaraoke={() => push({ name: 'karaoke', song: top.song })}
          onHome={goHome}
          onSearch={openCatalog}
          onExitTv={exitTv}
          backInterceptorRef={backInterceptorRef}
        />
      );
    }
    if (top.name === 'karaoke') return <TvKaraokeScreen key={top.song.id} song={top.song} onClose={pop} backInterceptorRef={backInterceptorRef} />;
    return (
      <TvHome
        songs={songs}
        getThumb={getThumb}
        getCat={getCat}
        getHasKaraoke={getHasKaraoke}
        onSelectSong={(s) => push({ name: 'detail', song: s })}
        onOpenKaraoke={(s) => push({ name: 'karaoke', song: s })}
        onOpenGrid={(title, list) => push({ name: 'grid', title, songs: list })}
        onExitTv={exitTv}
      />
    );
  }, [top, songs, getThumb, getCat, getHasKaraoke, push, pop, exitTv, goHome, openCatalog]);

  if (loading) {
    return (
      <div className="tv-root tv-boot">
        <Loader2 className="tv-spin" size={44} />
        <p>A preparar o palco…</p>
      </div>
    );
  }

  return <div className="tv-root">{content}</div>;
}
