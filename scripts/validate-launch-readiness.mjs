import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

const checks = [
  [
    "calculator requires an authenticated account",
    read("src/app/calculadora/page.tsx").includes("configured && !user"),
  ],
  [
    "calculator validates subscription expiry",
    read("src/app/calculadora/page.tsx").includes("hasSubscriptionAccess(subscription)"),
  ],
  [
    "cloud mode does not fall back to anonymous local lots",
    read("src/hooks/useLots.ts").includes("requireAuthenticatedCloudUser"),
  ],
  [
    "signup requires legal acceptance",
    read("src/components/AuthModal.tsx").includes("termsAccepted") &&
      read("src/components/AuthModal.tsx").includes("/termos-de-uso"),
  ],
  [
    "password recovery is available",
    read("src/components/AuthModal.tsx").includes('mode === "forgot"') &&
      read("src/hooks/useAuth.tsx").includes("resetPasswordForEmail"),
  ],
  [
    "account data export is available",
    read("src/app/conta/page.tsx").includes("downloadAccountData"),
  ],
  [
    "account deletion validates the user token",
    read("supabase/functions/account-self-service/index.ts").includes("auth.getUser(token)"),
  ],
  [
    "manual paid grants clear expired trial access",
    read("src/app/admin/page.tsx").includes("shouldResetAccessWindow") &&
      read("src/app/admin/page.tsx").includes("updatePayload.billing_cycle") &&
      read("src/app/admin/page.tsx").includes("updatePayload.expires_at = null") &&
      read("supabase/migrations/20260718155408_fix_manual_subscription_access.sql").includes(
        "provider = 'manual'"
      ),
  ],
  [
    "customer subscription refreshes after an admin update",
    read("src/hooks/useAuth.tsx").includes('"postgres_changes"') &&
      read("src/hooks/useAuth.tsx").includes('table: "subscriptions"'),
  ],
  [
    "active paid subscriptions block account deletion",
    read("supabase/functions/account-self-service/index.ts").includes("active_subscription_must_be_cancelled"),
  ],
  [
    "security headers are configured",
    read("next.config.ts").includes("Strict-Transport-Security") &&
      read("next.config.ts").includes("X-Content-Type-Options"),
  ],
  [
    "production monitor runs on deploy and cannot hang indefinitely",
    read(".github/workflows/production-smoke.yml").includes("push:") &&
      read(".github/workflows/production-smoke.yml").includes("--connect-timeout") &&
      read(".github/workflows/production-smoke.yml").includes("--max-time"),
  ],
  [
    "cancellation policy is linked globally",
    read("src/components/SiteFooter.tsx").includes("/cancelamento-e-reembolso") &&
      read("src/app/cancelamento-e-reembolso/page.tsx").includes("R$ 149,90"),
  ],
  [
    "legal documents identify the supplier and data controller",
    read("src/lib/legal-identity.ts").includes("60.144.937/0001-62") &&
      read("src/lib/legal-identity.ts").includes("75910-426") &&
      read("src/app/termos-de-uso/page.tsx").includes("LEGAL_IDENTITY") &&
      read("src/app/politica-de-privacidade/page.tsx").includes("LEGAL_IDENTITY") &&
      read("src/app/cancelamento-e-reembolso/page.tsx").includes("LEGAL_IDENTITY"),
  ],
  [
    "customer-facing plans page does not expose webhook implementation",
    !read("src/app/planos/page.tsx").toLowerCase().includes("webhook"),
  ],
  [
    "legacy one-time checkout is documented as forbidden",
    read("docs/PRODUCTION_LAUNCH.md").includes("PPU38CQE4L8") &&
      read("docs/PRODUCTION_LAUNCH.md").includes("Nao use"),
  ],
];

for (const [name, passed] of checks) {
  assert.equal(passed, true, `Launch readiness check failed: ${name}`);
  console.log(`ok - ${name}`);
}

console.log(`\n${checks.length} launch readiness checks passed.`);
