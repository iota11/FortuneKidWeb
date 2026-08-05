# Fortune Kid Inc. — 官网

Fortune Kid Inc.（新泽西互动娱乐工作室）官方网站。纯静态 HTML/CSS/JS，无构建步骤、无第三方依赖，
托管在 GitHub Pages，成本 $0（除域名外）。

面向读者是投资人，文案口径：具体、可核实，不用形容词堆热度。

## 目录

```
index.html            About（首页，单页滚动 + 锚点）
games.html            Our Games（作品列表）
hua.html   单个作品页（新作品复制这一份改写）
uni.html              UNI 产品页（双栏 + 滚动驱动的 3D 面板）
news.html             News（博客/动态列表，**当前暂时隐藏**：导航链接已注释、页面 noindex）
privacy.html          隐私政策（**只管游戏**，明确排除本网站 / UNI / 周边 / 商店）
terms.html            使用条款（**只管本网站**，明确排除游戏 / UNI / 购买）
css/style.css         全站样式
css/uni.css           仅 UNI 页
js/main.js            滚动入场 / 导航状态 / 数字滚动
js/uni.js             UNI 页滚动联动
assets/               图片 / logo
.nojekyll             关闭 GitHub 的 Jekyll 处理
CNAME                 自定义域名
```

## 站点结构

全站导航当前四项：`About` · `Our Games` · `Uni` · `Contact`
（`News` 因暂无内容临时下线，链接在各页以 `TODO 暂时隐藏 News` 注释保留，恢复时取消注释即可）

- **About 就是首页**，单页滚动，四个锚点分区：
  `#top` Intro → `#about` 公司故事/新泽西根基/创立命题 → `#build` 三根支柱 → `#contact`
- **Contact 不是独立页面**，是首页底部的锚点（其他页面链到 `index.html#contact`）
- **Our Games / Uni / News** 是独立页面

三根支柱固定为：Original Mobile Games、3D-Printed Collectibles、Tools That Helped
（第三项讲内部工具链，用来支撑"小团队 / 快节奏"这个可信度论点，并引出 UNI）。

## 法律页面（privacy.html / terms.html）

两页各自把适用范围写死，互不兜底 —— **这是有意的，改的时候不要打破**：

| 页面 | 管什么 | 明确不管什么 |
| --- | --- | --- |
| `privacy.html` | 表格里列出的**游戏** | 本网站、UNI、周边、App Store / Google Play |
| `terms.html` | **本网站** fortunekidstudio.com | 游戏（随商店发布的 EULA）、UNI（上线时独立 ToS）、购买退款（商店条款） |

`terms.html` 里对公司现状真正重要的两节，改文案时别删：

- **§8 Ideas, feedback and unsolicited submissions** —— 官网挂着公开邮箱，任何人都能把
  游戏点子发进来。这一节声明来稿非保密、不构成任何义务、并授予免版税使用许可，
  是"你抄了我的创意"这类主张的主要防线
- **§9 Forward-looking statements; no offer of securities** —— 站点面向投资人，
  且全站是 pre-launch 口径（Upcoming / In development / Coming soon）。
  这一节声明前瞻性表述不是承诺，且站内任何内容都不构成证券要约

`terms.html` §11 顺带补上了本网站自身的隐私披露（GitHub Pages 访问日志、Google Fonts
会把访客 IP 暴露给 Google）—— 因为 `privacy.html` 明确不管本网站，这块原本是空的。
如果以后把 Poppins 字体自托管到 `assets/`，第三方请求归零，§11 第二条就可以删掉。

**未来两件事需要另写文档，不要改这两页去迁就：**

1. 游戏上架 → 随商店发布的 EULA
2. UNI 上线 → 独立的 clickwrap ToS，必须覆盖 UGC / AI 生成内容归属 / 内容审核 /
   **DMCA 指定代理人**（§512 安全港要去美国版权局实名注册并交费，不是网页写一段就行）。
   仲裁 + 集体诉讼弃权条款也留到那时候写 —— 那里才有真正的"我同意"勾选；
   现在这种没人点过的 browsewrap 加仲裁条款，法院一般不认，对投资人观感也差

## UNI 页是怎么动的

单栏 9 段文案，每段一屏高、内容垂直居中。`js/uni.js` 只做一件事：把停在屏幕
中间的那一段标上 `.is-active`，其余段落压到 `opacity: .3`。

滚动位置 → 时间轴 `tl`（0–9，整数部分就是当前第几段）。**参考线取视口顶端**，
不是中线 —— 用中线的话页面一打开 `tl` 就已经是 0.5，01 段的静置状态会被跳过。
每帧只做一次"读 rect → 算下标"，rAF 只在还有东西要动时才继续排队。

对外口径统一叫 **worlds**（不是 places），index.html 的 Uni 卡片和 uni.html 01 段用同一句话。
文案只讲用户看得见的部分 —— 说一句话、边看边生成、说话改、一键发布 —— **不写 AI 内部怎么拆解**
（"geometry / objects / rules" 这类枚举已经删掉了，别加回来）。

> 早先右栏有一块 sticky 的 CSS 3D 占位场景（Place A 小花园 / Place B 跑酷小关卡），
> 由滚动进度驱动旋转、装配、切换。已整体移除 —— HTML 里的 `.uni-stage`、CSS 里的
> `.bx`/`.place`/`--asm`/`--swap`/`--ghost`，以及 `js/uni.js` 的 `TRACKS` 关键帧表
> 都不在了。真模型到位后是重新加一块，不是恢复这块。

### 移动端

≤900px 时段落不再一段一屏，改成靠上下间距拉开；压暗效果只在 ≥901px 生效。

### 减少动效

`prefers-reduced-motion: reduce` 时不做压暗，所有段落保持正常亮度。
**注意：headless Chrome 默认就是 reduce**，用无头浏览器截图/测试时会走到这条分支。

## 本地预览

直接双击 `index.html` 用浏览器打开即可（全站用相对路径，file:// 也能跑）；或起个本地服务器：

```bash
cd FortuneKidWeb
python3 -m http.server 8000   # 然后访问 http://localhost:8000
```

## 上线（GitHub Pages）

1. 把本仓库推到 GitHub（public 仓库的 Pages 免费）。
2. 仓库 **Settings → Pages → Source** 选 `main` 分支、根目录 `/`，保存。
3. 几分钟后可通过 `https://<你的用户名>.github.io/FortuneKidWeb/` 访问。

## 绑定自定义域名（注册域名后）

1. 在仓库根目录新建 `CNAME` 文件，内容仅一行你的域名，例如：
   ```
   fortunekid.com
   ```
2. Settings → Pages 的 **Custom domain** 填入同一域名，勾选 **Enforce HTTPS**。
3. 在域名 DNS 处添加：
   - Apex `@` A 记录 × 4：`185.199.108.153` / `185.199.109.153` / `185.199.110.153` / `185.199.111.153`
   - `www` CNAME → `<你的用户名>.github.io`

域名：**fortunekidstudio.com**（Cloudflare 注册）。GitHub 用户名：**iota11**。

## 待办

### 内容

- [ ] 首页 Contact 保持原样（标题 + 一句话 + 邮箱）。handoff 里提到的投资人内容
      —— 领导层履历、明确的 ask（deck / data room / intro call）—— 目前**没有**放在页面上，
      需要时再决定放 Contact 还是分一部分到 About

- [ ] News 现在是**暂时隐藏**的空页面。发第一篇时按顺序做三件事：
      ① 复制 `news.html` 里 `<template id="post-template">` 的 `<article>`，粘到 `.posts` 顶部
      （新的在上），然后删掉 `.empty` 那块空状态；
      ② 删掉 `news.html` `<head>` 里的 `<meta name="robots" content="noindex, nofollow" />`；
      ③ 在 `index.html` / `games.html` / `uni.html` / `hua.html` 里搜索
      `TODO 暂时隐藏 News`（每个文件顶部导航 + 页脚各一处），把注释里的链接放回去
- [ ] `terms.html` 上线前请律师过一遍（尤其 §8 来稿条款、§9 证券免责、§14 责任上限）。
      当前版本是按公司现状写的，不是法律意见
- [ ] 商标：`Fortune Kid` / `Hua` / `UNI` 目前在 `terms.html` §5 按未注册商标主张
      （TM 而非 ®）。真去 USPTO 注册后再改措辞
- [ ] 考虑把 Poppins 自托管到 `assets/`：第三方请求归零，`terms.html` §11 可以简化
- [ ] 加新游戏：复制 `games.html` 里注释掉的 `.tile` 模板，另建 `game-<slug>.html`
      （直接复制 `hua.html` 改写）
- [ ] 放入 logo / 游戏截图到 `assets/`；`.tile-art` 现在是纯色占位，换成真截图
- [ ] 游戏上架后：`.tile-status` 和 `hua.html` 的 `.detail-note` 换成真实商店链接，
      把 About 数据条的 "Building" 换成真实上线数据，并同步更新全站所有"在研中"措辞
      （当前全站均为 pre-launch 口径，**不得暗示已上架**）

### UNI 页

- [ ] 真模型：03/04 用同一个物体（装配 + 分身），05 需要一个视觉上明显不同的第二个物体。
      现在是 CSS 图元占位
- [ ] 滚动联动需要在真机/真浏览器上过一遍手感。无头浏览器测不出卡顿，
      而 sticky + 滚动联动旋转最容易在这里露怯
- [ ] 移动端交互（拖动 vs 自动轮播）值得单独再过一版细则

### 基础设施

- [x] 域名已注册、`CNAME` 已创建
- [ ] 推仓库到 GitHub、开 Pages、配 DNS（见上）
- [ ] 开通 Zoho 邮箱，把联系邮箱确认为 `hello@fortunekidstudio.com`
