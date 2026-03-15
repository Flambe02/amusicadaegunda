import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Song } from '@/api/entities';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { Tag, Music } from 'lucide-react';

const CATEGORY_LABELS = {
  internacional: 'Internacional',
  midia: 'Mídia',
  energia: 'Energia',
  esporte: 'Esporte',
  cultura: 'Cultura',
  outros: 'Outros',
  saude: 'Saúde',
  policia: 'Polícia',
  politica: 'Política',
  seguranca: 'Segurança',
  tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia',
};

const CATEGORY_DESCRIPTIONS = {
  internacional: 'Paródias sobre geopolítica, diplomacia e eventos fora do Brasil.',
  midia: 'Sátiras sobre jornalismo, redes sociais e comunicação.',
  energia: 'Músicas sobre crises energéticas, apagões e infraestrutura elétrica.',
  esporte: 'Paródias do universo do esporte brasileiro e internacional.',
  cultura: 'Sátiras sobre carnaval, entretenimento e vida cultural brasileira.',
  outros: 'Músicas sobre temas variados do cotidiano.',
  saude: 'Paródias sobre saúde pública, medicina e bem-estar.',
  policia: 'Sátiras sobre segurança pública e casos policiais.',
  politica: 'Músicas sobre política brasileira, eleições e mandatos.',
  seguranca: 'Paródias sobre violência urbana e segurança pública.',
  tecnologia: 'Sátiras sobre startups, inteligência artificial e inovação.',
  gastronomia: 'Músicas sobre gastronomia, culinária e cultura alimentar.',
};

export default function Categoria() {
  const { slug } = useParams();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const label = CATEGORY_LABELS[slug] || slug;
  const description = CATEGORY_DESCRIPTIONS[slug] || `Paródias musicais da categoria ${label} — A Música da Segunda.`;

  useSEO({
    title: `${label} — Paródias Musicais | A Música da Segunda`,
    description,
    keywords: `música, paródia, ${label.toLowerCase()}, brasil, sátira musical`,
    url: `/categoria/${slug}`,
    type: 'website',
    robots: 'index, follow, max-video-preview:0',
  });

  useEffect(() => {
    if (!slug || !CATEGORY_LABELS[slug]) {
      setLoading(false);
      return;
    }
    Song.list('-release_date').then(all => {
      setSongs((all || []).filter(s => s.category === slug));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  if (!CATEGORY_LABELS[slug]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <p className="text-white/50">Categoria não encontrada.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <html lang="pt-BR" />
        <meta name="robots" content="index, follow, max-video-preview:0" />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
              <Tag className="h-3.5 w-3.5 text-[#FDE047]" />
              Categoria
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black tracking-tight text-white mb-3">{label}</h1>
          <p className="text-base text-white/55 mb-10 leading-relaxed">{description}</p>

          {/* Song list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : songs.length === 0 ? (
            <p className="text-white/40">Nenhuma música nesta categoria ainda.</p>
          ) : (
            <ol className="space-y-3">
              {songs.map((song, i) => (
                <li key={song.id || song.slug}>
                  <Link
                    to={`/musica/${song.slug || ''}`}
                    className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 px-5 py-4 transition hover:bg-white/8 hover:border-white/15"
                  >
                    <span className="text-sm font-mono text-white/30 w-6 text-right shrink-0">{i + 1}</span>
                    <Music className="h-4 w-4 text-[#FDE047] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{song.title}</p>
                      {song.subtitle && (
                        <p className="text-xs text-white/45 italic truncate">{song.subtitle}</p>
                      )}
                    </div>
                    {song.release_date && (
                      <span className="ml-auto text-xs text-white/30 shrink-0">
                        {new Date(song.release_date).getFullYear()}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {/* Back link */}
          <p className="mt-10">
            <Link to="/musica" className="text-sm text-white/40 hover:text-white transition">
              ← Todas as músicas
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
