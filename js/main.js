/* ===== FortuneKid 官网交互 ===== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 自动更新页脚年份
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // ===== 导航滚动状态：越过 hero 后加模糊与底边 =====
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ===== 数字滚动动画 =====
  function countUp(el) {
    var to = parseFloat(el.dataset.countTo);
    if (isNaN(to)) return;
    var from = parseFloat(el.dataset.countFrom);
    if (isNaN(from)) from = 0;
    var suffix = el.dataset.suffix || '';
    var duration = 900;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = Math.round(from + (to - from) * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ===== 滚动入场：淡入 + 上移，卡片按 --delay 错峰 =====
  var revealables = document.querySelectorAll('.reveal');
  var counters = document.querySelectorAll('[data-count-to]');

  // 动画跑完后拆掉 .reveal / --delay，否则这条 transition 会一直压过
  // .card 自己的 hover 过渡（0.45s + 最多 240ms 延迟 = 悬停发黏）。
  var CLEANUP_MS = 1000; // > 最大 --delay + 时长
  function settle(el) {
    // 移除 .reveal 后 opacity / transform / will-change 一并回到默认值
    el.classList.remove('reveal', 'is-visible');
  }

  function show(el) {
    el.classList.add('is-visible');
    window.setTimeout(function () { settle(el); }, CLEANUP_MS);
  }

  function revealAll() {
    for (var i = 0; i < revealables.length; i++) settle(revealables[i]);
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  // 底部兜底：滚到页面尽头时，放出任何还没触发的元素，
  // 避免落在 rootMargin 死区里的内容永远保持透明。
  window.addEventListener('scroll', function () {
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      revealAll();
    }
  }, { passive: true });

  // -22% 让元素真正进入阅读位置再动，而不是在屏幕最底下擦边触发
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target);

      var nums = entry.target.querySelectorAll('[data-count-to]');
      for (var i = 0; i < nums.length; i++) countUp(nums[i]);
    });
  }, { rootMargin: '0px 0px -22% 0px', threshold: 0 });

  for (var i = 0; i < revealables.length; i++) observer.observe(revealables[i]);

  // 数字若不在 .reveal 容器内，单独观察
  var numObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      numObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  for (var j = 0; j < counters.length; j++) {
    if (!counters[j].closest('.reveal')) numObserver.observe(counters[j]);
  }
})();
