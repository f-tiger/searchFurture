/* Shared mobile-nav toggle for secondary pages (blog, tools). */
(function () {
  "use strict";
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }
})();
