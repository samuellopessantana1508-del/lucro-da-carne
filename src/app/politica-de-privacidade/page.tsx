import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Lucro da Carne coleta, usa, compartilha e protege dados pessoais.",
};

const SECTIONS = [
  { id: "controlador", label: "Controlador" },
  { id: "dados-coletados", label: "Dados coletados" },
  { id: "finalidades", label: "Finalidades" },
  { id: "bases-legais", label: "Bases legais" },
  { id: "compartilhamento", label: "Compartilhamento" },
  { id: "armazenamento-local", label: "Armazenamento local" },
  { id: "retencao", label: "Retenção" },
  { id: "seguranca", label: "Segurança" },
  { id: "direitos", label: "Seus direitos" },
  { id: "automacao", label: "Automação" },
  { id: "alteracoes", label: "Alterações" },
];

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalDocument
      eyebrow="LGPD e privacidade"
      title="Política de Privacidade"
      summary="Este documento explica de forma transparente quais dados pessoais o Lucro da Carne utiliza, para quais finalidades, com quem os compartilha e como você pode exercer seus direitos."
      updatedAt="14 de julho de 2026"
      sections={SECTIONS}
    >
      <section id="controlador">
        <h2>1. Controlador e contato</h2>
        <p>
          O responsável pela operação da plataforma Lucro da Carne atua como controlador dos dados
          pessoais tratados para cadastro, acesso, suporte e administração do serviço. O canal para
          assuntos de privacidade é <a href="mailto:suporte@lucrodacarne.com.br">suporte@lucrodacarne.com.br</a>.
        </p>
      </section>

      <section id="dados-coletados">
        <h2>2. Dados que tratamos</h2>
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail, senha protegida pelo provedor de autenticação, telefone e nome do negócio.</li>
          <li><strong>Uso do produto:</strong> lotes, fornecedores, datas, pesos, custos, margens, cortes, observações e relatórios criados pelo usuário.</li>
          <li><strong>Assinatura:</strong> plano, valor, ciclo, código da venda, status do pagamento e datas de aprovação, renovação, cancelamento ou estorno.</li>
          <li><strong>Suporte e segurança:</strong> mensagens enviadas ao suporte, registros de falha e dados técnicos como IP, navegador, data e horário, quando disponibilizados pela infraestrutura.</li>
        </ul>
        <p>
          Dados completos de cartão e credenciais bancárias são coletados e processados diretamente
          pela Perfect Pay e pelos participantes do pagamento. O webhook do Lucro da Carne não grava o
          token de autenticação nem o CPF recebido do provedor em seu histórico de eventos.
        </p>
      </section>

      <section id="finalidades">
        <h2>3. Para que usamos os dados</h2>
        <ul>
          <li>criar e autenticar a conta;</li>
          <li>salvar, sincronizar e apresentar lotes e cálculos;</li>
          <li>ativar, renovar, suspender e auditar assinaturas;</li>
          <li>prestar suporte, recuperar acesso e comunicar eventos importantes;</li>
          <li>prevenir fraude, abuso e incidentes de segurança;</li>
          <li>cumprir obrigações legais e defender direitos em processos.</li>
        </ul>
      </section>

      <section id="bases-legais">
        <h2>4. Bases legais</h2>
        <p>
          Conforme a Lei Geral de Proteção de Dados Pessoais, o tratamento pode se apoiar na execução
          do contrato e de procedimentos preliminares, no cumprimento de obrigações legais, no exercício
          regular de direitos, no legítimo interesse com avaliação dos direitos do titular e, quando
          necessário, no consentimento.
        </p>
      </section>

      <section id="compartilhamento">
        <h2>5. Compartilhamento e operadores</h2>
        <p>Compartilhamos apenas o necessário com fornecedores que viabilizam o serviço:</p>
        <ul>
          <li><strong>Supabase:</strong> autenticação, banco de dados e processamento do webhook;</li>
          <li><strong>Perfect Pay:</strong> checkout, cobrança recorrente e eventos de pagamento;</li>
          <li><strong>Hostinger:</strong> hospedagem do aplicativo, domínio, SSL e entrega de conteúdo;</li>
          <li>autoridades e terceiros quando houver obrigação legal, ordem válida ou necessidade de proteger direitos.</li>
        </ul>
        <p>
          Alguns fornecedores podem utilizar infraestrutura em outros países. Quando houver transferência
          internacional, adotamos as medidas e salvaguardas previstas na legislação aplicável.
        </p>
      </section>

      <section id="armazenamento-local">
        <h2>6. Armazenamento no navegador</h2>
        <p>
          A sessão de autenticação utiliza armazenamento técnico essencial no navegador. Contas criadas
          antes da migração para a nuvem podem possuir lotes legados no armazenamento local; a área da
          conta oferece uma função para importá-los ao Supabase. Não utilizamos cookies de publicidade
          comportamental no aplicativo.
        </p>
        <p>
          Dados locais podem ser removidos pelo próprio usuário ao limpar os dados do navegador ou pelas
          funções de exclusão disponíveis no produto.
        </p>
      </section>

      <section id="retencao">
        <h2>7. Retenção e exclusão</h2>
        <p>
          Dados de conta e lotes são mantidos enquanto a conta estiver ativa ou enquanto forem necessários
          para prestar o serviço. Registros de assinatura, segurança e auditoria podem ser conservados pelos
          prazos legais aplicáveis e pelo tempo necessário ao exercício regular de direitos. Depois disso,
          os dados são excluídos ou anonimizados de forma segura, quando tecnicamente possível.
        </p>
      </section>

      <section id="seguranca">
        <h2>8. Segurança</h2>
        <p>
          Utilizamos conexões criptografadas, controle de acesso por usuário, políticas de segurança no banco,
          separação de chaves administrativas e validação autenticada de webhooks. Nenhum sistema é totalmente
          imune a riscos; incidentes relevantes serão tratados e comunicados conforme a legislação aplicável.
        </p>
      </section>

      <section id="direitos">
        <h2>9. Direitos do titular</h2>
        <p>Nos termos da LGPD, você pode solicitar, quando aplicável:</p>
        <ul>
          <li>confirmação da existência de tratamento e acesso aos dados;</li>
          <li>correção de informações incompletas, inexatas ou desatualizadas;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou irregulares;</li>
          <li>portabilidade, informação sobre compartilhamentos e revisão de consentimento;</li>
          <li>revogação do consentimento e eliminação dos dados tratados com essa base, ressalvadas as hipóteses legais de conservação;</li>
          <li>oposição a tratamento realizado em desconformidade com a lei.</li>
        </ul>
        <p>
          Para proteger a conta, podemos solicitar informações que confirmem a identidade antes de atender
          ao pedido. O exercício de direitos é gratuito.
        </p>
      </section>

      <section id="automacao">
        <h2>10. Decisões automatizadas</h2>
        <p>
          O status enviado pela Perfect Pay é processado automaticamente para liberar ou encerrar o acesso ao
          plano correspondente. Essa automação não realiza perfilamento comercial nem toma decisões sobre
          crédito. Dúvidas ou contestações podem ser encaminhadas ao suporte para revisão.
        </p>
      </section>

      <section id="alteracoes">
        <h2>11. Alterações desta Política</h2>
        <p>
          Esta Política pode ser atualizada para refletir mudanças no serviço, nos fornecedores ou na
          legislação. A data da versão vigente aparece no início da página e alterações relevantes serão
          comunicadas por meio adequado.
        </p>
      </section>
    </LegalDocument>
  );
}
