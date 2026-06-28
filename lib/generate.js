/**
 * AI content-plan generation via the Anthropic Messages API.
 * Route: POST /api/generate   body: { biz, platforms[], count, tone }
 *
 * Enable by setting ANTHROPIC_API_KEY (encrypted Secret) in the Worker.
 * Optional:
 *   - GEN_MODEL   (default "claude-haiku-4-5" — a public, per-call-billed tool,
 *                  so the default favors cost; set "claude-opus-4-8" for higher quality)
 *   - GEN_DAILY_LIMIT  per-IP/day cap (default 8) — abuse/cost guard, needs KV LEADS bound
 *
 * Degrades gracefully: if the key is absent, the request is rate-limited, or the
 * upstream call fails, returns ok:false and the frontend falls back to local templates.
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function rateLimited(env, ip) {
  if (!env.LEADS || !ip) return false; // no store / no ip → can't limit, allow
  const limit = parseInt(env.GEN_DAILY_LIMIT || "8", 10) || 8;
  const day = new Date().toISOString().slice(0, 10);
  const key = "rl:gen:" + day + ":" + ip;
  let n = 0;
  try { n = parseInt((await env.LEADS.get(key)) || "0", 10) || 0; } catch (e) {}
  if (n >= limit) return true;
  try { await env.LEADS.put(key, String(n + 1), { expirationTtl: 60 * 60 * 26 }); } catch (e) {}
  return false;
}

export async function handleGenerate(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!env.ANTHROPIC_API_KEY) return json({ ok: false, error: "ai_disabled" }, 200);

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (await rateLimited(env, ip)) return json({ ok: false, error: "rate_limited" }, 200);

  let body = {};
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: "bad_body" }, 400); }

  const biz = String(body.biz || "").trim().slice(0, 120) || "a small business";
  const platforms = Array.isArray(body.platforms) && body.platforms.length
    ? body.platforms.slice(0, 6).map(function (p) { return String(p).slice(0, 24); })
    : ["X", "LinkedIn", "Instagram"];
  const count = Math.max(1, Math.min(parseInt(body.count, 10) || 5, 14));
  const tone = String(body.tone || "practical").slice(0, 20);

  const prompt =
    "You are a sharp social media strategist. Create a content plan of exactly " + count +
    " posts for this business: \"" + biz + "\".\n" +
    "Platforms to use (rotate across them): " + platforms.join(", ") + ".\n" +
    "Tone: " + tone + ".\n" +
    "Vary the angles across posts (e.g. hot take, how-to, customer story, quick tip, myth-busting, behind the scenes, question, proof). " +
    "For each post return: day (Mon–Sun), platform (one of the provided), angle (2–4 words), and text " +
    "(a ready-to-post hook or idea, 1–2 sentences, written in the requested tone, specific to the business — no placeholders).";

  const schema = {
    type: "object",
    properties: {
      posts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "string" },
            platform: { type: "string" },
            angle: { type: "string" },
            text: { type: "string" },
          },
          required: ["day", "platform", "angle", "text"],
          additionalProperties: false,
        },
      },
    },
    required: ["posts"],
    additionalProperties: false,
  };

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.GEN_MODEL || "claude-haiku-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: { type: "json_schema", schema: schema } },
      }),
    });

    if (!resp.ok) {
      return json({ ok: false, error: "upstream_" + resp.status }, 200);
    }
    const data = await resp.json();
    if (data.stop_reason === "refusal") return json({ ok: false, error: "refused" }, 200);

    const textBlock = (data.content || []).find(function (b) { return b.type === "text"; });
    if (!textBlock) return json({ ok: false, error: "no_content" }, 200);

    let parsed;
    try { parsed = JSON.parse(textBlock.text); } catch (e) { return json({ ok: false, error: "parse" }, 200); }
    const posts = Array.isArray(parsed.posts) ? parsed.posts.slice(0, count) : [];
    if (!posts.length) return json({ ok: false, error: "empty" }, 200);

    return json({ ok: true, posts: posts });
  } catch (e) {
    return json({ ok: false, error: "exception" }, 200);
  }
}
