import { useSEO } from '../hooks/useSEO';

const CONTACT_EMAIL = 'thepimentaorougecompany@gmail.com';
const LAST_UPDATE = '7 de maio de 2026';

export default function Privacy() {
  useSEO({
    title: 'Política de Privacidade — A Música da Segunda',
    description: 'Política de privacidade do A Música da Segunda: quais dados são coletados, como são protegidos e como solicitar a exclusão.',
    keywords: 'política de privacidade, privacidade, lgpd, a música da segunda',
    url: '/privacy',
    type: 'website',
    robots: 'index, follow'
  });

  const sectionClass = 'mb-8';
  const headingClass = 'mb-3 text-xl font-bold text-[#FDE047]';
  const paragraphClass = 'mb-3 text-[15px] leading-7 text-white/82';
  const listClass = 'mb-3 ml-5 list-disc space-y-2 text-[15px] leading-7 text-white/82';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white lg:py-12">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
          A Música da Segunda
        </p>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-white lg:text-4xl">
          Política de Privacidade
        </h1>
        <p className="text-sm text-white/55">
          Última atualização: {LAST_UPDATE}
        </p>
      </header>

      <section className={sectionClass}>
        <h2 className={headingClass}>1. Sobre o aplicativo</h2>
        <p className={paragraphClass}>
          O <strong>A Música da Segunda</strong> é um projeto cultural brasileiro que permite ouvir e descobrir paródias musicais inéditas publicadas semanalmente, todas as segundas-feiras. O aplicativo está disponível no site amusicadasegunda.com e como aplicativo Android.
        </p>
        <p className={paragraphClass}>
          Esta política descreve quais dados podem ser coletados quando você utiliza o aplicativo, com qual finalidade, como protegemos essas informações e quais são os seus direitos.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>2. Dados que podem ser coletados</h2>
        <p className={paragraphClass}>
          Coletamos apenas o mínimo necessário para o funcionamento do aplicativo. Os dados que podem ser coletados são:
        </p>
        <ul className={listClass}>
          <li>
            <strong>Endereço de e-mail</strong>: somente se você se inscrever na newsletter ou criar uma conta no aplicativo. O e-mail é usado exclusivamente para enviar a nova música da semana ou gerenciar sua conta.
          </li>
          <li>
            <strong>Interações no aplicativo</strong>: cliques, navegação entre páginas, músicas reproduzidas e outras métricas de uso, coletadas de forma agregada via Google Analytics, com a finalidade de melhorar a experiência do usuário.
          </li>
          <li>
            <strong>Diagnósticos técnicos e de desempenho</strong>: medições de Core Web Vitals (tempo de carregamento, estabilidade visual, responsividade) e logs de erros eventuais, para identificar e corrigir problemas técnicos.
          </li>
        </ul>
        <p className={paragraphClass}>
          Não coletamos sua localização precisa, fotos, contatos, microfone, câmera, nem dados financeiros.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>3. Finalidade do tratamento</h2>
        <ul className={listClass}>
          <li>Enviar comunicações solicitadas (newsletter semanal).</li>
          <li>Operar e manter o aplicativo funcionando corretamente.</li>
          <li>Medir o uso de forma agregada para melhorar o conteúdo e a experiência.</li>
          <li>Identificar e corrigir falhas técnicas.</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>4. Compartilhamento de dados</h2>
        <p className={paragraphClass}>
          Não vendemos, alugamos nem compartilhamos seus dados pessoais com terceiros para fins de marketing. Os únicos prestadores que podem processar dados em nosso nome são:
        </p>
        <ul className={listClass}>
          <li><strong>Google Analytics</strong> — métricas de uso agregadas e anônimas.</li>
          <li><strong>Supabase</strong> — armazenamento seguro do banco de dados (e-mails de inscritos e contas, quando aplicável).</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>5. Segurança e transmissão</h2>
        <p className={paragraphClass}>
          Todos os dados trafegam exclusivamente por conexões criptografadas via <strong>HTTPS/TLS</strong>. As bases de dados são protegidas por mecanismos de autenticação e autorização do prestador de armazenamento (Supabase).
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>6. Seus direitos</h2>
        <p className={paragraphClass}>
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem o direito de:
        </p>
        <ul className={listClass}>
          <li>Confirmar a existência de tratamento dos seus dados.</li>
          <li>Acessar os dados que mantemos sobre você.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>Solicitar a <strong>exclusão</strong> dos seus dados a qualquer momento.</li>
          <li>Cancelar a inscrição na newsletter (link presente em cada e-mail enviado).</li>
          <li>Revogar o consentimento dado anteriormente.</li>
        </ul>
        <p className={paragraphClass}>
          Para exercer qualquer um desses direitos, basta enviar um e-mail para o endereço de contato indicado abaixo.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>7. Cookies e armazenamento local</h2>
        <p className={paragraphClass}>
          O aplicativo utiliza armazenamento local do navegador (localStorage / sessionStorage) apenas para guardar preferências de uso (por exemplo: música atual, estado do tutorial inicial). Esses dados ficam exclusivamente no seu dispositivo e não são enviados a nenhum servidor.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>8. Crianças</h2>
        <p className={paragraphClass}>
          O aplicativo contém humor e sátira sobre a atualidade do Brasil. Não é recomendado para crianças menores de 13 anos. Não coletamos intencionalmente dados de crianças.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>9. Alterações nesta política</h2>
        <p className={paragraphClass}>
          Esta política pode ser atualizada periodicamente. A data da última atualização aparece no topo desta página. Recomendamos revisitá-la sempre que houver mudanças relevantes no aplicativo.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>10. Contato</h2>
        <p className={paragraphClass}>
          Para qualquer dúvida, solicitação de acesso, correção ou exclusão de dados, entre em contato pelo e-mail:
        </p>
        <p className={paragraphClass}>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-[#FDE047] underline-offset-4 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/45">
        © A Música da Segunda — The Pimentão Rouge Project
      </footer>
    </div>
  );
}
