import type { SubscriptionPlan } from "./database.types";

export type AppPlan = {
  id: SubscriptionPlan;
  name: string;
  price: string;
  cadence: string;
  badge?: string;
  lotLimit: string;
  description: string;
  features: string[];
  checkoutUrl?: string;
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  gratis: "Gratis",
  pro: "Pro",
  business: "Business",
};

export const PLAN_DISPLAY_ORDER: SubscriptionPlan[] = ["gratis", "pro", "business"];

export const APP_PLANS: AppPlan[] = [
  {
    id: "gratis",
    name: PLAN_LABELS.gratis,
    price: "R$ 0",
    cadence: "para testar",
    lotLimit: "Ate 5 lotes",
    description: "Para validar a calculadora no dia a dia antes de assinar.",
    features: [
      "Calculo de rendimento e quebra",
      "Historico local ou em conta Supabase",
      "Relatorio copiavel e PDF",
      "Dashboard basico de lotes",
    ],
  },
  {
    id: "pro",
    name: PLAN_LABELS.pro,
    price: "Plano pago",
    cadence: "por acougue",
    badge: "Mais indicado",
    lotLimit: "Limite configuravel",
    description: "Para acougues e casas de carne que acompanham fornecedores e margem toda semana.",
    features: [
      "Mais lotes salvos na nuvem",
      "Dashboard por lote e fornecedor",
      "PDFs para conferencia interna",
      "Acesso liberado por compra Kirvano",
    ],
    checkoutUrl: process.env.NEXT_PUBLIC_KIRVANO_PRO_CHECKOUT_URL,
  },
  {
    id: "business",
    name: PLAN_LABELS.business,
    price: "Sob medida",
    cadence: "para operacoes maiores",
    lotLimit: "Limite ampliado",
    description: "Para equipes, varios pontos de venda ou operacoes com maior volume de lotes.",
    features: [
      "Limite alto ou ilimitado de lotes",
      "Gestao manual pelo painel admin",
      "Acompanhamento de clientes e planos",
      "Preparado para suporte comercial",
    ],
    checkoutUrl: process.env.NEXT_PUBLIC_KIRVANO_BUSINESS_CHECKOUT_URL,
  },
];

export function getPlanLabel(plan?: SubscriptionPlan | null): string {
  return plan ? PLAN_LABELS[plan] : PLAN_LABELS.gratis;
}

