import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const LAST_UPDATED = '1 de julho de 2026';

export default function Guia() {
  useSEO({
    title: 'Paródia Musical no Brasil: Tradição, Humor e Sátira | A Música da Segunda',
    description: 'Guia completo sobre a história da paródia musical no Brasil — do carnaval ao YouTube. Como o formato funciona, por que fascina brasileiros há décadas.',
    keywords: 'paródia musical brasil, história paródia musical, sátira musical brasileira, música da segunda',
    url: '/guia',
    type: 'website',
    robots: 'index, follow'
  });

  const h2Class = 'mb-3 mt-8 text-xl font-bold text-[#FDE047]';
  const pClass = 'mb-4 text-[15px] leading-7 text-white/82';
  const linkClass = 'text-[#FDE047] underline hover:text-yellow-300';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white lg:py-12">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
          Guia
        </p>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-white lg:text-4xl">
          Paródia Musical no Brasil: Tradição, Humor e Sátira
        </h1>
        <p className="text-sm text-white/55">
          Por A Música da Segunda · Atualizado em {LAST_UPDATED}
        </p>
      </header>

      <p className={pClass}>
        <strong>Paródia musical</strong> é a arte de adaptar uma melodia conhecida com uma nova letra — geralmente satírica, cômica ou crítica de um tema atual. No Brasil, essa tradição é profunda e está entrelaçada com a história política e cultural do país. Das marchinhas de carnaval do século XX ao YouTube Shorts de hoje, a paródia musical nunca deixou de ser um dos formatos mais eficazes de comentário sobre a realidade brasileira.
      </p>

      <h2 className={h2Class}>O que é paródia musical?</h2>
      <p className={pClass}>
        A paródia musical reutiliza a melodia de uma música existente e compõe uma letra nova com propósito diferente do original. A eficácia do formato vem da familiaridade: o ouvinte já conhece a melodia, o que cria uma ponte imediata entre a mensagem nova e o prazer sonoro. A nova letra se ancora no ritmo e na expectativa gerada pelo original.
      </p>
      <p className={pClass}>
        Diferente da paródia literária ou visual, a paródia musical tem uma vantagem extra: a melodia original já carrega uma carga emocional. Quando uma música muito tocada no rádio vira paródia de um escândalo político, o contraste entre a emoção da melodia e o conteúdo da letra nova é parte do efeito cômico.
      </p>

      <h2 className={h2Class}>Uma tradição com décadas de história</h2>
      <p className={pClass}>
        A paródia musical no Brasil tem raízes no carnaval. As <strong>marchinhas carnavalescas</strong> do século XX eram, com frequência, comentários satíricos sobre a sociedade e a política da época. O carnaval sempre foi um espaço de inversão social e humor — e a paródia musical era um dos seus instrumentos mais eficazes.
      </p>
      <p className={pClass}>
        Nas décadas de 1930 e 1940, o <strong>samba de breque</strong> incorporou o humor de forma ainda mais explícita. Artistas como Moreira da Silva criavam composições que intercalavam trechos cantados com pausas dramáticas — os &ldquo;breques&rdquo; — onde o intérprete fazia comentários cômicos sobre a situação descrita na música. Era crítica social com leveza e ritmo.
      </p>
      <p className={pClass}>
        O <strong>rádio brasileiro</strong> dos anos 1950 e 1960 também desenvolveu uma longa tradição de programas de humor que usavam a paródia musical como recurso. Melodias conhecidas ganhavam letras novas para comentar notícias do dia, personagens públicos ou situações cotidianas — uma fórmula que sobreviveria por décadas.
      </p>

      <h2 className={h2Class}>Do palco para a televisão</h2>
      <p className={pClass}>
        Com a chegada da televisão, a paródia musical encontrou uma plataforma ainda mais ampla. Programas de humor dos anos 1970 e 1980 incorporaram o formato com frequência, especialmente para comentar eventos políticos. A combinação de melodia reconhecível e letra nova sobre um tema polêmico mostrou-se uma das formas mais memoráveis de sátira televisiva.
      </p>
      <p className={pClass}>
        O período da ditadura militar (1964–1985) foi um momento em que o humor funcionou como mecanismo de crítica indireta. Artistas da MPB encontravam formas de comentar a realidade usando metáfora, ironia e a ludicidade da sátira — uma maneira de dizer o que não se podia dizer diretamente.
      </p>
      <p className={pClass}>
        A partir dos anos 1990, com a redemocratização, a paródia política ganhou mais liberdade. Programas de humor na televisão aberta passaram a fazer uso do formato de forma aberta, comentando semanalmente as notícias com músicas adaptadas e personagens satíricos.
      </p>

      <h2 className={h2Class}>A era do YouTube e das redes sociais</h2>
      <p className={pClass}>
        A chegada do YouTube ao Brasil, em meados dos anos 2000, democratizou completamente a produção e distribuição de paródias musicais. Pela primeira vez, qualquer criador poderia gravar uma paródia em casa, publicar para milhões de pessoas e receber feedback imediato. O formato explodiu em visualizações, especialmente quando conectado a temas do momento.
      </p>
      <p className={pClass}>
        A partir de 2020, com a ascensão do TikTok e do YouTube Shorts, as paródias musicais ganharam novo impulso. O formato curto (15 a 60 segundos) favorece a adaptação de refrões conhecidos para comentar notícias em tempo real. Uma paródia bem-feita pode alcançar centenas de milhares de visualizações em menos de 48 horas.
      </p>

      <h2 className={h2Class}>Por que a paródia musical funciona tão bem?</h2>
      <p className={pClass}>A eficácia do formato tem bases cognitivas e culturais bem estabelecidas:</p>
      <ul className="mb-4 ml-5 list-disc space-y-3 text-[15px] leading-7 text-white/82">
        <li><strong>Familiaridade da melodia:</strong> quando o ouvinte reconhece a melodia, o esforço de processamento cai. A nova letra se instala com mais facilidade — e permanece na memória junto com o original.</li>
        <li><strong>Ancoragem cultural:</strong> no Brasil, música e identidade cultural são inseparáveis. A paródia de uma canção conhecida ativa associações profundas, criando um contexto emocional imediato.</li>
        <li><strong>Humor como crítica:</strong> o riso cria distância. Transformar um escândalo político em paródia permite processar e criticar um evento sem o peso discursivo do texto argumentativo puro.</li>
        <li><strong>Viralidade natural:</strong> o formato musical é compartilhável por natureza. Uma paródia com melodia reconhecível e letra precisa sobre o momento tem alta probabilidade de se propagar rapidamente.</li>
      </ul>

      <h2 className={h2Class}>A Música da Segunda: sátira musical semanal</h2>
      <p className={pClass}>
        <strong>A Música da Segunda</strong> é um projeto independente brasileiro de sátira musical semanal. Toda segunda-feira, um acontecimento real do noticiário brasileiro — político, econômico, cultural ou internacional — vira o tema de uma nova paródia musical publicada com letra completa, vídeo e contexto editorial.
      </p>
      <p className={pClass}>
        O projeto já publicou dezenas de paródias sobre política brasileira, eleições, crises energéticas, escândalos corporativos, futebol, carnaval e geopolítica internacional. A ideia é simples: toda segunda-feira, o Brasil acorda com uma nova música sobre o que aconteceu na semana anterior.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {['politica', 'internacional', 'economia', 'cultura', 'esporte', 'midia', 'energia'].map((cat) => (
          <Link
            key={cat}
            to={`/categoria/${cat}`}
            className="rounded-full bg-white/10 px-3 py-1 text-sm capitalize text-white/70 hover:bg-white/20 hover:text-white"
          >
            {cat === 'midia' ? 'Mídia' : cat === 'economia' ? 'Economia' : cat === 'politica' ? 'Política' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Link>
        ))}
      </div>

      <p className="mt-8">
        <Link to="/musica" className={linkClass}>
          Ver todas as paródias →
        </Link>
      </p>
    </div>
  );
}
