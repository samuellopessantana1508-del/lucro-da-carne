"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import MetricCard from "@/components/MetricCard";
import AlertBox from "@/components/AlertBox";
import { useAuth } from "@/hooks/useAuth";
import { useLotsStore } from "@/hooks/useLots";
import { clearAllData, getLots } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatDateBR } from "@/lib/format";
import { FREE_TRIAL_DAYS, getPlanLabel, hasSubscriptionAccess } from "@/lib/plans";
import {
  AlertTriangle,
  Cloud,
  CreditCard,
  Database,
  Download,
  KeyRound,
  LifeBuoy,
  LogIn,
  Save,
  Trash2,
  Upload,
  User,
  WifiOff,
} from "lucide-react";

export default function ContaPage() {
  const {
    configured,
    loading,
    user,
    profile,
    subscription,
    accountError,
    refreshAccount,
    signOut,
  } = useAuth();
  const { lots, loaded, loadedFor, loadLots, importLocalLotsToCloud } = useLotsStore();
  const userId = user?.id ?? null;
  const [authOpen, setAuthOpen] = useState(false);
  const [localCount, setLocalCount] = useState(() => getLots().length);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

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
  const activePaidSubscription = Boolean(
    subscription && subscription.plan !== "gratis" && hasSubscriptionAccess(subscription)
  );

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

  function downloadAccountData() {
    if (!user) return;

    const exportData = {
      version: 1,
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile,
      subscription,
      lots,
      legacy_local_lots: getLots(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lucro-da-carne-dados-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!user?.email || deleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setError("Digite o e-mail exato da conta para confirmar a exclusao.");
      return;
    }

    if (activePaidSubscription) {
      setError("Cancele a assinatura paga antes de excluir a conta para evitar novas cobrancas.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: deleteError } = await supabase.functions.invoke("account-self-service", {
        method: "DELETE",
        body: { confirmationEmail: deleteEmail.trim() },
      });
      if (deleteError) throw deleteError;
      if (!data?.deleted) throw new Error("A exclusao nao foi confirmada pelo servidor.");

      clearAllData();
      try {
        await signOut();
      } catch {
        // The server has already invalidated the deleted user.
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir a conta.");
      setDeleting(false);
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
                  Contas e assinaturas estao temporariamente indisponiveis. Tente novamente em instantes.
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
                  E necessario entrar para usar a calculadora e acessar seus lotes.
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
              <MetricCard label="Plano" value={getPlanLabel(subscription?.plan)} icon={Cloud} />
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
                {activePaidSubscription && (
                  <a
                    href={`mailto:suporte@lucrodacarne.com.br?subject=${encodeURIComponent("Cancelamento da assinatura Lucro da Carne")}&body=${encodeURIComponent(`Solicito o cancelamento da assinatura vinculada ao e-mail ${user.email ?? ""}.`)}`}
                    className="btn-secondary justify-center"
                  >
                    Cancelar assinatura
                  </a>
                )}
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
                Consulte tambem nossa{" "}
                <Link href="/cancelamento-e-reembolso" className="font-semibold text-[#7A1E24] hover:underline">
                  politica de cancelamento e reembolso
                </Link>
                .
              </p>
            </div>

            <div className="card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#4A0F14]">
                <Download className="h-5 w-5 text-[#C89B3C]" />
                Privacidade e dados
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#8A8178]">
                Baixe uma copia dos dados da conta ou solicite a exclusao definitiva. Exporte seus
                dados antes de excluir, pois a operacao nao pode ser desfeita.
              </p>
              <button type="button" onClick={downloadAccountData} className="btn-secondary mt-4 justify-center">
                <Download className="h-4 w-4" />
                Exportar meus dados
              </button>

              <div className="mt-6 border-t border-[#E5DED3] pt-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#A33A3A]" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[#4A0F14]">Excluir conta</h3>
                    <p className="mt-1 text-sm leading-6 text-[#8A8178]">
                      A exclusao remove seu perfil, lotes e acesso. Assinaturas pagas precisam ser
                      canceladas antes para impedir cobrancas futuras.
                    </p>
                    <label className="label mt-4" htmlFor="delete-account-email">
                      Confirme seu e-mail
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="delete-account-email"
                        type="email"
                        value={deleteEmail}
                        onChange={(event) => setDeleteEmail(event.target.value)}
                        placeholder={user.email ?? "seu@email.com"}
                        autoComplete="off"
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => void deleteAccount()}
                        disabled={deleting || activePaidSubscription || deleteEmail.trim().toLowerCase() !== user.email?.toLowerCase()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#A33A3A] px-4 py-2 text-sm font-semibold text-[#A33A3A] hover:bg-[#FFF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? "Excluindo..." : "Excluir definitivamente"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
