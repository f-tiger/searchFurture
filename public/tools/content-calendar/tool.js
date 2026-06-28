/* ==========================================================================
   Brandloop — Free Content Calendar Generator
   Builds a structured weekly content plan locally from proven content angles.
   ========================================================================== */
(function () {
  "use strict";

  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Platform-specific format hint.
  var FORMAT = {
    "X": "Thread",
    "LinkedIn": "Story post",
    "Instagram": "Carousel",
    "Newsletter": "Deep-dive",
    "TikTok/Reels": "Short video",
    "Facebook": "Post",
  };

  // Content angles — each returns a post idea given the business + tone.
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

  var TONE_PREFIX = {
    practical: "",
    bold: "Bold angle: ",
    friendly: "Casually: ",
    expert: "Expert breakdown: ",
  };

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function selectedPlatforms() {
    var out = [];
    document.querySelectorAll("#platforms input:checked").forEach(function (cb) { out.push(cb.value); });
    return out.length ? out : ["X"];
  }

  function spreadDays(n) {
    // Choose n day-indexes spread across the week (allow repeats if n>7).
    var idxs = [];
    if (n >= 7) { for (var k = 0; k < n; k++) idxs.push(k % 7); return idxs; }
    if (n === 1) return [0];
    for (var i = 0; i < n; i++) idxs.push(Math.round((i * 6) / (n - 1)));
    return idxs;
  }

  var lastPlan = []; // for copy/CSV

  function generate() {
    var biz = (document.getElementById("biz").value || "your business").trim() || "your business";
    var tone = document.getElementById("tone").value;
    var platforms = selectedPlatforms();
    var perWeek = parseInt(document.getElementById("perWeek").value, 10) || 5;
    var weeks = parseInt(document.getElementById("weeks").value, 10) || 1;
    var tonePrefix = TONE_PREFIX[tone] || "";

    var angleBag = shuffle(ANGLES);
    var ai = 0, pi = 0;
    lastPlan = [];

    var html = "";
    for (var w = 1; w <= weeks; w++) {
      var dayIdxs = spreadDays(perWeek);
      // group posts by day
      var byDay = {};
      for (var i = 0; i < dayIdxs.length; i++) {
        var dayKey = dayIdxs[i];
        var angle = angleBag[ai % angleBag.length]; ai++;
        var platform = platforms[pi % platforms.length]; pi++;
        var idea = tonePrefix + angle.make(biz);
        (byDay[dayKey] = byDay[dayKey] || []).push({ platform: platform, angle: angle.name, idea: idea });
        lastPlan.push({ week: w, day: DAYS[dayKey], platform: platform, angle: angle.name, idea: idea });
      }

      html += '<div class="cal-week"><h4>Week ' + w + "</h4>";
      Object.keys(byDay).sort(function (a, b) { return a - b; }).forEach(function (dk) {
        html += '<div class="cal-day"><div class="d">' + DAYS[dk] + '</div><div class="posts">';
        byDay[dk].forEach(function (p) {
          var fmt = FORMAT[p.platform] || "Post";
          html +=
            '<div class="cal-post">' +
            '<div class="meta">' +
            '<span class="pill green">' + esc(p.platform) + "</span>" +
            '<span class="pill">' + esc(fmt) + "</span>" +
            '<span class="pill">' + esc(p.angle) + "</span>" +
            '<button class="copy" type="button" data-copy="' + esc(p.idea) + '">Copy</button>' +
            "</div>" +
            '<div class="ptxt">' + esc(p.idea) + "</div>" +
            "</div>";
        });
        html += "</div></div>";
      });
      html += "</div>";
    }

    var out = document.getElementById("calOut");
    out.innerHTML = html;
    document.getElementById("toolActions").style.display = "flex";
    document.getElementById("toolCta").style.display = "flex";

    // wire per-post copy buttons
    out.querySelectorAll(".copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn.getAttribute("data-copy"));
        var old = btn.textContent; btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = old; }, 1200);
      });
    });
  }

  function planToText() {
    return lastPlan.map(function (p) {
      return "Week " + p.week + " · " + p.day + " · " + p.platform + " [" + p.angle + "]\n" + p.idea;
    }).join("\n\n");
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
  // chip toggles
  document.querySelectorAll("#platforms .chip").forEach(function (chip) {
    var cb = chip.querySelector("input");
    chip.addEventListener("click", function (e) {
      if (e.target !== cb) cb.checked = !cb.checked;
      chip.classList.toggle("on", cb.checked);
    });
  });

  var gen = document.getElementById("genBtn");
  if (gen) gen.addEventListener("click", generate);
  var regen = document.getElementById("regenBtn");
  if (regen) regen.addEventListener("click", generate);
  var copyBtn = document.getElementById("copyBtn");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    copyText(planToText());
    var old = copyBtn.textContent; copyBtn.textContent = "Copied!";
    setTimeout(function () { copyBtn.textContent = old; }, 1200);
  });
  var csvBtn = document.getElementById("csvBtn");
  if (csvBtn) csvBtn.addEventListener("click", downloadCSV);

  // mobile nav
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  // generate one on load
  generate();
})();
