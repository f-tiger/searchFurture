/**
 * Protected admin view of waitlist signups.
 * Route: GET /api/leads?token=<ADMIN_TOKEN>[&format=json]
 *
 * Set an `ADMIN_TOKEN` variable in the Worker's settings, then open:
 *   https://<your-worker>/api/leads?token=YOUR_TOKEN
 * Reads signups from KV (binding LEADS) using list metadata — one call, no per-key reads.
 */

function page(body, status) {
  return new Response(
    "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
      "<title>Brandloop · waitlist</title>" +
      "<style>body{font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:#f6f8fc;color:#0c1633}" +
      ".w{max-width:860px;margin:0 auto;padding:32px 20px}h1{font-size:22px;margin:0 0 6px}" +
      ".muted{color:#6b7793;font-size:13px;margin:0 0 20px}" +
      "table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3e9f4;border-radius:12px;overflow:hidden}" +
      "th,td{text-align:left;padding:10px 12px;font-size:13px;border-bottom:1px solid #eef2fb;vertical-align:top}" +
      "th{background:#f6f8fc;font-weight:700;color:#3a4664}tr:last-child td{border-bottom:0}" +
      ".pill{display:inline-block;background:#eef2fb;color:#1b3bd1;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600}" +
      ".empty{background:#fff;border:1px solid #e3e9f4;border-radius:12px;padding:30px;text-align:center;color:#6b7793}" +
      "code{background:#eef2fb;padding:2px 6px;border-radius:5px}</style>" +
      "<div class=w>" + body + "</div>",
    { status: status || 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

export async function handleLeadsAdmin(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";

  if (!env.ADMIN_TOKEN) {
    return page(
      "<h1>Admin not configured</h1><p class=muted>Add an <code>ADMIN_TOKEN</code> variable in the Worker's " +
        "Settings → Variables, then open <code>/api/leads?token=YOUR_TOKEN</code>.</p>",
      403
    );
  }
  if (token !== env.ADMIN_TOKEN) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!env.LEADS) {
    return page("<h1>Waitlist</h1><p class=muted>KV namespace <code>LEADS</code> is not bound yet.</p>", 200);
  }

  // Gather all signups via list metadata (single pass, paginated).
  const items = [];
  let cursor;
  do {
    const res = await env.LEADS.list({ prefix: "waitlist:", limit: 1000, cursor: cursor });
    res.keys.forEach(function (k) {
      const m = k.metadata || {};
      // Fallback: parse "waitlist:<ts>:<email>" from the key name.
      let ts = m.ts, email = m.email;
      if (!email || !ts) {
        const parts = k.name.split(":");
        ts = ts || parts[1];
        email = email || parts.slice(2).join(":");
      }
      items.push({ ts: ts || "", email: email || "", role: m.role || "", source: m.source || "" });
    });
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);

  items.sort(function (a, b) { return (b.ts || "").localeCompare(a.ts || ""); });

  if (url.searchParams.get("format") === "json") {
    return new Response(JSON.stringify({ count: items.length, leads: items }, null, 2), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  if (url.searchParams.get("format") === "csv") {
    const rows = [["ts", "email", "role", "source"]].concat(
      items.map(function (it) { return [it.ts, it.email, it.role, it.source]; })
    );
    const csv = rows
      .map(function (r) { return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(","); })
      .join("\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="brandloop-waitlist.csv"',
      },
    });
  }

  if (!items.length) {
    return page("<h1>Waitlist</h1><div class=empty>No signups yet. Share your link and check back.</div>");
  }

  const rows = items
    .map(function (it) {
      return (
        "<tr><td>" + esc((it.ts || "").replace("T", " ").slice(0, 16)) + "</td>" +
        "<td><b>" + esc(it.email) + "</b></td>" +
        "<td>" + esc(it.role) + "</td>" +
        "<td>" + (it.source ? "<span class=pill>" + esc(it.source) + "</span>" : "—") + "</td></tr>"
      );
    })
    .join("");

  return page(
    "<h1>Waitlist · " + items.length + " signup" + (items.length === 1 ? "" : "s") + "</h1>" +
      "<p class=muted>Most recent first · <a href='?token=" + esc(token) + "&format=csv'>Download CSV</a> · <a href='?token=" + esc(token) + "&format=json'>JSON</a></p>" +
      "<table><tr><th>When (UTC)</th><th>Email</th><th>Role</th><th>Source</th></tr>" + rows + "</table>"
  );
}
