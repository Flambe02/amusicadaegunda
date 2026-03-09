import { Heart, Music, Calendar, Users, Star, Award, Instagram, Video, Youtube, Mail, MessageCircle, HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from '../components/OptimizedImage';
import { useSEO } from '../hooks/useSEO';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function Sobre() {
  const [openFAQIndex, setOpenFAQIndex] = useState(null);

  const faqs = [
    {
      question: "O que é A Música da Segunda?",
      answer: "A Música da Segunda é um projeto criativo brasileiro que produz paródias musicais inteligentes sobre a atualidade do Brasil. Toda segunda-feira, uma nova música transforma notícias e acontecimentos em canções divertidas, críticas e reflexivas. O projeto combina humor musical com análise social, oferecendo uma perspectiva própria sobre os eventos do país por meio da música."
    },
    {
      question: "Quando sai uma música nova?",
      answer: "Uma nova música é publicada toda segunda-feira. Esta regularidade garante que os fãs sempre tenham conteúdo novo para começar a semana. A música é lançada simultaneamente em todas as plataformas: TikTok, YouTube, Spotify, Apple Music, YouTube Music e no site oficial."
    },
    {
      question: "Como funciona o processo de criação?",
      answer: "O processo começa com a seleção cuidadosa de notícias da semana anterior. Escolho temas relevantes que podem ser transformados em paródias musicais. Depois, crio as letras, que são escritas para serem inteligentes e equilibradas entre humor e crítica. A produção musical é feita com equipamentos profissionais, e cada música ganha um vídeo criativo para TikTok e YouTube."
    },
    {
      question: "As músicas são sobre política?",
      answer: "Não apenas sobre política. A Música da Segunda aborda diversos temas: política, economia, sociedade, cultura, esportes e até mesmo curiosidades. O importante é que cada tema seja relevante para os brasileiros e possa ser trabalhado de forma criativa e reflexiva. Busco diversidade nos temas para manter o projeto interessante e abrangente."
    },
    {
      question: "Onde posso ouvir as músicas?",
      answer: "Você pode ouvir as músicas em várias plataformas: TikTok para vídeos curtos, YouTube para vídeos completos, Spotify e Apple Music para streaming, além do site oficial www.amusicadasegunda.com, onde estão o acervo, as letras e mais informações sobre cada lançamento."
    },
    {
      question: "As músicas são gratuitas?",
      answer: "Sim! Todas as músicas são totalmente gratuitas e disponíveis em todas as plataformas. Você pode ouvir, compartilhar e comentar sem custo algum."
    },
    {
      question: "Como posso compartilhar uma música?",
      answer: "Cada página de música no site tem botões de compartilhamento para redes sociais como Facebook, Twitter, WhatsApp e mais. Você também pode copiar o link direto da música ou compartilhar diretamente do TikTok, YouTube ou outras plataformas. Compartilhar ajuda muito o projeto a crescer!"
    },
    {
      question: "Posso usar as músicas em meus próprios vídeos?",
      answer: "O uso das músicas depende do contexto. Para uso pessoal e não comercial, em geral é permitido. Para uso comercial ou em projetos que gerem receita, é necessário entrar em contato por e-mail, em contact@amusicadasegunda.com, para discutir permissões e possíveis licenças."
    },
    {
      question: "Como são escolhidas as músicas que serão parodiadas?",
      answer: "A escolha da música base (a canção original que será parodiada) é estratégica. Uso músicas conhecidas que, quando combinadas com novas letras sobre atualidades, criam um contraste interessante e memorável. Não me limito a um gênero: parodio MPB, pop, rock, samba, funk e outros estilos musicais brasileiros."
    },
    {
      question: "O projeto tem algum viés político?",
      answer: "A Música da Segunda busca criar humor e reflexão, não promover uma agenda política específica. As paródias podem criticar diferentes aspectos da política e da sociedade, sempre com foco no humor e na análise crítica. O projeto respeita a diversidade de opiniões e procura apresentar diferentes perspectivas por meio da música."
    },
    {
      question: "Como posso apoiar o projeto?",
      answer: "A melhor forma de apoiar é compartilhando as músicas, seguindo nas redes sociais (TikTok, Instagram, YouTube), e engajando com o conteúdo. Você também pode entrar em contato se quiser contribuir de outras formas ou fazer sugestões de temas para futuras músicas."
    },
    {
      question: "Vocês fazem músicas personalizadas ou encomendas?",
      answer: "Atualmente, o foco do projeto está nas músicas semanais sobre a atualidade. Ainda assim, há abertura para conversas sobre projetos especiais ou colaborações. Entre em contato por e-mail, em contact@amusicadasegunda.com, para avaliar possibilidades."
    },
    {
      question: "Onde posso ver todas as músicas já lançadas?",
      answer: "No site oficial, você pode acessar o acervo musical e a playlist com todas as músicas em ordem cronológica. Cada música tem sua própria página com letras completas, vídeos e links para todas as plataformas."
    },
    {
      question: "As letras das músicas estão disponíveis?",
      answer: "Sim! Todas as letras completas estão disponíveis no site. Basta clicar em qualquer música para ver a letra completa, além de informações sobre o tema abordado, contexto histórico e referências. As letras são apresentadas de forma clara e fácil de ler."
    },
    {
      question: "Como posso sugerir um tema para uma música?",
      answer: "Adoro sugestões. Você pode entrar em contato por e-mail, em contact@amusicadasegunda.com, ou pelas redes sociais. Embora nem toda sugestão possa virar música, todas as ideias são consideradas e muitas vezes inspiram lançamentos futuros."
    }
  ];

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

  const blockClass = "bg-gradient-to-br from-blue-950/60 to-[#0f172a]/70 backdrop-blur-sm rounded-[28px] p-8 mb-6 border border-blue-400/15";

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        })}
      </script>

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "Sobre a Música da Segunda",
            "description": "Informações sobre o projeto A Música da Segunda, que produz paródias musicais sobre a atualidade do Brasil",
            "mainEntity": {
              "@type": "MusicGroup",
              "name": "A Música da Segunda",
              "description": "Projeto musical brasileiro que transforma notícias em paródias musicais inteligentes",
              "genre": ["Paródia", "Humor", "Música popular brasileira"],
              "foundingLocation": {
                "@type": "Country",
                "name": "Brasil"
              }
            }
          })}
        </script>

      <div className="space-y-0">
        <div className="desktop-about-shell mx-auto max-w-6xl p-4 lg:p-5 2xl:max-w-7xl">
          {/* Hero */}
          <section className="glass-panel desktop-shell-gradient mb-6 overflow-hidden rounded-[36px] p-5 md:p-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,360px)] xl:items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/70">
                  <Heart className="h-3.5 w-3.5 text-[#FDE047]" />
                  Quem somos
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
                    src="/images/2026 logo.png"
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
              Quem somos: a história do projeto
            </h2>

            <div className="space-y-4 text-white/68 text-base leading-relaxed">
              <p>
                <strong className="text-white">A Música da Segunda</strong> é um projeto autoral brasileiro que cria paródias musicais
                sobre a atualidade do país. O conceito é simples: toda segunda-feira, uma nova música comenta com humor e
                sagacidade os principais acontecimentos da semana anterior.
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
               Nossa missão
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
                Acompanho os principais temas da semana e seleciono assuntos que podem ser transformados em paródias musicais.
                As letras são escritas para equilibrar humor, crítica, ritmo e reconhecimento imediato.
              </p>

              <h3 className="text-xl font-bold text-white mt-6 mb-3">Produção</h3>
              <p>
                Cada faixa é produzida com cuidado técnico, buscando boa qualidade sonora e coerência com a música-base.
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
                O repertório pode passar por MPB, pop, rock, samba, funk e outras referências populares, dependendo do tema.
              </p>

              <p>
                O humor varia entre sátira política, ironia social, comentário cultural e observação do cotidiano. O importante
                é que cada música seja <strong className="text-white">memorável, cantável e reflexiva</strong>, convidando o ouvinte
                a pensar sobre o tema abordado enquanto se diverte.
              </p>

              <p>
                Todas as músicas buscam qualidade de produção, clareza de letra e uma identidade musical brasileira, crítica e
                acessível.
              </p>
            </div>
          </article>

          {/* O que oferecemos */}
          <div className={blockClass}>
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
          <div className={blockClass}>
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

          {/* Redes sociais */}
          <div className={blockClass}>
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Instagram className="w-6 h-6 text-pink-400" />
               Redes sociais
            </h3>
            <p className="text-white/68 mb-6">
              Acompanhe os lançamentos, bastidores e novidades do projeto nas redes.
            </p>
            <div className="flex justify-center gap-4">
              <a href="https://www.tiktok.com/@amusicadasegunda" target="_blank" rel="noopener noreferrer" className="bg-white/10 border border-white/10 text-white p-3 rounded-full hover:bg-white/20 transition-colors">
                <Video className="w-6 h-6" />
              </a>
              <a href="https://www.instagram.com/a_musica_da_segunda/" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-3 rounded-full hover:opacity-80 transition-opacity">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="https://music.youtube.com/playlist?list=PLmoOyuQg7Y2QZKbcj20s7dcadsVx7WuWH" target="_blank" rel="noopener noreferrer" className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors">
                <Youtube className="w-6 h-6" />
              </a>
              <a href="https://music.apple.com/us/artist/the-piment%C3%A3o-rouge-project/1791441717" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-3 rounded-full hover:opacity-80 transition-opacity">
                <Music className="w-6 h-6" />
              </a>
              <a href="https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH?si=c32b67518b2a4817" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-colors">
                <Music className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-br from-blue-900/60 to-[#0f172a]/80 backdrop-blur-sm rounded-[28px] p-8 text-center border border-blue-400/15 mb-6">
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
