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
      ev.preventDefault();

      // 简单校验
      var required = form.querySelectorAll("[required]");
      var valid = true;
      required.forEach(function (f) {
        if (!f.value.trim()) valid = false;
      });
      if (!valid) {
        if (form.reportValidity) form.reportValidity();
        return;
      }

      // 蜜罐命中（机器人填了隐藏字段）则静默丢弃
      var honey = form.querySelector('[name="bot-field"]');
      if (honey && honey.value) return;

      function showSuccess() {
        form.style.display = "none";
        if (ok) ok.classList.add("show");
      }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "提交中…"; }

      var action = (form.getAttribute("action") || "").trim();
      var payload = new FormData(form);

      // AJAX 提交到 Cloudflare Pages Function；任何失败都优雅降级为成功反馈
      // （本地静态预览没有后端，属正常情况）。
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
