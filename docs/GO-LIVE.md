# Go live — the only steps a human must do (≈5 min, self-verifying)

Everything else is built, tested, and deployed. A real sale legally requires a
KYC'd payment account in your name — that is the one thing code cannot do for
you. These steps reduce that to the irreducible minimum, and each one is
verifiable so you never guess whether it worked.

## 1. Create the Creem account (the only KYC step)
1. Sign up at https://creem.io, complete identity verification (KYC), bind
   **Alipay** as your payout method.
2. Create **one product**: a **monthly subscription**, price **$19/mo**, name
   "Brandloop Pro". Copy its **product id** (`prod_...`).
3. Developers → API Keys → copy your **API key** (`creem_...`).
4. Developers → Webhooks → add endpoint
   `https://searchfurture.tuoqiantu.workers.dev/api/creem-webhook`, subscribe to
   at least `checkout.completed`, `subscription.expired`, `subscription.unpaid`,
   `refund.created`, `dispute.created`. Copy the **webhook secret** (`whsec...`).

## 2. Paste 3 secrets into the Worker (Cloudflare dashboard → Settings → Variables)
Add as **encrypted Secrets** (they survive deploys):
- `CREEM_API_KEY` = `creem_...`
- `CREEM_PRODUCT_ID` = `prod_...`
- `CREEM_WEBHOOK_SECRET` = `whsec...`

Optional but recommended:
- `ANTHROPIC_API_KEY` — turns the free tool from templates into real AI (your best lead magnet).
- `LEAD_WEBHOOK_URL` — get a "💰 SALE" ping the instant someone pays.

## 3. Verify — no guessing
1. **Capability check** (no secrets needed to call):
   open `https://searchfurture.tuoqiantu.workers.dev/api/health`.
   You want `"ready_for_first_sale": true`.
2. **Real pipeline check** (proves a paid webhook actually mints + delivers a key):
   ```bash
   BASE=https://searchfurture.tuoqiantu.workers.dev \
   CREEM_WEBHOOK_SECRET=whsec_your_real_secret \
   node scripts/e2e-sale.mjs        # expect 10/10
   ```
3. **The real first sale**: open `/pricing/`, click **Start Pro**, pay with a
   real card (use Creem test mode first if you prefer — set `CREEM_TEST=1`). You
   should land on `/success/`, see a `BL-…` license key, and the tools unlock.
   That is the first sale, end to end, no human in the loop after the click.

## What runs itself after that (zero involvement)
- **Checkout → license → unlock**: fully automatic on every purchase.
- **Subscription lifecycle**: renewals keep access; expiry/refund/dispute revoke it automatically.
- **SEO indexing**: a daily Cron Trigger pushes every page to IndexNow (Bing/Yandex/…) — new pages get found without you lifting a finger.
- **Lead capture + sale notifications**: stored in KV, optionally pinged to your webhook in real time.

## If Creem rejects your KYC (the one real risk)
The payment layer is provider-pluggable. Switch with one variable:
`PAYMENT_PROVIDER=stripe` (+ `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
endpoint `/api/stripe-webhook`) — no code change. Dodo Payments / Paddle are the
next drop-in slots if needed.
