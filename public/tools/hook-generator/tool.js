/* ==========================================================================
   Brandloop — Free Hook Generator
   Builds scroll-stopping opening lines from proven hook formulas (local).
   ========================================================================== */
(function () {
  "use strict";

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function low(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // {t} = topic as-is, {T} = capitalized, {l} = lowercased-first
  var FORMULAS = [
    { tag: "Curiosity gap", t: "Nobody tells you the truth about {l}. So I will." },
    { tag: "Bold claim", t: "{T} is way easier than everyone makes it look. Here's the proof." },
    { tag: "Mistake", t: "I wasted months on {l} before I figured out this one thing." },
    { tag: "Number", t: "We tried 7 ways to handle {l}. Only one actually worked." },
    { tag: "Question", t: "What if {l} only took you one focused afternoon?" },
    { tag: "Contrarian", t: "Unpopular opinion: most advice about {l} is quietly wrong." },
    { tag: "Story", t: "6 months ago, {l} was a mess for us. Today it's an edge. The turning point:" },
    { tag: "How-to", t: "How to approach {l} — the version no one bothers to explain." },
    { tag: "Listicle", t: "5 things I wish someone told me about {l} sooner." },
    { tag: "Before/after", t: "{T}: here's the exact before and after, no filter." },
    { tag: "Urgency", t: "If you're still struggling with {l}, read this before your competitors do." },
    { tag: "Relatable pain", t: "Raise your hand if {l} quietly keeps you up at night. 🙋" },
    { tag: "Authority", t: "After 100+ reps at {l}, here's the only part that actually matters." },
    { tag: "Pattern interrupt", t: "Stop doing {l} the way you were taught. It's costing you more than you think." },
    { tag: "Reveal", t: "The {l} playbook I almost didn't share — steal it:" },
  ];

  function platformTweak(text, platform) {
    if (platform === "Newsletter") {
      // subject-line style: trim trailing colon, drop emoji
      return text.replace(/[🙋]/g, "").replace(/[:.]\s*$/, "").trim();
    }
    if (platform === "TikTok") {
      return "POV: " + low(text);
    }
    return text;
  }

  var last = [];

  function build(formula, topic, platform) {
    var t = formula.t
      .replace(/\{T\}/g, cap(topic))
      .replace(/\{l\}/g, low(topic))
      .replace(/\{t\}/g, topic);
    return platformTweak(t, platform);
  }

  function generate() {
    var topic = (document.getElementById("topic").value || "your topic").trim() || "your topic";
    var platform = document.getElementById("platform").value;
    var picks = shuffle(FORMULAS).slice(0, 12);
    last = picks.map(function (f) { return { tag: f.tag, text: build(f, topic, platform) }; });

    var out = document.getElementById("hooksOut");
    out.innerHTML = last.map(function (h, i) {
      return (
        '<div class="hook-card">' +
        '<div class="num">' + (i + 1) + "</div>" +
        '<div class="body">' +
        '<div class="htxt">' + esc(h.text) + "</div>" +
        '<div class="hmeta"><span class="pill green">' + esc(h.tag) + "</span>" +
        '<button class="copy" type="button" data-c="' + esc(h.text) + '">Copy</button></div>' +
        "</div></div>"
      );
    }).join("");

    document.getElementById("toolActions").style.display = "flex";
    document.getElementById("toolCta").style.display = "flex";

    out.querySelectorAll(".copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn.getAttribute("data-c"));
        var o = btn.textContent; btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = o; }, 1200);
      });
    });
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(function () {});
    } else {
      var ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  var gen = document.getElementById("genBtn");
  if (gen) gen.addEventListener("click", generate);
  var regen = document.getElementById("regenBtn");
  if (regen) regen.addEventListener("click", generate);
  var copyAll = document.getElementById("copyBtn");
  if (copyAll) copyAll.addEventListener("click", function () {
    copyText(last.map(function (h, i) { return (i + 1) + ". " + h.text; }).join("\n"));
    var o = copyAll.textContent; copyAll.textContent = "Copied!";
    setTimeout(function () { copyAll.textContent = o; }, 1200);
  });

  // mobile nav
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  generate();
})();
