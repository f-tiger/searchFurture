/**
 * Brandloop — Cloudflare Worker (Workers + Static Assets)
 *
 * - Serves the static site from ./public via the ASSETS binding.
 * - Handles the waitlist API at POST /api/lead.
 *
 * Static assets take precedence for matching paths (e.g. "/", "/assets/..."),
 * so this fetch handler effectively runs for non-asset routes like /api/lead.
 */
import { handleLead } from "./lib/lead.js";
import { handleLeadsAdmin } from "./lib/admin.js";
import { handleGenerate } from "./lib/generate.js";
import { handleCheckout, handleCreemWebhook, handleStripeWebhook, handleLicense } from "./lib/billing.js";
import { handleHealth, submitIndexNow } from "./lib/ops.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead") {
      return handleLead(request, env);
    }
    if (url.pathname === "/api/leads") {
      return handleLeadsAdmin(request, env);
    }
    if (url.pathname === "/api/generate") {
      return handleGenerate(request, env);
    }
    if (url.pathname === "/api/checkout") {
      return handleCheckout(request, env);
    }
    if (url.pathname === "/api/creem-webhook") {
      return handleCreemWebhook(request, env);
    }
    if (url.pathname === "/api/stripe-webhook") {
      return handleStripeWebhook(request, env);
    }
    if (url.pathname === "/api/license") {
      return handleLicense(request, env);
    }
    if (url.pathname === "/api/health") {
      return handleHealth(request, env);
    }

    // Fallback to static assets (returns the asset, or a 404 from the asset layer).
    return env.ASSETS.fetch(request);
  },

  // Cloudflare Cron Trigger — autonomous SEO ops: push all URLs to IndexNow so new
  // pages get indexed on a schedule with zero human involvement. (See wrangler.toml.)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(submitIndexNow(env));
  },
};
