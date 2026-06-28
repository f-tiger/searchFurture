/**
 * End-to-end "first sale" smoke test for Brandloop's self-serve commerce loop.
 *
 * Provider-aware: tests the Creem webhook by default, and the Stripe webhook too.
 * Drives REAL transactions through the running Worker over HTTP:
 *   forged payment rejected → real provider-signed completed-checkout accepted
 *   → license minted in KV → buyer retrieves it (success-page flow).
 *
 * Local:
 *   1) .dev.vars: CREEM_WEBHOOK_SECRET=whsec_creem_e2e_proof
 *                 STRIPE_WEBHOOK_SECRET=whsec_stripe_e2e_proof
 *   2) npx wrangler dev --port 8787 --local
 *   3) node scripts/e2e-sale.mjs
 *
 * Production (after configuring the real webhook secret):
 *   BASE=https://searchfurture.tuoqiantu.workers.dev \
 *   CREEM_WEBHOOK_SECRET=whsec_live_xxx node scripts/e2e-sale.mjs
 */
import { createHmac } from "node:crypto";

const BASE = process.env.BASE || "http://localhost:8787";
const CREEM_SECRET = process.env.CREEM_WEBHOOK_SECRET || "whsec_creem_e2e_proof";
const STRIPE_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_stripe_e2e_proof";
const line = (s) => console.log(s);
let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; line("  ✓ " + m); } else { fail++; line("  ✗ FAIL: " + m); } };

const hex = (secret, msg) => createHmac("sha256", secret).update(msg).digest("hex");
const stamp = Date.now();

line("\n=== 1. site is live (real Worker, real HTTP) ===");
let r = await fetch(BASE + "/");        check(r.status === 200, `GET / → ${r.status}`);
r = await fetch(BASE + "/pricing/");     check(r.status === 200, `GET /pricing/ → ${r.status}`);
r = await fetch(BASE + "/success/");     check(r.status === 200, `GET /success/ → ${r.status}`);

line("\n=== 2. checkout endpoint wired (provider-dispatched) ===");
r = await fetch(BASE + "/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: "pro" }) });
let j = await r.json();
check(r.status === 200 && "ok" in j, `POST /api/checkout → ok:${j.ok} (${j.error || "url"})`);

/* ---------- CREEM ---------- */
line("\n=== 3. CREEM — forged signature rejected ===");
const creemCheckoutId = "ch_creem_" + stamp;
const creemEvent = {
  eventType: "checkout.completed",
  object: {
    id: creemCheckoutId, request_id: "bl_" + stamp, status: "completed",
    customer: { id: "cust_1", email: "creem.buyer@brandloop-demo.com" },
    order: { id: "ord_creem_" + stamp },
  },
};
const creemBody = JSON.stringify(creemEvent);
r = await fetch(BASE + "/api/creem-webhook", { method: "POST", headers: { "content-type": "application/json", "creem-signature": "deadbeef" }, body: creemBody });
check(r.status === 400, `forged creem-signature → HTTP ${r.status}`);

line("\n=== 4. CREEM — real signed payment → license issued ===");
r = await fetch(BASE + "/api/creem-webhook", { method: "POST", headers: { "content-type": "application/json", "creem-signature": hex(CREEM_SECRET, creemBody) }, body: creemBody });
j = await r.json();
check(r.status === 200 && j.received === true, `valid checkout.completed → received:${j.received}`);

line("\n=== 5. CREEM — buyer retrieves license (by checkout_id AND request_id) ===");
let creemToken = null;
for (let i = 0; i < 5 && !creemToken; i++) { r = await fetch(BASE + "/api/license?ref=" + creemCheckoutId); j = await r.json(); if (j.ok && j.token) creemToken = j.token; }
check(!!creemToken && creemToken.startsWith("BL-"), `GET /api/license?ref=checkout_id → ${creemToken}`);
r = await fetch(BASE + "/api/license?request_id=bl_" + stamp); j = await r.json();
check(j.ok === true && j.token === creemToken, `GET /api/license?request_id → same key (multi-ref mapping works)`);

/* ---------- STRIPE adapter ---------- */
line("\n=== 6. STRIPE adapter — real signed payment → license issued ===");
const sessionId = "cs_stripe_" + stamp;
const stripeEvent = { type: "checkout.session.completed", data: { object: { id: sessionId, customer: "cus_s", customer_details: { email: "stripe.buyer@brandloop-demo.com" } } } };
const stripeBody = JSON.stringify(stripeEvent);
const t = String(Math.floor(Date.now() / 1000));
r = await fetch(BASE + "/api/stripe-webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${hex(STRIPE_SECRET, t + "." + stripeBody)}` }, body: stripeBody });
j = await r.json();
check(r.status === 200 && j.received === true, `valid checkout.session.completed → received:${j.received}`);
let stripeToken = null;
for (let i = 0; i < 5 && !stripeToken; i++) { r = await fetch(BASE + "/api/license?session_id=" + sessionId); j = await r.json(); if (j.ok && j.token) stripeToken = j.token; }
check(!!stripeToken && stripeToken.startsWith("BL-"), `GET /api/license?session_id → ${stripeToken}`);

line(`\n========  ${pass} passed, ${fail} failed  ========`);
if (creemToken) line(`\n💰 First-sale pipeline verified end-to-end (Creem). License: ${creemToken}\n`);
process.exit(fail ? 1 : 0);
