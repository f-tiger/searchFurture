/**
 * Programmatic SEO page generator for Brandloop (automated marketing surface).
 *
 * Emits two families of long-tail, search-intent landing pages — all static,
 * all on-brand ("sounds like you, not like AI"), each with unique copy and
 * internal links into the free tool + pricing/waitlist:
 *
 *   public/for/<audience>/index.html      → "AI marketing for <audience>"
 *   public/content-calendar/<platform>/   → "<Platform> content calendar generator"
 *
 * Re-run anytime to extend coverage:  node scripts/gen-seo.mjs
 * It also rewrites public/sitemap.xml from the canonical page list.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const SITE = "https://searchfurture.tuoqiantu.workers.dev";

/* ---------- data ---------- */
const AUDIENCES = [
  { slug: "consultants", name: "consultants", noun: "consultant",
    pain: "Your clients buy your judgment — but generic AI posts make you sound like every other advisor.",
    promise: "content that carries your point of view and your phrasing, so prospects hear the expert they're about to hire." },
  { slug: "coaches", name: "coaches", noun: "coach",
    pain: "Coaching is personal. The moment your content sounds like a template, trust leaks.",
    promise: "posts that sound like how you actually talk to clients — warm, direct, unmistakably you." },
  { slug: "course-creators", name: "course creators", noun: "course creator",
    pain: "Your audience followed you for your voice. AI-generic captions quietly erode why they subscribed.",
    promise: "a steady drip of on-brand content that builds your launch list without sounding mass-produced." },
  { slug: "solopreneurs", name: "solopreneurs", noun: "solopreneur",
    pain: "You are the brand, the marketer, and the product team — and there's no time to write daily.",
    promise: "a marketing manager that writes in your voice and keeps you visible while you do the real work." },
  { slug: "saas-founders", name: "SaaS founders", noun: "founder",
    pain: "Founder-led content outperforms the company blog — but only if it actually sounds like the founder.",
    promise: "build-in-public posts and launch threads in your voice, not a committee's." },
  { slug: "newsletter-writers", name: "newsletter writers", noun: "writer",
    pain: "Your readers know your cadence. Off-voice social posts feel like a different person wrote them.",
    promise: "social content that matches your newsletter's voice and feeds new subscribers into it." },
  { slug: "creators", name: "creators", noun: "creator",
    pain: "Consistency is the whole game, and burning out on captions is how creators stall.",
    promise: "a content engine that protects your voice while you stay consistent across platforms." },
  { slug: "agencies", name: "agencies", noun: "agency",
    pain: "Every client needs a distinct voice — and generic AI flattens them all into the same mush.",
    promise: "per-client brand voices that stay distinct, so each account sounds like itself at scale." },
];

const PLATFORMS = [
  { slug: "linkedin", name: "LinkedIn", tip: "lead with a strong first line, keep paragraphs short, and end with a question to drive comments." },
  { slug: "twitter", name: "X (Twitter)", tip: "open with a hook tweet, then deliver one idea per line so the thread stays skimmable." },
  { slug: "instagram", name: "Instagram", tip: "design carousels that teach one thing, and put the payoff on the last slide." },
  { slug: "tiktok", name: "TikTok", tip: "hook in the first two seconds and script for retention, not perfection." },
  { slug: "threads", name: "Threads", tip: "be conversational and reply fast — Threads rewards back-and-forth, not broadcasts." },
  { slug: "facebook", name: "Facebook", tip: "write like a person, not a brand, and post when your audience is actually online." },
  { slug: "youtube", name: "YouTube", tip: "earn the click with a clear title and promise, then deliver it in the first 30 seconds." },
  { slug: "newsletter", name: "newsletter", tip: "one idea per send, a subject line worth opening, and a single clear call to action." },
];

/* ---------- shared chrome ---------- */
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%232f5bff'/%3E%3Ctext x='16' y='22' font-size='17' font-family='Arial' font-weight='bold' fill='white' text-anchor='middle'%3E%E2%9F%B3%3C/text%3E%3C/svg%3E";

function head(title, desc, canonical, up) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<link rel="canonical" href="${canonical}" />
<meta name="robots" content="index,follow" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="${SITE}/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${SITE}/og.png" />
<link rel="icon" href="${FAVICON}" />
<link rel="stylesheet" href="${up}assets/css/styles.css" />
</head>
<body>

<header class="nav" id="nav">
  <div class="wrap nav-inner">
    <a href="${up}" class="brand"><span class="logo">⟳</span><span>Brandloop<br><small>AI MARKETING</small></span></a>
    <nav class="nav-links" id="navLinks">
      <a href="${up}#how">How it works</a>
      <a href="${up}tools/">Free tools</a>
      <a href="${up}blog/">Blog</a>
      <a href="${up}pricing/">Pricing</a>
    </nav>
    <div class="nav-cta">
      <a href="${up}pricing/" class="btn btn-primary">Start Pro</a>
      <button class="nav-toggle" id="navToggle" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
`;
}

function foot(up) {
  return `
<footer class="footer">
  <div class="wrap">
    <div class="footer-bottom" style="border-top:0;padding-top:0;">
      <span>© 2026 Brandloop</span>
      <span><a href="${up}">Home</a> · <a href="${up}tools/">Free tools</a> · <a href="${up}pricing/">Pricing</a> · <a href="${up}blog/">Blog</a></span>
    </div>
  </div>
</footer>

<script src="${up}assets/js/nav.js"></script>
</body>
</html>
`;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- audience page ---------- */
function audiencePage(a) {
  const up = "../../";
  const title = `AI marketing for ${a.name} that sounds like you | Brandloop`;
  const desc = `Brandloop is the AI marketing manager for ${a.name}: it learns your real voice and keeps your content sounding like you, not like AI. Plan, write, and stay consistent.`;
  const canonical = `${SITE}/for/${a.slug}/`;
  return head(title, desc, canonical, up) + `
<section class="blog-hero">
  <div class="wrap">
    <span class="eyebrow">For ${a.name}</span>
    <h1>Marketing that sounds like you — built for ${a.name}</h1>
    <p>${a.pain} Brandloop gives you ${a.promise}</p>
    <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;">
      <a href="${up}pricing/" class="btn btn-primary">Start Pro — $19/mo →</a>
      <a href="${up}tools/content-calendar/" class="btn btn-ghost">Try the free tool</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap" style="max-width:820px;">
    <div class="article-body">
      <h2>Why ${a.name} sound generic with most AI tools</h2>
      <p>Most AI writers are trained to be average. They smooth out exactly the things that make a ${a.noun}'s
         content work — your phrasing, your opinions, the specific way you explain things. The result is content
         that's technically fine and completely forgettable. For a ${a.noun} whose reputation <em>is</em> the
         product, sounding like everyone else is the worst possible outcome.</p>

      <h2>What Brandloop does differently</h2>
      <ul>
        <li><strong>Learns your voice.</strong> It studies how you actually write and gets more like you the more you use it — a private voice profile that compounds.</li>
        <li><strong>Plans the whole week.</strong> A ready-to-post calendar across your platforms, each post tied to a proven angle.</li>
        <li><strong>Keeps you consistent.</strong> The hard part isn't one good post — it's showing up every week. Brandloop removes the blank page.</li>
      </ul>

      <h2>Start free, upgrade when it earns it</h2>
      <p>Try the <a href="${up}tools/content-calendar/">free content calendar generator</a> right now — no signup.
         When you want unlimited content on the highest-quality model, <a href="${up}pricing/">Brandloop Pro</a> is
         $19/mo and cancels anytime.</p>
    </div>

    <div class="tool-cta" style="margin-top:30px;">
      <div>
        <h3>Sound like yourself again</h3>
        <p>Give Brandloop your voice once. Get on-brand content every week — without the AI sheen.</p>
      </div>
      <a href="${up}pricing/" class="btn btn-light">Start Pro →</a>
    </div>

    <p style="margin-top:24px;font-size:14px;color:var(--ink-3);">
      More: ${AUDIENCES.filter(x => x.slug !== a.slug).slice(0, 4).map(x => `<a href="${up}for/${x.slug}/" style="color:var(--brand-ink);">for ${x.name}</a>`).join(" · ")}
    </p>
  </div>
</section>
` + foot(up);
}

/* ---------- platform page ---------- */
function platformPage(p) {
  const up = "../../";
  const isNL = p.slug === "newsletter";
  const label = isNL ? "newsletter" : p.name;
  const title = `Free ${p.name} content calendar generator | Brandloop`;
  const desc = `Generate a ready-to-post ${p.name} content calendar in seconds — free, no signup. Pick your topic and get a week of ${p.name} posts with hooks and angles.`;
  const canonical = `${SITE}/content-calendar/${p.slug}/`;
  return head(title, desc, canonical, up) + `
<section class="blog-hero">
  <div class="wrap">
    <span class="eyebrow">Free · no signup</span>
    <h1>${cap(label)} content calendar generator</h1>
    <p>Plan a full week of ${p.name} content in seconds. Describe your business, and get post ideas tied to proven angles — ready to copy or download as CSV.</p>
    <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;">
      <a href="${up}tools/content-calendar/" class="btn btn-primary">Open the generator →</a>
      <a href="${up}pricing/" class="btn btn-ghost">Get unlimited with Pro</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap" style="max-width:820px;">
    <div class="article-body">
      <h2>How to plan ${p.name} content that doesn't sound like AI</h2>
      <p>A calendar solves consistency, but most AI tools solve it by making every post sound identical. The trick for
         ${p.name} is to keep a reliable cadence <em>and</em> your own voice. Use the free generator for the plan and the
         angles, then make each line sound like you. Pro tip for ${p.name}: ${p.tip}</p>

      <h2>Generate your ${p.name} calendar</h2>
      <ol>
        <li>Open the <a href="${up}tools/content-calendar/">free content calendar generator</a>.</li>
        <li>Describe your business in one line and select ${p.name}.</li>
        <li>Generate a week (or several) of post ideas — copy the ones you like or export the lot as CSV.</li>
      </ol>

      <h2>Want it written in your voice, automatically?</h2>
      <p><a href="${up}">Brandloop</a> learns how you write and produces ${p.name} content that sounds like you — not like
         every other AI account. Start with <a href="${up}pricing/">Pro</a> for $19/mo, cancel anytime.</p>
    </div>

    <div class="tool-cta" style="margin-top:30px;">
      <div>
        <h3>Never stare at a blank ${p.name} composer again</h3>
        <p>Get a week of on-brand ${p.name} ideas in seconds, free.</p>
      </div>
      <a href="${up}tools/content-calendar/" class="btn btn-light">Open the tool →</a>
    </div>

    <p style="margin-top:24px;font-size:14px;color:var(--ink-3);">
      Other platforms: ${PLATFORMS.filter(x => x.slug !== p.slug).slice(0, 5).map(x => `<a href="${up}content-calendar/${x.slug}/" style="color:var(--brand-ink);">${x.name}</a>`).join(" · ")}
    </p>
  </div>
</section>
` + foot(up);
}

/* ---------- write ---------- */
function emit(relDir, html) {
  const dir = join(PUB, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  return relDir.replace(/\\/g, "/") + "/";
}

const urls = [];
for (const a of AUDIENCES) urls.push(emit(join("for", a.slug), audiencePage(a)));
for (const p of PLATFORMS) urls.push(emit(join("content-calendar", p.slug), platformPage(p)));

/* ---------- hub pages (index the families) ---------- */
function hub(relDir, up, eyebrow, h1, lede, items) {
  const cards = items.map(i => `      <a class="post-card" href="${i.href}">
        <div class="tagrow"><span class="pill green">${i.tag}</span></div>
        <h3>${i.title}</h3>
        <p>${i.blurb}</p>
        <span class="more">Open →</span>
      </a>`).join("\n");
  const html = head(`${h1} | Brandloop`, lede, `${SITE}/${relDir.replace(/\\/g, "/")}/`, up) + `
<section class="blog-hero"><div class="wrap"><span class="eyebrow">${eyebrow}</span><h1>${h1}</h1><p>${lede}</p></div></section>
<section class="section"><div class="wrap" style="max-width:920px;"><div class="post-grid">
${cards}
    </div></div></section>
` + foot(up);
  emit(relDir, html);
  return relDir.replace(/\\/g, "/") + "/";
}
urls.push(hub("for", "../", "By role", "AI marketing, tuned to who you are",
  "Brandloop learns your voice and keeps your content sounding like you. See how it works for your kind of work.",
  AUDIENCES.map(a => ({ href: `${a.slug}/`, tag: "Use case", title: `For ${a.name}`, blurb: `${a.pain}` }))));
urls.push(hub("content-calendar", "../", "Free generators", "Content calendar generators by platform",
  "Free, no-signup content calendar generators for every platform. Plan a week of posts in seconds.",
  PLATFORMS.map(p => ({ href: `${p.slug}/`, tag: "Free tool", title: `${cap(p.name)} content calendar`, blurb: `Generate a week of ${p.name} post ideas with proven angles — free.` }))));

/* ---------- sitemap ---------- */
const core = [
  ["", "weekly", "1.0"], ["tools/", "monthly", "0.9"],
  ["tools/content-calendar/", "monthly", "0.9"], ["tools/hook-generator/", "monthly", "0.9"],
  ["pricing/", "monthly", "0.9"], ["blog/", "weekly", "0.8"],
  ["blog/content-consistency-solo-founder/", "monthly", "0.7"],
  ["blog/ai-writer-vs-ai-marketing-manager/", "monthly", "0.7"],
  ["blog/content-system-zero-audience/", "monthly", "0.7"],
  ["blog/how-to-make-a-content-calendar/", "monthly", "0.7"],
  ["privacy/", "yearly", "0.3"], ["terms/", "yearly", "0.3"],
];
const all = core.concat(urls.map(u => [u, "monthly", "0.6"]));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(([loc, cf, pr]) => `  <url><loc>${SITE}/${loc}</loc><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync(join(PUB, "sitemap.xml"), sitemap);

console.log(`Generated ${urls.length} SEO pages + rewrote sitemap (${all.length} urls).`);
urls.forEach(u => console.log("  " + SITE + "/" + u));
