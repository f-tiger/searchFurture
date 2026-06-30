/**
 * One-command Creem setup — shrinks the owner's manual dashboard work to near-zero.
 *
 * Once you have a Creem API key (the one thing that needs your KYC'd account), this
 * creates the $19/mo "Brandloop Pro" subscription product via Creem's API and prints
 * the product id to paste as CREEM_PRODUCT_ID. No clicking around the dashboard.
 *
 * Wire shapes verified against the official Creem SDK source (npm `creem_io`):
 *   POST {api|test-api}.creem.io/v1/products  header x-api-key
 *   body { name, description, price(cents), currency, billing_type, billing_period,
 *          tax_mode, tax_category, default_success_url }  → response { id: "prod_..." }
 *
 * Usage:
 *   CREEM_API_KEY=creem_xxx node scripts/setup-creem.mjs            # production
 *   CREEM_API_KEY=creem_test_xxx CREEM_TEST=1 node scripts/setup-creem.mjs   # test mode
 *   PRICE_USD_CENTS=1900 PLAN_NAME="Brandloop Pro" ...             # optional overrides
 */
const API_KEY = process.env.CREEM_API_KEY;
const TEST = !!process.env.CREEM_TEST;
const BASE = TEST ? "https://test-api.creem.io" : "https://api.creem.io";
const SITE = (process.env.PUBLIC_BASE_URL || "https://searchfurture.tuoqiantu.workers.dev").replace(/\/$/, "");
const cents = parseInt(process.env.PRICE_USD_CENTS || "1900", 10) || 1900;
const name = process.env.PLAN_NAME || "Brandloop Pro";

if (!API_KEY) {
  console.error("✗ Set CREEM_API_KEY first (Creem dashboard → Developers → API Keys).");
  console.error("  CREEM_API_KEY=creem_xxx node scripts/setup-creem.mjs");
  process.exit(1);
}

const body = {
  name,
  description: "Unlimited on-brand AI marketing content in your own voice — highest-quality model, every Brandloop tool unlocked.",
  price: cents,
  currency: "USD",
  billing_type: "recurring",
  billing_period: "every-month",
  tax_mode: "inclusive",
  tax_category: "saas",
  default_success_url: SITE + "/success/?provider=creem",
};

console.log(`\nCreating ${TEST ? "TEST " : ""}product "${name}" at $${(cents / 100).toFixed(2)}/mo …`);
try {
  const resp = await fetch(BASE + "/v1/products", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error(`✗ Creem returned ${resp.status}:`, JSON.stringify(data));
    console.error("  Check the API key (and CREEM_TEST if using a test key).");
    process.exit(1);
  }
  const productId = data.id || data.product_id;
  console.log("\n✓ Product created.\n");
  console.log("  CREEM_PRODUCT_ID = " + productId + "\n");
  console.log("Next:");
  console.log("  1. Paste that as CREEM_PRODUCT_ID (Worker → Settings → Variables), plus");
  console.log("     CREEM_API_KEY and CREEM_WEBHOOK_SECRET (encrypted Secrets).");
  console.log("  2. Creem → Developers → Webhooks → add  " + SITE + "/api/creem-webhook");
  console.log("     (events: checkout.completed, subscription.expired/unpaid, refund.created, dispute.created)");
  console.log("  3. Verify:  open " + SITE + "/api/health  → ready_for_first_sale: true\n");
  process.exit(0);
} catch (e) {
  console.error("✗ Request failed:", e.message);
  process.exit(1);
}
