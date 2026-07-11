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

export const PLAN_DEFAULT_LIMITS: Record<SubscriptionPlan, number> = {
  gratis: 3,
  pro: 50,
  business: 9999,
};

export const APP_PLANS: AppPlan[] = [
  {
    id: "gratis",
    name: PLAN_LABELS.gratis,
    price: "R$ 0",
    cadence: "para testar",
    lotLimit: `Ate ${PLAN_DEFAULT_LIMITS.gratis} lotes`,
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
    price: "R$ 49",
    cadence: "/mes por acougue",
    badge: "Mais indicado",
    lotLimit: `Ate ${PLAN_DEFAULT_LIMITS.pro} lotes`,
    description: "Para acougues e casas de carne que acompanham fornecedores e margem toda semana.",
    features: [
      `Ate ${PLAN_DEFAULT_LIMITS.pro} lotes salvos na nuvem`,
      "Dashboard por lote e fornecedor",
      "PDFs para conferencia interna",
      "Acesso liberado por compra Kirvano",
    ],
    checkoutUrl: process.env.NEXT_PUBLIC_KIRVANO_PRO_CHECKOUT_URL,
  },
  {
    id: "business",
    name: PLAN_LABELS.business,
    price: "R$ 149",
    cadence: "/ano para equipes",
    lotLimit: "Lotes ilimitados",
    description: "Para equipes, varios pontos de venda ou operacoes com maior volume de lotes.",
    features: [
      "Lotes ilimitados na nuvem",
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
