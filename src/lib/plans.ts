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

export const FREE_TRIAL_DAYS = 3;

export const PLAN_DEFAULT_LIMITS: Record<SubscriptionPlan, number> = {
  gratis: 9999,
  pro: 9999,
  business: 9999,
};

export const APP_PLANS: AppPlan[] = [
  {
    id: "gratis",
    name: PLAN_LABELS.gratis,
    price: "R$ 0",
    cadence: `por ${FREE_TRIAL_DAYS} dias`,
    lotLimit: `${FREE_TRIAL_DAYS} dias de teste`,
    description: "Para validar a calculadora no dia a dia antes de assinar.",
    features: [
      `Acesso completo por ${FREE_TRIAL_DAYS} dias`,
      "Calculo de rendimento, quebra e lucro",
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
    lotLimit: "Uso ilimitado",
    description: "Para acougues e casas de carne que acompanham fornecedores e margem toda semana.",
    features: [
      "Lotes e calculos ilimitados",
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
    lotLimit: "Uso ilimitado",
    description: "Para equipes, varios pontos de venda ou operacoes com maior volume de lotes.",
    features: [
      "Lotes e calculos ilimitados",
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
