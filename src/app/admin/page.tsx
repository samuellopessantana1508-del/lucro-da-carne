"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LockKeyhole, LogIn, ReceiptText, RefreshCw, Save, Search, ShieldCheck, Users } from "lucide-react";
import AlertBox from "@/components/AlertBox";
import AuthModal from "@/components/AuthModal";
import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import { useAuth } from "@/hooks/useAuth";
import type { Database, SubscriptionPlan, SubscriptionStatus } from "@/lib/database.types";
import { formatDateBR } from "@/lib/format";
import { hasSubscriptionAccess, PLAN_DEFAULT_LIMITS } from "@/lib/plans";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
type BillingProductRow = Database["public"]["Tables"]["billing_products"]["Row"];
type BillingEventSummary = Omit<Database["public"]["Tables"]["billing_events"]["Row"], "payload">;
type Customer = ProfileRow & { subscription: SubscriptionRow | null; lotsCount: number };

const PLANS: SubscriptionPlan[] = ["gratis", "pro", "business"];
const STATUSES: SubscriptionStatus[] = ["active", "past_due", "canceled", "expired"];

function isPlan(value: string): value is SubscriptionPlan {
  return PLANS.includes(value as SubscriptionPlan);
}

function isStatus(value: string): value is SubscriptionStatus {
  return STATUSES.includes(value as SubscriptionStatus);
}

export default function AdminPage() {
  const { configured, loading, user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [authOpen, setAuthOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [billingProducts, setBillingProducts] = useState<BillingProductRow[]>([]);
  const [billingEvents, setBillingEvents] = useState<BillingEventSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [productBusy, setProductBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!configured || !isAdmin) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setDataLoading(true);
    setError(null);

    try {
      const [profilesResult, subscriptionsResult, lotsResult, productsResult] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
        supabase.from("lots").select("user_id"),
        supabase.from("billing_products").select("*").eq("provider", "kirvano").order("created_at"),
      ]);
      const billingEventsResult = await supabase
        .from("billing_events")
        .select("id,user_id,provider,provider_event_id,event_type,status,error_message,processed_at,created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (profilesResult.error) throw profilesResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (lotsResult.error) throw lotsResult.error;
      if (productsResult.error) throw productsResult.error;
      if (billingEventsResult.error) throw billingEventsResult.error;

      const subscriptionsByUser = new Map(
        (subscriptionsResult.data ?? []).map((subscription) => [subscription.user_id, subscription])
      );
      const lotsByUser = new Map<string, number>();

      for (const lot of lotsResult.data ?? []) {
        lotsByUser.set(lot.user_id, (lotsByUser.get(lot.user_id) ?? 0) + 1);
      }

      setCustomers(
        (profilesResult.data ?? []).map((customer) => ({
          ...customer,
          subscription: subscriptionsByUser.get(customer.id) ?? null,
          lotsCount: lotsByUser.get(customer.id) ?? 0,
        }))
      );
      setBillingProducts(productsResult.data ?? []);
      setBillingEvents((billingEventsResult.data ?? []) as BillingEventSummary[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os clientes.");
    } finally {
      setDataLoading(false);
    }
  }, [configured, isAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const metrics = useMemo(
    () => ({
      customers: customers.length,
      paid: customers.filter((customer) => customer.subscription?.plan !== "gratis").length,
      active: customers.filter((customer) => customer.subscription?.status === "active").length,
      lots: customers.reduce((total, customer) => total + customer.lotsCount, 0),
    }),
    [customers]
  );
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((customer) => {
      const subscription = customer.subscription;
      const searchable = [
        customer.email,
        customer.name,
        customer.business_name,
        subscription?.plan,
        subscription?.status,
        subscription?.provider,
        subscription?.sale_code,
        subscription?.plan_code,
        subscription?.provider_subscription_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [customers, searchTerm]);

  async function updateSubscription(event: FormEvent<HTMLFormElement>, customer: Customer) {
    event.preventDefault();
    if (!customer.subscription) return;

    const formData = new FormData(event.currentTarget);
    const plan = String(formData.get("plan") ?? "");
    const status = String(formData.get("status") ?? "");
    const lotsLimit = Number(formData.get("lotsLimit"));

    if (!isPlan(plan) || !isStatus(status) || !Number.isInteger(lotsLimit) || lotsLimit < 0) {
      setError("Revise o plano, status e limite de lotes antes de salvar.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusyUserId(customer.id);
    setError(null);
    setMessage(null);

    try {
      const changedAt = new Date();
      const paidAccessRequested = plan !== "gratis" && status === "active";
      const existingExpiry = customer.subscription.expires_at
        ? new Date(customer.subscription.expires_at).getTime()
        : null;
      const shouldResetAccessWindow = paidAccessRequested && (
        customer.subscription.provider === "manual" ||
        customer.subscription.plan === "gratis" ||
        customer.subscription.status !== "active" ||
        existingExpiry === null ||
        !Number.isFinite(existingExpiry) ||
        existingExpiry <= changedAt.getTime()
      );
      const updatePayload: Database["public"]["Tables"]["subscriptions"]["Update"] = {
        plan,
        status,
        lots_limit: lotsLimit,
      };

      if (shouldResetAccessWindow) {
        updatePayload.billing_cycle = plan === "business" ? "annual" : "monthly";
        updatePayload.current_period_start = changedAt.toISOString();
        updatePayload.current_period_end = null;
        updatePayload.expires_at = null;
        updatePayload.cancel_at_period_end = false;
      }

      const { data: updatedSubscription, error: updateError } = await supabase
        .from("subscriptions")
        .update(updatePayload)
        .eq("id", customer.subscription.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      if (paidAccessRequested && !hasSubscriptionAccess(updatedSubscription)) {
        throw new Error("A assinatura foi salva, mas a validade ainda bloqueia o acesso.");
      }

      setMessage(
        paidAccessRequested
          ? `Assinatura de ${customer.email} atualizada e acesso liberado.`
          : `Assinatura de ${customer.email} atualizada.`
      );
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar a assinatura.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function saveKirvanoProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const formData = new FormData(event.currentTarget);
    const providerProductId = String(formData.get("providerProductId") ?? "").trim();
    const plan = String(formData.get("plan") ?? "");
    const lotsLimit = Number(formData.get("lotsLimit"));
    const rawAccessDays = String(formData.get("accessDays") ?? "").trim();
    const accessDays = rawAccessDays ? Number(rawAccessDays) : null;

    if (
      !providerProductId ||
      !isPlan(plan) ||
      !Number.isInteger(lotsLimit) ||
      lotsLimit < 0 ||
      (accessDays !== null && (!Number.isInteger(accessDays) || accessDays <= 0))
    ) {
      setError("Informe um ID de produto, plano e limites validos.");
      return;
    }

    setProductBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { error: productError } = await supabase.from("billing_products").upsert(
        {
          provider: "kirvano",
          provider_product_id: providerProductId,
          plan,
          lots_limit: lotsLimit,
          access_days: accessDays,
          active: true,
        },
        { onConflict: "provider,provider_product_id" }
      );

      if (productError) throw productError;

      event.currentTarget.reset();
      setMessage("Produto Kirvano salvo. Compras aprovadas deste produto liberarao o plano configurado.");
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o produto Kirvano.");
    } finally {
      setProductBusy(false);
    }
  }

  async function removeKirvanoProduct(product: BillingProductRow) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setProductBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { error: productError } = await supabase.from("billing_products").delete().eq("id", product.id);
      if (productError) throw productError;

      setMessage("Produto Kirvano removido. Novas compras dele nao liberarao acesso.");
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover o produto Kirvano.");
    } finally {
      setProductBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#4A0F14]">Administracao</h1>
            <p className="mt-1 text-sm text-[#8A8178]">Clientes, uso e gestao manual de planos.</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => void loadCustomers()}
              disabled={dataLoading}
              className="btn-secondary disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          )}
        </div>

        {error && <AlertBox type="error" message={error} />}
        {message && <AlertBox type="success" message={message} />}

        {!configured && (
          <div className="card p-6">
            <LockKeyhole className="mb-3 h-6 w-6 text-[#C89B3C]" />
            <h2 className="text-lg font-bold text-[#4A0F14]">Supabase ainda nao configurado</h2>
          </div>
        )}

        {configured && !loading && !user && (
          <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#4A0F14]">Entre com uma conta administradora</h2>
              <p className="mt-1 text-sm text-[#8A8178]">O acesso e conferido no banco, nao apenas na tela.</p>
            </div>
            <button type="button" onClick={() => setAuthOpen(true)} className="btn-primary">
              <LogIn className="w-4 h-4" />
              Entrar
            </button>
          </div>
        )}

        {configured && !loading && user && !isAdmin && (
          <div className="card p-6">
            <ShieldCheck className="mb-3 h-6 w-6 text-[#C89B3C]" />
            <h2 className="text-lg font-bold text-[#4A0F14]">Acesso restrito</h2>
            <p className="mt-1 text-sm text-[#8A8178]">Esta conta nao tem permissao de administracao.</p>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard label="Clientes" value={String(metrics.customers)} icon={Users} />
              <MetricCard label="Planos pagos" value={String(metrics.paid)} icon={ShieldCheck} />
              <MetricCard label="Assinaturas ativas" value={String(metrics.active)} icon={RefreshCw} />
              <MetricCard label="Lotes salvos" value={String(metrics.lots)} icon={Save} />
            </div>

            <div className="flex flex-col gap-2 sm:max-w-lg">
              <label htmlFor="admin-search" className="label">Buscar clientes e vendas</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8178]" />
                <input
                  id="admin-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="input-field pl-10"
                  placeholder="E-mail, plano, status ou codigo de venda"
                />
              </div>
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-[#E5DED3] bg-[#F7F1E8] text-xs uppercase text-[#8A8178]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Lotes</th>
                    <th className="px-4 py-3 font-semibold">Plano</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Limite</th>
                    <th className="px-4 py-3 font-semibold">Cadastro</th>
                    <th className="px-4 py-3 font-semibold" aria-label="Salvar plano" />
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-[#EDE7DF] last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#4A0F14]">
                          {customer.business_name || customer.name || "Sem nome"}
                        </p>
                        <p className="text-xs text-[#8A8178]">{customer.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[#4A0F14]">{customer.lotsCount}</td>
                      <td colSpan={5} className="p-0">
                        {customer.subscription ? (
                          <form
                            onSubmit={(event) => void updateSubscription(event, customer)}
                            className="grid grid-cols-[150px_150px_100px_130px_1fr] items-center"
                          >
                            <div className="px-4 py-2">
                              <select name="plan" defaultValue={customer.subscription.plan} className="input-field py-2">
                                {PLANS.map((plan) => (
                                  <option key={plan} value={plan}>{plan}</option>
                                ))}
                              </select>
                              <p className="mt-1 text-[11px] text-[#8A8178]">
                                {customer.subscription.provider === "perfectpay" ? "Perfect Pay" : customer.subscription.provider}
                                {customer.subscription.sale_code ? ` · ${customer.subscription.sale_code}` : ""}
                              </p>
                            </div>
                            <div className="px-4 py-2">
                              <select name="status" defaultValue={customer.subscription.status} className="input-field py-2">
                                {STATUSES.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                            <div className="px-4 py-2">
                              <input
                                name="lotsLimit"
                                type="number"
                                min="0"
                                step="1"
                                className="input-field py-2"
                                defaultValue={customer.subscription.lots_limit}
                              />
                            </div>
                            <div className="px-4 py-3 text-xs text-[#8A8178]">
                              <p>{formatDateBR(customer.created_at.slice(0, 10))}</p>
                              {customer.subscription.approved_at && (
                                <p>Aprovado {formatDateBR(customer.subscription.approved_at.slice(0, 10))}</p>
                              )}
                            </div>
                            <div className="px-4 py-2">
                              <button
                                type="submit"
                                disabled={busyUserId === customer.id}
                                className="btn-primary px-3 py-2 disabled:opacity-50"
                              >
                                <Save className="w-4 h-4" />
                                Salvar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[#B23A3A]">Assinatura ausente</div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!dataLoading && filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#8A8178]">
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {dataLoading && <p className="px-4 py-4 text-sm text-[#8A8178]">Carregando clientes...</p>}
            </div>

            <section className="card overflow-x-auto">
              <div className="flex items-center gap-2 px-4 py-4">
                <ReceiptText className="h-5 w-5 text-[#C89B3C]" />
                <h2 className="text-lg font-bold text-[#4A0F14]">Eventos de pagamento</h2>
              </div>
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-y border-[#E5DED3] bg-[#F7F1E8] text-xs uppercase text-[#8A8178]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Evento</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Recebido</th>
                    <th className="px-4 py-3 font-semibold">Processado</th>
                  </tr>
                </thead>
                <tbody>
                  {billingEvents.map((event) => {
                    const eventCustomer = event.user_id ? customersById.get(event.user_id) : null;
                    return (
                      <tr key={event.id} className="border-b border-[#EDE7DF] last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-[#4A0F14]">{event.provider_event_id}</p>
                          <p className="text-xs text-[#8A8178]">{event.provider} · {event.event_type}</p>
                        </td>
                        <td className="px-4 py-3 text-[#4A0F14]">{eventCustomer?.email ?? "-"}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#4A0F14]">{event.status}</p>
                          {event.error_message && <p className="mt-1 text-xs text-[#B23A3A]">{event.error_message}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8A8178]">
                          {formatDateBR(event.created_at.slice(0, 10))}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8A8178]">
                          {event.processed_at ? formatDateBR(event.processed_at.slice(0, 10)) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {!dataLoading && billingEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#8A8178]">
                        Nenhum evento registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="card p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-[#4A0F14]">Produtos Kirvano</h2>
                <p className="mt-1 text-sm text-[#8A8178]">
                  Cadastre o ID do produto para que somente compras aprovadas dele liberem o plano correto.
                </p>
              </div>

              <form onSubmit={saveKirvanoProduct} className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
                <div>
                  <label className="label">ID do produto</label>
                  <input name="providerProductId" className="input-field" placeholder="ID exibido na Kirvano" required />
                </div>
                <div>
                  <label className="label">Plano</label>
                  <select name="plan" className="input-field" defaultValue="pro">
                    {PLANS.map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Limite de lotes</label>
                  <input
                    name="lotsLimit"
                    type="number"
                    min="0"
                    step="1"
                    className="input-field"
                    defaultValue={PLAN_DEFAULT_LIMITS.pro}
                    required
                  />
                </div>
                <div>
                  <label className="label">Dias de acesso</label>
                  <input name="accessDays" type="number" min="1" step="1" className="input-field" placeholder="Sem vencimento" />
                </div>
                <button type="submit" disabled={productBusy} className="btn-primary disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  Salvar produto
                </button>
              </form>

              {billingProducts.length > 0 && (
                <div className="mt-6 overflow-x-auto border-t border-[#E5DED3] pt-4">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="text-xs uppercase text-[#8A8178]">
                      <tr>
                        <th className="pb-2 font-semibold">Produto</th>
                        <th className="pb-2 font-semibold">Plano</th>
                        <th className="pb-2 font-semibold">Limite</th>
                        <th className="pb-2 font-semibold">Acesso</th>
                        <th className="pb-2" aria-label="Remover produto" />
                      </tr>
                    </thead>
                    <tbody>
                      {billingProducts.map((product) => (
                        <tr key={product.id} className="border-t border-[#EDE7DF]">
                          <td className="py-3 font-mono text-xs text-[#4A0F14]">{product.provider_product_id}</td>
                          <td className="py-3">{product.plan}</td>
                          <td className="py-3">{product.lots_limit >= 9999 ? "Ilimitado" : product.lots_limit}</td>
                          <td className="py-3">{product.access_days ? `${product.access_days} dias` : "Sem vencimento"}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void removeKirvanoProduct(product)}
                              disabled={productBusy}
                              className="text-sm font-semibold text-[#B23A3A] hover:underline disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
