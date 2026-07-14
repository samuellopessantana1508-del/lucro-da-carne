import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos aplicáveis ao uso da plataforma Lucro da Carne.",
};

const SECTIONS = [
  { id: "aceitacao", label: "Aceitação" },
  { id: "servico", label: "O serviço" },
  { id: "conta", label: "Conta e segurança" },
  { id: "planos", label: "Planos e cobrança" },
  { id: "responsabilidades", label: "Responsabilidades" },
  { id: "uso-aceitavel", label: "Uso aceitavel" },
  { id: "dados", label: "Dados e privacidade" },
  { id: "propriedade", label: "Propriedade intelectual" },
  { id: "disponibilidade", label: "Disponibilidade" },
  { id: "encerramento", label: "Encerramento" },
  { id: "lei", label: "Lei aplicável" },
];

export default function TermosDeUsoPage() {
  return (
    <LegalDocument
      eyebrow="Documento legal"
      title="Termos de Uso"
      summary="Estes Termos regulam o acesso e a utilização da plataforma Lucro da Carne, inclusive o período gratuito, as assinaturas e os recursos de cálculo e armazenamento."
      updatedAt="14 de julho de 2026"
      sections={SECTIONS}
    >
      <section id="aceitacao">
        <h2>1. Aceitação dos Termos</h2>
        <p>
          Estes Termos são celebrados com {LEGAL_IDENTITY.businessName}, inscrita no CNPJ sob o nº{" "}
          {LEGAL_IDENTITY.cnpj}, com sede em {LEGAL_IDENTITY.formattedAddress}, responsável pela
          plataforma Lucro da Carne.
        </p>
        <p>
          Ao criar uma conta, iniciar o período gratuito, contratar um plano ou utilizar a plataforma
          Lucro da Carne, você declara que leu e concorda com estes Termos e com a Política de
          Privacidade. Se estiver usando o serviço em nome de uma empresa, declara possuir autorização
          para vinculá-la a estas condições.
        </p>
        <p>
          O serviço é destinado a pessoas com capacidade civil e a profissionais ou negócios do setor
          de carnes. Menores de 18 anos somente podem utilizá-lo sob responsabilidade de representante
          legal.
        </p>
      </section>

      <section id="servico">
        <h2>2. O que a plataforma oferece</h2>
        <p>
          O Lucro da Carne auxilia no registro de lotes e no cálculo de rendimento, quebra, custo por
          quilo, margem, preços de referência e lucro estimado. Os resultados dependem integralmente dos
          dados informados pelo usuário e possuem finalidade gerencial.
        </p>
        <p>
          A plataforma não substitui contador, consultor financeiro, responsável técnico, assessoria
          tributária ou verificação de exigências sanitárias. Decisões de compra, produção e venda devem
          ser revisadas pelo usuário antes de serem aplicadas ao negócio.
        </p>
      </section>

      <section id="conta">
        <h2>3. Conta e segurança</h2>
        <ul>
          <li>As informações de cadastro devem ser verdadeiras, completas e atualizadas.</li>
          <li>O usuário é responsável pela confidencialidade da senha e pelas atividades de sua conta.</li>
          <li>Suspeitas de acesso indevido devem ser comunicadas imediatamente ao suporte.</li>
          <li>Uma conta não deve ser revendida, cedida ou compartilhada publicamente.</li>
        </ul>
      </section>

      <section id="planos">
        <h2>4. Período gratuito, planos e cobrança</h2>
        <p>
          Novas contas recebem uso gratuito e ilimitado por 3 dias contados da criação da conta. Depois
          desse prazo, é necessário manter uma assinatura ativa para continuar usando a plataforma.
        </p>
        <ul>
          <li>Plano mensal: R$ 49,90 por mes, com uso ilimitado enquanto estiver ativo.</li>
          <li>Plano anual: R$ 149,90 por ano, com uso ilimitado enquanto estiver ativo.</li>
          <li>O pagamento e a recorrência são processados pela Perfect Pay no ambiente de checkout.</li>
        </ul>
        <p>
          O checkout apresenta o valor final, a periodicidade e os meios de pagamento antes da
          confirmação. Cancelamento, reembolso ou chargeback podem encerrar o acesso pago sem apagar os
          registros existentes. Direitos obrigatórios previstos na legislação de consumo permanecem
          preservados, inclusive o direito de arrependimento quando aplicável à contratação.
        </p>
        <p>
          As regras operacionais e os canais de solicitação estão descritos na{" "}
          <Link href="/cancelamento-e-reembolso">Política de Cancelamento e Reembolso</Link>.
        </p>
      </section>

      <section id="responsabilidades">
        <h2>5. Responsabilidades do usuário</h2>
        <p>Ao utilizar o serviço, o usuário se compromete a:</p>
        <ul>
          <li>conferir pesos, custos, percentuais, cortes e demais informações inseridas;</li>
          <li>validar os resultados antes de definir preços ou assumir compromissos comerciais;</li>
          <li>observar normas fiscais, sanitárias, trabalhistas e de defesa do consumidor aplicáveis;</li>
          <li>manter cópias próprias das informações essenciais ao seu negócio.</li>
        </ul>
      </section>

      <section id="uso-aceitavel">
        <h2>6. Uso aceitavel</h2>
        <p>
          Não é permitido tentar acessar contas ou dados de terceiros, explorar vulnerabilidades,
          interferir na infraestrutura, automatizar requisições abusivas, contornar limites de acesso,
          distribuir código malicioso ou usar a plataforma para atividade ilegal ou fraudulenta.
        </p>
      </section>

      <section id="dados">
        <h2>7. Dados e privacidade</h2>
        <p>
          O tratamento de dados pessoais é descrito na Política de Privacidade. O usuário mantém a
          titularidade sobre os dados de seus lotes e concede ao Lucro da Carne permissão limitada para
          hospedar, processar, proteger e exibir essas informações exclusivamente para prestar o serviço.
        </p>
      </section>

      <section id="propriedade">
        <h2>8. Propriedade intelectual</h2>
        <p>
          A marca, a interface, os textos, o código, os modelos de cálculo e os demais elementos da
          plataforma são protegidos pela legislação aplicável. A assinatura concede apenas uma licença
          limitada, revogável, não exclusiva e intransferível de uso do serviço durante sua vigência.
        </p>
      </section>

      <section id="disponibilidade">
        <h2>9. Disponibilidade e limitacao de responsabilidade</h2>
        <p>
          Empregamos esforços razoáveis para manter o serviço seguro e disponível, mas manutenções,
          falhas de terceiros, internet ou eventos fora de controle podem causar interrupções. Na máxima
          extensão permitida por lei, o Lucro da Carne não responde por decisões comerciais tomadas sem
          conferência, lucros cessantes ou perdas indiretas decorrentes de dados inseridos incorretamente.
        </p>
      </section>

      <section id="encerramento">
        <h2>10. Suspensão e encerramento</h2>
        <p>
          O acesso pode ser suspenso por inadimplência, estorno, risco de segurança, fraude ou violação
          destes Termos. O usuário pode solicitar cancelamento, exportação disponível e exclusão da conta
          pelo suporte, observadas obrigações legais de retenção de registros.
        </p>
      </section>

      <section id="lei">
        <h2>11. Alterações, lei aplicável e foro</h2>
        <p>
          Estes Termos podem ser atualizados para refletir mudanças no serviço ou na legislação. Alterações
          relevantes serão informadas por meio adequado. Aplicam-se as leis brasileiras; quando houver
          relação de consumo, fica preservado o foro do domicílio do consumidor e seus direitos legais.
        </p>
      </section>
    </LegalDocument>
  );
}
