/* ==========================================================================
   Brandloop — self-serve checkout
   Any element with [data-checkout] starts a hosted checkout session via
   POST /api/checkout and redirects to the payment provider (Creem by default,
   Stripe optional). If billing isn't configured yet (billing_disabled) or
   anything fails, it degrades gracefully to the waitlist so the funnel never
   dead-ends.
   ========================================================================== */
(function () {
  "use strict";

  function waitlistFallback(el) {
    // Prefer an on-page waitlist anchor; otherwise go to the homepage one.
    var onPage = document.getElementById("waitlist");
    if (onPage) { location.hash = "#waitlist"; return; }
    var home = el && el.getAttribute("data-fallback");
    location.href = home || "/#waitlist";
  }

  function startCheckout(el) {
    var plan = (el.getAttribute("data-plan") || "pro").trim();
    var old = el.textContent;
    el.setAttribute("aria-busy", "true");
    el.textContent = "Redirecting…";
    if (el.disabled !== undefined) el.disabled = true;

    fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: plan }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.url) {
          location.href = data.url; // → hosted checkout (Creem / Stripe)
          return;
        }
        // billing_disabled or upstream error → soft-land on the waitlist.
        waitlistFallback(el);
      })
      .catch(function () { waitlistFallback(el); })
      .then(function () {
        el.removeAttribute("aria-busy");
        el.textContent = old;
        if (el.disabled !== undefined) el.disabled = false;
      });
  }

  document.querySelectorAll("[data-checkout]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      startCheckout(el);
    });
  });
})();
