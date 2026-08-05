/* ===== UNI 页：滚动时点亮当前这一段 + 驱动画面的视差和淡入淡出 =====

   累加每段被推过视口顶端的比例，得到 0–段数 的进度，整数部分就是当前
   第几段。段落高度不必一致，按各自高度归一化。rAF 只在还有东西要动时继续跑。

   带画面的段落（.uni-step--media）另外每帧写两个自定义属性，样式全在 CSS 里：
     --p  这一段穿过视口的进度 0→1，驱动画面在裁切框里上下漂移（视差）
     --f  这一段的聚焦度，停在屏幕中间时为 1，进出时衰减到 0，驱动卡片淡入淡出
   没有 JS、或者用户要求减少动效时，两个值用 CSS 里的默认值，卡片就是静态图。 */

(function () {
  'use strict';

  var layout = document.getElementById('uni-layout');
  var copy = document.getElementById('uni-copy');
  if (!layout || !copy) return;

  var steps = copy.querySelectorAll('.uni-step');
  if (!steps.length) return;

  var LAST = steps.length - 1;
  var END = steps.length;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 带画面的段落。缓存上一帧写进去的值，没变就不写，省掉一堆无谓的样式失效。
  var media = [];
  var withMedia = copy.querySelectorAll('.uni-step--media');
  for (var m = 0; m < withMedia.length; m++) {
    media.push({ el: withMedia[m], p: -1, f: -1 });
  }

  /* 换成 <video> 之后：只让露出来的那个播，其余暂停。
     四个解码器同时跑会把滚动拖卡，而滚动正是这一页要展示的东西。 */
  var videos = copy.querySelectorAll('.uni-media video, video.uni-media');
  if (videos.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var v = entries[i].target;
        if (entries[i].isIntersecting && !reduced) {
          var play = v.play();
          if (play && play.catch) play.catch(function () {});  // 自动播放被拦就算了
        } else {
          v.pause();
        }
      }
    }, { rootMargin: '20% 0px' });
    for (var vi = 0; vi < videos.length; vi++) io.observe(videos[vi]);
  }

  // 减少动效时不做压暗，所有段落保持正常亮度，画面也不漂
  if (reduced) {
    steps[0].classList.add('is-active');
    return;
  }

  function clamp01(n) {
    return n < 0 ? 0 : (n > 1 ? 1 : n);
  }

  // 三次平滑：两端收得住，卡片不会在进出的瞬间"啪"一下亮起来
  function smooth(n) {
    return n * n * (3 - 2 * n);
  }

  function readTl() {
    var tl = 0;
    for (var i = 0; i < steps.length; i++) {
      var r = steps[i].getBoundingClientRect();
      var f = -r.top / Math.max(r.height, 1);
      tl += f < 0 ? 0 : (f > 1 ? 1 : f);
    }
    return tl > END ? END : tl;
  }

  function paintMedia() {
    var vh = window.innerHeight || 1;
    /* 进出各留 45% 视口高度做过渡，中间是一段 --f 恒为 1 的平台期。
       这个值得跟段落高度配着调：段落不再是整屏高，过渡带太宽的话，
       --f 还没爬到 1 就开始退场，画面全程半透明。 */
    var band = vh * 0.45;

    for (var i = 0; i < media.length; i++) {
      var item = media[i];
      var r = item.el.getBoundingClientRect();

      // 段落顶端在视口底部时 p=0，段落底端划过视口顶端时 p=1
      var p = clamp01((vh - r.top) / Math.max(vh + r.height, 1));

      // 进场和退场两条斜坡取小的那个：中间一段稳定在 1
      var rampIn = clamp01((vh * 0.8 - r.top) / band);
      var rampOut = clamp01((r.bottom - vh * 0.2) / band);
      var f = smooth(rampIn < rampOut ? rampIn : rampOut);

      // 三位小数足够，再细人眼看不出来，只是白写样式
      p = Math.round(p * 1000) / 1000;
      f = Math.round(f * 1000) / 1000;

      if (p !== item.p) {
        item.el.style.setProperty('--p', p);
        item.p = p;
      }
      if (f !== item.f) {
        item.el.style.setProperty('--f', f);
        item.f = f;
      }
    }
  }

  var cur = readTl();
  var target = cur;
  var activeStep = -1;
  var raf = null;

  layout.classList.add('is-live');

  function frame() {
    raf = null;

    target = readTl();
    // 帧率无关的缓动：抹掉滚轮的离散跳变，段落切换不跟着一格一格闪
    cur += (target - cur) * 0.18;

    var idx = Math.floor(cur);
    if (idx < 0) idx = 0;
    if (idx > LAST) idx = LAST;
    if (idx !== activeStep) {
      if (activeStep >= 0) steps[activeStep].classList.remove('is-active');
      steps[idx].classList.add('is-active');
      activeStep = idx;
    }

    // 视差直接跟手，不走上面那条缓动：画面滞后于滚动会很明显地"拖"
    paintMedia();

    if (Math.abs(target - cur) > 0.0004) raf = requestAnimationFrame(frame);
  }

  function tick() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);

  tick();
})();
