import { Tv as TvIcon, Download, Mic, Users, PartyPopper, CheckCircle2, Clock } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { getPlayStoreUrl } from '@/lib/playStore';

const SCREENSHOT = '/images/tv-app/tv-home-screenshot.webp';

const FEATURES = [
  {
    icon: Mic,
    title: 'Karaokê completo',
    text: 'Letras sincronizadas, balayage palavra a palavra e barra de comandos no controle remoto.',
  },
  {
    icon: Users,
    title: 'Modo Dueto',
    text: 'Cante em dupla com letras alinhadas e coloridas por cantor, quando a música tiver esse modo.',
  },
  {
    icon: PartyPopper,
    title: 'Modo Festa',
    text: 'Uma música puxa a outra automaticamente — perfeito para a roda de amigos e família.',
  },
];

const PLATFORMS = [
  { name: 'Google TV / Android TV', status: 'available', note: 'Disponível agora na Google Play' },
  { name: 'Samsung TV', status: 'soon', note: 'Em breve' },
];

function PlatformBadge({ name, status, note }) {
  const Icon = status === 'available' ? CheckCircle2 : Clock;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
      status === 'available' ? 'border-app-yellow/30 bg-app-yellow/5' : 'border-white/10 bg-white/[0.04]'
    }`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${status === 'available' ? 'text-app-yellow' : 'text-white/40'}`} />
      <div>
        <p className="text-sm font-bold text-white">{name}</p>
        <p className="text-xs text-white/50">{note}</p>
      </div>
    </div>
  );
}

function DownloadButton({ className = '' }) {
  return (
    <a
      href={getPlayStoreUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-app-yellow px-6 py-4 text-sm font-black text-black transition hover:bg-[#fde047]/90 ${className}`}
    >
      <Download className="h-5 w-5" />
      Baixar na Google Play
    </a>
  );
}

export default function Tv() {
  useSEO({
    title: 'A Música da Segunda na sua TV — Karaokê para Google TV e Android TV',
    description: 'Baixe o app A Música da Segunda para Google TV / Android TV e cante karaokê na tela grande: letras sincronizadas, Modo Dueto e Modo Festa. Em breve também na Samsung TV.',
    keywords: 'app android tv, google tv, karaokê tv, samsung tv, baixar app música da segunda',
    url: '/tv',
    type: 'website',
  });

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'A Música da Segunda',
          applicationCategory: 'EntertainmentApplication',
          operatingSystem: 'Android TV, Google TV',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
        })}
      </script>

      {/* Mobile */}
      <div className="md:hidden px-4 pb-8 pt-5 text-white">
        <div className="mx-auto max-w-[430px] text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-app-yellow/35 bg-black">
            <TvIcon className="h-7 w-7 text-app-yellow" />
          </div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.26em] text-app-yellow">Novo</p>
          <h1 className="text-2xl font-black leading-tight text-white">
            Karaokê da Segunda, direto na sua TV
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Baixe o app, conecte o microfone (ou grite mesmo) e cante as paródias com a família, no controle remoto.
          </p>

          <div className="mt-5 overflow-hidden rounded-[20px] border border-white/10">
            <img src={SCREENSHOT} alt="Tela inicial do app A Música da Segunda no Google TV" className="w-full" loading="lazy" />
          </div>

          <DownloadButton className="mt-5 w-full" />

          <div className="mt-4 space-y-2 text-left">
            {PLATFORMS.map((p) => <PlatformBadge key={p.name} {...p} />)}
          </div>

          <div className="mt-6 space-y-2 text-left">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[18px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-app-yellow" />
                  <p className="text-sm font-black text-white">{title}</p>
                </div>
                <p className="text-xs leading-5 text-white/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block mx-auto max-w-6xl p-4 lg:p-5 2xl:max-w-7xl">
        <section className="glass-panel desktop-shell-gradient mb-6 overflow-hidden rounded-[36px] p-5 md:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,460px)] xl:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/70">
                <TvIcon className="h-3.5 w-3.5 text-app-yellow" />
                A Música da Segunda na TV
              </div>

              <h1 className="max-w-[16ch] text-4xl font-black leading-[0.98] tracking-tight text-white md:text-5xl xl:text-[3.2rem]">
                Karaokê da Segunda, direto na sua TV
              </h1>
              <p className="max-w-xl text-base leading-7 text-white/68 md:text-lg">
                Baixe o app para Google TV / Android TV e transforme a sala em palco: letras sincronizadas,
                Modo Dueto e Modo Festa para cantar com quem estiver por perto.
              </p>

              <DownloadButton />

              <div className="grid gap-3 sm:grid-cols-2">
                {PLATFORMS.map((p) => <PlatformBadge key={p.name} {...p} />)}
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 shadow-2xl shadow-black/40">
              <img src={SCREENSHOT} alt="Tela inicial do app A Música da Segunda no Google TV" className="w-full" loading="eager" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-app-yellow/12 text-app-yellow">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/62">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
