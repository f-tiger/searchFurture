# Brandloop

> **Your AI marketing manager that does the work** — it plans your content, writes in your
> brand voice, schedules it, and learns from what converts. For founders and small teams who'd
> rather build than market.

这是一个**英文 waitlist 验证站**，对应"全球独立 AI 产品（卖给海外、赚美元）"方向。
打法是 indie hacker 的"先验证后造"：用落地页 + waitlist 测真实需求，再投入开发。

## 为什么是这个定位

- **全球市场、赚美元**：面向海外创始人/小团队，彻底绕开中国巨头（它们不在全球 indie SaaS 战场）。
- **不是又一个 AI 写手**：通用文案 AI 已是红海。Brandloop 是**完成整段工作流的 Agent**——
  规划→创作→排期→学习，2026 的赢家"替你干完活"，而不是只给建议。
- **护城河 = 专有数据**：每账号沉淀"品牌口吻 × 转化效果"，越用越懂你，竞品难复制
  （护城河在工作流+数据+分发，不在模型）。
- **可自助付费**：$19/mo 起的早鸟价，高毛利、可被收购的资产。

## 站点内容

- Hero + 交互式**样例周计划生成器**（输入你的业务 → 生成 5 条多平台内容计划，强获客钩子）
- 痛点（创始人每周 3–10 小时耗在社媒）
- How it works（连接品牌 → 规划创作 → 排期学习）
- 六大功能（品牌口吻引擎 / 干完活的 Agent / 效果学习闭环 / 多平台原生 / 内容日历 / 白话分析）
- 差异化对比（vs 通用 AI 写手 vs 请代运营/自己做）
- 适用对象、市场数据（含来源）、定价、waitlist 表单、FAQ

## 技术

纯静态站点，**无构建步骤、无运行时外部依赖**，可部署到任意静态托管。

```
index.html                     # 单页落地页
assets/css/styles.css          # 自包含设计系统
assets/js/main.js              # 样例周计划生成器 / 导航 / 渐显 / waitlist 表单
functions/api/lead.js          # Cloudflare Pages Function：waitlist 接口 POST /api/lead
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
