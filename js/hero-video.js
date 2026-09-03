/* hero 背景视频的挑源逻辑。替掉 js/hero-shader.js 那 2.5MB 的 WebGPU bundle。
   片源由 tools/encode-hero.sh 压出来，三档编码 × 两种画幅，一共六个文件，
   但每个访客只会下其中一个。

   为什么不写成 <source> 让浏览器自己挑：
     1. <video> 里的 <source media="..."> 早就被浏览器废掉了（只有 <picture> 认），
        横竖版没法用媒体查询区分，本来就得靠 JS；
     2. <source type="..."> 里的 codecs 串一旦写错，浏览器不是"跳过这条试下一条"，
        而是选中之后解码失败、整个播放器停在黑屏——错法很隐蔽。
        改成自己用 canPlayType() 问一遍，问不出结果就往下走，最差落到 H.264，
        那一档是所有浏览器的保底。 */
(function () {
  var video = document.getElementById('hero-video');
  if (!video) return;

  /* 横版还是竖版。
     hero 的 CSS 是 object-fit:cover，390px 的竖屏手机会把 16:9 的画面左右各裁掉
     一大半——那些像素编了也没人看见。竖版是从源里裁 9:16 再压的，
     文件小一半还多，铺在手机上反而更清楚。
     判定用 orientation 而不是单看宽度：横过来的手机和窄窗口的桌面都该拿横版。 */
  var portrait = window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;
  var base = portrait ? 'assets/video/hero-portrait' : 'assets/video/hero-1080';

  /* 顺序就是优先级，从省流量到最通用。
     AV1 和 H.264 在 VMAF 上是同一档画质（94.9 / 94.6），但 AV1 只要四成体积——
     Chrome / Firefox / Edge 走第一条，Apple 芯片上 M3 以前的 Safari 没有 AV1 硬解，
     落到 VP9；再老的落到 H.264。
     codecs 串里的 level 是从产物里读出来的，换了分辨率要跟着改：
     1080p 的 AV1 是 level 8（4.0），竖版 720×1280 是 level 5（3.1）。 */
  var LADDER = [
    { ext: '.av1.webm', type: 'video/webm; codecs="av01.0.' + (portrait ? '05' : '08') + 'M.10"' },
    { ext: '.webm',     type: 'video/webm; codecs="vp9"' },
    { ext: '.mp4',      type: 'video/mp4; codecs="avc1.640029"' }
  ];

  var chosen = LADDER[LADDER.length - 1];   /* 兜底先占上，问得出更好的再换 */
  for (var i = 0; i < LADDER.length; i++) {
    if (video.canPlayType(LADDER[i].type)) { chosen = LADDER[i]; break; }
  }

  /* poster 取的是视频第 0 帧，不是随便一帧——第一帧解出来的瞬间画面不会跳。
     它同时也是这一屏的 LCP 元素：没有 poster 的话 <video> 自己会变成 LCP 候选，
     那就得等视频解码，分数只会更难看。 */
  video.poster = portrait
    ? 'assets/video/hero-poster-portrait.webp'
    : 'assets/video/hero-poster.webp';
  video.src = base + chosen.ext;
  video.load();

  /* --- 播放兜底 ---
     autoplay 不是承诺：省电模式、后台标签页、某些移动浏览器都会拒绝。
     被拒时 play() 返回的 promise 会 reject——再试一次，第二次还不行就随它去
     （画面停在 poster 上，比一直重试更省电，也不会把控制台刷满）。 */
  function kick() {
    var p = video.play();
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }
  kick();
  video.addEventListener('loadeddata', kick, { once: true });

  /* 用户开了"减少动态效果"时不是把视频删掉，而是停在第一帧——
     跟 js/hero-shader.js 对这个设置的处理保持一致（画静帧，不是换纯色）。
     等 loadeddata 再暂停：立刻 pause 可能一帧都还没解出来，剩一片底色。 */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.addEventListener('loadeddata', function () { video.pause(); }, { once: true });
  }

  /* 标签页切走时暂停。浏览器对隐藏标签的节流并不一致，有的还在解码——
     一支 1080p 的循环在后台空转，笔记本的风扇是听得见的。 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) video.pause();
    else if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) kick();
  });
})();
