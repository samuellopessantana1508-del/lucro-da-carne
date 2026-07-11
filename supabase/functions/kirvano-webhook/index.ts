import { createClient } from "npm:@supabase/supabase-js@2";

type KirvanoPayload = {
  event?: string;
  status?: string;
  sale_id?: string;
  type?: "ONE_TIME" | "RECURRING";
  created_at?: string;
  customer?: {
    email?: string;
    name?: string;
  };
  plan?: {
    next_charge_date?: string;
  };
  products?: Array<{
    id?: string;
  }>;
  token?: string;
};

type BillingProduct = {
  id: string;
  provider_product_id: string;
  plan: "gratis" | "pro" | "business";
  lots_limit: number;
  access_days: number | null;
};

const jsonHeaders = { "Content-Type": "application/json" };
const encoder = new TextEncoder();

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function getAdminKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    const defaultKey = JSON.parse(secretKeys).default as string | undefined;
    if (defaultKey) return defaultKey;
  }

  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  throw new Error("Chave administrativa do Supabase indisponivel.");
}

async function secureEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const first = new Uint8Array(leftHash);
  const second = new Uint8Array(rightHash);
  let difference = left.length ^ right.length;

  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }

  return difference === 0;
}

function getRequestToken(request: Request, payload: KirvanoPayload) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  for (const [name, value] of request.headers.entries()) {
    if (name.includes("token")) return value.trim();
  }

  return payload.token?.trim() ?? new URL(request.url).searchParams.get("token")?.trim() ?? "";
}

function parseKirvanoDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function addDays(base: string | null, days: number | null) {
  if (!base || !days) return null;
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function planPriority(plan: BillingProduct["plan"]) {
  return { gratis: 0, pro: 1, business: 2 }[plan];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  let payload: KirvanoPayload;
  try {
    payload = await request.json();
  } catch {
    return response({ error: "invalid_json" }, 400);
  }

  const webhookToken = Deno.env.get("KIRVANO_WEBHOOK_TOKEN");
  if (!webhookToken) return response({ error: "webhook_not_configured" }, 503);

  if (!(await secureEqual(getRequestToken(request, payload), webhookToken))) {
    return response({ error: "invalid_token" }, 401);
  }

  const event = payload.event?.trim();
  const saleId = payload.sale_id?.trim();
  const email = payload.customer?.email?.trim().toLowerCase();
  if (!event || !saleId) return response({ error: "missing_sale_reference" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, getAdminKey());
  const eventId = `${event}:${saleId}`;
  const { data: knownEvent, error: knownEventError } = await supabase
    .from("billing_events")
    .select("status")
    .eq("provider", "kirvano")
    .eq("provider_event_id", eventId)
    .maybeSingle();

  if (knownEventError) return response({ error: "event_lookup_failed" }, 500);
  if (knownEvent?.status === "processed") return response({ received: true, duplicate: true });

  const { error: eventError } = await supabase.from("billing_events").upsert(
    {
      provider: "kirvano",
      provider_event_id: eventId,
      event_type: event,
      payload,
      status: "received",
      error_message: null,
      processed_at: null,
    },
    { onConflict: "provider,provider_event_id" }
  );

  if (eventError) return response({ error: "event_record_failed" }, 500);

  async function fail(message: string, status = 500) {
    await supabase
      .from("billing_events")
      .update({ status: "failed", error_message: message.slice(0, 500) })
      .eq("provider", "kirvano")
      .eq("provider_event_id", eventId);
    return response({ error: "processing_failed" }, status);
  }

  if (event === "SALE_CHARGEBACK" || event === "SALE_REFUNDED") {
    const now = new Date().toISOString();
    const { error: revokeSubscriptionError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", expires_at: now })
      .eq("provider", "kirvano")
      .eq("provider_subscription_id", saleId);
    if (revokeSubscriptionError) return fail("Nao foi possivel cancelar a assinatura.");

    const { error: revokeGrantError } = await supabase
      .from("billing_access_grants")
      .update({ status: "revoked", revoked_at: now })
      .eq("provider", "kirvano")
      .eq("provider_sale_id", saleId);
    if (revokeGrantError) return fail("Nao foi possivel revogar a concessao.");

    await supabase
      .from("billing_events")
      .update({ status: "processed", processed_at: now, error_message: null })
      .eq("provider", "kirvano")
      .eq("provider_event_id", eventId);
    return response({ received: true, access: "revoked" });
  }

  if (event !== "SALE_APPROVED" || payload.status !== "APPROVED" || !email) {
    return fail("Evento sem compra aprovada ou e-mail valido.", 202);
  }

  const productIds = (payload.products ?? [])
    .map((product) => product.id?.trim())
    .filter((productId): productId is string => Boolean(productId));
  if (productIds.length === 0) return fail("Compra aprovada sem produto identificado.", 202);

  const { data: products, error: productsError } = await supabase
    .from("billing_products")
    .select("id, provider_product_id, plan, lots_limit, access_days")
    .eq("provider", "kirvano")
    .eq("active", true)
    .in("provider_product_id", productIds);
  if (productsError) return fail("Nao foi possivel consultar os produtos Kirvano.");
  if (!products?.length) return fail("Nenhum produto Kirvano ativo foi mapeado para um plano.", 202);

  const product = [...products].sort((left, right) => planPriority(right.plan) - planPriority(left.plan))[0] as BillingProduct;
  const occurredAt = parseKirvanoDate(payload.created_at) ?? new Date().toISOString();
  const expiresAt =
    parseKirvanoDate(payload.plan?.next_charge_date) ?? addDays(occurredAt, product.access_days);

  const { error: grantError } = await supabase.from("billing_access_grants").upsert(
    {
      provider: "kirvano",
      provider_sale_id: saleId,
      provider_product_id: product.provider_product_id,
      email,
      plan: product.plan,
      lots_limit: product.lots_limit,
      expires_at: expiresAt,
      status: "pending",
      granted_at: null,
      revoked_at: null,
    },
    { onConflict: "provider,provider_sale_id,provider_product_id" }
  );
  if (grantError) return fail("Nao foi possivel registrar a concessao de acesso.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (profileError) return fail("Nao foi possivel localizar a conta do comprador.");

  if (profile) {
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .update({
        plan: product.plan,
        status: "active",
        lots_limit: product.lots_limit,
        provider: "kirvano",
        provider_customer_id: email,
        provider_subscription_id: saleId,
        current_period_start: occurredAt,
        current_period_end: expiresAt,
        expires_at: expiresAt,
      })
      .eq("user_id", profile.id);
    if (subscriptionError) return fail("Nao foi possivel liberar a assinatura.");

    const { error: grantedError } = await supabase
      .from("billing_access_grants")
      .update({ status: "granted", user_id: profile.id, granted_at: new Date().toISOString() })
      .eq("provider", "kirvano")
      .eq("provider_sale_id", saleId)
      .eq("provider_product_id", product.provider_product_id);
    if (grantedError) return fail("Nao foi possivel confirmar a concessao.");
  } else {
    const appUrl = Deno.env.get("KIRVANO_APP_URL");
    if (!appUrl) return fail("KIRVANO_APP_URL nao foi configurada para enviar convites.", 503);

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: appUrl,
      data: { name: payload.customer?.name ?? "" },
    });
    if (inviteError && !inviteError.message.toLowerCase().includes("already")) {
      return fail("Nao foi possivel enviar o convite de acesso.");
    }
  }

  const { error: processedError } = await supabase
    .from("billing_events")
    .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
    .eq("provider", "kirvano")
    .eq("provider_event_id", eventId);
  if (processedError) return fail("Nao foi possivel finalizar o evento.");

  return response({ received: true, access: profile ? "granted" : "invite_sent" });
});
