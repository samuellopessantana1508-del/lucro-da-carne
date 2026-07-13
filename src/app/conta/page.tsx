"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import MetricCard from "@/components/MetricCard";
import AlertBox from "@/components/AlertBox";
import { useAuth } from "@/hooks/useAuth";
import { useLotsStore } from "@/hooks/useLots";
import { getLots } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDateBR } from "@/lib/format";
import { FREE_TRIAL_DAYS } from "@/lib/plans";
import { Cloud, CreditCard, Database, KeyRound, LifeBuoy, LogIn, Save, Upload, User, WifiOff } from "lucide-react";

export default function ContaPage() {
  const {
    configured,
    loading,
    user,
    profile,
    subscription,
    accountError,
    refreshAccount,
  } = useAuth();
  const { lots, loaded, loadedFor, loadLots, importLocalLotsToCloud } = useLotsStore();
  const userId = user?.id ?? null;
  const [authOpen, setAuthOpen] = useState(false);
  const [localCount, setLocalCount] = useState(() => getLots().length);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded || loadedFor !== userId) void loadLots(userId);
  }, [loaded, loadedFor, loadLots, userId]);

  const usageLabel = subscription?.plan === "gratis"
    ? `${FREE_TRIAL_DAYS} dias gratis`
    : "Ilimitado";
  const validityLabel = useMemo(() => {
    if (!subscription) return "-";
    if (subscription.expires_at) return formatDateBR(subscription.expires_at.slice(0, 10));
    return "Sem vencimento";
  }, [subscription]);
  const periodStartLabel = subscription?.current_period_start
    ? formatDateBR(subscription.current_period_start.slice(0, 10))
    : "-";
  const providerLabel =
    subscription?.provider === "perfectpay"
      ? "Perfect Pay"
      : subscription?.provider === "kirvano"
        ? "Kirvano"
        : "Manual";

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name,
          business_name: businessName || null,
          phone: phone || null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshAccount();
      setMessage("Dados da conta atualizados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar os dados.");
    } finally {
      setBusy(false);
    }
  }

  async function importLocalLots() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const imported = await importLocalLotsToCloud();
      setLocalCount(0);
      setMessage(
        imported === 1
          ? "1 lote local foi importado para sua conta."
          : `${imported} lotes locais foram importados para sua conta.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel importar os lotes.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    if (!user?.email) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/definir-senha`,
      });
      if (resetError) throw resetError;
      setMessage("Enviamos um link de redefinicao de senha para seu e-mail.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar o reset de senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#4A0F14]">Conta</h1>
          <p className="text-sm text-[#8A8178] mt-1">
            Gerencie acesso, dados do negocio e persistencia dos lotes.
          </p>
        </div>

        {accountError && <AlertBox type="error" message={accountError} />}
        {error && <AlertBox type="error" message={error} />}
        {message && <AlertBox type="success" message={message} />}

        {!configured && (
          <div className="card p-5 sm:p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-[#FFF8E1] p-3">
                <WifiOff className="w-6 h-6 text-[#C89B3C]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#4A0F14]">Modo local ativo</h2>
                <p className="text-sm text-[#8A8178] mt-1">
                  A calculadora continua funcionando no navegador. Para virar SaaS com login e banco,
                  configure as variaveis do Supabase e execute o schema no projeto.
                </p>
              </div>
            </div>
          </div>
        )}

        {configured && !loading && !user && (
          <div className="card p-5 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#4A0F14]">Entre para salvar na nuvem</h2>
                <p className="text-sm text-[#8A8178] mt-1">
                  Sem login, os lotes continuam salvos apenas neste navegador.
                </p>
              </div>
              <button onClick={() => setAuthOpen(true)} className="btn-primary">
                <LogIn className="w-4 h-4" />
                Entrar ou criar conta
              </button>
            </div>
          </div>
        )}

        {user && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Plano" value={subscription?.plan ?? "gratis"} icon={Cloud} />
              <MetricCard label="Validade" value={validityLabel} icon={Save} />
              <MetricCard label="Lotes na conta" value={String(lots.length)} icon={Database} />
              <MetricCard label="Uso do plano" value={usageLabel} icon={Upload} />
            </div>

            <div className="card p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#4A0F14]">Plano e assinatura</h2>
                  <p className="mt-1 text-sm text-[#8A8178]">
                    {subscription?.provider === "perfectpay" || subscription?.provider === "kirvano"
                      ? `Sua assinatura foi liberada por uma compra ${providerLabel}.`
                      : "Veja os planos para liberar mais lotes e manter o historico na nuvem."}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-[#4A0F14] sm:grid-cols-3">
                    <p>
                      <span className="block text-xs font-semibold uppercase text-[#8A8178]">Inicio</span>
                      {periodStartLabel}
                    </p>
                    <p>
                      <span className="block text-xs font-semibold uppercase text-[#8A8178]">Proxima renovacao</span>
                      {validityLabel}
                    </p>
                    <p>
                      <span className="block text-xs font-semibold uppercase text-[#8A8178]">Limite</span>
                      {subscription?.plan === "gratis"
                        ? `Uso ilimitado por ${FREE_TRIAL_DAYS} dias`
                        : "Uso ilimitado"}
                    </p>
                  </div>
                </div>
                <Link href="/planos" className="btn-secondary justify-center">
                  <CreditCard className="w-4 h-4" />
                  Ver planos
                </Link>
              </div>
            </div>

            <form
              key={`${user.id}-${profile?.updated_at ?? "novo"}`}
              onSubmit={saveProfile}
              className="card p-5 sm:p-6"
            >
              <h2 className="text-lg font-bold text-[#4A0F14] mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#C89B3C]" />
                Dados do negocio
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nome</label>
                  <input name="name" className="input-field" defaultValue={profile?.name ?? ""} />
                </div>
                <div>
                  <label className="label">Negocio</label>
                  <input
                    name="businessName"
                    className="input-field"
                    defaultValue={profile?.business_name ?? ""}
                    placeholder="Nome do acougue"
                  />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input name="phone" className="input-field" defaultValue={profile?.phone ?? ""} />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input className="input-field" value={user.email ?? ""} disabled />
                </div>
              </div>
              <div className="mt-5">
                <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {busy ? "Salvando..." : "Salvar dados"}
                </button>
              </div>
            </form>

            <div className="card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-[#4A0F14] mb-4">Acesso e suporte</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void sendPasswordReset()}
                  disabled={busy}
                  className="btn-secondary justify-center disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  Redefinir senha
                </button>
                <a href="mailto:suporte@lucrodacarne.com.br" className="btn-secondary justify-center">
                  <LifeBuoy className="w-4 h-4" />
                  Suporte
                </a>
              </div>
              <p className="mt-3 text-xs text-[#8A8178]">
                Para trocar o e-mail da conta, acione o suporte para validarmos a titularidade antes da alteracao.
              </p>
            </div>

            <div className="card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-[#4A0F14] mb-2">Migracao de dados locais</h2>
              <p className="text-sm text-[#8A8178] mb-4">
                {localCount > 0
                  ? `Encontramos ${localCount} lote(s) salvos neste navegador.`
                  : "Nenhum lote local pendente neste navegador."}
              </p>
              <button
                onClick={importLocalLots}
                disabled={busy || localCount === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Importar para a conta
              </button>
            </div>

            <div className="text-xs text-[#8A8178]">
              Conta criada em {profile?.created_at ? formatDateBR(profile.created_at.slice(0, 10)) : "-"}.
            </div>
          </div>
        )}
      </main>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
