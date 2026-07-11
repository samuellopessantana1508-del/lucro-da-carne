import { readdir, readFile } from "node:fs/promises";

const fixturesDir = new URL("./perfectpay-payloads/", import.meta.url);
const validPlanCodes = new Set(["PP-MONTHLY-49-90", "PP-ANNUAL-149-90"]);
const validProductCode = "PP-PRODUCT-LUCRO-CARNE";
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

const files = (await readdir(fixturesDir)).filter((file) => file.endsWith(".json")).sort();
let failures = 0;

for (const file of files) {
  const expectation = expectations[file];
  if (!expectation) {
    console.error(`No expectation configured for ${file}`);
    failures += 1;
    continue;
  }

  const payload = JSON.parse(await readFile(new URL(file, fixturesDir), "utf8"));
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

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`Perfect Pay payload fixtures OK (${files.length})`);
}
