/* ===== 法务页地区切换（privacy.html / privacy-cn.html） =====
   两个标签对应两块已经都在 DOM 里的 .legal 面板，纯本地 show/hide，不发请求、
   不改 URL。哪块面板默认显示由 HTML 里谁带 hidden 决定，这份脚本只管点击后的切换，
   不替 HTML 做默认选择。没有 JS 时 .legal-tabs 整体隐藏（见 style.css），
   默认那块 .legal 照常可读，只是少了切换按钮。 */

(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.legal-tab'));
  if (!tabs.length) return;

  function panelFor(tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  }

  function activate(tab, focusTab) {
    tabs.forEach(function (t) {
      var isActive = t === tab;
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.tabIndex = isActive ? 0 : -1;
      var panel = panelFor(t);
      if (panel) panel.hidden = !isActive;
    });
    if (focusTab) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { activate(tab, false); });

    // ← → 在两个标签间移动，Home/End 跳首尾——跟 hua.html 那套媒体画廊的
    // tablist 键盘行为保持一致。
    tab.addEventListener('keydown', function (e) {
      var targetIndex = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') targetIndex = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') targetIndex = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') targetIndex = 0;
      else if (e.key === 'End') targetIndex = tabs.length - 1;
      if (targetIndex === null) return;
      e.preventDefault();
      activate(tabs[targetIndex], true);
    });
  });
})();
