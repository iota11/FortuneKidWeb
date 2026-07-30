/* ===== UNI 页：把滚动进度翻译成 3D 面板的状态 =====

   时间轴 tl 的取值是 0–6，整数部分就是当前第几段（0 = 01 Landing）。
   每帧算出 tl，采样下面的关键帧轨道，再写成 CSS 自定义属性。
   动画由滚动位置驱动，不自动播放；rAF 只在"还有东西要动"时继续跑。 */

(function () {
  'use strict';

  var stage = document.getElementById('uni-stage');
  var layout = document.getElementById('uni-layout');
  var copy = document.getElementById('uni-copy');
  if (!stage || !layout || !copy) return;

  var steps = copy.querySelectorAll('.uni-step');
  if (!steps.length) return;

  var LAST = steps.length - 1; // 最后一段的下标（5）
  var END = steps.length;      // 时间轴上限（6）
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 无 JS / 减少动效时：CSS 里的默认值已经是一个摆好姿势的成品场景，直接收工
  if (reduceMotion) {
    steps[0].classList.add('is-active');
    return;
  }

  // ===== remix 分身：克隆 Place A，去掉 id 避免重复 =====
  var placeA = document.getElementById('place-a');
  if (placeA) {
    var ghost = placeA.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.classList.add('is-ghost');
    placeA.parentNode.insertBefore(ghost, placeA);
  }

  // ===== 关键帧轨道：[tl, 值] =====
  var TRACKS = {
    // 旋转与缩放：02 段拉远看清"房间大小"，03 段推近看装配
    rotY:  [[0, -26], [1, -4], [2, 16], [3, 46], [4, 88], [5, 120], [6, 140]],
    rotX:  [[0, -18], [1, -30], [2, -20], [4, -20], [6, -15]],
    scale: [[0, 1.0], [1, 0.72], [1.85, 0.95], [3, 0.95], [4, 0.98], [6, 0.9]],
    // 03 段是核心解释镜头：进 03 之前先散架，再随滚动装回去
    asm:   [[0, 1], [1.75, 1], [1.99, 0], [2.8, 1], [6, 1]],
    // 04 段：分身剥离，转一圈再收回
    ghost: [[0, 0], [2.98, 0], [3.4, 1], [3.85, 1], [4.1, 0], [6, 0]],
    // 05 段：换成另一个场景（不是同一个物体转个角度）
    swap:  [[0, 0], [3.95, 0], [4.45, 1], [6, 1]]
  };

  function sample(pts, t) {
    if (t <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        var span = b[0] - a[0];
        var u = span > 0 ? (t - a[0]) / span : 1;
        u = u * u * (3 - 2 * u); // smoothstep：关键点处不出折角
        return a[1] + (b[1] - a[1]) * u;
      }
    }
    return pts[pts.length - 1][1];
  }

  // ===== 读取滚动进度 =====
  // 参考线取视口顶端：每段高一屏、内容垂直居中，所以"某段顶端刚到视口顶端"
  // 正好是这段文字停在屏幕正中的时刻。累加每段被推过去的比例 → 0 到 steps.length。
  // （用视口中线当参考线的话，页面一打开 tl 就已经是 0.5，01 的静置状态会被跳过。）
  function readTl() {
    var tl = 0;
    for (var i = 0; i < steps.length; i++) {
      var r = steps[i].getBoundingClientRect();
      var f = -r.top / Math.max(r.height, 1);
      tl += f < 0 ? 0 : (f > 1 ? 1 : f);
    }
    return tl > END ? END : tl;
  }

  var isMobile = window.matchMedia('(max-width: 900px)');
  function mobile() { return isMobile.matches; }

  var cur = readTl();     // 平滑后的时间轴
  var target = cur;
  var dragCur = 0;        // 移动端拖动累计角度
  var dragTarget = 0;
  var activeStep = -1;
  var raf = null;
  var stageVisible = true;

  layout.classList.add('is-live');

  // 面板滚出视口后停掉环境自转，别让 rAF 在后台空转
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      stageVisible = entries[0].isIntersecting;
      if (stageVisible) tick();
    }, { threshold: 0 }).observe(stage);
  }

  function setVar(name, value) {
    stage.style.setProperty(name, value);
  }

  function frame(now) {
    raf = null;

    target = readTl();

    // 帧率无关的缓动：抹掉滚轮的离散跳变，不让物体跟着一格一格抖
    var k = 0.18;
    cur += (target - cur) * k;
    dragCur += (dragTarget - dragCur) * 0.16;

    // 顶部（以及移动端全程）保留一点环境自转，说明物体是"活的"
    var idle = stageVisible ? (mobile() ? 1 : Math.max(0, 1 - cur / 0.4)) : 0;
    var ambient = Math.sin(now / 2800) * 12 * idle;

    // 移动端不做滚动联动的旋转：靠自转 + 拖动，避免 sticky 面板里的抖动
    var rotY = mobile()
      ? (-26 + ambient + dragCur)
      : (sample(TRACKS.rotY, cur) + ambient);

    setVar('--rot-y', rotY.toFixed(2));
    setVar('--rot-x', sample(TRACKS.rotX, cur).toFixed(2));
    setVar('--scale', (mobile() ? 0.95 : sample(TRACKS.scale, cur)).toFixed(3));
    setVar('--asm', sample(TRACKS.asm, cur).toFixed(3));
    setVar('--ghost', sample(TRACKS.ghost, cur).toFixed(3));
    setVar('--swap', sample(TRACKS.swap, cur).toFixed(3));

    // 当前段高亮：tl 的整数部分就是正停在屏幕中间的那一段
    var idx = Math.floor(cur);
    if (idx < 0) idx = 0;
    if (idx > LAST) idx = LAST;
    if (idx !== activeStep) {
      if (activeStep >= 0) steps[activeStep].classList.remove('is-active');
      steps[idx].classList.add('is-active');
      activeStep = idx;
    }

    // 还有东西在动就继续，否则停下来别空转
    if (Math.abs(target - cur) > 0.0004 ||
        Math.abs(dragTarget - dragCur) > 0.01 ||
        idle > 0.001) {
      raf = requestAnimationFrame(frame);
    }
  }

  function tick() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  if (isMobile.addEventListener) isMobile.addEventListener('change', tick);

  // ===== 移动端：拖动转动物体 =====
  var dragging = false;
  var lastX = 0;
  var pointer = null;

  stage.addEventListener('pointerdown', function (e) {
    if (!mobile()) return;
    dragging = true;
    pointer = e.pointerId;
    lastX = e.clientX;
    stage.classList.add('is-dragging');
    // 捕获指针，手指滑出面板范围也能继续转（touch-action: pan-y 保证纵向还能滚页面）
    if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    tick();
  });

  stage.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== pointer) return;
    dragTarget += (e.clientX - lastX) * 0.45;
    lastX = e.clientX;
    tick();
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pointer)) return;
    dragging = false;
    pointer = null;
    stage.classList.remove('is-dragging');
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);

  tick();
})();
