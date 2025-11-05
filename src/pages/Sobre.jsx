import { Heart, Music, Calendar, Users, Star, Award, Instagram, Video, Youtube, Mail, MessageCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Sobre() {

  return (
    <>
      {/* SEO Meta Tags enrichis pour IA */}
      <Helmet>
        <title>Sobre - A Música da Segunda | Paródias Musicais do Brasil</title>
        <meta name="description" content="A Música da Segunda é um projeto criativo brasileiro que produz paródias musicais inteligentes sobre a atualidade do Brasil. Toda segunda-feira, lançamos uma nova música que transforma notícias em canções divertidas e críticas." />
        <meta name="keywords" content="música da segunda, paródias musicais, música brasileira, humor musical, atualidades brasil, música semanal, paródias políticas, música de humor" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Sobre - A Música da Segunda | Paródias Musicais do Brasil" />
        <meta property="og:description" content="Descubra a história por trás do projeto A Música da Segunda, que transforma notícias do Brasil em paródias musicais inteligentes e divertidas." />
        <meta property="og:type" content="website" />
        
        {/* Schema.org pour IA */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "name": "Sobre A Música da Segunda",
            "description": "Informações sobre o projeto A Música da Segunda, que produz paródias musicais sobre a atualidade do Brasil",
            "mainEntity": {
              "@type": "MusicGroup",
              "name": "A Música da Segunda",
              "description": "Projeto musical brasileiro que transforma notícias em paródias musicais inteligentes",
              "genre": ["Parody", "Comedy", "Música popular brasileira"],
              "foundingLocation": {
                "@type": "Country",
                "name": "Brasil"
              }
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="p-5 max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-white/10 rounded-full mb-4 backdrop-blur-sm">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden shadow-2xl ring-4 ring-white/20">
                <img 
                  src="images/Musica da segunda.jpg" 
                  alt="Logo Música da Segunda" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-2xl mb-3 bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              Sobre o Projeto
            </h1>
            <p className="text-white/90 font-medium text-lg md:text-xl drop-shadow-lg max-w-2xl mx-auto">
              Conheça a história por trás da Música da Segunda e descubra como nasceu essa paixão pela música
            </p>
          </div>

          {/* Logo Section */}
          <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-10 text-center mb-10 shadow-2xl border border-white/20">
            <div className="w-40 h-40 mx-auto mb-8 rounded-full overflow-hidden shadow-2xl ring-8 ring-white/30 transform hover:scale-105 transition-transform duration-300">
              <img 
                src="images/Musica da segunda.jpg" 
                alt="Logo Música da Segunda" 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-4xl font-black text-gray-800 mb-3">Música da Segunda</h2>
            <p className="text-gray-700 text-xl font-medium">
              Descubra música nova toda segunda-feira
            </p>
          </div>

          {/* Section enrichie pour SEO IA - Quem Somos */}
          <article className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white animate-pulse" />
              </div>
              Quem Somos: A História do Projeto
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p className="text-lg leading-relaxed">
                <strong>A Música da Segunda</strong> é um projeto criativo brasileiro que produz paródias musicais 
                inteligentes sobre a atualidade do Brasil. O conceito é simples: toda segunda-feira, uma nova música é 
                lançada, comentando com humor e sagacidade os principais eventos da semana anterior.
              </p>
              
              <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3">Origem e Inspiração</h3>
              <p className="text-lg leading-relaxed">
                O conceito de <strong>A Música da Segunda</strong> é inspirado em <strong>La Chanson du Dimanche</strong>, 
                um projeto musical francês que publicava uma chanson chaque semaine. A Música da Segunda se inspira deste 
                conceito, mas com um <strong>ton brésilien</strong> único, adaptado à realidade e à cultura do Brasil.
              </p>

              <p className="text-lg leading-relaxed">
                Assim como o projeto francês, o objetivo é criar paródias musicais que comentam a atualidade, mas aqui 
                com uma abordagem totalmente brasileira, usando referências musicais locais, humor típico do Brasil e 
                comentários sobre eventos que marcam a vida dos brasileiros.
              </p>
            </div>
          </article>

          {/* Mission Section enrichie */}
          <article className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                <Music className="w-6 h-6 text-white" />
              </div>
              Nossa Missão
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p className="text-lg leading-relaxed">
                A missão de <strong>A Música da Segunda</strong> é transformar notícias e acontecimentos do Brasil em 
                paródias musicais inteligentes, divertidas e reflexivas. Através do humor musical, buscamos informar, 
                divertir e promover a reflexão sobre a atualidade do país.
              </p>

              <p className="text-lg leading-relaxed">
                Acreditamos que o humor é uma ferramenta poderosa para o debate democrático. Nossas paródias são 
                <strong> comentários musicais</strong> que buscam engajar o público em reflexões sobre política, 
                sociedade, economia e cultura brasileira, sempre respeitando a diversidade de opiniões.
              </p>
            </div>
          </article>

          {/* Como Funciona - Section enrichie */}
          <article className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              Como Funciona o Projeto
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p className="text-lg leading-relaxed">
                O processo de criação é simples e focado em qualidade:
              </p>

              <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3">Seleção e Criação</h3>
              <p className="text-lg leading-relaxed">
                Acompanho as principais notícias do Brasil e seleciono temas relevantes que podem ser transformados em 
                paródias musicais. As letras são escritas para serem inteligentes, mantendo o equilíbrio entre humor e crítica. 
                A escolha da música base é estratégica: uso músicas conhecidas que, quando combinadas com novas letras, 
                criam um contraste interessante e memorável.
              </p>

              <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3">Produção</h3>
              <p className="text-lg leading-relaxed">
                Cada paródia é produzida com equipamentos profissionais, garantindo qualidade sonora. As gravações incluem 
                vocais, instrumentos e arranjos que respeitam a estrutura da música original enquanto incorporam elementos 
                únicos que refletem o tema abordado. Cada música também ganha um vídeo criativo para TikTok e YouTube.
              </p>

              <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3">Publicação Semanal</h3>
              <p className="text-lg leading-relaxed">
                Toda segunda-feira, uma nova música é publicada simultaneamente em todas as plataformas de música: 
                <strong> Spotify, Apple Music, YouTube Music</strong>, além de TikTok, YouTube e no site oficial. 
                Esta regularidade cria expectativa e garante que sempre há conteúdo novo para começar a semana.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="group bg-gradient-to-br from-white/80 to-white/60 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-800 mb-3 text-lg">Toda Segunda</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Uma nova música é cuidadosamente selecionada e publicada para começar sua semana
                </p>
              </div>
              <div className="group bg-gradient-to-br from-white/80 to-white/60 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-800 mb-3 text-lg">Vídeo TikTok</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  A música é apresentada em vídeo com qualidade profissional e criatividade
                </p>
              </div>
              <div className="group bg-gradient-to-br from-white/80 to-white/60 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-800 mb-3 text-lg">Compartilhamento</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  A comunidade descobre, compartilha e cria conexões através da música
                </p>
              </div>
            </div>
          </article>

          {/* Público-Alvo - Section simplifiée */}
          <article className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              Para Quem é Este Projeto?
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p className="text-lg leading-relaxed">
                <strong>A Música da Segunda</strong> é para todos os brasileiros que se interessam por música, humor e atualidades. 
                O projeto busca criar pontes através do humor e da música, sempre respeitando a diversidade de opiniões e 
                promovendo o diálogo construtivo sobre os temas abordados.
              </p>
            </div>
          </article>

          {/* Formato e Estilo Musical - Section simplifiée */}
          <article className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Music className="w-6 h-6 text-white" />
              </div>
              Formato e Estilo Musical
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p className="text-lg leading-relaxed">
                As paródias de <strong>A Música da Segunda</strong> seguem uma abordagem musical diversificada. Não me limito 
                a um único gênero: parodio desde MPB clássica até pop contemporâneo, rock, samba, funk e outros estilos 
                musicais brasileiros. A escolha do estilo musical sempre tem relação com o tema abordado.
              </p>

              <p className="text-lg leading-relaxed">
                O estilo de humor varia entre sátira política, ironia social, comentários sobre economia, cultura e até 
                mesmo paródias de eventos esportivos ou culturais. O importante é que cada música seja <strong>memorável, 
                engajante e reflexiva</strong>, convidando o ouvinte a pensar sobre o tema abordado enquanto se diverte.
              </p>

              <p className="text-lg leading-relaxed">
                Todas as músicas são produzidas com qualidade profissional, utilizando equipamentos de gravação de alta 
                qualidade e arranjos cuidadosamente elaborados.
              </p>
            </div>
          </article>

          {/* Features existantes */}
          <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 shadow-2xl border border-white/20">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              O Que Oferecemos
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Música nova toda segunda-feira</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Vídeos TikTok integrados</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Letras das músicas completas</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Disponível em Spotify, Apple Music e YouTube Music</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Calendário musical interativo</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                  <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Interface responsiva e moderna</span>
                </div>
              </div>
            </div>
          </div>

          {/* Technology */}
          <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 shadow-2xl border border-white/20">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              Tecnologia
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6 text-lg">
              Este projeto foi desenvolvido com as mais modernas tecnologias web para garantir 
              uma experiência excepcional em todos os dispositivos.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-6 text-white backdrop-blur-sm border border-gray-700/50">
                <h4 className="font-bold mb-4 text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  Frontend
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>React 18 + Vite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Tailwind CSS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Radix UI Components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>Responsive Design</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-6 text-white backdrop-blur-sm border border-gray-700/50">
                <h4 className="font-bold mb-4 text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Funcionalidades
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>TikTok Integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Music Calendar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Lyrics Display</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>Social Sharing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white/20 rounded-3xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Instagram className="w-6 h-6 text-pink-400" />
              Redes Sociais
            </h3>
            <p className="text-white/90 mb-4">
              Siga-nos nas redes sociais para ficar por dentro de todas as novidades!
            </p>
            <div className="flex justify-center gap-4">
              <a href="https://www.tiktok.com/@amusicadasegunda" target="_blank" rel="noopener noreferrer" className="bg-black text-white p-3 rounded-full hover:bg-gray-800 transition-colors">
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
          <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-3xl p-8 text-center shadow-2xl border border-white/20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Entre em Contato</h3>
            <p className="text-white/90 mb-6 text-lg max-w-2xl mx-auto">
              Tem sugestões, críticas ou quer participar do projeto? Adoraríamos ouvir de você!
            </p>
            <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/30">
              <Mail className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">pimentaoenchansons@gmail.com</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
