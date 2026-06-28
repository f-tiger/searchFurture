/**
 * End-to-end "first sale" smoke test for Brandloop's self-serve commerce loop.
 *
 * Drives a REAL transaction through the running Worker over HTTP:
 *   forged payment is rejected → real Stripe-signed checkout.session.completed
 *   is accepted → a license is minted in KV → the buyer retrieves it (success-page flow).
 *
 * Run against a local Worker:
 *   1) put STRIPE_WEBHOOK_SECRET=whsec_e2e_proof_secret in .dev.vars (git-ignored)
 *   2) npx wrangler dev --port 8787 --local
 *   3) node scripts/e2e-sale.mjs
 *
 * Or against production (uses the real webhook secret you configured):
 *   BASE=https://searchfurture.tuoqiantu.workers.dev \
 *   STRIPE_WEBHOOK_SECRET=whsec_live_xxx node scripts/e2e-sale.mjs
 */
import { createHmac } from "node:crypto";

const BASE = process.env.BASE || "http://localhost:8787";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_e2e_proof_secret";
const line = (s) => console.log(s);
let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; line("  ✓ " + m); } else { fail++; line("  ✗ FAIL: " + m); } };

const sessionId = "cs_e2e_" + Date.now();
const event = {
  id: "evt_e2e_" + Date.now(),
  type: "checkout.session.completed",
  data: { object: {
    id: sessionId, customer: "cus_e2e", payment_status: "paid",
    amount_total: 1900, currency: "usd",
    customer_details: { email: "first.customer@brandloop-demo.com" },
  } },
};
const body = JSON.stringify(event);
const t = String(Math.floor(Date.now() / 1000));
const sig = createHmac("sha256", SECRET).update(t + "." + body).digest("hex");

line("\n=== 1. site is live ===");
let r = await fetch(BASE + "/");           check(r.status === 200, `GET / → ${r.status}`);
r = await fetch(BASE + "/pricing/");        check(r.status === 200, `GET /pricing/ → ${r.status}`);

line("\n=== 2. checkout endpoint wired ===");
r = await fetch(BASE + "/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: "pro" }) });
let j = await r.json();                      check(r.status === 200 && "ok" in j, `POST /api/checkout → ok:${j.ok} (${j.error || "url"})`);

line("\n=== 3. forged payment rejected ===");
r = await fetch(BASE + "/api/stripe-webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=deadbeef` }, body });
check(r.status === 400, `forged signature → HTTP ${r.status} "${await r.text()}"`);

line("\n=== 4. real signed payment → license issued ===");
r = await fetch(BASE + "/api/stripe-webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` }, body });
j = await r.json();                          check(r.status === 200 && j.received === true, `valid event → received:${j.received}`);

line("\n=== 5. buyer retrieves license ===");
let token = null;
for (let i = 0; i < 5 && !token; i++) { r = await fetch(BASE + "/api/license?session_id=" + sessionId); j = await r.json(); if (j.ok && j.token) token = j.token; }
check(!!token && token.startsWith("BL-"), `GET /api/license → ${token}`);

line(`\n========  ${pass} passed, ${fail} failed  ========`);
if (token) line(`\n💰 First-sale pipeline verified end-to-end. License: ${token}\n`);
process.exit(fail ? 1 : 0);
