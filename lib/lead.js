/**
 * Shared waitlist handler — used by the Cloudflare Worker (worker.js).
 * Route: POST /api/lead
 *
 * All capabilities are optional and degrade gracefully (a missing binding
 * never breaks the form):
 *   1. If KV namespace LEADS is bound, the signup is persisted.
 *   2. If env var LEAD_WEBHOOK_URL is set (Feishu / WeCom / Slack bot), a
 *      realtime notification is pushed.
 *   3. Always returns JSON; the frontend shows success accordingly.
 *
 * To enable storage / notifications, in the Cloudflare dashboard for this
 * Worker → Settings:
 *   - Bindings → KV namespace: variable name LEADS
 *   - Variables: LEAD_WEBHOOK_URL = your bot webhook URL
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleLead(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "POST only" }, 405);
  }

  let data = {};
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) data[k] = v;
    }
  } catch (e) {
    return json({ ok: false, error: "could not parse body" }, 400);
  }

  // Honeypot: bots that fill the hidden field get a silent "success".
  if (data["bot-field"]) return json({ ok: true });

  const contact = (data.contact || "").toString().trim(); // email
  if (!contact) return json({ ok: false, error: "email is required" }, 422);

  const lead = {
    email: contact,
    about: (data.company || "").toString(), // "what do you do?"
    role: (data.business || "").toString(), // founder / agency / ...
    pain: (data.scale || "").toString(), // biggest marketing headache
    source: (data.source || "").toString(), // attribution: which channel converted
    ua: request.headers.get("user-agent") || "",
    ip: request.headers.get("cf-connecting-ip") || "",
    ts: new Date().toISOString(),
  };

  // 1) Persist to KV (if bound). Store a compact summary in metadata so the
  //    admin view can list everything in a single call (no per-key reads).
  try {
    if (env.LEADS) {
      await env.LEADS.put("waitlist:" + lead.ts + ":" + contact, JSON.stringify(lead), {
        metadata: { email: contact, role: lead.role, source: lead.source, ts: lead.ts },
      });
    }
  } catch (e) {
    // storage failure must not break the user experience
  }

  // 2) Realtime webhook notification (if configured)
  try {
    if (env.LEAD_WEBHOOK_URL) {
      const text =
        "🆕 Brandloop waitlist signup\nEmail: " + contact +
        "\nAbout: " + lead.about +
        "\nRole: " + lead.role +
        "\nPain: " + lead.pain +
        "\nSource: " + lead.source;
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Feishu custom-bot shape; adjust for WeCom / Slack as needed.
        body: JSON.stringify({ msg_type: "text", content: { text } }),
      });
    }
  } catch (e) {
    // notification failure must not break the user experience
  }

  return json({ ok: true });
}
