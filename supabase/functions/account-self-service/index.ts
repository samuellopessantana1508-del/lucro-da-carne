import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

const allowedOrigins = new Set([
  "https://lucrodacarne.com.br",
  "https://www.lucrodacarne.com.br",
  "http://localhost:3000",
  "http://localhost:3001",
]);

function getAdminKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const defaultKey = JSON.parse(secretKeys).default as string | undefined;
      if (defaultKey) return defaultKey;
    } catch {
      // Fall through to the legacy service role key.
    }
  }

  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;
  throw new Error("Chave administrativa do Supabase indisponivel.");
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://lucrodacarne.com.br",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    Vary: "Origin",
  };
}

function json(request: Request, body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function isActivePaidSubscription(subscription: {
  plan: string;
  status: string;
  expires_at: string | null;
} | null) {
  if (!subscription || subscription.plan === "gratis" || subscription.status !== "active") {
    return false;
  }

  if (!subscription.expires_at) return true;
  return new Date(subscription.expires_at).getTime() > Date.now();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }

  if (request.method !== "DELETE") {
    return json(request, { error: "method_not_allowed" }, 405);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) return json(request, { error: "unauthorized" }, 401);

  let payload: { confirmationEmail?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: "invalid_json" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return json(request, { error: "server_not_configured" }, 500);

  const admin = createClient(supabaseUrl, getAdminKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData.user;
  if (authError || !user?.email) return json(request, { error: "unauthorized" }, 401);

  const confirmationEmail = typeof payload.confirmationEmail === "string"
    ? payload.confirmationEmail.trim().toLowerCase()
    : "";
  if (confirmationEmail !== user.email.toLowerCase()) {
    return json(request, { error: "email_confirmation_mismatch" }, 422);
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("plan,status,expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subscriptionError) return json(request, { error: "subscription_lookup_failed" }, 500);
  if (isActivePaidSubscription(subscription)) {
    return json(request, { error: "active_subscription_must_be_cancelled" }, 409);
  }

  const { data: billingEvents, error: billingEventsError } = await admin
    .from("billing_events")
    .select("id,payload")
    .eq("user_id", user.id);
  if (billingEventsError) return json(request, { error: "billing_audit_lookup_failed" }, 500);

  for (const event of billingEvents ?? []) {
    const eventPayload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? event.payload as JsonObject
      : {};
    const sanitizedPayload = { ...eventPayload };
    delete sanitizedPayload.customer;
    const { error: scrubError } = await admin
      .from("billing_events")
      .update({ payload: sanitizedPayload })
      .eq("id", event.id);
    if (scrubError) return json(request, { error: "billing_audit_scrub_failed" }, 500);
  }

  const { error: grantByUserError } = await admin
    .from("billing_access_grants")
    .delete()
    .eq("user_id", user.id);
  if (grantByUserError) return json(request, { error: "billing_grant_delete_failed" }, 500);

  const { error: grantByEmailError } = await admin
    .from("billing_access_grants")
    .delete()
    .ilike("email", user.email);
  if (grantByEmailError) return json(request, { error: "billing_grant_delete_failed" }, 500);

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return json(request, { error: "account_delete_failed" }, 500);

  return json(request, { deleted: true });
});
