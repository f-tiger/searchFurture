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

## 技术（Cloudflare Workers + Static Assets）

静态站点托管在 `public/`，由一个轻量 Worker 提供静态资源并处理 waitlist API。

```
public/index.html              # 单页落地页
public/assets/css/styles.css   # 自包含设计系统
public/assets/js/main.js       # 样例周计划生成器 / 导航 / 渐显 / waitlist 表单
worker.js                      # Worker：服务静态资源 + 处理 POST /api/lead
lib/lead.js                    # waitlist 共享处理逻辑（KV + Webhook，均可选）
wrangler.toml                  # Workers + Static Assets 配置
```

### 留资后端

表单 AJAX 提交到 `POST /api/lead`（`worker.js` → `lib/lead.js`）。可选配置：
- 绑定 KV 命名空间 `LEADS` → 注册信息持久化存储；
- 设置变量 `LEAD_WEBHOOK_URL`（飞书/企业微信/Slack 机器人）→ 实时通知。
缺任一绑定都会优雅降级，不影响表单提交。

### 本地预览

```bash
# 纯静态预览（API 无后端，表单会优雅降级为成功提示）
python3 -m http.server 8080 --directory public
# 或带 Worker/API 的完整预览：
npx wrangler dev
```

### 部署（Cloudflare Workers，连 GitHub）

Cloudflare 的 Git 集成会在每次 push 自动运行 `npx wrangler deploy`：
- **生产分支**：在 Cloudflare 项目 → Settings 里把生产分支设为实际开发分支，
  或将代码合并到 `main`（Cloudflare 默认构建 `main`）。
- `wrangler.toml` 已配置 `main = worker.js` 与 `[assets] directory = "./public"`，
  无需额外构建步骤。
- 可选：在 dashboard 绑定 KV `LEADS`、设置变量 `LEAD_WEBHOOK_URL` 以启用存储/通知。

## 免责声明

Brandloop 为早期验证阶段的预发布产品，"Brandloop" 为暂用名；样例生成器仅在本地产出
示意内容，尚未生成真实内容。文中市场数据来自公开来源并标注出处。加入 waitlist 不产生
任何义务，邮箱仅用于团队就上线事宜与你联系。
