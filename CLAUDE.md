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

## 表单后端（已接 Cloudflare Pages Functions）

留资表单 AJAX 提交到 `POST /api/lead`，由 `functions/api/lead.js` 处理。
该函数全部能力可选、优雅降级（缺绑定也不会让表单报错）：

- **持久化存储**：在 Pages 项目 → Settings → Functions → KV namespace bindings，
  绑定变量名 `LEADS` 到一个 KV 命名空间，线索即写入 KV。
- **实时通知**：设置环境变量 `LEAD_WEBHOOK_URL`（飞书/企业微信/Slack 机器人），
  每条线索实时推送。
- 本地纯静态预览没有后端，fetch 失败时前端优雅降级为成功反馈，属正常现象。
