import { HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "O que é A Música da Segunda?",
      answer: "A Música da Segunda é um projeto criativo brasileiro que produz paródias musicais inteligentes sobre a atualidade do Brasil. Toda segunda-feira, lançamos uma nova música que transforma notícias e acontecimentos em canções divertidas, críticas e reflexivas. O projeto combina humor musical com análise social, oferecendo uma perspectiva única sobre os eventos do país através da música."
    },
    {
      question: "Quando sai uma música nova?",
      answer: "Uma nova música é publicada toda segunda-feira, às 00:00 (meia-noite). Esta regularidade garante que os fãs sempre tenham conteúdo novo para começar a semana. A música é lançada simultaneamente em todas as plataformas: TikTok, YouTube, Spotify, Apple Music e no site oficial."
    },
    {
      question: "Como funciona o processo de criação?",
      answer: "O processo começa com a seleção cuidadosa de notícias da semana anterior. Nossa equipe escolhe temas relevantes que podem ser transformados em paródias musicais. Depois, criamos as letras, que são escritas para serem inteligentes e equilibradas entre humor e crítica. A produção musical é feita com equipamentos profissionais, e cada música ganha um vídeo criativo para TikTok e YouTube."
    },
    {
      question: "As músicas são sobre política?",
      answer: "Não apenas sobre política. A Música da Segunda aborda diversos temas: política, economia, sociedade, cultura, esportes e até mesmo curiosidades. O importante é que cada tema seja relevante para os brasileiros e possa ser trabalhado de forma criativa e reflexiva. Buscamos diversidade nos temas para manter o projeto interessante e abrangente."
    },
    {
      question: "Onde posso ouvir as músicas?",
      answer: "Você pode ouvir as músicas em várias plataformas: TikTok para vídeos curtos, YouTube para vídeos completos, Spotify para streaming de áudio, Apple Music para podcasts e músicas, e no site oficial www.amusicadasegunda.com onde você pode ver todas as músicas, letras, calendário e mais informações sobre cada produção."
    },
    {
      question: "As músicas são gratuitas?",
      answer: "Sim! Todas as músicas são totalmente gratuitas e disponíveis em todas as plataformas. Você pode ouvir, compartilhar e comentar sem custo algum. O projeto é financiado através de doações e suporte da comunidade."
    },
    {
      question: "Como posso compartilhar uma música?",
      answer: "Cada página de música no site tem botões de compartilhamento para redes sociais como Facebook, Twitter, WhatsApp e mais. Você também pode copiar o link direto da música ou compartilhar diretamente do TikTok, YouTube ou outras plataformas. Compartilhar ajuda muito o projeto a crescer!"
    },
    {
      question: "Posso usar as músicas em meus próprios vídeos?",
      answer: "O uso das músicas depende do contexto. Para uso pessoal e não comercial, geralmente é permitido. Para uso comercial ou em projetos que gerem receita, é necessário entrar em contato conosco através do email pimentaoenchansons@gmail.com para discutir permissões e possíveis licenças."
    },
    {
      question: "Como são escolhidas as músicas que serão parodiadas?",
      answer: "A escolha da música base (a canção original que será parodiada) é estratégica. Buscamos músicas conhecidas que, quando combinadas com novas letras sobre atualidades, criam um contraste interessante e memorável. Não nos limitamos a um gênero: parodiamos MPB, pop, rock, samba, funk e outros estilos musicais brasileiros."
    },
    {
      question: "O projeto tem algum viés político?",
      answer: "A Música da Segunda busca criar humor e reflexão, não promover uma agenda política específica. Nossas paródias podem criticar diferentes aspectos da política e sociedade, sempre com foco no humor e na análise crítica. Respeitamos a diversidade de opiniões e buscamos apresentar diferentes perspectivas através da música."
    },
    {
      question: "Como posso apoiar o projeto?",
      answer: "A melhor forma de apoiar é compartilhando as músicas, seguindo nas redes sociais (TikTok, Instagram, YouTube), e engajando com o conteúdo. Você também pode entrar em contato conosco se quiser contribuir de outras formas ou fazer sugestões de temas para futuras músicas."
    },
    {
      question: "Vocês fazem músicas personalizadas ou encomendas?",
      answer: "Atualmente, o foco do projeto é nas músicas semanais sobre atualidades. No entanto, estamos abertos a discussões sobre projetos especiais ou colaborações. Entre em contato através do email pimentaoenchansons@gmail.com para conversar sobre possibilidades."
    },
    {
      question: "Onde posso ver todas as músicas já lançadas?",
      answer: "No site oficial, você pode acessar o Calendário Musical que mostra todas as músicas organizadas por data. Há também a Playlist no Spotify e YouTube Music que reúne todas as músicas em ordem cronológica. Cada música tem sua própria página com letras completas, vídeos e links para todas as plataformas."
    },
    {
      question: "As letras das músicas estão disponíveis?",
      answer: "Sim! Todas as letras completas estão disponíveis no site. Basta clicar em qualquer música para ver a letra completa, além de informações sobre o tema abordado, contexto histórico e referências. As letras são apresentadas de forma clara e fácil de ler."
    },
    {
      question: "O projeto tem um canal no YouTube?",
      answer: "Sim! Além dos vídeos no TikTok, todas as músicas são publicadas no YouTube Music e também em um canal dedicado. Você pode encontrar o link no site na seção de Redes Sociais, junto com links para Spotify, Apple Music e outras plataformas."
    },
    {
      question: "Como posso sugerir um tema para uma música?",
      answer: "Adoramos sugestões! Você pode entrar em contato através do email pimentaoenchansons@gmail.com ou através das redes sociais. Enquanto não podemos garantir que todas as sugestões serão usadas, consideramos todas as ideias e muitas vezes incorporamos temas sugeridos pela comunidade."
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Schema.org FAQPage pour SEO IA
  const faqSchema = {
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
  };

  return (
    <>
      <Helmet>
        <title>Perguntas Frequentes - A Música da Segunda | FAQ</title>
        <meta name="description" content="Perguntas frequentes sobre A Música da Segunda. Descubra como funciona o projeto, quando saem músicas novas, onde ouvir e muito mais." />
        <meta name="keywords" content="faq música da segunda, perguntas frequentes, como funciona música da segunda, onde ouvir música da segunda" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Perguntas Frequentes - A Música da Segunda" />
        <meta property="og:description" content="Respostas para as perguntas mais comuns sobre o projeto A Música da Segunda" />
        <meta property="og:type" content="website" />
        
        {/* Schema.org FAQPage */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6">
              <HelpCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Perguntas Frequentes
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Encontre respostas para as dúvidas mais comuns sobre A Música da Segunda
            </p>
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <article
                key={index}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl"
                itemScope
                itemType="https://schema.org/Question"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <h2
                    className="text-lg md:text-xl font-bold text-gray-900 pr-8"
                    itemProp="name"
                  >
                    {faq.question}
                  </h2>
                  <ChevronDown
                    className={`w-6 h-6 text-gray-500 flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                
                <div
                  id={`faq-answer-${index}`}
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div
                    className="px-6 pb-5 text-gray-700 leading-relaxed"
                    itemScope
                    itemType="https://schema.org/Answer"
                    itemProp="acceptedAnswer"
                  >
                    <p className="text-base md:text-lg" itemProp="text">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-center text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Não encontrou sua resposta?</h2>
            <p className="text-blue-100 mb-6 text-lg">
              Entre em contato conosco e teremos prazer em ajudar!
            </p>
            <a
              href="mailto:pimentaoenchansons@gmail.com"
              className="inline-block bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Enviar Email
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

