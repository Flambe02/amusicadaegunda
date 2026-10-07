import { Heart, Music, Calendar, Users, Star, Award, Instagram, Video, Youtube, Mail, MessageCircle, HelpCircle, ChevronDown, Facebook, Bell, Smile, Headphones, ExternalLink, Search as SearchIcon, X, Play, Pause } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from '../components/OptimizedImage';
import { useSEO } from '../hooks/useSEO';
import { ENTITY_ID, injectJsonLd } from '@/lib/seo-jsonld';
import sobreContent from '../../scripts/sobre.content.json';
import { WHATSAPP_CHANNEL_LABEL, WHATSAPP_CHANNEL_URL } from '@/lib/whatsappChannel';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { BRAND_LOGO_MEDIUM } from '@/lib/imageAssets';
import { Song } from '@/api/entities';
import { extractYouTubeId, getYouTubeThumbnailUrl, titleToSlug } from '@/lib/utils';

// Nombre de chansons publiées, écrit au build par vite.config.js (content/songs.json).
// Absent en développement et dans les tests : la phrase qui le cite n'est alors pas affichée.
/* global __AMDS_SONG_COUNT__ */
const SONG_COUNT = typeof __AMDS_SONG_COUNT__ === 'number' ? __AMDS_SONG_COUNT__ : null;

function normalizeSearchText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getMobileYouTubeId(song) {
  return (
    extractYouTubeId(song?.youtube_url) ||
    extractYouTubeId(song?.youtube_music_url) ||
    null
  );
}

function getMobileSongArtwork(song) {
  const ytId = getMobileYouTubeId(song);
  return (
    song?.cover_image ||
    song?.thumbnail_url ||
    (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null) ||
    getYouTubeThumbnailUrl(song?.youtube_url || song?.youtube_music_url, 'hqdefault') ||
    null
  );
}

function MobileSongSearch() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [activeYtId, setActiveYtId] = useState(null);
  const [playerState, setPlayerState] = useState('stopped');
  const iframeRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    Song.list('-release_date')
      .then((data) => {
        if (!cancelled) setSongs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setSongs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const q = normalizeSearchText(query.trim());
    if (!q) return songs.slice(0, 3);

    return songs
      .filter((song) => (
        normalizeSearchText(song.title).includes(q) ||
        normalizeSearchText(song.artist).includes(q) ||
        normalizeSearchText(song.description).includes(q) ||
        normalizeSearchText(song.category).includes(q)
      ))
      .slice(0, 5);
  }, [query, songs]);

  const sendYTCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  };

  const attemptPlayCurrent = () => {
    if (!activeYtId) return;
    sendYTCommand('playVideo');
    setPlayerState('playing');
  };

  useEffect(() => {
    if (!activeYtId) return undefined;
    const t1 = window.setTimeout(attemptPlayCurrent, 250);
    const t2 = window.setTimeout(attemptPlayCurrent, 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [activeYtId]);

  const handleTogglePlay = (song) => {
    const ytId = getMobileYouTubeId(song);
    if (!ytId) return;

    if (activeId === song.id) {
      if (playerState === 'playing') {
        sendYTCommand('pauseVideo');
        setPlayerState('paused');
      } else {
        sendYTCommand('playVideo');
        setPlayerState('playing');
      }
      return;
    }

    setActiveId(song.id);
    setActiveYtId(ytId);
    setPlayerState('paused');
  };

  return (
    <section className="relative mx-auto max-w-[430px] rounded-[22px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {activeYtId ? (
        <iframe
          key={activeYtId}
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${activeYtId}?enablejsapi=1&autoplay=1&rel=0`}
          title="player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={attemptPlayCurrent}
          className="fixed -left-[9999px] -top-[9999px] h-px w-px opacity-0"
        />
      ) : null}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-app-yellow">Pesquisa</p>
          <h2 className="mt-1 text-lg font-black text-white">Buscar músicas</h2>
        </div>
        <Music className="h-5 w-5 text-white/38" aria-hidden="true" />
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Titulo, tema, palavra..."
          className="min-h-12 w-full rounded-[16px] border border-white/10 bg-black/35 pl-10 pr-10 text-sm font-semibold text-white placeholder:text-white/32 focus:border-app-yellow/45 focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/45"
            aria-label="Limpar pesquisa"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="py-5 text-center text-sm font-semibold text-white/42">Carregando catálogo...</div>
        ) : results.length > 0 ? (
          results.map((song) => {
            const artwork = getMobileSongArtwork(song);
            const slug = titleToSlug(song.title);
            const isActive = activeId === song.id;
            const isPlaying = isActive && playerState === 'playing';

            return (
              <article key={song.id} className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-black/28 p-2.5">
                <Link
                  to={slug ? `/musica/${slug}/` : createPageUrl('Playlist')}
                  className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[12px] bg-white/8"
                  aria-label={`Abrir ${song.title}`}
                >
                  {artwork ? (
                    <img src={artwork} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Music className="h-5 w-5 text-white/30" aria-hidden="true" />
                    </span>
                  )}
                </Link>

                <Link to={slug ? `/musica/${slug}/` : createPageUrl('Playlist')} className="min-w-0 flex-1 text-left">
                  <h3 className="truncate text-sm font-black text-white">{song.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-4 text-white/50">
                    {song.description || song.artist || 'A Música da Segunda'}
                  </p>
                </Link>

                <button
                  type="button"
                  onClick={() => handleTogglePlay(song)}
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                    isPlaying ? 'bg-app-yellow text-black' : 'bg-white/10 text-white'
                  }`}
                  aria-label={isPlaying ? 'Pausar música' : 'Tocar música'}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                </button>
              </article>
            );
          })
        ) : (
          <div className="py-5 text-center text-sm font-semibold text-white/42">Nenhuma música encontrada.</div>
        )}
      </div>
    </section>
  );
}

function MobileAboutExperience() {
  const socialLinks = [
    {
      label: 'WhatsApp',
      href: 'https://wa.me/?text=A%20M%C3%BAsica%20da%20Segunda%20-%20https%3A%2F%2Fwww.amusicadasegunda.com',
      className: 'bg-green-500 text-white',
      icon: MessageCircle,
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/a_musica_da_segunda/',
      className: 'bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 text-white',
      icon: Instagram,
    },
    {
      label: 'YouTube',
      href: 'https://music.youtube.com/playlist?list=PLmoOyuQg7Y2QZKbcj20s7dcadsVx7WuWH',
      className: 'bg-red-600 text-white',
      icon: Youtube,
    },
    {
      label: 'Spotify',
      href: 'https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH?si=c32b67518b2a4817',
      className: 'bg-emerald-500 text-black',
      icon: Music,
    },
  ];

  const pillars = [
    {
      icon: Music,
      title: 'Nova música toda semana',
      text: 'Toda segunda tem lançamento.',
    },
    {
      icon: Smile,
      title: 'Humor com contexto',
      text: 'Piadas inteligentes sobre o que importa.',
    },
    {
      icon: Headphones,
      title: 'Disponível em várias plataformas',
      text: 'Ouça onde e como quiser.',
    },
  ];

  return (
    <div className="md:hidden relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_50%_-10%,rgba(253,224,71,0.18),transparent_30%),linear-gradient(180deg,#050505_0%,#0d0d0d_48%,#050505_100%)] px-4 pb-6 pt-5 text-app-white">
      <div className="pointer-events-none absolute -right-14 top-4 h-36 w-36 rounded-full bg-app-yellow/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-28 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[repeating-linear-gradient(135deg,rgba(253,224,71,0.08)_0px,rgba(253,224,71,0.08)_1px,transparent_1px,transparent_18px)] opacity-20" />

      <section className="relative mx-auto flex min-h-[calc(100svh-6rem)] max-w-[430px] flex-col items-center justify-center py-5 text-center landscape:min-h-0 landscape:max-w-[680px] landscape:py-6">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-app-yellow/35 bg-black shadow-[0_0_0_8px_rgba(253,224,71,0.05),0_24px_70px_rgba(0,0,0,0.62)]">
          <div className="absolute inset-2 rounded-full border border-app-yellow/35" />
          <OptimizedImage
            src={BRAND_LOGO_MEDIUM}
            alt="Logo A Música da Segunda"
            className="h-full w-full rounded-full object-cover"
            loading="eager"
          />
        </div>

        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.26em] text-app-yellow">
          Sobre o projeto
        </p>
        <h1 className="max-w-[12ch] text-[2.1rem] font-black leading-[0.98] tracking-normal text-white landscape:max-w-[28ch] landscape:text-[1.8rem]">
          Toda segunda, o Brasil vira refrão.
        </h1>
        <p className="mt-4 max-w-[20rem] text-[14px] font-medium leading-6 text-white/68">
          A Música da Segunda transforma notícias, política, cultura e caos do Brasil em paródias musicais cheias de humor e contexto.
        </p>

        <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
          {pillars.map(({ icon: Icon, title, text }) => (
            <article key={title} className="min-h-[116px] rounded-[18px] border border-white/10 bg-white/[0.055] px-2.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="mx-auto mb-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-app-yellow ring-1 ring-app-yellow/20">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-[11px] font-black leading-tight text-white">
                {title}
              </h2>
              <p className="mt-1.5 text-[10px] font-medium leading-[1.3] text-white/55">
                {text}
              </p>
            </article>
          ))}
        </div>

        <a
          href="mailto:contact@amusicadasegunda.com?subject=Receber%20A%20M%C3%BAsica%20da%20Segunda"
          className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-app-yellow px-5 text-sm font-black text-black shadow-[0_16px_38px_rgba(253,224,71,0.24)] transition active:scale-[0.98]"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          Receber toda segunda
        </a>

        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold text-white/42">Nos acompanhe</p>
          <div className="flex items-center justify-center gap-4">
            {socialLinks.map(({ label, href, className, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`flex h-11 w-11 items-center justify-center rounded-full shadow-[0_12px_28px_rgba(0,0,0,0.34)] transition active:scale-95 ${className}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </a>
            ))}
          </div>
          {WHATSAPP_CHANNEL_URL && (
            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-[44px] items-center px-3 text-sm font-semibold text-white/70 underline underline-offset-4 active:text-white"
            >
              {WHATSAPP_CHANNEL_LABEL}
            </a>
          )}
        </div>
      </section>

      <section className="relative mx-auto max-w-[430px] space-y-3 pb-2">
        <MobileSongSearch />

        <Link
          to={createPageUrl('Playlist')}
          className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-4 text-left transition active:scale-[0.99]"
        >
          <span>
            <span className="block text-sm font-black text-white">Conheça o catálogo</span>
            <span className="mt-1 block text-xs font-medium text-white/55">Todas as paródias em ordem cronológica.</span>
          </span>
          <ExternalLink className="h-5 w-5 flex-shrink-0 text-app-yellow" aria-hidden="true" />
        </Link>

        <Link
          to={createPageUrl('Roda')}
          className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-4 text-left transition active:scale-[0.99]"
        >
          <span>
            <span className="block text-sm font-black text-white">Gire a roleta</span>
            <span className="mt-1 block text-xs font-medium text-white/55">Descubra um tema e uma música para ouvir agora.</span>
          </span>
          <ExternalLink className="h-5 w-5 flex-shrink-0 text-app-yellow" aria-hidden="true" />
        </Link>

        {/* Blog et Aprender ne sont plus dans le Menu mobile (étape 11) : ils restent
            accessibles ici, discrètement. */}
        <nav aria-label="Mais do projeto" className="flex items-center justify-center gap-6 pt-2">
          <Link to="/blog" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-white/60 active:text-white">
            Blog
          </Link>
          <Link to="/apprendre" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-white/60 active:text-white">
            Aprender português
          </Link>
        </nav>
      </section>
    </div>
  );
}

export default function Sobre() {
  const [openFAQIndex, setOpenFAQIndex] = useState(null);

  // La liste validée, la même que dans le HTML statique (scripts/sobre.content.json).
  const faqs = sobreContent.faq;

  const toggleFAQ = (index) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  useSEO({
    title: 'Sobre a Música da Segunda',
    description: 'A Música da Segunda é um projeto autoral brasileiro que publica paródias musicais inteligentes sobre a atualidade do Brasil, sempre com novos lançamentos às segundas-feiras.',
    keywords: 'música da segunda, paródias musicais, música brasileira, humor musical, atualidades do Brasil, música semanal, sátira musical',
    url: '/sobre',
    type: 'website'
  });

  // JSON-LD dans le <head> : le bloc FAQPage remplace celui du HTML statique (même liste),
  // et AboutPage renvoie à l'entité déclarée sur toutes les pages.
  useEffect(() => {
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    }, 'sobre-faq-schema');
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Sobre A Música da Segunda',
      url: 'https://www.amusicadasegunda.com/sobre/',
      description: sobreContent.intro[0],
      mainEntity: { '@id': ENTITY_ID },
    }, 'sobre-about-schema');
    return () => {
      document.getElementById('sobre-faq-schema')?.remove();
      document.getElementById('sobre-about-schema')?.remove();
    };
  }, [faqs]);

  const blockClass = "bg-gradient-to-br from-blue-950/60 to-[#0f172a]/70 backdrop-blur-sm rounded-[28px] p-5 md:p-8 mb-6 border border-blue-400/15";

  return (
    <>
      <div className="space-y-0">
        <MobileAboutExperience />

        {/* Texte long et FAQ : affichés aussi sur téléphone, sous le bloc court (Google indexe la
            version mobile, et le contenu du FAQPage doit être visible). Les blocs que le bloc
            court couvre déjà (apresentação, redes, contato) restent réservés aux grands écrans. */}
        <div className="desktop-about-shell mx-auto max-w-6xl p-4 md:p-5 2xl:max-w-7xl">
          {/* Hero */}
          <section className="glass-panel desktop-shell-gradient mb-6 hidden overflow-hidden rounded-[36px] p-5 md:block md:p-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,360px)] xl:items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/70">
                  <Heart className="h-3.5 w-3.5 text-[#FDE047]" />
                  Sobre o projeto
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-[13ch] text-4xl font-black leading-[0.95] tracking-tight text-white md:text-5xl xl:text-[3.4rem]">
                    Paródias musicais sobre o Brasil, toda segunda-feira
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                    A Música da Segunda transforma notícias, política, cultura e humor em canções semanais.
                    Esta página explica de onde vem o projeto, como ele é produzido e por que existe.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to={createPageUrl('Playlist')}>
                    <Button className="rounded-full bg-[#FDE047] px-6 py-6 text-sm font-bold text-black hover:bg-[#fde047]/90">
                      Ouvir o catálogo
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Roda')}>
                    <Button
                      variant="outline"
                      className="rounded-full border-white/12 bg-white/5 px-5 py-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
                    >
                      Explorar na roda
                    </Button>
                  </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="max-w-[8ch] text-[clamp(1.55rem,1.7vw,2.15rem)] font-black leading-[0.95] text-[#FDE047]">Toda semana</div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/40">Nova música</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="max-w-[9ch] text-[clamp(1.45rem,1.55vw,2rem)] font-black leading-[0.95] text-white">Várias plataformas</div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/40">TikTok, YouTube, Spotify</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="max-w-[9ch] text-[clamp(1.45rem,1.55vw,2rem)] font-black leading-[0.95] text-white">Humor com contexto</div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/40">Música e atualidade</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-center">
                <div className="mx-auto mb-6 h-40 w-40 overflow-hidden rounded-full ring-8 ring-white/10">
                  <OptimizedImage
                    src={BRAND_LOGO_MEDIUM}
                    alt="Logo A Música da Segunda"
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                </div>
                <h2 className="text-3xl font-black text-white">A Música da Segunda</h2>
                <p className="mt-3 text-base text-white/62">
                  Um projeto autoral para ouvir, rir e refletir toda semana.
                </p>
                <div className="mt-6 space-y-3 text-left text-sm text-white/62">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    Letras inéditas a partir das notícias mais comentadas da semana.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    Publicação contínua com vídeo, letra e links para streaming.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    Uma identidade musical brasileira, crítica e acessível.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quem Somos */}
          <article className={blockClass}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              A história do projeto
            </h2>

            <div className="space-y-4 text-white/68 text-base leading-relaxed">
              <p>
                {sobreContent.intro[0]}
              </p>

              <p>
                {SONG_COUNT ? sobreContent.intro[1].replace('{count}', String(SONG_COUNT)) : sobreContent.introWithoutCount}
              </p>

              <h3 className="text-xl font-bold text-white mt-6 mb-3">Origem e inspiração</h3>
              <p>
                O projeto conversa com o espírito de <strong className="text-white">La Chanson du Dimanche</strong>, iniciativa
                francesa que publicava uma nova canção por semana. A Música da Segunda adapta essa lógica ao contexto
                brasileiro, com referências locais, repertório popular e um olhar crítico sobre o que acontece no país.
              </p>

              <p>
                O resultado é uma linguagem própria: música, comentário e humor em um formato recorrente, pensado para criar
                memória, ritmo de publicação e identidade.
              </p>
            </div>
          </article>

          {/* Nossa missão */}
          <article className={blockClass}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                <Music className="w-6 h-6 text-white" />
              </div>
               A missão do projeto
            </h2>

            <div className="space-y-4 text-white/68 text-base leading-relaxed">
              <p>
                A missão de <strong className="text-white">A Música da Segunda</strong> é transformar notícias e acontecimentos do Brasil em
                paródias musicais inteligentes, divertidas e reflexivas. Por meio do humor musical, o projeto busca informar,
                divertir e estimular reflexão sobre a atualidade do país.
              </p>

              <p>
                O humor é uma ferramenta poderosa para o debate democrático. As paródias funcionam como
                <strong className="text-white"> comentários musicais</strong> que buscam engajar o público em reflexões sobre política,
                sociedade, economia e cultura brasileira, sempre respeitando a diversidade de opiniões.
              </p>
            </div>
          </article>

          {/* Como funciona */}
          <article className={blockClass}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
               Como funciona o projeto
            </h2>

            <div className="space-y-4 text-white/68 text-base leading-relaxed">
              <p>O processo de criação é contínuo e combina curadoria, escrita, produção musical e publicação.</p>

              <h3 className="text-xl font-bold text-white mt-6 mb-3">Seleção e escrita</h3>
              <p>
                {sobreContent.howItWorks}
              </p>

              <h3 className="text-xl font-bold text-white mt-6 mb-3">Produção</h3>
              <p>
                {sobreContent.production}
                O lançamento também pode ganhar vídeo, capa e contexto editorial.
              </p>

              <h3 className="text-xl font-bold text-white mt-6 mb-3">Publicação semanal</h3>
              <p>
                Toda segunda-feira, uma nova música é publicada nas plataformas de streaming e nas redes. O site centraliza o
                acervo, a letra e os links de escuta.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
              <div className="rounded-[20px] border border-blue-400/15 bg-blue-950/40 p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-white mb-3 text-lg">Toda segunda</h4>
                <p className="text-white/58 text-sm leading-relaxed">
                  Um novo lançamento entra no ar para abrir a semana com música e comentário.
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-400/15 bg-blue-950/40 p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-white mb-3 text-lg">Vídeo e música</h4>
                <p className="text-white/58 text-sm leading-relaxed">
                  A faixa pode ser acompanhada por vídeo, letra e distribuição nas plataformas.
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-400/15 bg-blue-950/40 p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-white mb-3 text-lg">Compartilhamento</h4>
                <p className="text-white/58 text-sm leading-relaxed">
                  A comunidade descobre, compartilha e amplia o alcance de cada lançamento.
                </p>
              </div>
            </div>
          </article>

          {/* Para quem */}
          <article className={blockClass}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
               Para quem é este projeto?
            </h2>

            <p className="text-white/68 text-base leading-relaxed">
              <strong className="text-white">A Música da Segunda</strong> é para quem gosta de música, humor e atualidade.
              O projeto cria pontes por meio do repertório, da ironia e do comentário cultural, sempre respeitando a diversidade
              de opiniões e a inteligência de quem escuta.
            </p>
          </article>

          {/* Formato e estilo */}
          <article className={blockClass}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Music className="w-6 h-6 text-white" />
              </div>
               Formato e estilo musical
            </h2>

            <div className="space-y-4 text-white/68 text-base leading-relaxed">
              <p>
                As paródias de <strong className="text-white">A Música da Segunda</strong> seguem uma abordagem musical diversificada.
                Cada música é uma criação original, no estilo de gêneros populares brasileiros como marchinha, pagode, funk,
                forró e axé, dependendo do tema.
              </p>

              <p>
                O humor varia entre sátira política, ironia social, comentário cultural e observação do cotidiano. O importante
                é que cada música seja <strong className="text-white">memorável, cantável e reflexiva</strong>, convidando o ouvinte
                a pensar sobre o tema abordado enquanto se diverte.
              </p>
            </div>
          </article>

          {/* O que oferecemos */}
          <div className={`${blockClass} hidden md:block`}>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              O que oferecemos
            </h3>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                {[
                  { color: 'bg-blue-400', text: 'Música nova toda segunda-feira' },
                  { color: 'bg-green-400', text: 'Vídeos do YouTube integrados' },
                  { color: 'bg-purple-400', text: 'Letras das músicas completas' },
                ].map(({ color, text }) => (
                  <div key={text} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/8">
                    <div className={`w-3 h-3 ${color} rounded-full flex-shrink-0`} />
                    <span className="text-white/70 font-medium">{text}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[
                  { color: 'bg-red-400', text: 'Disponível em Spotify, Apple Music e YouTube Music' },
                  { color: 'bg-orange-400', text: 'Acervo musical navegável' },
                  { color: 'bg-pink-400', text: 'Interface responsiva e moderna' },
                ].map(({ color, text }) => (
                  <div key={text} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/8">
                    <div className={`w-3 h-3 ${color} rounded-full flex-shrink-0`} />
                    <span className="text-white/70 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tecnologia */}
          <div className={`${blockClass} hidden md:block`}>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              Tecnologia
            </h3>
            <p className="text-white/68 leading-relaxed mb-6 text-base">
              O site foi construído para oferecer uma experiência rápida, clara e responsiva em desktop, mobile e PWA.
            </p>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[20px] border border-blue-400/15 bg-blue-950/50 p-6">
                <h4 className="font-bold mb-4 text-lg text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  Frontend
                </h4>
                <div className="space-y-2 text-sm text-white/60">
                  {['React 18 + Vite', 'Tailwind CSS', 'Radix UI', 'Design responsivo'].map((item, i) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${['bg-blue-400','bg-green-400','bg-purple-400','bg-orange-400'][i]}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[20px] border border-blue-400/15 bg-blue-950/50 p-6">
                <h4 className="font-bold mb-4 text-lg text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Funcionalidades
                </h4>
                <div className="space-y-2 text-sm text-white/60">
                  {['Integração com YouTube', 'Biblioteca musical', 'Exibição de letras', 'Compartilhamento social'].map((item, i) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${['bg-blue-400','bg-green-400','bg-purple-400','bg-orange-400'][i]}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <article className={blockClass}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              Perguntas frequentes
            </h2>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <article
                  key={index}
                  className="rounded-[20px] border border-white/10 bg-white/5 overflow-hidden transition-all duration-300 hover:border-blue-400/25"
                  itemScope
                  itemType="https://schema.org/Question"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none"
                    aria-expanded={openFAQIndex === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <h3 className="text-base md:text-lg font-semibold text-white pr-8" itemProp="name">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-white/40 flex-shrink-0 transition-transform duration-300 ${
                        openFAQIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div
                    id={`faq-answer-${index}`}
                    className={`overflow-hidden transition-all duration-300 ${
                      openFAQIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div
                      className="px-6 pb-5 text-white/62 leading-relaxed"
                      itemScope
                      itemType="https://schema.org/Answer"
                      itemProp="acceptedAnswer"
                    >
                      <p className="text-sm md:text-base" itemProp="text">{faq.answer}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          {/* Présentation pour les assistants d'IA — des faits, visible, le même texte que dans le HTML statique et llms.txt. */}
          {sobreContent.aiMessage && (
            <article className={blockClass}>
              <h2 className="text-xl font-bold text-white mb-3">{sobreContent.aiMessageTitle}</h2>
              <p className="text-white/68 text-base leading-relaxed">{sobreContent.aiMessage}</p>
            </article>
          )}

          {/* Redes sociais */}
          <div className={`${blockClass} hidden md:block`}>
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Instagram className="w-6 h-6 text-pink-400" />
               Redes sociais
            </h3>
            <p className="text-white/68 mb-6">
              Acompanhe os lançamentos, bastidores e novidades do projeto nas redes.
            </p>
            <div className="flex justify-center gap-4">
              <a href="https://www.facebook.com/amusicadasegundaofficial" target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="https://www.tiktok.com/@amusicadasegunda" target="_blank" rel="noopener noreferrer" className="bg-white/10 border border-white/10 text-white p-3 rounded-full hover:bg-white/20 transition-colors">
                <Video className="w-6 h-6" />
              </a>
              <a href="https://www.instagram.com/a_musica_da_segunda/" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-3 rounded-full hover:opacity-80 transition-opacity">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="https://music.youtube.com/playlist?list=PLmoOyuQg7Y2QZKbcj20s7dcadsVx7WuWH" target="_blank" rel="noopener noreferrer" className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors">
                <Youtube className="w-6 h-6" />
              </a>
              <a href="https://music.apple.com/us/artist/a-m%C3%BAsica-da-segunda/1867784335" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-3 rounded-full hover:opacity-80 transition-opacity">
                <Music className="w-6 h-6" />
              </a>
              <a href="https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH?si=c32b67518b2a4817" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-colors">
                <Music className="w-6 h-6" />
              </a>
            </div>
            {WHATSAPP_CHANNEL_URL && (
              <p className="mt-5 text-center">
                <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white/70 underline underline-offset-4 hover:text-white">
                  {WHATSAPP_CHANNEL_LABEL}
                </a>
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="hidden md:block bg-gradient-to-br from-blue-900/60 to-[#0f172a]/80 backdrop-blur-sm rounded-[28px] p-8 text-center border border-blue-400/15 mb-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Entre em contato</h3>
            <p className="text-white/70 mb-6 text-lg max-w-2xl mx-auto">
              Tem sugestões, críticas ou quer participar do projeto? Adoraríamos ouvir você.
            </p>
            <p className="text-white/45 mb-6 text-sm max-w-2xl mx-auto">
              Bastidores: A Música da Segunda é um projeto criativo idealizado e produzido por The Pimentão Rouge Project.
            </p>
            <a
              href="mailto:contact@amusicadasegunda.com"
              className="inline-flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-sm px-4 md:px-6 py-3 rounded-2xl border border-white/15 hover:bg-white/20 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Mail className="w-5 h-5 text-white flex-shrink-0" />
              <span className="text-white font-semibold text-sm md:text-base break-all">contact@amusicadasegunda.com</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
