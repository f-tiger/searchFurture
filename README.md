# 通税云 TongTax

> 平台中立的 **AI 出口退税与跨境财税合规助手** —— 为中国外贸与出海企业打造的财税后台。

这是一个可直接上线的产品官网（落地页），由一次"40岁后财富增长路径调研"收敛而来：
不与平台/ERP 在宽口工具上正面竞争，而是切入巨头**有利益冲突、做不深、不敢担责**的垂直层——
**出口退税与跨境财税合规**。

## 为什么是这个定位

- **客户在国内，零本地化**：服务做出口的中国企业，绕开"海外市场复杂、本地化重"的难题。
- **独家壁垒**：通关退税域知识 + 软件能力，平台的免费 AI 只能"提示"，做不到"核算 + 担责"。
- **政策强驱动**：2025 跨境电商合规元年、金税四期、2026《增值税法》落地，退税合规成刚需。
- **平台中立**：跨阿里 / Amazon / 独立站 / 线下统一归集，这是平台型巨头因利益冲突做不出来的东西。

## 站点内容

- Hero + 交互式**出口退税测算器**（获客钩子）
- 为什么是现在（合规时代的政策窗口）
- 产品六大能力（退税核算 / 四流合一 / 合规预警 / 跨平台归集 / 资金外汇 / AI 政策问答）
- 差异化对比（vs 平台免费 AI vs 传统 ERP）
- 适用对象、市场数据（含来源）、落地流程、定价
- 预约诊断留资表单（兼容 Netlify Forms）

## 技术

纯静态站点，**无构建步骤、无运行时外部依赖**，可部署到任意静态托管。

```
index.html                     # 单页落地页
assets/css/styles.css          # 自包含设计系统
assets/js/main.js              # 退税测算器 / 导航 / 渐显 / 表单
functions/api/lead.js          # Cloudflare Pages Function：留资接口 POST /api/lead
.github/workflows/deploy.yml   # Cloudflare Pages 自动部署
```

### 留资后端

表单 AJAX 提交到 `POST /api/lead`（`functions/api/lead.js`）。可选配置：
- 绑定 KV 命名空间 `LEADS` → 线索持久化存储；
- 设置环境变量 `LEAD_WEBHOOK_URL`（飞书/企业微信/Slack 机器人）→ 实时通知。
缺任一绑定都会优雅降级，不影响表单提交。

### 本地预览

```bash
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

### 部署（Cloudflare Pages + GitHub）

本项目默认部署到 **Cloudflare Pages**（免费额度大）。两种方式任选其一：

1. **GitHub Actions 自动部署（已配置）**：在仓库 `Settings → Secrets and variables → Actions`
   添加 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`，之后每次 push 自动部署
   （见 `.github/workflows/deploy.yml`，首次运行自动创建名为 `tongtax` 的 Pages 项目）。
2. **控制台连仓库（零配置）**：Cloudflare → `Pages → Connect to Git` → 选本仓库，
   构建命令留空、输出目录为根 `/`，保存即上线。

## 免责声明

本站为产品概念展示；市场数据来自公开来源并标注出处；退税测算结果仅为示意估算，
不构成税务、法律或投资建议。实际退税以发票、报关单及税务机关申报系统核算为准。
