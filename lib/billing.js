/**
 * Self-serve billing & licensing for Brandloop (Cloudflare Worker).
 *
 * Pluggable payment layer — one license kernel, swappable providers:
 *   - "creem"  (DEFAULT) — Merchant of Record. Works for China-mainland sellers,
 *                payouts to Alipay, auto-remits global tax. api.creem.io.
 *   - "stripe" — kept as an adapter for when the owner has a US/HK entity.
 *
 * Select with env.PAYMENT_PROVIDER ("creem" | "stripe"); defaults to "creem".
 *
 * Routes (wired in worker.js):
 *   POST /api/checkout        -> create a hosted checkout session, return { url }
 *   POST /api/creem-webhook   -> verify creem-signature, on completed checkout issue a license
 *   POST /api/stripe-webhook  -> verify Stripe signature, on completed checkout issue a license
 *   GET  /api/license?ref=...  (also accepts session_id / checkout_id / request_id)
 *                             -> return the license key minted for that paid session
 *   verifyLicense() is used by /api/generate to lift the free quota.
 *
 * Everything degrades gracefully: with no provider keys, /api/checkout returns
 * { ok:false, error:"billing_disabled" } and the UI falls back to the waitlist.
 *
 * Worker config to go live:
 *   CREEM (default provider):
 *     CREEM_API_KEY        (Secret)   creem_...    — enables billing
 *     CREEM_PRODUCT_ID                prod_...      — the $19/mo product (created once in Creem)
 *     CREEM_WEBHOOK_SECRET (Secret)   whsec...      — verifies webhooks
 *     CREEM_TEST           (optional) "1" to hit test-api.creem.io
 *   STRIPE (only if PAYMENT_PROVIDER=stripe):
 *     STRIPE_SECRET_KEY (Secret), STRIPE_WEBHOOK_SECRET (Secret)
 *   Shared / optional:
 *     PRICE_USD_CENTS (default 1900), PLAN_NAME (default "Brandloop Pro"),
 *     PUBLIC_BASE_URL, LEAD_WEBHOOK_URL (notified on a new paid customer)
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function form(obj) {
  const p = new URLSearchParams();
  for (const k in obj) p.append(k, String(obj[k]));
  return p.toString();
}

function baseUrl(request, env) {
  return (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

/* ---------------- crypto helpers ---------------- */
async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(mac)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------- shared license kernel ---------------- */
function newToken() {
  return "BL-" + crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
}

/**
 * Mint a license for a completed sale and map every id the success page might
 * carry back (so it can look the key up regardless of which param the provider
 * appends to success_url). `refs` is a list of session/checkout/order/request ids.
 */
async function mintLicense(env, { email, refs, plan, provider }) {
  if (!env.LEADS) return null; // no KV → can't persist; surfaced upstream
  const token = newToken();
  const record = {
    token, email: email || "",
    plan: plan || env.PLAN_NAME || "Brandloop Pro",
    provider: provider || "",
    refs: (refs || []).filter(Boolean),
    ts: new Date().toISOString(),
    status: "active",
  };
  await env.LEADS.put("lic:" + token, JSON.stringify(record));
  // 7-day reverse lookups for the success page
  for (const ref of record.refs) {
    await env.LEADS.put("sess:" + ref, token, { expirationTtl: 60 * 60 * 24 * 7 });
  }
  return token;
}

async function notifySale(env, { email, plan, provider }) {
  if (!env.LEAD_WEBHOOK_URL) return;
  try {
    await fetch(env.LEAD_WEBHOOK_URL, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text: "💰 Brandloop SALE (" + (provider || "") + ")\nEmail: " + (email || "—") + "\nPlan: " + (plan || env.PLAN_NAME || "Brandloop Pro") },
      }),
    });
  } catch (e) {}
}

/* ============================================================ *
 *  PROVIDER: Creem (default — Merchant of Record)              *
 * ============================================================ */
const creem = {
  enabled(env) { return !!(env.CREEM_API_KEY && env.CREEM_PRODUCT_ID); },
  apiBase(env) { return env.CREEM_TEST ? "https://test-api.creem.io" : "https://api.creem.io"; },

  async createCheckout(request, env) {
    const root = baseUrl(request, env);
    const requestId = "bl_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const body = {
      product_id: env.CREEM_PRODUCT_ID,
      request_id: requestId,
      // Creem appends checkout_id / order_id / request_id / customer_id as query params.
      success_url: root + "/success/?provider=creem",
    };
    try {
      const resp = await fetch(this.apiBase(env) + "/v1/checkouts", {
        method: "POST",
        headers: { "x-api-key": env.CREEM_API_KEY, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(function () { return {}; });
      const url = data.checkout_url || data.url;
      if (!resp.ok || !url) {
        return json({ ok: false, error: "creem_" + ((data.error && (data.error.code || data.error)) || resp.status) }, 200);
      }
      return json({ ok: true, url: url, id: data.id || requestId });
    } catch (e) {
      return json({ ok: false, error: "exception" }, 200);
    }
  },

  // Verify creem-signature (hex HMAC-SHA256 of the raw body) and parse a completed sale.
  async parseWebhook(raw, headers, env) {
    if (env.CREEM_WEBHOOK_SECRET) {
      const sig = headers.get("creem-signature");
      const expected = await hmacHex(env.CREEM_WEBHOOK_SECRET, raw).catch(function () { return ""; });
      if (!timingSafeEqualHex(expected, sig || "")) return { ok: false, status: 400 };
    }
    let event;
    try { event = JSON.parse(raw); } catch (e) { return { ok: false, status: 400 }; }

    const type = event.eventType || event.type || "";
    if (type !== "checkout.completed") return { ok: true, ignore: true };

    const obj = event.object || event.data || {};
    const cust = obj.customer || {};
    const order = obj.order || {};
    const email = cust.email || obj.customer_email || event.customer_email || "";
    const refs = [obj.id, obj.request_id, obj.checkout_id, order.id, obj.subscription && obj.subscription.id]
      .filter(Boolean);
    return { ok: true, sale: { email, refs } };
  },
};

/* ============================================================ *
 *  PROVIDER: Stripe (adapter — for a US/HK entity)            *
 * ============================================================ */
const stripe = {
  enabled(env) { return !!env.STRIPE_SECRET_KEY; },

  async createCheckout(request, env) {
    const cents = parseInt(env.PRICE_USD_CENTS || "1900", 10) || 1900;
    const planName = env.PLAN_NAME || "Brandloop Pro";
    const root = baseUrl(request, env);
    const body = {
      mode: "subscription",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": cents,
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][product_data][name]": planName,
      success_url: root + "/success/?provider=stripe&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: root + "/pricing/?canceled=1",
      allow_promotion_codes: "true",
      billing_address_collection: "auto",
    };
    try {
      const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" },
        body: form(body),
      });
      const data = await resp.json();
      if (!resp.ok) return json({ ok: false, error: "stripe_" + (data.error && data.error.code || resp.status) }, 200);
      return json({ ok: true, url: data.url, id: data.id });
    } catch (e) {
      return json({ ok: false, error: "exception" }, 200);
    }
  },

  async parseWebhook(raw, headers, env) {
    if (env.STRIPE_WEBHOOK_SECRET) {
      const sigHeader = headers.get("stripe-signature") || "";
      const parts = {};
      sigHeader.split(",").forEach(function (kv) {
        const i = kv.indexOf("=");
        if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
      });
      if (!parts.t || !parts.v1) return { ok: false, status: 400 };
      const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, parts.t + "." + raw).catch(function () { return ""; });
      if (!timingSafeEqualHex(expected, parts.v1)) return { ok: false, status: 400 };
    }
    let event;
    try { event = JSON.parse(raw); } catch (e) { return { ok: false, status: 400 }; }
    if (event.type !== "checkout.session.completed") return { ok: true, ignore: true };
    const session = (event.data && event.data.object) ? event.data.object : {};
    const email = (session.customer_details && session.customer_details.email) || session.customer_email || "";
    const refs = [session.id, session.subscription, session.customer].filter(Boolean);
    return { ok: true, sale: { email, refs } };
  },
};

const PROVIDERS = { creem, stripe };
function getProvider(env) {
  const name = (env.PAYMENT_PROVIDER || "creem").toLowerCase();
  return { name, impl: PROVIDERS[name] || creem };
}

/* ---------------- Checkout (provider-dispatched) ---------------- */
export async function handleCheckout(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  const { impl } = getProvider(env);
  if (!impl.enabled(env)) return json({ ok: false, error: "billing_disabled" }, 200);
  return impl.createCheckout(request, env);
}

/* ---------------- Webhooks ---------------- */
async function runWebhook(impl, providerName, request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  const raw = await request.text();
  const parsed = await impl.parseWebhook(raw, request.headers, env);
  if (!parsed.ok) return new Response("bad signature", { status: parsed.status || 400 });
  if (parsed.ignore || !parsed.sale) return json({ received: true });

  const plan = env.PLAN_NAME || "Brandloop Pro";
  try {
    await mintLicense(env, { email: parsed.sale.email, refs: parsed.sale.refs, plan, provider: providerName });
  } catch (e) {}
  await notifySale(env, { email: parsed.sale.email, plan, provider: providerName });
  return json({ received: true });
}

export async function handleCreemWebhook(request, env) {
  return runWebhook(creem, "creem", request, env);
}
export async function handleStripeWebhook(request, env) {
  return runWebhook(stripe, "stripe", request, env);
}

/* ---------------- License retrieval (success page) ---------------- */
export async function handleLicense(request, env) {
  const url = new URL(request.url);
  const ref =
    url.searchParams.get("ref") ||
    url.searchParams.get("session_id") ||
    url.searchParams.get("checkout_id") ||
    url.searchParams.get("request_id") ||
    url.searchParams.get("order_id") || "";
  if (!ref) return json({ ok: false, error: "missing_session" }, 400);
  if (!env.LEADS) return json({ ok: false, error: "store_unavailable" }, 200);
  try {
    const token = await env.LEADS.get("sess:" + ref);
    if (!token) return json({ ok: false, error: "pending" }, 200); // webhook may not have landed yet
    return json({ ok: true, token: token });
  } catch (e) {
    return json({ ok: false, error: "exception" }, 200);
  }
}

/* ---------------- License check (used by /api/generate) ---------------- */
export async function verifyLicense(env, token) {
  if (!token || !env.LEADS) return false;
  try {
    const raw = await env.LEADS.get("lic:" + String(token).trim());
    if (!raw) return false;
    const rec = JSON.parse(raw);
    return rec && rec.status === "active";
  } catch (e) {
    return false;
  }
}
