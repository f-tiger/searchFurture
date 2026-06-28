/**
 * Cloudflare Pages Function — 留资接口
 * 路由：POST /api/lead
 *
 * 能力（全部可选、优雅降级，缺任何绑定都不会让表单报错）：
 *   1. 若绑定了 KV 命名空间 LEADS，则把线索持久化存储；
 *   2. 若设置了环境变量 LEAD_WEBHOOK_URL（飞书 / 企业微信 / Slack 机器人等），
 *      则实时推送一条通知；
 *   3. 始终返回 JSON，前端据此显示成功。
 *
 * 部署后如需启用存储/通知，在 Cloudflare → Pages 项目 → Settings：
 *   - Functions → KV namespace bindings：变量名 LEADS，绑定一个 KV 命名空间
 *   - Environment variables：LEAD_WEBHOOK_URL = 你的机器人 webhook 地址
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

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
    return json({ ok: false, error: "无法解析提交内容" }, 400);
  }

  // 蜜罐：机器人填了隐藏字段则静默"成功"丢弃
  if (data["bot-field"]) return json({ ok: true });

  const contact = (data.contact || "").toString().trim(); // email
  if (!contact) {
    return json({ ok: false, error: "email is required" }, 422);
  }

  const lead = {
    email: contact,
    about: (data.company || "").toString(),   // "what do you do?"
    role: (data.business || "").toString(),    // founder / agency / ...
    pain: (data.scale || "").toString(),       // biggest marketing headache
    ua: request.headers.get("user-agent") || "",
    ip: request.headers.get("cf-connecting-ip") || "",
    ts: new Date().toISOString(),
  };

  // 1) Persist to KV (if bound)
  try {
    if (env.LEADS) {
      await env.LEADS.put("waitlist:" + lead.ts + ":" + contact, JSON.stringify(lead));
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
        "\nPain: " + lead.pain;
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // 飞书自定义机器人格式；企业微信/Slack 可按需调整
        body: JSON.stringify({ msg_type: "text", content: { text } }),
      });
    }
  } catch (e) {
    // 通知失败不影响用户体验
  }

  return json({ ok: true });
}

// 非 POST 方法的友好提示
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ ok: false, error: "仅支持 POST" }, 405);
  }
  return onRequestPost(context);
}
