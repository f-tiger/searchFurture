/**
 * Self-serve billing & licensing for Brandloop (Cloudflare Worker).
 *
 * Routes (wired in worker.js):
 *   POST /api/checkout        -> create a Stripe Checkout Session, return { url }
 *   POST /api/stripe-webhook  -> verify signature, on completed checkout issue a license
 *   GET  /api/license?session_id=... -> return the license key minted for that paid session
 *   (verifyLicense is used by /api/generate to lift the free quota)
 *
 * Everything degrades gracefully:
 *   - No STRIPE_SECRET_KEY  -> /api/checkout returns { ok:false, error:"billing_disabled" }
 *     and the UI falls back to the waitlist.
 *   - No KV (LEADS)         -> licenses can't persist; checkout still works but access
 *     can't be granted (surfaced as an error) — so KV should stay bound.
 *
 * Required Worker config to go live (set by the owner):
 *   STRIPE_SECRET_KEY      (Secret)   sk_live_... / sk_test_...
 *   STRIPE_WEBHOOK_SECRET  (Secret)   whsec_...   (from the Stripe webhook endpoint)
 * Optional:
 *   PRICE_USD_CENTS  (default 1900)   monthly price in cents
 *   PLAN_NAME        (default "Brandloop Pro")
 *   PUBLIC_BASE_URL  (default request origin) used for success/cancel redirects
 *   LEAD_WEBHOOK_URL                  notified on a new paid customer
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function form(obj) {
  // Stripe wants application/x-www-form-urlencoded with bracket nesting.
  const p = new URLSearchParams();
  for (const k in obj) p.append(k, String(obj[k]));
  return p.toString();
}

function baseUrl(request, env) {
  return (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

/* ---------------- Checkout ---------------- */
export async function handleCheckout(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, error: "billing_disabled" }, 200);

  const cents = parseInt(env.PRICE_USD_CENTS || "1900", 10) || 1900;
  const planName = env.PLAN_NAME || "Brandloop Pro";
  const root = baseUrl(request, env);

  // Inline price_data → owner doesn't need to pre-create a product in Stripe.
  const body = {
    mode: "subscription",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": cents,
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": planName,
    success_url: root + "/success/?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: root + "/pricing/?canceled=1",
    allow_promotion_codes: "true",
    billing_address_collection: "auto",
  };

  try {
    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.STRIPE_SECRET_KEY,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form(body),
    });
    const data = await resp.json();
    if (!resp.ok) return json({ ok: false, error: "stripe_" + (data.error && data.error.code || resp.status) }, 200);
    return json({ ok: true, url: data.url, id: data.id });
  } catch (e) {
    return json({ ok: false, error: "exception" }, 200);
  }
}

/* ---------------- Webhook signature verify ---------------- */
async function verifyStripeSignature(rawBody, sigHeader, secret) {
  // Stripe-Signature: t=timestamp,v1=signature(hex of HMAC-SHA256 over `${t}.${body}`)
  if (!sigHeader) return false;
  const parts = {};
  sigHeader.split(",").forEach(function (kv) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });
  if (!parts.t || !parts.v1) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(parts.t + "." + rawBody));
  const hex = Array.from(new Uint8Array(mac)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  // constant-time-ish compare
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

/* ---------------- Webhook handler ---------------- */
export async function handleStripeWebhook(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (env.STRIPE_WEBHOOK_SECRET) {
    const ok = await verifyStripeSignature(raw, sig, env.STRIPE_WEBHOOK_SECRET).catch(function () { return false; });
    if (!ok) return new Response("bad signature", { status: 400 });
  }

  let event;
  try { event = JSON.parse(raw); } catch (e) { return new Response("bad json", { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const session = event.data && event.data.object ? event.data.object : {};
    const email = (session.customer_details && session.customer_details.email) || session.customer_email || "";
    try {
      if (env.LEADS) {
        const token = "BL-" + crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
        const record = {
          token: token,
          email: email,
          plan: env.PLAN_NAME || "Brandloop Pro",
          stripe_session: session.id || "",
          stripe_customer: session.customer || "",
          ts: new Date().toISOString(),
          status: "active",
        };
        await env.LEADS.put("lic:" + token, JSON.stringify(record));
        if (session.id) await env.LEADS.put("sess:" + session.id, token, { expirationTtl: 60 * 60 * 24 * 7 });
      }
    } catch (e) {}

    // Notify owner of the sale (optional)
    try {
      if (env.LEAD_WEBHOOK_URL) {
        await fetch(env.LEAD_WEBHOOK_URL, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ msg_type: "text", content: { text: "💰 Brandloop SALE\nEmail: " + email + "\nPlan: " + (env.PLAN_NAME || "Brandloop Pro") } }),
        });
      }
    } catch (e) {}
  }

  return json({ received: true });
}

/* ---------------- License retrieval (success page) ---------------- */
export async function handleLicense(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") || "";
  if (!sessionId) return json({ ok: false, error: "missing_session" }, 400);
  if (!env.LEADS) return json({ ok: false, error: "store_unavailable" }, 200);
  try {
    const token = await env.LEADS.get("sess:" + sessionId);
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
