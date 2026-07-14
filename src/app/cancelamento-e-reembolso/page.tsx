import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Cancelamento e Reembolso",
  description: "Regras de cancelamento, renovacao e reembolso do Lucro da Carne.",
};

const SECTIONS = [
  { id: "planos", label: "Planos e renovacao" },
  { id: "cancelamento", label: "Como cancelar" },
  { id: "acesso", label: "Acesso apos cancelar" },
  { id: "reembolso", label: "Reembolso" },
  { id: "arrependimento", label: "Direito de arrependimento" },
  { id: "estorno", label: "Estorno e chargeback" },
  { id: "prazos", label: "Prazos do pagamento" },
];

export default function CancelamentoEReembolsoPage() {
  return (
    <LegalDocument
      eyebrow="Assinatura"
      title="Cancelamento e Reembolso"
      summary="Veja como funcionam a renovacao dos planos, o cancelamento da assinatura e as solicitacoes de reembolso do Lucro da Carne."
      updatedAt="14 de julho de 2026"
      sections={SECTIONS}
    >
      <section id="planos">
        <h2>1. Planos e renovacao</h2>
        <p>
          A plataforma Lucro da Carne é fornecida por {LEGAL_IDENTITY.businessName}, CNPJ{" "}
          {LEGAL_IDENTITY.cnpj}, com sede em {LEGAL_IDENTITY.formattedAddress}.
        </p>
        <p>
          Novas contas podem usar o Lucro da Carne gratuitamente por 3 dias, sem limite de calculos.
          Depois desse periodo, o acesso depende de uma assinatura ativa.
        </p>
        <ul>
          <li>Plano mensal: R$ 49,90, renovado mensalmente ate o cancelamento.</li>
          <li>Plano anual: R$ 149,90, renovado anualmente ate o cancelamento.</li>
        </ul>
        <p>
          O valor, a periodicidade e o meio de pagamento sao apresentados pela Perfect Pay antes da
          confirmacao da compra.
        </p>
      </section>

      <section id="cancelamento">
        <h2>2. Como cancelar</h2>
        <p>
          O cancelamento pode ser solicitado pelo canal de suporte informado nesta pagina ou pelos
          recursos disponibilizados pela Perfect Pay. Informe o e-mail utilizado na conta e na compra
          para que a assinatura seja localizada com seguranca.
        </p>
        <p>
          A solicitacao interrompe renovacoes futuras depois de processada. Valores ja cobrados seguem
          as regras de reembolso abaixo e os direitos obrigatorios previstos na legislacao brasileira.
        </p>
      </section>

      <section id="acesso">
        <h2>3. Acesso depois do cancelamento</h2>
        <p>
          O acesso pago pode ser encerrado quando a Perfect Pay confirmar o cancelamento, estorno ou
          reembolso. Antes de encerrar a conta, use a opcao de exportacao disponivel na area da conta
          para guardar uma copia dos seus dados.
        </p>
      </section>

      <section id="reembolso">
        <h2>4. Solicitacoes de reembolso</h2>
        <p>
          Pedidos de reembolso devem ser enviados ao suporte com o e-mail da compra, a data e o motivo
          da solicitacao. Cada pedido sera analisado conforme a legislacao aplicavel, o status da
          transacao e as regras do meio de pagamento.
        </p>
      </section>

      <section id="arrependimento">
        <h2>5. Direito de arrependimento</h2>
        <p>
          Quando a contratacao estiver sujeita ao Codigo de Defesa do Consumidor, fica preservado o
          direito de arrependimento no prazo legal aplicavel as compras realizadas fora do
          estabelecimento comercial. A solicitacao deve identificar a compra e o titular.
        </p>
      </section>

      <section id="estorno">
        <h2>6. Estorno, fraude e chargeback</h2>
        <p>
          Reembolsos, chargebacks, suspeitas de fraude ou contestacoes de pagamento podem suspender ou
          encerrar imediatamente o acesso relacionado a transacao. Para evitar duplicidade e atrasos,
          procure o suporte antes de abrir uma contestacao quando a cobranca for reconhecida.
        </p>
      </section>

      <section id="prazos">
        <h2>7. Prazo para receber o valor</h2>
        <p>
          Depois da aprovacao do reembolso, a efetiva devolucao depende da Perfect Pay, da operadora do
          cartao, do banco e do meio de pagamento utilizado. O prazo pode aparecer em faturas ou ciclos
          bancarios posteriores.
        </p>
        <p>
          Consulte tambem os <Link href="/termos-de-uso">Termos de Uso</Link> e a{" "}
          <Link href="/politica-de-privacidade">Politica de Privacidade</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
