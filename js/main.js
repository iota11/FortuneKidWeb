/* ===== FortuneKid 官网交互 ===== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 自动更新页脚年份
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // ===== 联系邮箱：点击即复制 =====
  // 没配默认邮件客户端的机器上，mailto 点了像坏了一样毫无反应。改成把地址复制到
  // 剪贴板并弹一条提示。href 保留不动：这段 JS 没跑起来时仍然退回原来的 mailto。
  // 注意必须写在下面 reduceMotion 那条 return 之前，否则关掉动效的用户点了没反应。
  var COPY_FEEDBACK_MS = 2200;

  function copyText(text) {
    // 异步剪贴板要求安全上下文（https / localhost）
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // 兜底：http 打开的页面和老 Safari 拿不到 navigator.clipboard
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length); // iOS 上 select() 不够
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  var mailLinks = document.querySelectorAll('.contact-mail');
  if (mailLinks.length) {
    // 气泡是 CSS 伪元素，读屏软件读不到，另开一个 live region 播报
    var copyStatus = document.createElement('p');
    copyStatus.className = 'sr-only';
    copyStatus.setAttribute('role', 'status');
    copyStatus.setAttribute('aria-live', 'polite');
    document.body.appendChild(copyStatus);

    Array.prototype.forEach.call(mailLinks, function (link) {
      var address = (link.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0] ||
        link.textContent.trim();
      var timer = null;

      // 行为已经不是"打开邮件"了，标签跟着改；JS 没跑时标签保持链接原样
      link.setAttribute('aria-label', 'Copy email address ' + address);

      function flash(msg) {
        link.setAttribute('data-copy-msg', msg);
        link.classList.add('is-copied');
        copyStatus.textContent = msg;
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          link.classList.remove('is-copied');
          copyStatus.textContent = '';
        }, COPY_FEEDBACK_MS);
      }

      link.addEventListener('click', function (e) {
        e.preventDefault();
        copyText(address).then(
          function () { flash('Email copied!'); },
          function () {
            // 两条通道都被浏览器挡了，退回打开邮件客户端，别让这一下点了没结果
            flash("Couldn't copy - opening your mail app");
            window.location.href = link.href;
          }
        );
      });
    });
  }

  // ===== 单一 rAF 调度器 =====
  // 所有滚动相关的读写都挂在这里，一帧只跑一次，避免多个 scroll 监听各自触发布局。
  var frameJobs = [];
  var queued = false;

  function runFrame() {
    queued = false;
    var y = window.pageYOffset;
    var vh = window.innerHeight;
    for (var i = 0; i < frameJobs.length; i++) frameJobs[i](y, vh);
  }

  function schedule() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(runFrame);
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  // ===== 导航滚动状态：越过 hero 后加模糊与底边 =====
  var nav = document.getElementById('nav');
  if (nav) {
    // 迟滞：开关阈值错开，滚轮在临界点附近抖两下不会把 class 来回切，
    // 否则导航的背景和模糊会跟着一闪一闪。
    var navOn = false;
    frameJobs.push(function (y) {
      if (!navOn && y > 48) {
        navOn = true;
        nav.classList.add('is-scrolled');
      } else if (navOn && y < 16) {
        navOn = false;
        nav.classList.remove('is-scrolled');
      }
    });
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

  // ===== Hero 滚动淡出：随滚动位置实时上移 + 缩小 + 淡出 =====
  // 不是"到点触发"，而是跟着滚轮走，松手停在哪就是哪一帧。
  var hero = document.querySelector('.hero');
  var heroInner = document.querySelector('.hero-inner');
  if (hero && heroInner && !reduceMotion) {
    var heroH = hero.offsetHeight;
    window.addEventListener('resize', function () { heroH = hero.offsetHeight; });

    var lastP = -1;
    frameJobs.push(function (y) {
      // 走完 hero 高度的 85% 时正好完全淡出，剩下一点余量避免刚滚就消失
      var p = Math.min(Math.max(y / Math.max(heroH * 0.85, 1), 0), 1);
      // 值没变就别写样式：滚出 hero 之后每帧照写会一直让这层重绘
      if (Math.abs(p - lastP) < 0.0015) return;
      var moving = (p > 0 && p < 1);
      var wasMoving = (lastP > 0 && lastP < 1);
      lastP = p;
      var eased = p * p; // easeInQuad：起步慢，离场快
      heroInner.style.transform =
        'translate3d(0,' + (-eased * 88).toFixed(2) + 'px,0) scale(' + (1 - eased * 0.055).toFixed(4) + ')';
      heroInner.style.opacity = Math.max(1 - eased * 1.15, 0).toFixed(3);
      // 只在动的那段挂合成层提示，停在两端就撤掉
      if (moving !== wasMoving) heroInner.style.willChange = moving ? 'transform, opacity' : 'auto';
    });
  }

  // ===== 标题分行 + 遮罩上推 =====
  // 把 [data-split] 的文字按实际换行位置切成若干行，每行套一个 overflow:hidden 的
  // 容器，内层从下方推上来，逐行错峰。行数依赖真实排版，所以要等字体加载完再切。
  var LINE_STAGGER = 70; // ms / 行

  function splitIntoLines(el) {
    if (el._splitSrc == null) el._splitSrc = el.innerHTML;
    else el.innerHTML = el._splitSrc;

    // 只处理"纯文本 + <br>"的标题；出现其它内联元素就放弃分行，交回普通淡入。
    var kids = Array.prototype.slice.call(el.childNodes);
    for (var k = 0; k < kids.length; k++) {
      if (kids[k].nodeType === 1 && kids[k].tagName !== 'BR') return false;
    }

    // 1) 逐词包 span，用来量每个词落在第几行
    kids.forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (token) {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          frag.appendChild(document.createTextNode(token));
        } else {
          var word = document.createElement('span');
          word.className = 'split-w';
          word.textContent = token;
          frag.appendChild(word);
        }
      });
      el.replaceChild(frag, node);
    });

    // 2) 按 offsetTop 把词分组成行，<br> 直接断行
    var lines = [];
    var current = [];
    var lineTop = null;

    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === 'BR') {
        lines.push(current); // 硬换行：断行，<br> 本身丢弃
        current = [];
        lineTop = null;
        return;
      }
      if (node.nodeType === 1 && node.className === 'split-w') {
        var top = node.offsetTop;
        if (lineTop === null) {
          lineTop = top;
        } else if (Math.abs(top - lineTop) > 2) {
          lines.push(current);
          current = [];
          lineTop = top;
        }
      }
      current.push(node);
    });
    lines.push(current);

    // 只留真正有字的行：末尾的 <br> 或纯空白会攒出空行，包成裁切框就是一段空高度
    lines = lines.filter(function (nodes) {
      return nodes.some(function (n) { return n.nodeType === 1 && n.className === 'split-w'; });
    });
    if (lines.length === 0) return false;

    // 3) 重建：每行 = <span class="split-line"><i style="--d">…</i></span>
    var frag = document.createDocumentFragment();
    lines.forEach(function (nodes, i) {
      var line = document.createElement('span');
      line.className = 'split-line';
      var inner = document.createElement('i');
      inner.style.setProperty('--d', i * LINE_STAGGER + 'ms');
      // 这一步把节点从 el 里搬进 inner，搬完 el 只剩下 <br> 和空白残渣
      nodes.forEach(function (n) { inner.appendChild(n); });
      line.appendChild(inner);
      frag.appendChild(line);
    });

    el.textContent = ''; // 清掉硬换行的 <br>：每行已是块级，留着会多一个空行
    el.appendChild(frag);
    el.classList.add('split');

    return true;
  }

  var splitTargets = Array.prototype.slice.call(document.querySelectorAll('[data-split]'));

  // ===== 滚动入场：淡入 + 上移，卡片按 --delay 错峰 =====
  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var counters = document.querySelectorAll('[data-count-to]');

  // 动画跑完后拆掉 .reveal / --delay，否则这条 transition 会一直压过
  // .card 自己的 hover 过渡（0.95s + 最多 240ms 延迟 = 悬停发黏）。
  var CLEANUP_MS = 1100; // > 最大 --delay + 时长
  function settle(el) {
    // 移除 .reveal 后 opacity / transform / will-change 一并回到默认值
    el.classList.remove('reveal', 'is-visible');
  }

  function show(el) {
    // 分行还在等字体：先记一笔，切好后立刻补播。
    // 否则这次触发会落空，元素永远停在 opacity:0。
    if (el.hasAttribute('data-split') && !el.classList.contains('split')) {
      el._showPending = true;
      return;
    }
    if (el.classList.contains('split')) {
      el.classList.add('is-in');
      // 分行元素的 will-change 在动画结束后撤掉，别让每行常驻合成层
      window.setTimeout(function () { el.classList.add('split-done'); }, CLEANUP_MS);
      return;
    }
    el.classList.add('is-visible');
    window.setTimeout(function () { settle(el); }, CLEANUP_MS);
  }

  function revealAll() {
    for (var i = 0; i < revealables.length; i++) {
      var el = revealables[i];
      if (el.classList.contains('split')) el.classList.add('is-in', 'split-done');
      else settle(el);
    }
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // 不做分行：直接把 data-split 摘掉，让元素回到默认可见状态
    splitTargets.forEach(function (el) { el.removeAttribute('data-split'); });
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

  // 刚过视口下沿就起步（-5% 只是躲开擦边抖动）：动画在元素滚进阅读位置的
  // 途中跑完，既不用等，也还看得见它动。触发点再往前提动画就在屏幕外播完了。
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target);

      var nums = entry.target.querySelectorAll('[data-count-to]');
      for (var i = 0; i < nums.length; i++) countUp(nums[i]);
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });

  // ===== 成组进场 =====
  // 竖着排的一小块内容（"联系"那三行：标题 / 说明 / 邮箱）各自观察的话，
  // 会按各自越线的先后拖成三拍，邮箱总是最后才冒出来。给容器加
  // data-reveal-group，整块一起触发，块内节奏交给各自的 --delay。
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-reveal-group]'));

  function grouped(el) { return !!el.closest('[data-reveal-group]'); }

  var groupObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      groupObserver.unobserve(entry.target);
      // 现查而不是提前缓存：分行会把成员节点整个换掉
      var members = entry.target.querySelectorAll('.reveal, [data-split]');
      for (var i = 0; i < members.length; i++) show(members[i]);

      var nums = entry.target.querySelectorAll('[data-count-to]');
      for (var j = 0; j < nums.length; j++) countUp(nums[j]);
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });

  groups.forEach(function (g) { groupObserver.observe(g); });

  // 分行会重排 DOM，必须先切好再交给 observer，否则观察到的是被替换掉的节点
  function prepareSplits(targets) {
    return targets.filter(function (el) {
      var ok = false;
      try {
        ok = splitIntoLines(el);
      } catch (err) {
        ok = false;
      }
      if (!ok) {
        // 分行失败：还原文字，摘掉 data-split，退回普通 .reveal 淡入
        if (el._splitSrc != null) el.innerHTML = el._splitSrc;
        el.removeAttribute('data-split');
        el.classList.remove('split');
        if (el._showPending) show(el);
        else if (!grouped(el)) observer.observe(el);
        return false;
      }
      // 分行接管入场动画，普通淡入的初始态要让位
      el.classList.remove('reveal');
      // 切好之前就已经越线的（成组触发 / 直接跳锚点），这里补播
      if (el._showPending) show(el);
      else if (!grouped(el)) observer.observe(el);
      return true;
    });
  }

  // 已经播完入场的元素也要能重切：.split-line 是块级裁切框，行内容在切的那一刻
  // 就定死了，宽度变了也不会重新断——窗口从窄拉宽（比如先开小窗再最大化）之后，
  // 标题还按旧宽度分行，1080px 的容器里挤着几个窄行。这里原地重切，
  // is-in / split-done 留在元素上，新行直接是终态，不会再播一遍动画。
  function resplitPlayed(el) {
    var ok = false;
    try {
      ok = splitIntoLines(el);
    } catch (err) {
      ok = false;
    }
    if (ok) return true;
    // 重切失败：还原文字退回普通显示，别把内容留在半拆状态
    if (el._splitSrc != null) el.innerHTML = el._splitSrc;
    el.removeAttribute('data-split');
    el.classList.remove('split');
    return false;
  }

  // 行的断点取决于最终字体，用 Poppins 之前量出来的行是错的（会切在错误的词上，
  // 每个 .split-line 又会自己再折一次）。所以等字体就位再切；[data-split] 在切好
  // 之前是 opacity:0，不会闪。字体请求卡住时最多等 1.5s 就按当前排版切。
  function initSplits() {
    splitTargets = prepareSplits(splitTargets);
  }

  if (splitTargets.length && document.fonts && document.fonts.ready) {
    var splitStarted = false;
    var startSplits = function () {
      if (splitStarted) return;
      splitStarted = true;
      initSplits();
    };
    document.fonts.ready.then(startSplits);
    window.setTimeout(startSplits, 1500);
  } else {
    initSplits();
  }

  revealables.forEach(function (el) {
    if (!el.hasAttribute('data-split') && !grouped(el)) observer.observe(el);
  });

  // 视口宽度变了断行就变了：还没播过的重新切，已经播过的原地重切并保持可见。
  var lastWidth = window.innerWidth;
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return; // 移动端地址栏收起只改高度，不重切
    lastWidth = window.innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      var played = [];
      var pending = [];
      splitTargets.forEach(function (el) {
        if (el.classList.contains('is-in')) played.push(el);
        else pending.push(el);
      });
      pending.forEach(function (el) { observer.unobserve(el); });
      splitTargets = played.filter(resplitPlayed).concat(prepareSplits(pending));
    }, 200);
  });

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

  schedule();
})();
