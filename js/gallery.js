/* ===== FortuneKid 游戏页媒体画廊 =====
   上面舞台，下面胶片条。缩略图是 tab，舞台是 tabpanel。
   视频用「假封面」：进页面只有一张本地海报，点了播放才注入 iframe，
   所以打开这一页之前不会有任何第三方请求。
   剧场模式只换 .gallery 的定位，不搬 DOM——iframe 一旦被移动就会重新加载。 */

(function () {
  'use strict';

  var galleries = document.querySelectorAll('[data-gallery]');
  for (var i = 0; i < galleries.length; i++) init(galleries[i]);

  function init(gallery) {
    var shell   = gallery.parentNode;
    var slides  = toArray(gallery.querySelectorAll('.gallery-slide'));
    var thumbs  = toArray(gallery.querySelectorAll('.gallery-thumb'));
    var rail    = gallery.querySelector('.gallery-rail');
    var counter = gallery.querySelector('.gallery-counter');
    var btnPrev = gallery.querySelector('.gallery-arrow--prev');
    var btnNext = gallery.querySelector('.gallery-arrow--next');
    var btnOpen = gallery.querySelector('.gallery-expand');
    var btnShut = gallery.querySelector('.gallery-close');

    if (!slides.length) return;

    var index      = 0;
    var isTheater  = false;
    var savedY     = 0;
    var lastFocus  = null;

    // ===== 换片 =====
    function show(next) {
      var total = slides.length;
      next = ((next % total) + total) % total; // 负数也能绕回去
      if (next === index) return;

      // 离开视频片时把 iframe 拆掉：这是最可靠的停止播放方式，
      // 不用引 YouTube 的 postMessage API，声音不会留在后台响。
      teardownVideo(slides[index]);

      index = next;
      paint();
    }

    function paint() {
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle('is-active', i === index);
        slides[i].setAttribute('aria-hidden', i === index ? 'false' : 'true');
      }
      for (var j = 0; j < thumbs.length; j++) {
        var on = (j === index);
        thumbs[j].setAttribute('aria-selected', on ? 'true' : 'false');
        // roving tabindex：只有当前 tab 进 tab 序列，其余用方向键到达
        thumbs[j].tabIndex = on ? 0 : -1;
      }
      if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;
      preloadNeighbours();
      scrollThumbIntoView();
    }

    // 相邻两张提前取。只挂 loading="lazy" 的话，点下一张的瞬间图还没下完，
    // 舞台会先黑一下再出图；把前后各一张的 lazy 摘掉就能盖住这个空档。
    function preloadNeighbours() {
      var total = slides.length;
      [index, index - 1, index + 1].forEach(function (i) {
        var slide = slides[((i % total) + total) % total];
        var img = slide.querySelector('img');
        if (img && img.hasAttribute('loading')) img.removeAttribute('loading');
      });
    }

    // 手写而不是用 scrollIntoView：后者会连带把整个页面滚一下
    function scrollThumbIntoView() {
      if (!rail || !thumbs[index]) return;
      var t = thumbs[index];
      var left = t.offsetLeft;
      var right = left + t.offsetWidth;
      if (left < rail.scrollLeft) {
        rail.scrollLeft = left - 8;
      } else if (right > rail.scrollLeft + rail.clientWidth) {
        rail.scrollLeft = right - rail.clientWidth + 8;
      }
    }

    // ===== 视频假封面 =====
    function playVideo(slide) {
      if (slide.querySelector('iframe')) return;
      var id = slide.getAttribute('data-yt');
      if (!id) return;

      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id +
                  '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
      frame.title = slide.getAttribute('data-title') || 'Trailer';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; ' +
                    'gyroscope; picture-in-picture; web-share';
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      slide.appendChild(frame);

      var btn = slide.querySelector('.gallery-play');
      if (btn) btn.hidden = true;
    }

    function teardownVideo(slide) {
      if (!slide) return;
      var frame = slide.querySelector('iframe');
      if (!frame) return;
      frame.parentNode.removeChild(frame);
      var btn = slide.querySelector('.gallery-play');
      if (btn) btn.hidden = false;
    }

    // ===== 剧场模式 =====
    function openTheater() {
      if (isTheater) return;
      isTheater = true;
      lastFocus = document.activeElement;
      savedY = window.pageYOffset;

      // 先把壳子的高度钉住，再让 .gallery 脱离文档流，页面才不会塌一下
      shell.style.height = gallery.offsetHeight + 'px';

      var barW = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (barW > 0) document.body.style.paddingRight = barW + 'px';

      gallery.classList.add('is-theater');
      gallery.setAttribute('role', 'dialog');
      gallery.setAttribute('aria-modal', 'true');
      if (btnShut) btnShut.focus();
    }

    function closeTheater() {
      if (!isTheater) return;
      isTheater = false;

      gallery.classList.remove('is-theater');
      gallery.removeAttribute('role');
      gallery.removeAttribute('aria-modal');

      shell.style.height = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      window.scrollTo(0, savedY);

      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // 剧场模式下把 Tab 圈在画廊里
    function trapTab(e) {
      var items = toArray(gallery.querySelectorAll(
        'button:not([hidden]):not([disabled]), iframe, a[href]'
      )).filter(function (el) { return el.getClientRects().length > 0; });
      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // ===== 事件 =====
    if (btnPrev) btnPrev.addEventListener('click', function () { show(index - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { show(index + 1); });
    if (btnOpen) btnOpen.addEventListener('click', openTheater);
    if (btnShut) btnShut.addEventListener('click', closeTheater);

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () { show(i); });
    });

    // 胶片条键盘：tab 模式的标准行为
    if (rail) {
      rail.addEventListener('keydown', function (e) {
        var handled = true;
        if (e.key === 'ArrowRight')      show(index + 1);
        else if (e.key === 'ArrowLeft')  show(index - 1);
        else if (e.key === 'Home')       show(0);
        else if (e.key === 'End')        show(slides.length - 1);
        else handled = false;

        if (handled) {
          e.preventDefault();
          if (thumbs[index]) thumbs[index].focus();
        }
      });
    }

    slides.forEach(function (slide) {
      var play = slide.querySelector('.gallery-play');
      if (play) {
        play.addEventListener('click', function () { playVideo(slide); });
        return;
      }
      // 图片片：点画面进剧场模式（视频片的点击留给播放）。
      // 剧场里不响应——否则想看细节点一下就被关掉了，退出交给
      // Esc / 关闭按钮 / 点背景。
      var img = slide.querySelector('img');
      if (img) {
        img.addEventListener('click', function () {
          if (!isTheater) openTheater();
        });
        img.style.cursor = 'zoom-in';
      }
    });

    // 剧场模式点背景关闭：只认落在 .gallery 自身上的点击
    gallery.addEventListener('click', function (e) {
      if (isTheater && e.target === gallery) closeTheater();
    });

    document.addEventListener('keydown', function (e) {
      if (!isTheater) return;
      if (e.key === 'Escape') { closeTheater(); return; }
      if (e.key === 'Tab') { trapTab(e); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    });

    // 窄屏没有箭头，用滑动换片
    var touchX = null;
    var touchY = null;
    gallery.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: true });

    gallery.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      touchX = null;
      // 横向位移够大、且明显比纵向大，才当成翻页而不是页面滚动
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        show(dx < 0 ? index + 1 : index - 1);
      }
    }, { passive: true });

    // 转屏 / 改窗宽后当前缩略图可能滚出可视区
    window.addEventListener('resize', scrollThumbIntoView);

    paint();
  }

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }
})();
