/* ===== UNI 页背景：安静的流体着色器 =====
   和首页旧的着色器共用仓库内的 WebGPU bundle，但这里不接鼠标、不做玻璃纹理：
   只保留低对比、低频率的双色 Swirl，让背景像一层缓慢移动的空气而非色块拼贴。 */

import { createShader, isWebGPUSupported } from './shaders.bundle.js';

const canvas = document.getElementById('uni-shader-canvas');
const layer = document.querySelector('.uni-shader');
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fallback() {
  if (layer) layer.classList.add('is-fallback');
}

if (!canvas || !layer || !isWebGPUSupported()) {
  fallback();
} else {
  const preset = {
    components: [
      {
        type: 'Swirl',
        id: 'fluid',
        props: {
          colorA: '#c9dce1',
          colorB: '#e8eeed',
          detail: 0.72,
          speed: still ? 0 : 0.08,
        },
      },
    ],
  };

  let instance = null;
  let pendingResize = false;

  function syncSize() {
    pendingResize = false;
    if (!instance || typeof instance.resize !== 'function') return;
    const width = Math.round(layer.clientWidth);
    const height = Math.round(layer.clientHeight);
    if (width > 0 && height > 0) instance.resize(width, height);
  }

  function scheduleResize() {
    if (pendingResize) return;
    pendingResize = true;
    window.requestAnimationFrame(syncSize);
  }

  createShader(canvas, preset, {
    onError: function () {
      window.setTimeout(function () {
        if (instance && instance.getFailureReason() !== null) fallback();
      }, 0);
    },
  })
    .then(function (shader) {
      instance = shader;
      if (instance.getFailureReason() !== null) {
        fallback();
        return;
      }
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(scheduleResize).observe(layer);
      } else {
        window.addEventListener('resize', scheduleResize);
      }
      scheduleResize();
    })
    .catch(fallback);
}
