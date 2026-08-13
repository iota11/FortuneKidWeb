/* ===== 首页 hero 着色器 =====
   首页 hero 背后那层会动的玻璃。图形本身跑在 WebGPU 上，由 js/shaders.bundle.js
   提供（该文件是上游打好的自包含 ESM，直接进仓库，不引 CDN、不需要构建步骤）。

   只在 index.html 加载：2.5MB 的 bundle 没必要出现在条款页和新闻页上。

   节点图（由内向外读）：
     Swirl + ChromaFlow  → 底层颜色：一层缓慢搅动的白，加一层跟着光标走的品牌蓝
     FlutedGlass         → 把上面那层压进竖向的棱纹玻璃里，产生折射和色散
     FilmGrain           → 极轻的颗粒，压掉大色块上的色带

   跑不起来时（浏览器没有 WebGPU、显卡拒绝分配、用户开了降低动态效果）一律
   退回 CSS 渐变：给容器加 .is-fallback，样式在 style.css 里。 */

import { createShader, isWebGPUSupported } from './shaders.bundle.js';

const ACCENT = '#0C26FF'; // 与 style.css 的 --accent 保持一致

const canvas = document.getElementById('hero-canvas');
const layer = document.querySelector('.hero-shader');

/* 降低动态效果时不是不画，而是画成一张静帧：所有 speed 归零，颗粒不再抖动。
   hero 仍然有质感，只是不动——比直接换成纯色更接近原设计。 */
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fallback() {
  if (layer) layer.classList.add('is-fallback');
}

if (!canvas || !layer) {
  // 不在首页，或者结构被改过：什么都不做
} else if (!isWebGPUSupported()) {
  fallback();
} else {
  const preset = {
    components: [
      {
        type: 'FilmGrain',
        id: 'grain',
        props: { strength: 0.05, animated: !still },
        children: [
          {
            type: 'FlutedGlass',
            id: 'glass',
            props: {
              shape: 'rounded',
              angle: 31,
              frequency: 8,
              softness: 1,
              refraction: 4,
              aberration: 0.61,
              lightAngle: -90,
              highlight: 0.12,
              highlightSoftness: 0,
              speed: still ? 0 : 0.15,
            },
            children: [
              {
                type: 'Swirl',
                id: 'swirl',
                props: {
                  colorA: '#ffffff',
                  colorB: '#f0f0f0',
                  detail: 1.7,
                  speed: still ? 0 : 1,
                },
              },
              {
                // 跟着光标走的那层蓝。四个方向同色，所以无论从哪个方向划过，
                // 晕开的都是同一支品牌蓝，不会出现彩虹边。
                type: 'ChromaFlow',
                id: 'flow',
                props: {
                  baseColor: '#ffffff',
                  upColor: ACCENT,
                  downColor: ACCENT,
                  leftColor: ACCENT,
                  rightColor: ACCENT,
                  momentum: 13,
                  radius: 3.5,
                  blendMode: 'multiply',
                  // 这层是节点级不透明度（跟 blendMode 一样由合成器读，不是 ChromaFlow 自己的
                  // 参数）：multiply 出来的蓝整片压下去太重，混一半回底下的白玻璃就够了。
                  opacity: 0.5,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  // onError 有两种情况：显卡设备丢失（库会自己重建，属于通知性质）和终止性错误
  // （画布永远不会再出图）。只有后者该换静态渐变——设备丢失时切过去，等库重建完
  //  hero 就成了一张永远退不回来的渐变图。用 getFailureReason() 区分：它非 null
  // 才是真的没救了。
  let instance = null;

  function checkTerminal() {
    if (!instance || instance.getFailureReason() !== null) fallback();
  }

  /* 画布尺寸得我们自己盯着。库初始化时按当时的尺寸给 canvas 写死了行内
     width/height（比如 745px × 900px），而它内部那套 resize 又是从 canvas 自己的
     getBoundingClientRect() 读新尺寸——行内值把这个读数钉死了，画布再也长不回来。
     结果就是：先开个小窗口再最大化，hero 上只剩左边一条旧尺寸的玻璃，右边全是底色。
     显式把容器的新尺寸喂给 shader.resize(w, h) 才会真的重建交换链。 */
  var pendingSync = false;

  function syncSize() {
    pendingSync = false;
    if (!instance || typeof instance.resize !== 'function') return;
    var w = Math.round(layer.clientWidth);
    var h = Math.round(layer.clientHeight);
    if (w > 0 && h > 0) instance.resize(w, h);
  }

  function scheduleSync() {
    // 拖动窗口边框会连着发很多次，合并到下一帧只做一次
    if (pendingSync) return;
    pendingSync = true;
    window.requestAnimationFrame(syncSize);
  }

  createShader(canvas, preset, {
    // 画布滚出视口时库会自己暂停，不用我们挂 IntersectionObserver
    onError: function () {
      // 报错可能发生在 createShader 兑现之前，等一拍再问最终状态
      window.setTimeout(checkTerminal, 0);
    },
  })
    .then(function (shader) {
      instance = shader;
      checkTerminal();
      // 观察容器而不是画布：画布的尺寸是我们写上去的，盯着它只会读回自己刚写的值
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(scheduleSync).observe(layer);
      } else {
        window.addEventListener('resize', scheduleSync);
      }
      scheduleSync();
    })
    .catch(fallback);
}
