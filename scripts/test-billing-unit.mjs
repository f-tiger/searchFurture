/**
 * Unit tests for the billing kernel's subscription lifecycle (mocked KV, no network).
 * Covers the bits the HTTP smoke test (e2e-sale.mjs) can't easily reach:
 *   purchase → license ACTIVE → subscription ends → license REVOKED,
 *   and that a mere "canceled" (still inside the paid period) does NOT revoke.
 *
 * Run:  node scripts/test-billing-unit.mjs
 */
import { handleCreemWebhook, handleStripeWebhook, handleLicense, verifyLicense } from "../lib/billing.js";
import { createHmac } from "node:crypto";

function kv() { const m = new Map(); return { async get(k){ return m.has(k)?m.get(k):null; }, async put(k,v){ m.set(k,v); }, _m:m }; }
const sign = (s, b) => createHmac("sha256", s).update(b).digest("hex");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ FAIL: " + m); } };
const SEC = "whsec_creem_x", SS = "whsec_stripe_x";
const creemReq = (body) => new Request("https://x/api/creem-webhook", { method: "POST", headers: { "creem-signature": sign(SEC, body) }, body });
const stripeReq = (body) => { const t = String(Math.floor(Date.now()/1000)); return new Request("https://x/api/stripe-webhook", { method: "POST", headers: { "stripe-signature": `t=${t},v1=${sign(SS, t + "." + body)}` }, body }); };

console.log("\n=== Creem subscription lifecycle ===");
const LEADS = kv(); const env = { LEADS, CREEM_WEBHOOK_SECRET: SEC };
const subId = "sub_creem_123";
const buy = JSON.stringify({ eventType: "checkout.completed", id: "evt1", object: { id: "ch_1", request_id: "bl_1", status: "completed", customer: { email: "a@b.com" }, order: { id: "ord_1" }, subscription: { id: subId } } });
let r = await handleCreemWebhook(creemReq(buy), env); ok(r.status === 200, "purchase accepted");
r = await handleLicense(new Request("https://x/api/license?ref=ch_1"), env); let j = await r.json();
ok(j.ok && j.token, "license retrievable by checkout_id"); const tok = j.token;
r = await handleLicense(new Request("https://x/api/license?request_id=bl_1"), env); j = await r.json();
ok(j.ok && j.token === tok, "same license by request_id (multi-ref mapping)");
ok(await verifyLicense(env, tok) === true, "license ACTIVE after purchase");
ok(await LEADS.get("sub:" + subId) === tok, "subscription→token map stored");
const exp = JSON.stringify({ eventType: "subscription.expired", id: "evt2", object: { id: subId, object: "subscription", status: "expired" } });
r = await handleCreemWebhook(creemReq(exp), env); ok(r.status === 200, "expire accepted");
ok(await verifyLicense(env, tok) === false, "license REVOKED after subscription.expired");

console.log("\n=== Creem 'canceled' keeps access until period end ===");
const L2 = kv(); const env2 = { LEADS: L2, CREEM_WEBHOOK_SECRET: SEC };
const buy2 = JSON.stringify({ eventType: "checkout.completed", id: "e", object: { id: "ch_2", customer: { email: "c@d.com" }, subscription: { id: "sub_keep" } } });
await handleCreemWebhook(creemReq(buy2), env2);
const tok2 = await L2.get("sub:sub_keep");
const can = JSON.stringify({ eventType: "subscription.canceled", id: "e2", object: { id: "sub_keep", object: "subscription" } });
await handleCreemWebhook(creemReq(can), env2);
ok(await verifyLicense(env2, tok2) === true, "license STAYS active on subscription.canceled");

console.log("\n=== Creem refund/dispute revokes via obj.subscription (not obj.id) ===");
const L4 = kv(); const env4 = { LEADS: L4, CREEM_WEBHOOK_SECRET: SEC };
const buy4 = JSON.stringify({ eventType: "checkout.completed", id: "e4", object: { id: "ch_4", customer: { email: "r@e.com" }, subscription: { id: "sub_refund" } } });
await handleCreemWebhook(creemReq(buy4), env4);
const tok4 = await L4.get("sub:sub_refund");
ok(await verifyLicense(env4, tok4) === true, "license active before refund");
// Refund entity: its own id is a refund id; the subscription is referenced via obj.subscription
const refund = JSON.stringify({ eventType: "refund.created", id: "e5", object: { object: "refund", id: "ref_xyz", subscription: { id: "sub_refund" }, customer: { email: "r@e.com" } } });
await handleCreemWebhook(creemReq(refund), env4);
ok(await verifyLicense(env4, tok4) === false, "license REVOKED after refund.created (resolved via obj.subscription)");

console.log("\n=== License validation endpoint (?token=) ===");
let vr = await handleLicense(new Request("https://x/api/license?token=" + encodeURIComponent(tok)), env); let vj = await vr.json();
ok(vj.ok === true && vj.valid === false, "validate revoked token → valid:false");
vr = await handleLicense(new Request("https://x/api/license?token=BL-NONEXISTENT"), env4); vj = await vr.json();
ok(vj.ok === true && vj.valid === false, "validate unknown token → valid:false");
const buy5 = JSON.stringify({ eventType: "checkout.completed", id: "e6", object: { id: "ch_6", customer: { email: "v@e.com" }, subscription: { id: "sub_valid" } } });
await handleCreemWebhook(creemReq(buy5), env4);
const tok5 = await L4.get("sub:sub_valid");
vr = await handleLicense(new Request("https://x/api/license?token=" + encodeURIComponent(tok5)), env4); vj = await vr.json();
ok(vj.ok === true && vj.valid === true, "validate active token → valid:true");

console.log("\n=== Stripe adapter parity ===");
const L3 = kv(); const e3 = { LEADS: L3, STRIPE_WEBHOOK_SECRET: SS };
const sbuy = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_1", subscription: "sub_stripe_9", customer: "cus_1", customer_details: { email: "s@e.com" } } } });
await handleStripeWebhook(stripeReq(sbuy), e3);
const stok = await L3.get("sub:sub_stripe_9");
ok(await verifyLicense(e3, stok) === true, "stripe license ACTIVE after purchase");
const sdel = JSON.stringify({ type: "customer.subscription.deleted", data: { object: { id: "sub_stripe_9", object: "subscription" } } });
await handleStripeWebhook(stripeReq(sdel), e3);
ok(await verifyLicense(e3, stok) === false, "stripe license REVOKED after subscription.deleted");

console.log(`\n========  ${pass} passed, ${fail} failed  ========\n`);
process.exit(fail ? 1 : 0);
