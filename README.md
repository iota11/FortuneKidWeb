# Fortune Kid Inc. — 官网

Fortune Kid Inc.（新泽西互动娱乐工作室）官方网站。纯静态 HTML/CSS，托管在 GitHub Pages，成本 $0（除域名外）。

## 目录

```
index.html        首页
css/style.css     样式
assets/           图片 / logo（自行放入）
.nojekyll         关闭 GitHub 的 Jekyll 处理
CNAME             自定义域名（注册域名后创建，见下）
```

## 本地预览

直接双击 `index.html` 用浏览器打开即可；或起个本地服务器：

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

## 待办 / 可自定义

- [x] 域名已注册、`CNAME` 已创建
- [ ] 推仓库到 GitHub、开 Pages、配 DNS（见上）
- [ ] 开通 Zoho 邮箱，把联系邮箱确认为 `hello@fortunekidstudio.com`
- [ ] 放入 logo / 游戏截图到 `assets/`，并在页面引用
- [ ] 游戏上架后，在 "What We Build" 卡片加上 App Store / Google Play 链接
