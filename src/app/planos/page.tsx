"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  ShieldCheck,
  User,
} from "lucide-react";
import AlertBox from "@/components/AlertBox";
import AuthModal from "@/components/AuthModal";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { APP_PLANS, getPlanLabel } from "@/lib/plans";

export default function PlanosPage() {
  const { configured, user, subscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const activePlan = subscription?.plan ?? "gratis";
  const paidCheckoutConfigured = APP_PLANS.some((plan) => plan.id !== "gratis" && plan.checkoutUrl);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#C89B3C]">
              Planos
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#4A0F14]">
              Transforme os calculos em rotina de margem.
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#8A8178]">
              O produto ja roda em modo local. Com conta ativa, seus lotes ficam na nuvem,
              respeitam limite de plano e podem ser liberados automaticamente por compras Perfect Pay.
            </p>
          </div>

          <div className="card p-4 sm:min-w-64">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F7F1E8] p-2 text-[#7A1E24]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#8A8178]">Plano atual</p>
                <p className="text-lg font-bold text-[#4A0F14]">{getPlanLabel(activePlan)}</p>
              </div>
            </div>
          </div>
        </div>

        {!configured && (
          <div className="mb-6">
            <AlertBox
              type="warning"
              message="Configure o Supabase para habilitar contas, assinatura e persistencia em nuvem."
            />
          </div>
        )}

        {configured && !paidCheckoutConfigured && (
          <div className="mb-6">
            <AlertBox
              type="info"
              message="Configure os links NEXT_PUBLIC_PERFECTPAY_MONTHLY_CHECKOUT_URL e NEXT_PUBLIC_PERFECTPAY_ANNUAL_CHECKOUT_URL para ativar os botoes de assinatura."
            />
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {APP_PLANS.map((plan) => {
            const current = activePlan === plan.id;
            const paidPlan = plan.id !== "gratis";

            return (
              <section
                key={plan.id}
                className={`card flex flex-col p-5 sm:p-6 ${
                  plan.badge ? "border-[#C89B3C] shadow-md" : ""
                }`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#4A0F14]">{plan.name}</h2>
                    <p className="mt-1 text-sm text-[#8A8178]">{plan.description}</p>
                  </div>
                  {plan.badge && (
                    <span className="rounded-full bg-[#FFF8E1] px-3 py-1 text-xs font-bold text-[#8B6914]">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mb-5">
                  <p className="text-3xl font-bold text-[#1F1F1F]">{plan.price}</p>
                  <p className="text-sm text-[#8A8178]">{plan.cadence}</p>
                  <p className="mt-2 inline-flex rounded-full bg-[#F7F1E8] px-3 py-1 text-xs font-semibold text-[#4A0F14]">
                    {plan.lotLimit}
                  </p>
                </div>

                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#1F1F1F]">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2F7D46]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {current ? (
                    <button className="btn-secondary w-full justify-center opacity-70" disabled>
                      <ShieldCheck className="h-4 w-4" />
                      Plano atual
                    </button>
                  ) : paidPlan && plan.checkoutUrl ? (
                    <a
                      href={plan.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary w-full justify-center"
                    >
                      <CreditCard className="h-4 w-4" />
                      Assinar agora
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : paidPlan ? (
                    <button className="btn-secondary w-full justify-center opacity-70" disabled>
                      <LockKeyhole className="h-4 w-4" />
                      Checkout pendente
                    </button>
                  ) : configured && !user ? (
                    <button onClick={() => setAuthOpen(true)} className="btn-primary w-full justify-center">
                      <User className="h-4 w-4" />
                      Criar conta gratis
                    </button>
                  ) : (
                    <Link href="/calculadora" className="btn-primary w-full justify-center">
                      Comecar calculo
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-[#4A0F14]">Como a liberacao funciona</h2>
            <p className="mt-2 text-sm text-[#8A8178]">
              A Perfect Pay envia o webhook para a Edge Function, os codigos de produto e plano
              sao validados e a assinatura e aplicada pelo e-mail do comprador.
            </p>
          </div>
          <div className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-[#4A0F14]">Antes de vender</h2>
            <p className="mt-2 text-sm text-[#8A8178]">
              Publique o app, configure Site URL no Supabase, cadastre os codigos Perfect Pay nas
              secrets da Edge Function e teste uma compra aprovada em ambiente controlado.
            </p>
          </div>
        </section>
      </main>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
