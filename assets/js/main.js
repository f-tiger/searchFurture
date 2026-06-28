/* ==========================================================================
   通税云 TongTax — 交互逻辑
   - 退税测算器
   - 移动端导航
   - 滚动渐显
   - 表单提交反馈
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 退税测算器 ---------- */
  var amountEl = document.getElementById("amount");
  var rateEl = document.getElementById("rate");
  var refundEl = document.getElementById("refund");
  var ratioEl = document.getElementById("ratio");
  var flagEl = document.getElementById("flag");

  function fmt(n) {
    return "¥" + Math.round(n).toLocaleString("zh-CN");
  }

  function calcRefund() {
    if (!amountEl || !rateEl || !refundEl) return;
    var amount = parseFloat(amountEl.value) || 0;
    var rate = parseFloat(rateEl.value) || 0;

    // 外贸企业出口退税常用估算口径：
    // 应退税额 ≈ 出口货值 ÷ (1 + 退税率) × 退税率（不含税基数 × 退税率）
    var refund = rate > 0 ? (amount / (1 + rate / 100)) * (rate / 100) : 0;

    refundEl.innerHTML = fmt(refund) + ' <small>/ 单笔</small>';

    if (ratioEl) {
      ratioEl.textContent =
        rate > 0
          ? "退税率 " + rate + "% · 估算口径：货值 ÷ (1+" + rate + "%) × 退税率"
          : "该品类不予退税（0%）——出口前请确认 HS 编码与退税资格";
    }

    if (flagEl) {
      if (rate === 0) {
        flagEl.innerHTML =
          "提示：所选品类<b>不予退税</b>。错误归类可能导致补税与处罚，建议提前核验 HS 编码与退税率档位。";
      } else if (refund >= 1000000) {
        flagEl.innerHTML =
          "你的单笔退税额较大（约 " +
          fmt(refund) +
          "）。<b>36 个月</b>红线与四流合一一旦出问题，损失成倍放大——更需要系统化风控。";
      } else {
        flagEl.innerHTML =
          "注意：出口后须在 <b>36 个月</b>内完成退税申报，否则将被视同内销补缴增值税，并可能丧失退税资格。";
      }
    }
  }

  if (amountEl) amountEl.addEventListener("input", calcRefund);
  if (rateEl) rateEl.addEventListener("change", calcRefund);
  calcRefund();

  /* ---------- 移动端导航 ---------- */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
    // 点击链接后收起
    var links = nav.querySelectorAll(".nav-links a");
    links.forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
      });
    });
  }

  /* ---------- 滚动渐显 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in");
    });
  }

  /* ---------- 表单提交反馈 ---------- */
  var form = document.getElementById("leadForm");
  var ok = document.getElementById("formOk");
  if (form) {
    form.addEventListener("submit", function (ev) {
      // 若部署在 Netlify，data-netlify 会原生处理；此处提供本地/通用反馈。
      // 简单校验
      var required = form.querySelectorAll("[required]");
      var valid = true;
      required.forEach(function (f) {
        if (!f.value.trim()) valid = false;
      });
      if (!valid) return; // 让浏览器原生提示

      // 在没有后端的演示环境下，阻止跳转并给出成功反馈
      var hasNetlify = form.getAttribute("data-netlify") === "true";
      var isLocal =
        location.protocol === "file:" ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";

      if (isLocal || !hasNetlify) {
        ev.preventDefault();
        form.style.display = "none";
        if (ok) ok.classList.add("show");
      }
      // 若在 Netlify 线上，则正常提交由平台捕获表单。
    });
  }
})();
