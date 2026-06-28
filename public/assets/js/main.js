/* ==========================================================================
   Brandloop — interactions
   - Sample-week content plan generator (illustrative, runs locally)
   - Mobile nav
   - Scroll reveal
   - Waitlist form submit (AJAX → /api/lead, graceful fallback)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Attribution: capture traffic source on landing ---------- */
  // Stores the first-touch source (utm_* / ref / referrer) so we can see which
  // channel a signup actually came from — the key signal when starting from zero.
  function captureSource() {
    try {
      var p = new URLSearchParams(location.search);
      var src = p.get("utm_source") || p.get("ref") || "";
      if (src && !localStorage.getItem("bl_src")) {
        localStorage.setItem(
          "bl_src",
          JSON.stringify({
            src: src,
            medium: p.get("utm_medium") || "",
            campaign: p.get("utm_campaign") || "",
            ref: document.referrer || "",
          })
        );
      }
    } catch (e) {}
  }
  function resolveSource() {
    try {
      var s = JSON.parse(localStorage.getItem("bl_src") || "{}");
      if (s.src) {
        return [s.src, s.medium, s.campaign].filter(Boolean).join("/");
      }
    } catch (e) {}
    return document.referrer || "direct";
  }
  captureSource();

  /* ---------- Sample-week plan generator ---------- */
  var bizInput = document.getElementById("bizInput");
  var genBtn = document.getElementById("genBtn");
  var planOut = document.getElementById("planOut");

  var TEMPLATES = [
    { day: "Mon", platform: "X", kind: "green",
      text: function (b) { return "Hot take: the one thing most people get wrong about " + b + " — and what to do instead. 🧵"; } },
    { day: "Tue", platform: "LinkedIn", kind: "",
      text: function (b) { return "A short story: how a customer used " + b + " to save a week of work. (Problem → turning point → result.)"; } },
    { day: "Wed", platform: "Instagram", kind: "",
      text: function (b) { return "Carousel: 5 signs you need " + b + " — slide-by-slide, swipe to the fix on the last card."; } },
    { day: "Thu", platform: "Newsletter", kind: "green",
      text: function (b) { return "This week's edition: a behind-the-scenes look at building " + b + ", plus one tactic you can steal today."; } },
    { day: "Fri", platform: "X", kind: "",
      text: function (b) { return "Ship-it Friday: a quick win your audience can apply to " + b + " before the weekend. Bookmark-worthy."; } },
  ];

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function generatePlan() {
    if (!planOut) return;
    var raw = (bizInput && bizInput.value ? bizInput.value : "your business").trim();
    if (!raw) raw = "your business";
    var biz = escapeHtml(raw.slice(0, 80));

    planOut.innerHTML = TEMPLATES.map(function (t) {
      return (
        '<div class="plan-item">' +
        '<div class="pday">' + t.day + "</div>" +
        '<div class="pbody">' +
        '<div class="ptext">' + t.text(biz) + "</div>" +
        '<div class="pmeta">' +
        '<span class="pill ' + t.kind + '">' + t.platform + "</span>" +
        '<span class="pill">on-brand</span>' +
        '<span class="pill">auto-scheduled</span>' +
        "</div></div></div>"
      );
    }).join("");
  }

  if (genBtn) genBtn.addEventListener("click", generatePlan);
  if (bizInput) {
    bizInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); generatePlan(); }
    });
  }
  // Render an initial sample on load
  generatePlan();

  /* ---------- Mobile nav ---------- */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Waitlist form ---------- */
  var form = document.getElementById("leadForm");
  var ok = document.getElementById("formOk");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var required = form.querySelectorAll("[required]");
      var valid = true;
      required.forEach(function (f) { if (!f.value.trim()) valid = false; });
      if (!valid) { if (form.reportValidity) form.reportValidity(); return; }

      var honey = form.querySelector('[name="bot-field"]');
      if (honey && honey.value) return;

      var srcField = form.querySelector("#leadSource");
      if (srcField && !srcField.value) srcField.value = resolveSource();

      function showSuccess() {
        form.style.display = "none";
        if (ok) ok.classList.add("show");
      }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Joining…"; }

      var action = (form.getAttribute("action") || "").trim();
      var payload = new FormData(form);

      // AJAX to the Cloudflare Pages Function; any failure degrades gracefully
      // (local static preview has no backend — that's expected).
      if (action && typeof fetch === "function") {
        fetch(action, { method: "POST", body: payload })
          .then(function () { showSuccess(); })
          .catch(function () { showSuccess(); });
      } else {
        showSuccess();
      }
    });
  }
})();
