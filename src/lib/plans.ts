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
  gratis: "Gratuito",
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
    cadence: `${FREE_TRIAL_DAYS} dias gratis`,
    lotLimit: `Uso ilimitado por ${FREE_TRIAL_DAYS} dias`,
    description: "Para validar a calculadora antes de assinar.",
    features: [
      `Calculos ilimitados por ${FREE_TRIAL_DAYS} dias`,
      "Calculo de rendimento, quebra e lucro",
      "Relatorio copiavel e PDF",
      "Depois dos 3 dias, assine para continuar usando",
    ],
  },
  {
    id: "pro",
    name: PLAN_LABELS.pro,
    price: "R$ 49,90",
    cadence: "/mes",
    badge: "Mais indicado",
    lotLimit: "Uso ilimitado",
    description: "Para acougues e casas de carne que acompanham fornecedores e margem toda semana.",
    features: [
      "Lotes e calculos ilimitados",
      "Dashboard por lote e fornecedor",
      "PDFs para conferencia interna",
      "Acesso liberado por compra Perfect Pay",
    ],
    checkoutUrl:
      process.env.NEXT_PUBLIC_PERFECTPAY_MONTHLY_CHECKOUT_URL ||
      process.env.NEXT_PUBLIC_KIRVANO_PRO_CHECKOUT_URL,
  },
  {
    id: "business",
    name: PLAN_LABELS.business,
    price: "R$ 149,90",
    cadence: "/ano",
    lotLimit: "Uso ilimitado",
    description: "Para equipes, varios pontos de venda ou operacoes com maior volume de lotes.",
    features: [
      "Lotes e calculos ilimitados",
      "Gestao manual pelo painel admin",
      "Acompanhamento de clientes e planos",
      "Preparado para suporte comercial",
    ],
    checkoutUrl:
      process.env.NEXT_PUBLIC_PERFECTPAY_ANNUAL_CHECKOUT_URL ||
      process.env.NEXT_PUBLIC_KIRVANO_BUSINESS_CHECKOUT_URL,
  },
];

export function getPlanLabel(plan?: SubscriptionPlan | null): string {
  return plan ? PLAN_LABELS[plan] : PLAN_LABELS.gratis;
}
