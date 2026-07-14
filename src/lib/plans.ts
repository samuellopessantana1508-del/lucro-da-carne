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
  pro: "Mensal",
  business: "Anual",
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
    description: "Acesso completo com renovacao mensal.",
    features: [
      "Lotes e calculos ilimitados",
      "Dashboard por lote e fornecedor",
      "PDFs para conferencia interna",
      "Historico seguro na nuvem",
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
    description: "O mesmo acesso completo com maior economia no ano.",
    features: [
      "Lotes e calculos ilimitados",
      "Dashboard por lote e fornecedor",
      "PDFs para conferencia interna",
      "Historico seguro na nuvem",
    ],
    checkoutUrl:
      process.env.NEXT_PUBLIC_PERFECTPAY_ANNUAL_CHECKOUT_URL ||
      process.env.NEXT_PUBLIC_KIRVANO_BUSINESS_CHECKOUT_URL,
  },
];

export function getPlanLabel(plan?: SubscriptionPlan | null): string {
  return plan ? PLAN_LABELS[plan] : PLAN_LABELS.gratis;
}

export function hasSubscriptionAccess(
  subscription?: {
    plan: SubscriptionPlan;
    status: string;
    expires_at: string | null;
  } | null,
  now = Date.now()
): boolean {
  if (!subscription || subscription.status !== "active") return false;

  const expiresAt = subscription.expires_at
    ? new Date(subscription.expires_at).getTime()
    : null;
  if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= now)) return false;

  return subscription.plan === "gratis" ? expiresAt !== null : true;
}
