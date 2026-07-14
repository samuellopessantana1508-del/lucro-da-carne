import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;
type AppPlan = "pro" | "business";
type BillingCycle = "monthly" | "annual";

type PerfectPayPayload = JsonObject & {
  token?: unknown;
  code?: unknown;
  sale_amount?: unknown;
  sale_status_enum?: unknown;
  sale_status_detail?: unknown;
  date_created?: unknown;
  date_approved?: unknown;
  product?: {
    code?: unknown;
    name?: unknown;
    external_reference?: unknown;
  };
  plan?: {
    code?: unknown;
    name?: unknown;
  };
  customer?: {
    full_name?: unknown;
    email?: unknown;
    identification_number?: unknown;
  };
};

type ResolvedPlan = {
  appPlan: AppPlan;
  billingCycle: BillingCycle;
  planCode: string;
  planName: string;
  periodMonths: number;
  expectedAmount: number;
};

const jsonHeaders = { "Content-Type": "application/json" };
const encoder = new TextEncoder();
const approvedStatus = 2;
const cancelledStatus = 6;
const refundedStatus = 7;
const authorizedStatus = 8;
const chargedBackStatus = 9;
const completedStatus = 10;
const revokeStatuses = new Set([cancelledStatus, refundedStatus, chargedBackStatus]);

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEmail(value: unknown) {
  const email = asString(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function parseDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;
  const parsed = new Date(raw.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function addMonths(baseIso: string, months: number) {
  const date = new Date(baseIso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function statusLabel(status: number) {
  switch (status) {
    case approvedStatus:
      return "approved";
    case cancelledStatus:
      return "cancelled";
    case refundedStatus:
      return "refunded";
    case authorizedStatus:
      return "authorized";
    case chargedBackStatus:
      return "charged_back";
    case completedStatus:
      return "completed";
    default:
      return `status_${status}`;
  }
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

function getRequestToken(request: Request, payload: PerfectPayPayload) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  const explicitHeaders = [
    "x-perfectpay-token",
    "x-webhook-token",
    "x-webhook-secret",
    "perfectpay-token",
  ];
  for (const header of explicitHeaders) {
    const value = request.headers.get(header);
    if (value) return value.trim();
  }

  return asString(payload.token) || new URL(request.url).searchParams.get("token")?.trim() || "";
}

function envValue(name: string) {
  return Deno.env.get(name)?.trim() ?? "";
}

function auditPayload(payload: PerfectPayPayload): JsonObject {
  return {
    code: asString(payload.code),
    sale_amount: asNumber(payload.sale_amount),
    sale_status_enum: asNumber(payload.sale_status_enum),
    sale_status_detail: asString(payload.sale_status_detail),
    date_created: asString(payload.date_created),
    date_approved: asString(payload.date_approved),
    product: {
      code: asString(payload.product?.code),
      name: asString(payload.product?.name),
      external_reference: asString(payload.product?.external_reference),
    },
    plan: {
      code: asString(payload.plan?.code),
      name: asString(payload.plan?.name),
    },
    customer: {
      full_name: asString(payload.customer?.full_name),
      email: normalizeEmail(payload.customer?.email),
    },
  };
}

function resolvePlan(payload: PerfectPayPayload): { plan?: ResolvedPlan; error?: string } {
  const monthlyCode = envValue("PERFECTPAY_MONTHLY_PLAN_CODE");
  const annualCode = envValue("PERFECTPAY_ANNUAL_PLAN_CODE");
  const expectedProductCode = envValue("PERFECTPAY_PRODUCT_CODE");
  const productCode = asString(payload.product?.code);
  const externalReference = asString(payload.product?.external_reference);
  const planCode = asString(payload.plan?.code) || externalReference;

  if (!monthlyCode || !annualCode) return { error: "plan_codes_not_configured" };

  if (
    expectedProductCode &&
    productCode !== expectedProductCode &&
    externalReference !== expectedProductCode
  ) {
    return { error: "invalid_product_code" };
  }

  if (planCode === monthlyCode) {
    return {
      plan: {
        appPlan: "pro",
        billingCycle: "monthly",
        planCode,
        planName: asString(payload.plan?.name) || "Mensal",
        periodMonths: 1,
        expectedAmount: 49.9,
      },
    };
  }

  if (planCode === annualCode) {
    return {
      plan: {
        appPlan: "business",
        billingCycle: "annual",
        planCode,
        planName: asString(payload.plan?.name) || "Anual",
        periodMonths: 12,
        expectedAmount: 149.9,
      },
    };
  }

  return { error: "unknown_plan_code" };
}

function appUrl(path: string) {
  const baseUrl = envValue("APP_URL");
  if (!baseUrl) return "";
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  let payload: PerfectPayPayload;
  try {
    const parsed = await request.json();
    if (!isObject(parsed)) return response({ error: "invalid_payload" }, 400);
    payload = parsed as PerfectPayPayload;
  } catch {
    return response({ error: "invalid_json" }, 400);
  }

  const webhookToken = envValue("PERFECTPAY_WEBHOOK_TOKEN");
  if (!webhookToken) return response({ error: "webhook_not_configured" }, 503);

  if (!(await secureEqual(getRequestToken(request, payload), webhookToken))) {
    return response({ error: "invalid_token" }, 401);
  }

  const saleCode = asString(payload.code);
  const parsedSaleStatus = asNumber(payload.sale_status_enum);
  if (!saleCode || parsedSaleStatus === null || !Number.isInteger(parsedSaleStatus)) {
    return response({ error: "missing_sale_reference" }, 400);
  }
  const saleStatus = parsedSaleStatus;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, getAdminKey());
  const eventType = statusLabel(saleStatus);
  const eventId = `${saleCode}:${saleStatus}`;
  const receivedEvent = {
    provider: "perfectpay",
    provider_event_id: eventId,
    event_type: eventType,
    payload: auditPayload(payload),
    status: "received",
    error_message: null,
    processed_at: null,
  };

  const { error: insertEventError } = await supabase.from("billing_events").insert(receivedEvent);
  if (insertEventError) {
    const errorCode = (insertEventError as { code?: string }).code;
    if (errorCode !== "23505") return response({ error: "event_record_failed" }, 500);

    const { data: knownEvent, error: knownEventError } = await supabase
      .from("billing_events")
      .select("id,status")
      .eq("provider", "perfectpay")
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (knownEventError) return response({ error: "event_lookup_failed" }, 500);
    if (knownEvent?.status !== "failed") {
      return response({ received: true, duplicate: true, status: knownEvent?.status ?? "received" });
    }

    const { error: retryEventError } = await supabase
      .from("billing_events")
      .update(receivedEvent)
      .eq("provider", "perfectpay")
      .eq("provider_event_id", eventId);
    if (retryEventError) return response({ error: "event_retry_failed" }, 500);
  }

  async function fail(message: string, status = 422) {
    await supabase
      .from("billing_events")
      .update({ status: "failed", error_message: message.slice(0, 500) })
      .eq("provider", "perfectpay")
      .eq("provider_event_id", eventId);
    return response({ received: true, error: message }, status);
  }

  async function markProcessed(userId: string | null = null) {
    const { error: processedError } = await supabase
      .from("billing_events")
      .update({
        user_id: userId,
        status: "processed",
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("provider", "perfectpay")
      .eq("provider_event_id", eventId);
    return processedError;
  }

  async function findAuthUserIdByEmail(email: string) {
    const perPage = 1000;
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const found = data.users.find((user) => user.email?.toLowerCase() === email);
      if (found) return found.id;
      if (data.users.length < perPage) break;
    }
    return null;
  }

  const productExternalReference = asString(payload.product?.external_reference);
  const productCode = asString(payload.product?.code) || productExternalReference;
  const expectedProductCode = envValue("PERFECTPAY_PRODUCT_CODE");
  if (
    expectedProductCode &&
    productCode !== expectedProductCode &&
    productExternalReference !== expectedProductCode
  ) {
    return fail("invalid_product_code", 422);
  }
  const storedProductCode = expectedProductCode || productCode || productExternalReference;
  const approvedAt = parseDate(payload.date_approved) ?? parseDate(payload.date_created) ?? new Date().toISOString();
  const amount = asNumber(payload.sale_amount);

  if (revokeStatuses.has(saleStatus)) {
    const now = new Date().toISOString();
    const revokePayload = {
      plan: "gratis",
      status: "expired",
      lots_limit: 9999,
      provider: "perfectpay",
      provider_subscription_id: saleCode,
      sale_code: saleCode,
      billing_cycle: "free",
      current_period_end: now,
      expires_at: now,
      cancelled_at: now,
      free_uses_consumed: 0,
    };

    let revokedUserId: string | null = null;
    const firstRevoke = await supabase
      .from("subscriptions")
      .update(revokePayload)
      .eq("provider", "perfectpay")
      .eq("sale_code", saleCode)
      .select("user_id")
      .maybeSingle();
    if (firstRevoke.error) return fail("subscription_revoke_failed", 500);

    revokedUserId = firstRevoke.data?.user_id ?? null;
    if (!revokedUserId) {
      const secondRevoke = await supabase
        .from("subscriptions")
        .update(revokePayload)
        .eq("provider", "perfectpay")
        .eq("provider_subscription_id", saleCode)
        .select("user_id")
        .maybeSingle();
      if (secondRevoke.error) return fail("subscription_revoke_failed", 500);
      revokedUserId = secondRevoke.data?.user_id ?? null;
    }

    const { error: grantError } = await supabase
      .from("billing_access_grants")
      .update({ status: "revoked", revoked_at: now })
      .eq("provider", "perfectpay")
      .eq("provider_sale_id", saleCode);
    if (grantError) return fail("grant_revoke_failed", 500);

    const processedError = await markProcessed(revokedUserId);
    if (processedError) return fail("event_finalize_failed", 500);
    return response({ received: true, access: "revoked" });
  }

  const resolved = resolvePlan(payload);
  if (resolved.error || !resolved.plan) return fail(resolved.error ?? "invalid_plan", 422);

  if (saleStatus === completedStatus) {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("provider", "perfectpay")
      .eq("sale_code", saleCode)
      .maybeSingle();
    const processedError = await markProcessed(subscription?.user_id ?? null);
    if (processedError) return fail("event_finalize_failed", 500);
    return response({ received: true, access: "unchanged" });
  }

  if (saleStatus !== approvedStatus) {
    const processedError = await markProcessed(null);
    if (processedError) return fail("event_finalize_failed", 500);
    return response({
      received: true,
      access: saleStatus === authorizedStatus ? "authorized_only" : "ignored_status",
    });
  }

  const email = normalizeEmail(payload.customer?.email);
  if (!email) return fail("invalid_customer_email", 422);

  const plan = resolved.plan;
  const customerName = asString(payload.customer?.full_name);
  const periodEnd = addMonths(approvedAt, plan.periodMonths);

  async function applySubscription(userId: string) {
    return await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        plan: plan.appPlan,
        status: "active",
        lots_limit: 9999,
        provider: "perfectpay",
        provider_customer_id: email,
        provider_subscription_id: saleCode,
        sale_code: saleCode,
        product_code: storedProductCode,
        plan_code: plan.planCode,
        plan_name: plan.planName,
        billing_cycle: plan.billingCycle,
        amount: amount ?? plan.expectedAmount,
        approved_at: approvedAt,
        current_period_start: approvedAt,
        current_period_end: periodEnd,
        expires_at: periodEnd,
        cancelled_at: null,
      }, { onConflict: "user_id" });
  }

  async function markGrant(userId: string | null, status: "pending" | "granted") {
    return await supabase.from("billing_access_grants").upsert(
      {
        provider: "perfectpay",
        provider_sale_id: saleCode,
        provider_product_id: storedProductCode || plan.planCode,
        email,
        user_id: userId,
        plan: plan.appPlan,
        lots_limit: 9999,
        expires_at: periodEnd,
        status,
        granted_at: status === "granted" ? new Date().toISOString() : null,
        revoked_at: null,
      },
      { onConflict: "provider,provider_sale_id,provider_product_id" }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (profileError) return fail("profile_lookup_failed", 500);

  if (profile) {
    const { error: subscriptionError } = await applySubscription(profile.id);
    if (subscriptionError) return fail("subscription_update_failed", 500);

    const { error: grantError } = await markGrant(profile.id, "granted");
    if (grantError) return fail("grant_update_failed", 500);

    const processedError = await markProcessed(profile.id);
    if (processedError) return fail("event_finalize_failed", 500);
    return response({ received: true, access: "granted" });
  }

  let authUserId: string | null = null;
  try {
    authUserId = await findAuthUserIdByEmail(email);
  } catch {
    return fail("auth_lookup_failed", 500);
  }

  if (!authUserId) {
    const redirectTo = appUrl("/definir-senha");
    if (!redirectTo) return fail("app_url_not_configured", 503);

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { name: customerName, plan: plan.appPlan },
    });
    if (inviteError && !inviteError.message.toLowerCase().includes("already")) {
      return fail("invite_failed", 500);
    }
    authUserId = inviteData.user?.id ?? null;
  }

  if (authUserId) {
    const { error: profileUpsertError } = await supabase.from("profiles").upsert(
      {
        id: authUserId,
        email,
        name: customerName,
      },
      { onConflict: "id" }
    );
    if (profileUpsertError) return fail("profile_create_failed", 500);

    const { error: subscriptionError } = await applySubscription(authUserId);
    if (subscriptionError) return fail("subscription_update_failed", 500);

    const { error: grantError } = await markGrant(authUserId, "granted");
    if (grantError) return fail("grant_update_failed", 500);

    const processedError = await markProcessed(authUserId);
    if (processedError) return fail("event_finalize_failed", 500);
    return response({ received: true, access: "invite_sent_and_granted" });
  }

  const { error: pendingGrantError } = await markGrant(null, "pending");
  if (pendingGrantError) return fail("grant_create_failed", 500);

  const processedError = await markProcessed(null);
  if (processedError) return fail("event_finalize_failed", 500);
  return response({ received: true, access: "pending_invite" });
});
