/**
 * Autonomous operations for Brandloop (no human, no external account needed).
 *
 *  - handleHealth(env)   GET /api/health — capability/readiness self-check (no secrets leaked).
 *      Lets the owner confirm activation at a glance: after pasting payment + AI keys,
 *      `ready_for_first_sale` flips true. This is the self-verifying activation gate.
 *
 *  - submitIndexNow(env) — runs on a Cloudflare Cron Trigger (see wrangler.toml [triggers]).
 *      Pushes every site URL to IndexNow (Bing, Yandex, Naver, Seznam) so new SEO pages get
 *      indexed automatically, on a schedule, forever, with zero human involvement and zero
 *      account: the key is self-generated and hosted at /<key>.txt on our own domain.
 */

const INDEXNOW_KEY = "f98078789a81d7163d46b0393eb9ea7c";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function siteOf(env, request) {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "https://searchfurture.tuoqiantu.workers.dev";
}

/* ---------------- Health / readiness ---------------- */
export function handleHealth(request, env) {
  const provider = (env.PAYMENT_PROVIDER || "creem").toLowerCase();
  const paymentsConfigured =
    provider === "stripe"
      ? !!env.STRIPE_SECRET_KEY
      : !!(env.CREEM_API_KEY && env.CREEM_PRODUCT_ID);
  const webhookSecretSet =
    provider === "stripe" ? !!env.STRIPE_WEBHOOK_SECRET : !!env.CREEM_WEBHOOK_SECRET;
  const leadsKv = !!env.LEADS;

  // To take a real first sale we need: a configured provider, its webhook secret
  // (so paid webhooks are trusted), and KV (so the license can be minted/stored).
  const readyForFirstSale = paymentsConfigured && webhookSecretSet && leadsKv;

  return json({
    ok: true,
    site: siteOf(env, request),
    capabilities: {
      payments: { provider, configured: paymentsConfigured, webhook_secret_set: webhookSecretSet },
      ai_generation: !!env.ANTHROPIC_API_KEY,
      leads_kv: leadsKv,
      sale_notifications: !!env.LEAD_WEBHOOK_URL,
    },
    ready_for_first_sale: readyForFirstSale,
    next_step: readyForFirstSale
      ? "Live. Run scripts/e2e-sale.mjs against this URL to verify the real pipeline, then make a $1 test purchase."
      : "Set the payment provider keys (+ webhook secret) and bind KV. See CLAUDE.md → 自助计费与许可.",
  });
}

/* ---------------- IndexNow auto-submit (scheduled) ---------------- */
async function siteUrls(env, base) {
  // Read our own sitemap straight from the asset layer (no external round-trip).
  try {
    const resp = await env.ASSETS.fetch(new Request(base + "/sitemap.xml"));
    if (!resp.ok) return [base + "/"];
    const xml = await resp.text();
    const out = [];
    const re = /<loc>([^<]+)<\/loc>/g;
    let m;
    while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
    return out.length ? out : [base + "/"];
  } catch (e) {
    return [base + "/"];
  }
}

export async function submitIndexNow(env) {
  const base = siteOf(env, null);
  const host = new URL(base).host;
  const urlList = await siteUrls(env, base);
  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: base + "/" + INDEXNOW_KEY + ".txt",
    urlList,
  };
  try {
    const resp = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    return { ok: resp.ok, status: resp.status, submitted: urlList.length };
  } catch (e) {
    return { ok: false, error: "exception", submitted: 0 };
  }
}
