# 项目说明与协作约定（通税云 TongTax）

## 部署偏好（重要 · 默认遵循）

- **默认部署平台：Cloudflare Pages + GitHub（免费额度大）。不要用 Netlify。**
- 站点为纯静态：根目录即发布目录，无构建步骤。
- 自动部署管线见 `.github/workflows/deploy.yml`（每次 push 经 GitHub Actions 部署到
  Cloudflare Pages）。需要的仓库 secret：
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- 或在 Cloudflare 控制台 **Pages → Connect to Git** 直接连本仓库（构建命令留空，
  输出目录为根 `/`），零配置即可上线。

## 产品定位

平台中立的 **AI 出口退税与跨境财税合规助手**，客户是做出口/出海的中国企业
（客户在国内 → 零本地化负担）。壁垒 = 通关退税域知识 + 软件能力 + 出错敢担责，
切平台/ERP 因利益冲突或深度不足做不了的垂直层。

## 目录结构

```
index.html                     # 单页落地页（含交互式退税测算器）
assets/css/styles.css          # 自包含设计系统，响应式
assets/js/main.js              # 测算器 / 导航 / 滚动渐显 / 表单
.github/workflows/deploy.yml   # Cloudflare Pages 自动部署
```

## 本地预览

```bash
python3 -m http.server 8080   # 打开 http://localhost:8080
```

## 表单后端

留资表单当前由 JS 给出本地成功反馈。接入真实后端时，把 `index.html` 中
`#leadForm` 的 `action` 指向接口（Cloudflare Pages Functions `/functions/api/lead.js`
或 Formspree 等）即可。
