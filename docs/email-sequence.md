# Waitlist → customer email sequence (copy-paste ready)

Five short emails that turn a free signup into a Pro customer. Send from any
provider (or paste manually at first). Keep them plain-text and personal — that's
on-brand for a product about *sounding like you*.

The trigger for the whole sequence is a `POST /api/lead` signup (captured in KV).
When `LEAD_WEBHOOK_URL` is set you also get a real-time ping per signup.

---

### Email 1 — instant (welcome + deliver value)
**Subject:** You're in — here's the free tool while you wait
> Thanks for joining Brandloop. Quick promise: I'll only email you when it's useful.
>
> While the full product rolls out, the free content calendar generator is live —
> plan a week of posts in seconds, no signup:
> {SITE}/tools/content-calendar/
>
> Reply and tell me one thing: what do you sell, and where does your marketing
> usually stall? I read every reply.

### Email 2 — day 2 (the wedge: why generic AI fails)
**Subject:** Why your AI content sounds like everyone else's
> Most AI tools optimize for "average." Your voice is the one thing you can't
> afford to average out — it's literally why people buy from *you*.
>
> That's the whole idea behind Brandloop: it learns how you write and gets more
> like you over time. Here's a 2-minute read on the difference:
> {SITE}/blog/ai-writer-vs-ai-marketing-manager/

### Email 3 — day 4 (proof + the consistency problem)
**Subject:** The real reason founders fall off with content
> It's never one good post. It's showing up every week without burning out.
>
> Try this: generate a month of posts in one sitting with the free tool, then keep
> the ones that sound like you. That alone fixes most consistency problems.
> {SITE}/tools/content-calendar/

### Email 4 — day 6 (the offer)
**Subject:** Brandloop Pro is open ($19/mo, cancel anytime)
> If the free tool's been useful, Pro removes the limits: unlimited generations on
> the highest-quality model, every tool unlocked with one license key.
>
> $19/mo, cancel anytime, and you get a key the second you check out:
> {SITE}/pricing/

### Email 5 — day 10 (last nudge + door open)
**Subject:** Closing the loop
> I won't keep nudging — but if "my content sounds like AI" is a problem you want
> gone, Pro is the fastest fix: {SITE}/pricing/
>
> Either way, the free tools stay free. And if there's a feature that would make
> this a yes, just reply — I'm building from real feedback.

---

> Replace `{SITE}` with `https://searchfurture.tuoqiantu.workers.dev` (or the custom domain).
> Cadence is a guide — shorten if signups are warm, lengthen if cold.
