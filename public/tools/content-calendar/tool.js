/* ==========================================================================
   Brandloop — Free Content Calendar Generator
   - Instant local generator (proven content angles), always available offline.
   - Optional "Generate with AI": calls /api/generate (Claude) when the site
     owner has set an ANTHROPIC_API_KEY; falls back to local on any failure.
   ========================================================================== */
(function () {
  "use strict";

  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* ---------- License (Pro) ---------- */
  function getLicense() {
    try { return (localStorage.getItem("bl_license") || "").trim(); } catch (e) { return ""; }
  }
  function setLicense(v) {
    try { if (v) localStorage.setItem("bl_license", v); } catch (e) {}
  }
  function show(el, on) { if (el) el.style.display = on ? (el.tagName === "DIV" ? "block" : "block") : "none"; }
  function reflectProState() {
    var badge = document.getElementById("proBadge");
    if (getLicense()) {
      if (badge) badge.style.display = "block";
      var pw = document.getElementById("paywall"); if (pw) pw.style.display = "none";
    }
  }

  var FORMAT = {
    "X": "Thread", "LinkedIn": "Story post", "Instagram": "Carousel",
    "Newsletter": "Deep-dive", "TikTok/Reels": "Short video", "Facebook": "Post",
  };

  var ANGLES = [
    { name: "Hot take", make: function (b) { return "A contrarian take on " + b + " that most people get wrong — and what to do instead."; } },
    { name: "How-to", make: function (b) { return "Step-by-step: how to get your first real result with " + b + " this week."; } },
    { name: "Listicle", make: function (b) { return "5 mistakes people make with " + b + " (and the quick fix for each)."; } },
    { name: "Customer story", make: function (b) { return "A short before/after story of someone who used " + b + " to solve a painful problem."; } },
    { name: "Behind the scenes", make: function (b) { return "Pull back the curtain on how " + b + " actually works behind the scenes."; } },
    { name: "Myth-busting", make: function (b) { return "Bust a common myth your audience believes about " + b + "."; } },
    { name: "Question / poll", make: function (b) { return "Ask your audience the one question they're secretly stuck on regarding " + b + "."; } },
    { name: "Comparison", make: function (b) { return "\"" + cap(b) + " vs the old way\" — the honest trade-offs, no hype."; } },
    { name: "Quick tip", make: function (b) { return "One 30-second tip that makes " + b + " noticeably easier today."; } },
    { name: "Mini case study", make: function (b) { return "Break down a real example: the problem, what changed, and the result with " + b + "."; } },
    { name: "Founder lesson", make: function (b) { return "A lesson you learned the hard way while building " + b + "."; } },
    { name: "FAQ / objection", make: function (b) { return "Answer the #1 objection people have before trying " + b + "."; } },
    { name: "Checklist", make: function (b) { return "A copy-paste checklist your audience can use for " + b + " right now."; } },
    { name: "Trend tie-in", make: function (b) { return "Tie " + b + " to a trend everyone in your niche is talking about this week."; } },
    { name: "Result / proof", make: function (b) { return "Share a concrete number or proof point that shows " + b + " works."; } },
  ];

  var TONE_PREFIX = { practical: "", bold: "Bold angle: ", friendly: "Casually: ", expert: "Expert breakdown: " };

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function selectedPlatforms() {
    var out = [];
    document.querySelectorAll("#platforms input:checked").forEach(function (cb) { out.push(cb.value); });
    return out.length ? out : ["X"];
  }
  function spreadDays(n) {
    var idxs = [];
    if (n >= 7) { for (var k = 0; k < n; k++) idxs.push(k % 7); return idxs; }
    if (n === 1) return [0];
    for (var i = 0; i < n; i++) idxs.push(Math.round((i * 6) / (n - 1)));
    return idxs;
  }
  function inputs() {
    return {
      biz: (document.getElementById("biz").value || "your business").trim() || "your business",
      tone: document.getElementById("tone").value,
      platforms: selectedPlatforms(),
      perWeek: parseInt(document.getElementById("perWeek").value, 10) || 5,
      weeks: parseInt(document.getElementById("weeks").value, 10) || 1,
    };
  }

  var lastPlan = []; // [{week, day, platform, angle, idea}]

  /* ---------- shared renderer ---------- */
  function render() {
    // group by week → day
    var byWeek = {};
    lastPlan.forEach(function (p) {
      (byWeek[p.week] = byWeek[p.week] || {});
      (byWeek[p.week][p.day] = byWeek[p.week][p.day] || []).push(p);
    });

    var html = "";
    Object.keys(byWeek).sort(function (a, b) { return a - b; }).forEach(function (w) {
      html += '<div class="cal-week"><h4>Week ' + esc(w) + "</h4>";
      var days = byWeek[w];
      Object.keys(days).sort(function (a, b) { return DAYS.indexOf(a) - DAYS.indexOf(b); }).forEach(function (d) {
        html += '<div class="cal-day"><div class="d">' + esc(d) + '</div><div class="posts">';
        days[d].forEach(function (p) {
          var fmt = FORMAT[p.platform] || "Post";
          html +=
            '<div class="cal-post"><div class="meta">' +
            '<span class="pill green">' + esc(p.platform) + "</span>" +
            '<span class="pill">' + esc(fmt) + "</span>" +
            '<span class="pill">' + esc(p.angle) + "</span>" +
            '<button class="copy" type="button" data-copy="' + esc(p.idea) + '">Copy</button>' +
            "</div><div class=\"ptxt\">" + esc(p.idea) + "</div></div>";
        });
        html += "</div></div>";
      });
      html += "</div>";
    });

    var out = document.getElementById("calOut");
    out.innerHTML = html;
    document.getElementById("toolActions").style.display = "flex";
    document.getElementById("toolCta").style.display = "flex";
    out.querySelectorAll(".copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn.getAttribute("data-copy"));
        var old = btn.textContent; btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = old; }, 1200);
      });
    });
  }

  /* ---------- local (template) generator ---------- */
  function generateLocal() {
    var v = inputs();
    var tonePrefix = TONE_PREFIX[v.tone] || "";
    var angleBag = shuffle(ANGLES);
    var ai = 0, pi = 0;
    lastPlan = [];
    for (var w = 1; w <= v.weeks; w++) {
      var dayIdxs = spreadDays(v.perWeek);
      for (var i = 0; i < dayIdxs.length; i++) {
        var angle = angleBag[ai % angleBag.length]; ai++;
        var platform = v.platforms[pi % v.platforms.length]; pi++;
        lastPlan.push({ week: w, day: DAYS[dayIdxs[i]], platform: platform, angle: angle.name, idea: tonePrefix + angle.make(v.biz) });
      }
    }
    render();
  }

  /* ---------- AI generator (optional, graceful fallback) ---------- */
  function setStatus(msg) {
    var el = document.getElementById("aiStatus");
    if (!el) return;
    if (!msg) { el.style.display = "none"; el.textContent = ""; return; }
    el.style.display = "block"; el.textContent = msg;
  }

  function generateAI() {
    var v = inputs();
    var count = Math.min(v.perWeek * v.weeks, 14);
    var btn = document.getElementById("aiBtn");
    if (btn) { btn.disabled = true; }
    setStatus("✨ Writing on-brand ideas with AI…");

    var license = getLicense();
    fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ biz: v.biz, platforms: v.platforms, count: count, tone: v.tone, license: license }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.posts) || !data.posts.length) {
          throw new Error((data && data.error) || "unavailable");
        }
        lastPlan = data.posts.map(function (p, i) {
          var day = DAYS.indexOf(p.day) >= 0 ? p.day : DAYS[i % 7];
          return { week: Math.floor(i / v.perWeek) + 1, day: day, platform: p.platform || v.platforms[i % v.platforms.length], angle: p.angle || "Idea", idea: p.text || "" };
        });
        render();
        // Hide paywall/key-entry on success; reflect Pro if the server confirmed it.
        var pw = document.getElementById("paywall"); if (pw) pw.style.display = "none";
        var ke = document.getElementById("keyEntry"); if (ke) ke.style.display = "none";
        if (data.pro) {
          var badge = document.getElementById("proBadge"); if (badge) badge.style.display = "block";
          setStatus("★ Pro: generated on the highest-quality model. Tweak any line to fit your voice.");
        } else {
          setStatus("✨ Generated with AI. Tweak any line to fit your voice.");
        }
      })
      .catch(function (err) {
        var why = (err && err.message) || "unavailable";
        // Graceful fallback to the instant local generator.
        generateLocal();
        if (why === "rate_limited") {
          setStatus("Daily free AI limit reached — here's an instant template plan. Go Pro for unlimited.");
          var pw = document.getElementById("paywall"); if (pw && !getLicense()) pw.style.display = "block";
        }
        else if (why === "ai_disabled") setStatus("AI isn't enabled on this demo — showing an instant template plan instead.");
        else setStatus("Couldn't reach AI just now — showing an instant template plan instead.");
      })
      .then(function () { if (btn) btn.disabled = false; });
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

  function planToText() {
    return lastPlan.map(function (p) {
      return "Week " + p.week + " · " + p.day + " · " + p.platform + " [" + p.angle + "]\n" + p.idea;
    }).join("\n\n");
  }
  function downloadCSV() {
    var rows = [["Week", "Day", "Platform", "Angle", "Idea"]];
    lastPlan.forEach(function (p) { rows.push([p.week, p.day, p.platform, p.angle, p.idea]); });
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "content-calendar.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------- wire up ---------- */
  document.querySelectorAll("#platforms .chip").forEach(function (chip) {
    var cb = chip.querySelector("input");
    chip.addEventListener("click", function (e) {
      if (e.target !== cb) cb.checked = !cb.checked;
      chip.classList.toggle("on", cb.checked);
    });
  });

  var gen = document.getElementById("genBtn");
  if (gen) gen.addEventListener("click", function () { setStatus(""); generateLocal(); });
  var aiBtn = document.getElementById("aiBtn");
  if (aiBtn) aiBtn.addEventListener("click", generateAI);
  var regen = document.getElementById("regenBtn");
  if (regen) regen.addEventListener("click", function () { setStatus(""); generateLocal(); });
  var copyBtn = document.getElementById("copyBtn");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    copyText(planToText());
    var old = copyBtn.textContent; copyBtn.textContent = "Copied!";
    setTimeout(function () { copyBtn.textContent = old; }, 1200);
  });
  var csvBtn = document.getElementById("csvBtn");
  if (csvBtn) csvBtn.addEventListener("click", downloadCSV);

  /* ---------- license key entry ---------- */
  var haveKeyBtn = document.getElementById("haveKeyBtn");
  var keyEntry = document.getElementById("keyEntry");
  if (haveKeyBtn && keyEntry) {
    haveKeyBtn.addEventListener("click", function () {
      keyEntry.style.display = keyEntry.style.display === "block" ? "none" : "block";
      var ki = document.getElementById("keyInput"); if (ki) ki.focus();
    });
  }
  var keySave = document.getElementById("keySave");
  if (keySave) {
    keySave.addEventListener("click", function () {
      var ki = document.getElementById("keyInput");
      var msg = document.getElementById("keyMsg");
      var val = ki && ki.value ? ki.value.trim() : "";
      if (!val) { if (msg) { msg.textContent = "Paste your key first."; msg.style.color = "var(--ink-3)"; } return; }
      setLicense(val);
      if (msg) { msg.textContent = "Checking your key…"; msg.style.color = "var(--ink-3)"; }
      // Validate by generating — the response's pro flag confirms the license.
      setStatus("");
      generateAI();
      setTimeout(function () {
        if (getLicense() && document.getElementById("proBadge").style.display === "block") {
          if (msg) { msg.textContent = "Unlocked! Enjoy Pro."; msg.style.color = "#0a7d3c"; }
        }
      }, 1200);
    });
  }

  reflectProState();

  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); }); });
  }

  generateLocal();
})();
