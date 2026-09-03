# HANDOFF — hero 视频沙盒（`sandbox-hero-video.html`）

给要在**另一台机器上试这一页**的人。写于 2026-09-03。

---

## 1. 这是什么

`sandbox-hero-video.html` 是把 hero 背景从 WebGPU 棱纹玻璃换成循环视频之后的**调参页**。
它不在导航里，也没有任何线上页面链过去 —— 唯一的用途是把参数拖到满意，然后把读数抄回 CSS。

这次新加了两件事，都在页面底部那条工具条上：

1. **Title X / Title Y** 两根滑块 —— 标题和按钮的位置，数值显示在滑块右边。
2. **色轮** —— 替掉原来那排七颗预设色块。

---

## 2. 先解决一件事：这些文件还没进版本库

当前分支 `Update_UI`（最新提交 `d251190`）。`git status` 里，整套沙盒都是**未跟踪**的：

```
?? sandbox-hero-video.html
?? css/sandbox-hero-video.css
?? js/hero-video.js
?? assets/video/
```

也就是说，**同事直接 clone 这个仓库，一个文件都拿不到**。二选一：

### A. 推上去（推荐）

```bash
git add sandbox-hero-video.html css/sandbox-hero-video.css js/hero-video.js \
        assets/video/hero-1080.av1.webm assets/video/hero-1080.webm assets/video/hero-1080.mp4 \
        assets/video/hero-portrait.av1.webm assets/video/hero-portrait.webm assets/video/hero-portrait.mp4 \
        assets/video/hero-poster.webp assets/video/hero-poster-portrait.webp \
        HERO_SANDBOX_HANDOFF.md WEBSITE_TEST_HANDOFF.md
git commit -m "Hero video sandbox: title placement sliders + color wheel"
git push origin Update_UI
```

八个视频/海报成品加起来约 **14MB**，`.gitignore` 里那段注释说得很清楚：成品该进库，离 Pages 的 1GB 上限还很远。

> **`assets/video/hero-master.mp4`（31MB）不要提交。** 它已经被 `.gitignore` 第 11 行的
> `assets/video/*-master.*` 排掉了，别用 `git add -f` 绕过去 —— git 的历史删不干净，
> 进去一次就永远在每个人的 clone 里。

### B. 不想推就打包发过去

上面 `git add` 那一串文件原样打个 zip，对方解到 clone 的相同路径下即可。目录结构必须保持一致，
`js/hero-video.js` 是按相对路径找 `assets/video/` 的。

---

## 3. 在对方机器上跑起来

纯静态，没有构建步骤、没有依赖。仓库根目录下：

```bash
python -m http.server 8000
```

然后开 **http://localhost:8000/sandbox-hero-video.html**

**不要用 `file://` 开。** 本地 mp4 那条路 `file://` 是能跑的（页面上只有普通 `<script>`，没有 ES module），
但工具条上 **YouTube** 那颗按钮走的是 YouTube IFrame Player API，它不认 `file://` 的 origin，点下去是空的。

---

## 4. 这次要试的两件事

### 4.1 Title X / Title Y —— 标题和按钮的位置

工具条上两根滑块，读数在右边（`0%` / `24svh`）。

- **两根滑块动的都是整块**：标题和下面那颗 “See what we build” 一起走。故意不做成分开控制 ——
  分开之后两者之间的距离会跨屏幕尺寸飘。
- **Y**（0–40svh，默认 24）加在 `.hero--video` 的 `padding-bottom` 上。`.hero` 本来就是
  `align-items: flex-end`，底部撑多少，整块就抬多少。
- **X**（0–50%，默认 0）加在 `.hero-inner` 的 `padding-left` 上，百分比量的是 hero 内容区的宽。

两根都**绕开了 `.hero-inner` 的 `transform`** —— 那个 transform 是 `js/main.js` 的滚动淡出在用，
每帧都会重写成行内的 `translate3d(...)`，写在 CSS 里的 `translateY/translateX` 会在第一帧被抹掉，
看起来就像“这条规则没生效”。谁要改这两根滑块的实现，先看 `css/sandbox-hero-video.css` 里那段注释。

**要在宽屏和窄屏各看一遍。** `box-sizing` 是 `border-box`，X 推远了可用行宽会变窄，
`Play & Build` 可能提前折行 —— 那是那个数值下的真实结果，不是滑块坏了。

### 4.2 色轮 —— 标题色

工具条上那颗 20px 的圆点，点开是个弹层：

- **盘面**：角度 = 色相（正上方 0°，顺时针一圈），半径 = 饱和度（圆心是灰）。按住拖，
  拖出盘外不断控，饱和度夹在 100。
- **L 滑块**：明度。盘面会跟着一起压暗/提亮，所见即所得。
  拖到 100 时盘面接近全白 —— **这是对的**，任何色相在 L=100 都是白；封顶留了 0.15 让色相还看得见。
- **Auto**：把行内的 `--sbx-title` 整个删掉，颜色交还给当前 Light/Dark 方案。切 Light/Dark 也会自动退回 Auto。
- **底下那行数字**：左边是十六进制，右边是**实时算的 WCAG 对比度**，底色取
  `#E6CBC9`（标题压着那块区域最暗一帧的均色，采样过程写在 CSS 里），低于 4.5 会变红。

原来七颗预设色块没了，但它们携带的信息没丢：那张 AAA/AA 对照表还留在
`css/sandbox-hero-video.css` 的注释里，而且轮盘底下那行用的是**同一个公式、同一个底色**。

盘面是两层 CSS 渐变（conic 管色相、radial 管饱和度），不是图也不是 canvas ——
取色是从指针角度反算的，不是拾像素，所以色块和数值永远对得上。

**已知限制**：色轮只能指针拖动，没有做键盘操作。`Esc` 现在是先收弹层，再按一次才收整条工具条。

---

## 5. 工具条上其它旋钮（都是原来就有的）

| 控件 | 作用 |
| --- | --- |
| Auto / AV1 / VP9 / H.264 / 竖版 | 换片源。**Auto 才是上线后访客真正会拿到的那一个**（`js/hero-video.js` 挑的），后面几颗是手动指定，用来横向比画质 |
| YouTube | 换成 YouTube 播放器（需要 http://，见第 3 节） |
| Light text / Dark text | 两套文字方案 |
| Glass / Tint / Solid | 主按钮的轻重 |
| Cover / Contain | 视频的 `object-fit` |
| Halo / Nav / Grain | 文字光晕、导航玻璃透明度、颗粒强度 |
| Hide / `H` / `Esc` | 收起工具条（截图用）。收起后右下角有颗 ☰ 收回来，状态存在 `localStorage` |

竖版那颗在桌面上看是被 `object-fit: cover` 裁过的，真要验手机效果得把窗口拖到 768px 以内再刷新。

---

## 6. 定稿之后，数值写回哪里

工具条只是挑数用的，**它不会保存任何东西**，刷新就回默认值。挑定了就把读数抄进文件：

| 工具条读数 | 写回 |
| --- | --- |
| Title X | [`css/sandbox-hero-video.css:139`](css/sandbox-hero-video.css#L139) `body { --sbx-title-x: 0%; }` |
| Title Y | [`css/sandbox-hero-video.css:129`](css/sandbox-hero-video.css#L129) `body { --sbx-title-y: 24svh; }` |
| 标题色 | [`css/sandbox-hero-video.css:166`](css/sandbox-hero-video.css#L166) `body { --sbx-title: #fff; }`（Dark 方案在下一行） |
| 滑块本身的默认值 | [`sandbox-hero-video.html:103`](sandbox-hero-video.html#L103) 和 [`:109`](sandbox-hero-video.html#L109) 的 `value=` 与 `<output>` 文本 |

改了 `css/` 或 `js/` 里的文件，记得把页面上的缓存戳 `?v=` 一起换掉（当前是 `sbx13`）。
GitHub Pages 给 css/js 的 `Cache-Control` 是 `max-age=600`，不换的话浏览器会拿旧样式配新 HTML。

**上线前**：`sandbox-*.html` 和 `css/sandbox-hero-video.css` 整套删掉，只把定下来的数值搬进
`css/style.css`。工具条那部分 CSS 和 JS 都是一次性的，不要带上线。

---

## 7. 需要反馈的东西

试完只要给这四个数 + 一句话：

```
Title X:  __%
Title Y:  __svh
标题色:   #______   （对比度 __:1）
方案:     Light / Dark text，按钮 Glass / Tint / Solid
一句话：
```

另外这些如果碰上了也说一声：色轮在你的浏览器上拖起来跟不跟手、
`Play & Build` 在你的屏幕宽度下有没有提前折行、视频有没有掉帧或黑屏。

---

## 8. 环境要求

现代浏览器就行，没有 polyfill：`conic-gradient`（色轮）、`svh` 单位（Safari 15.4+）、
`backdrop-filter`、Pointer Events 的 `setPointerCapture`。
Windows / macOS 上新版 Chrome、Edge、Safari、Firefox 都能跑。
