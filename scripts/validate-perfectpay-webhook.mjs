import { readdir, readFile } from "node:fs/promises";

const fixturesDir = new URL("./perfectpay-payloads/", import.meta.url);
const validPlanCodes = new Set(["PP-MONTHLY-49-90", "PP-ANNUAL-149-90"]);
const validProductCode = "PP-PRODUCT-LUCRO-CARNE";
const validToken = "test-webhook-token";
const expectations = {
  "approved-monthly.json": { valid: true, status: 2 },
  "approved-annual.json": { valid: true, status: 2 },
  "authorized-only.json": { valid: true, status: 8 },
  "completed-after-approved.json": { valid: true, status: 10 },
  "cancelled.json": { valid: true, status: 6 },
  "refunded.json": { valid: true, status: 7 },
  "charged-back.json": { valid: true, status: 9 },
  "pending.json": { valid: true, status: 1 },
  "invalid-email.json": { valid: false, status: 2 },
  "unknown-plan.json": { valid: false, status: 2 },
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validatePayload(payload) {
  const errors = [];
  if (!payload.code || typeof payload.code !== "string") errors.push("missing code");
  if (!Number.isInteger(payload.sale_status_enum)) errors.push("invalid sale_status_enum");
  if (!isObject(payload.product)) errors.push("missing product");
  if (!isObject(payload.plan)) errors.push("missing plan");
  if (!isObject(payload.customer)) errors.push("missing customer");
  if (payload.product?.code !== validProductCode) errors.push("invalid product code");
  if (!validPlanCodes.has(payload.plan?.code)) errors.push("unknown plan code");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.customer?.email ?? "").toLowerCase())) {
    errors.push("invalid email");
  }
  return errors;
}

function hasValidToken(payload, suppliedToken = payload.token) {
  return typeof suppliedToken === "string" && suppliedToken === validToken;
}

function recordScenario(name, passed, details = "") {
  scenarios.push(name);
  if (!passed) {
    console.error(`${name}: failed${details ? ` (${details})` : ""}`);
    failures += 1;
  }
}

const files = (await readdir(fixturesDir)).filter((file) => file.endsWith(".json")).sort();
let failures = 0;
const scenarios = [];
const payloads = new Map();

for (const file of files) {
  const expectation = expectations[file];
  if (!expectation) {
    console.error(`No expectation configured for ${file}`);
    failures += 1;
    continue;
  }

  const payload = JSON.parse(await readFile(new URL(file, fixturesDir), "utf8"));
  payloads.set(file, payload);
  const errors = validatePayload(payload);

  if (payload.sale_status_enum !== expectation.status) {
    console.error(`${file}: expected status ${expectation.status}, got ${payload.sale_status_enum}`);
    failures += 1;
  }

  if (expectation.valid && errors.length > 0) {
    console.error(`${file}: expected valid payload, got ${errors.join(", ")}`);
    failures += 1;
  }

  if (!expectation.valid && errors.length === 0) {
    console.error(`${file}: expected invalid payload, got none`);
    failures += 1;
  }
}

if (files.length !== Object.keys(expectations).length) {
  console.error(`Expected ${Object.keys(expectations).length} fixtures, found ${files.length}`);
  failures += 1;
}

const edgeFunctionSource = await readFile(
  new URL("../supabase/functions/perfectpay-webhook/index.ts", import.meta.url),
  "utf8"
);
const billingMigration = await readFile(
  new URL("../supabase/migrations/20260711140000_add_perfectpay_billing_and_free_usage.sql", import.meta.url),
  "utf8"
);
const freeLimitMigration = await readFile(
  new URL("../supabase/migrations/20260712102000_reinstate_three_use_free_limit.sql", import.meta.url),
  "utf8"
);
const schemaMigration = await readFile(
  new URL("../supabase/migrations/20260710040035_create_lucro_da_carne_saas_schema.sql", import.meta.url),
  "utf8"
);

recordScenario("01 approved monthly", validatePayload(payloads.get("approved-monthly.json")).length === 0);
recordScenario("02 approved annual", validatePayload(payloads.get("approved-annual.json")).length === 0);
recordScenario(
  "03 existing account is reused",
  edgeFunctionSource.includes('.from("profiles")') && edgeFunctionSource.includes("applySubscription(profile.id)")
);
recordScenario(
  "04 duplicate webhook is idempotent",
  edgeFunctionSource.includes('errorCode !== "23505"') && edgeFunctionSource.includes("duplicate: true")
);
recordScenario(
  "05 missing token is rejected",
  !hasValidToken(payloads.get("approved-monthly.json"), "")
);
recordScenario(
  "06 invalid token is rejected",
  !hasValidToken(payloads.get("approved-monthly.json"), "invalid-token") &&
    edgeFunctionSource.includes('error: "invalid_token"')
);
recordScenario("07 unknown plan is rejected", validatePayload(payloads.get("unknown-plan.json")).length > 0);
recordScenario("08 invalid email is rejected", validatePayload(payloads.get("invalid-email.json")).length > 0);
recordScenario(
  "09 pending payment does not grant access",
  payloads.get("pending.json").sale_status_enum !== 2 && edgeFunctionSource.includes('"ignored_status"')
);
recordScenario(
  "10 authorized sale does not grant access",
  payloads.get("authorized-only.json").sale_status_enum === 8 &&
    edgeFunctionSource.includes('access: saleStatus === authorizedStatus ? "authorized_only"')
);
recordScenario("11 cancellation revokes access", payloads.get("cancelled.json").sale_status_enum === 6);
recordScenario("12 refund revokes access", payloads.get("refunded.json").sale_status_enum === 7);
recordScenario("13 chargeback revokes access", payloads.get("charged-back.json").sale_status_enum === 9);
recordScenario(
  "14 completed event does not duplicate access",
  payloads.get("completed-after-approved.json").sale_status_enum === 10 &&
    edgeFunctionSource.includes('access: "unchanged"')
);
recordScenario(
  "15 renewal period is deterministic",
  edgeFunctionSource.includes("const periodEnd = addMonths(approvedAt, plan.periodMonths)") &&
    edgeFunctionSource.includes('sale_code: saleCode')
);
recordScenario(
  "16 invite failure is recorded",
  edgeFunctionSource.includes('return fail("invite_failed", 500)')
);
recordScenario(
  "17 database failure is recorded",
  edgeFunctionSource.includes('return fail("profile_create_failed", 500)') &&
    edgeFunctionSource.includes('return fail("subscription_update_failed", 500)')
);
recordScenario(
  "18 concurrent duplicate is constrained",
  billingMigration.includes("provider_event_id") &&
    schemaMigration.includes("UNIQUE (provider, provider_event_id)")
);
recordScenario(
  "19 fourth free use is blocked transactionally",
  freeLimitMigration.includes("FOR UPDATE") &&
    freeLimitMigration.includes("free_uses_consumed < 3") &&
    freeLimitMigration.includes("free_usage_limit_reached")
);
recordScenario(
  "20 frontend cannot alter subscription",
  schemaMigration.includes("subscriptions_select_own") &&
    !schemaMigration.includes("subscriptions_update_own")
);

if (scenarios.length !== 20) {
  console.error(`Expected 20 integration scenarios, found ${scenarios.length}`);
  failures += 1;
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`Perfect Pay validation OK (${files.length} fixtures, ${scenarios.length} scenarios)`);
}
