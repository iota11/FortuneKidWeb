# 官网测试交接文档

> 给在**另一台机器上帮忙测这版官网**的同学。写于 2026-09-03，分支 `Update_UI`（最新提交 `d251190`）。
> 结论先行：**这一版的改动全在工作副本里，一行都没提交**。所以你 clone 下来是测不到的，
> 必须先按 §1 把代码拿到手；拿到之后跑一条命令就能开测，全站过一遍大约 40 分钟。

---

## 0. 我们要什么（一句话）

这一版重做了首页 hero（背景换成循环视频）、backyard / hua 两个游戏页和一批站内样式。
要确认的是：**在你的浏览器和屏幕上，它有没有塌、有没有卡、有没有点不动的东西。**
不用看代码，按 §3 的表把每一页点一遍，按 §7 的模板回报。

---

## 1. 先解决一件事：改动没有提交

`git status` 现在长这样（`Update_UI` 分支）：

```
 M index.html  uni.html  games.html  hua.html  backyard.html
 M news.html  privacy.html  terms.html
 M css/style.css  css/uni.css  README.md
 M assets/games/roof-band/*.jpg          ← 重新导出过的图
?? sandbox-hero-video.html  css/sandbox-hero-video.css
?? js/hero-video.js  assets/video/       ← 首页 hero 的视频，整个目录都是新的
?? tools/  .gitignore  HERO_SANDBOX_HANDOFF.md  WEBSITE_TEST_HANDOFF.md
```

**直接 `git clone` + `git checkout Update_UI` 拿到的是改动之前的版本**，首页连视频文件都没有。二选一：

### A. 推上去（推荐）

在这台机器上：

```bash
git add -A                       # .gitignore 已经挡掉 assets/video/hero-master.mp4（31MB 原档）
git status --short               # 确认列表里没有 *-master.* 和 *-src.*
git commit -m "Site restyle: hero video, backyard/hua rework"
git push origin Update_UI
```

对方 `git pull` 即可。视频成品八个文件约 14MB，正常进库。

### B. 打包发过去

整个仓库目录打 zip（**排除 `.git/` 和 `assets/video/hero-master.mp4`**），对方解开就能跑。

> ⚠️ 不管哪种方式，`assets/video/hero-master.mp4`（31MB 原档）都不要传、不要提交。
> 它已经被 `.gitignore` 挡住了，别用 `git add -f` 绕过去。

---

## 2. 跑起来

纯静态站，没有构建步骤、没有 npm、没有依赖。仓库根目录下：

```bash
python -m http.server 8000
```

然后开 **http://localhost:8000/index.html**

**必须走 http://，`file://` 打不开首页。** 首页的 `js/hero-shader.js` 是 ES module
（`index.html:181` 的 `type="module"`），浏览器对 module 有 CORS 限制，`file://` 下直接被拒，
结果是 hero 背景一片空白。其余页面 `file://` 勉强能看，但没必要分两套。

> `https://fortunekidstudio.com` 上跑的是**已经推上去的旧版**，不含这次的改动。
> 它可以当"改之前"的对照，但**不要拿它当验收对象**。

---

## 3. 逐页检查表

导航是全站统一的：**About / Uni / Our Games / Contact Us**（News 有页面但暂时从导航里注释掉了，属正常）。

| # | 页面 | 重点看什么 |
|---|---|---|
| 1 | `index.html` | **hero 视频**：进页面就该自动播、无声、循环，没有播放按钮或黑屏定格。往下滚，标题和按钮淡出；`Contact Us` 跳到页面底部的 contact 区 |
| 2 | `uni.html` | 分步骤的那几段里有内嵌视频，**只有滚到眼前的那个在播**，划走应该自动暂停。卡片和步骤的排版在窄屏别叠一起 |
| 3 | `games.html` | 游戏 tile 的图有没有糊、有没有错位；点进 hua / backyard 两个详情页 |
| 4 | `hua.html` | **图集**（改动最大的一页，270 行）：缩略图切换、左右箭头、点大图展开影院模式、里面有视频的那几张能不能播、右上角关闭 |
| 5 | `backyard.html` | 同上，同一套图集组件（改了 200 行） |
| 6 | `news.html` | 目前没有文章，应该显示一句空状态提示，不是空白页 |
| 7 | `privacy.html` / `terms.html` | 正文能读、锚点能跳、页脚链接对得上 |

### 图集怎么测（hua / backyard 两页共用 `js/gallery.js`）

| 操作 | 预期 |
|---|---|
| 点缩略图 | 切到那一张，计数器（`3 / 8` 那种）跟着变 |
| 左右箭头按钮 | 前后切换，到头不越界 |
| 键盘 `←` `→` `Home` `End` | 同上（焦点要先在图集上） |
| 点大图 / 展开按钮 | 进影院模式（全屏遮罩） |
| 影院模式下按 `Esc` | 关掉 |
| 影院模式下按 `Tab` | 焦点被锁在弹层里，不会跑到后面的页面上 |
| 手机上左右滑 | 切换上/下一张 |
| 带 ▶ 的那几张 | 点一下播视频 |

---

## 4. 全站通用检查

| # | 项 | 预期 |
|---|---|---|
| 1 | 导航 | 每页高亮当前页；`Contact Us` 是深色胶囊；点 logo 回顶部 |
| 2 | 锚点滚动 | 平滑滚动，落点不被浮动导航挡住 |
| 3 | 进场动画 | 元素滚到视野里淡入。**只该出现一次**，来回滚不该反复闪 |
| 4 | 页脚 | 版权年份是脚本填的，应该显示 **2026**；Instagram / LinkedIn 链接能开 |
| 5 | 窄屏 | 把窗口拖到 375px 宽，全站不该出现横向滚动条 |
| 6 | 降低动态效果 | 系统里打开"减少动态效果"后刷新：动画和视频应该老实下来，页面仍然完整可读 |
| 7 | 控制台 | F12 打开，全站点一遍，**红色报错记下来**（黄色警告可以忽略） |

---

## 5. 浏览器 / 设备矩阵

至少覆盖两行，**其中必须有一行是真手机**（模拟器测不出自动播放和触摸）：

| 平台 | 浏览器 | 特别注意 |
|---|---|---|
| Windows | Chrome / Edge | hero 视频用的是 AV1，看看会不会掉帧 |
| macOS | Safari | Safari 对自动播放最严；hero 视频停在第一帧就是 bug |
| iPhone | Safari | 同上，另外看竖版视频有没有被裁得只剩背景 |
| Android | Chrome | 图集的触摸滑动 |
| 任意 | Firefox | 首页 hero 背景（Firefox 的 WebGPU 支持最不确定，见 §6） |

---

## 6. 已知的"不是 bug"

这几件事**不用报**：

1. **导航里没有 News** —— 暂时注释掉了，等第一篇文章发出来再放开。
2. **首页 hero 背景在某些机器上是静态渐变** —— 那层玻璃跑在 WebGPU 上，浏览器不支持、
   显卡拒绝分配、或者开了"减少动态效果"时，一律退回 CSS 渐变（`js/hero-shader.js`）。
   **是渐变不是灰块**就算正常；退成灰块或纯白才要报。
3. **网址打错时是 GitHub 的默认 404** —— 仓库里没有自定义 `404.html`。
4. **页脚 YouTube 图标指向 `youtube.com` 首页** —— 还没有频道地址，占位。
   （顺手确认一下是不是该先摘掉，这个可以报。）
5. **`sandbox-*.html` 那几页看起来不像正式页面** —— 它们是调参用的沙盒，不上线，
   不在测试范围内。

---

## 7. 反馈模板

每个问题一条，能给截图最好（连地址栏和控制台一起截）：

```
页面：      index.html / hua.html / ...
设备+浏览器：macOS 15 · Safari 18 · 1440×900   （手机写机型和系统版本）
操作：      滚到第二屏，点第 3 张缩略图
预期：      切到第 3 张
实际：      大图没变，计数器变成 3/8
控制台报错： （有就贴，没有写"无"）
严重程度：   挡路 / 难看 / 吹毛求疵
```

全部测完，不管有没有问题，回一句总结：

```
测试范围：__ 个页面 × __ 个浏览器
挡路问题：__ 个
可以上线：可以 / 不可以（不可以的话写卡在哪一条）
```

---

## 8. 另外一份文档

[`HERO_SANDBOX_HANDOFF.md`](HERO_SANDBOX_HANDOFF.md) 讲的是 `sandbox-hero-video.html`
那一页 —— 首页 hero 的**调参**沙盒（标题位置、标题色的取色轮）。
那是拍板参数用的，不是测试范围。**只有在你要参与决定 hero 标题摆哪儿、用什么颜色时才需要看它。**
