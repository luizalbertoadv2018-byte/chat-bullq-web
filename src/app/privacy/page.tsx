import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Alberto Martins Advocacia',
  description:
    'Política de Privacidade da plataforma de atendimento do escritório Alberto Martins Advocacia Previdenciária.',
};

const updatedAt = '11 de agosto de 2026';

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800 dark:text-zinc-200">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Última atualização: {updatedAt}
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          Esta Política de Privacidade descreve como o escritório{' '}
          <strong>Alberto Martins Advocacia Previdenciária</strong> (OAB/GO
          59.239), com sede em Anicuns/GO, doravante &quot;nós&quot;, coleta,
          usa, armazena e protege dados pessoais tratados por meio da nossa
          plataforma interna de atendimento (&quot;Plataforma&quot;), em
          conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados
          — LGPD).
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          1. Dados que coletamos
        </h2>
        <p>
          A Plataforma centraliza o atendimento a clientes e interessados por
          canais de mensagem, incluindo o WhatsApp Business Platform (Meta).
          Podemos tratar: nome, número de telefone, foto de perfil pública,
          conteúdo das mensagens trocadas (texto, áudio, imagens, documentos) e
          metadados de atendimento (data, hora e status das mensagens).
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          2. Como usamos os dados
        </h2>
        <p>
          Os dados são utilizados exclusivamente para prestar atendimento
          jurídico e administrativo, responder solicitações, dar andamento a
          demandas do titular, organizar o histórico de conversas e cumprir
          obrigações legais e regulatórias. Não vendemos dados pessoais nem os
          utilizamos para publicidade de terceiros.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          3. Compartilhamento
        </h2>
        <p>
          O envio e o recebimento de mensagens ocorrem por meio da
          infraestrutura da Meta Platforms (WhatsApp Business Platform), que
          processa as mensagens conforme suas próprias políticas. Podemos
          utilizar provedores de hospedagem e processamento estritamente para
          operar a Plataforma, sempre sob obrigações de confidencialidade e
          segurança. Não compartilhamos dados com terceiros para finalidades
          distintas do atendimento.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          4. Retenção e segurança
        </h2>
        <p>
          Mantemos os dados pelo tempo necessário ao atendimento e ao
          cumprimento de obrigações legais. Adotamos medidas técnicas e
          organizacionais para proteger os dados contra acesso não autorizado,
          perda ou vazamento, incluindo controle de acesso e criptografia em
          trânsito.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          5. Direitos do titular
        </h2>
        <p>
          Nos termos da LGPD, o titular pode solicitar confirmação de
          tratamento, acesso, correção, anonimização, portabilidade, eliminação
          dos dados e informações sobre compartilhamento. Para exercer esses
          direitos, entre em contato pelos canais abaixo.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          6. Contato
        </h2>
        <p>
          Encarregado/Responsável pelo tratamento de dados:{' '}
          <a
            className="text-primary underline"
            href="mailto:luizalbertoadv2018@gmail.com"
          >
            luizalbertoadv2018@gmail.com
          </a>
          . Alberto Martins Advocacia Previdenciária — Anicuns/GO.
        </p>

        <p className="pt-6 text-xs text-zinc-500 dark:text-zinc-400">
          Esta política pode ser atualizada periodicamente. A versão vigente é
          sempre a publicada nesta página.
        </p>
      </section>
    </main>
  );
}
