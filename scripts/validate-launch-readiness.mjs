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
    "active paid subscriptions block account deletion",
    read("supabase/functions/account-self-service/index.ts").includes("active_subscription_must_be_cancelled"),
  ],
  [
    "security headers are configured",
    read("next.config.ts").includes("Strict-Transport-Security") &&
      read("next.config.ts").includes("X-Content-Type-Options"),
  ],
  [
    "cancellation policy is linked globally",
    read("src/components/SiteFooter.tsx").includes("/cancelamento-e-reembolso") &&
      read("src/app/cancelamento-e-reembolso/page.tsx").includes("R$ 149,90"),
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
