# 项目说明与协作约定（通税云 TongTax）

## 部署偏好（重要 · 默认遵循）

- **默认部署平台：Cloudflare + GitHub（免费额度大）。不要用 Netlify。**
- 结构为 **Workers + Static Assets**：`wrangler.toml`（`main = worker.js`、
  `[assets] directory = "./public"`）+ `worker.js`（服务静态资源 + `POST /api/lead`）+
  `lib/lead.js`（waitlist 逻辑）。静态站点在 `public/`。
- Cloudflare 的 Git 集成每次 push 自动跑 `npx wrangler deploy`，无需额外构建步骤。
- **⚠️ 生产分支**：Cloudflare 默认构建 **main**。开发在功能分支上，故需把 Cloudflare
  项目的生产分支改成该功能分支，**或**把代码合并进 `main`，否则会构建到空的 main 而失败。
- 部署前可用 `npx wrangler deploy --dry-run` 本地校验配置。
- 可选：dashboard 绑定 KV `LEADS`、设置变量 `LEAD_WEBHOOK_URL` 启用存储/通知。

## 产品定位（Brandloop）

方向：**全球独立 AI 产品（卖给海外、赚美元）**，彻底绕开中国巨头。
风险姿态：均衡——**先用英文 waitlist 落地页验证需求，再投入开发**。

**Brandloop = "会替你干完活"的 AI 营销经理**：自动规划内容 → 按品牌口吻创作 →
排期发布 → 从转化数据中学习（plan → create → publish → learn 的闭环）。
不是又一个只写文案的 AI（红海），而是完成整段工作流的 Agent。
- **护城河**：每账号沉淀的"品牌口吻 × 效果"专有数据，越用越懂你，难复制。
- **客户**：没空做营销的全球创始人 / 小团队 / indie hacker / 代运营机构（英文、自助付费）。
- **当前站点目标**：waitlist 验证（注册转化率 = 需求信号），未上线真实产品。

> 注：本仓库历史上曾做过"通税云/出口退税"方向，已废弃——勿再回到税务/外贸/储能等老本行。

## 目录结构

```
public/index.html              # 单页落地页（含样例周计划生成器）
public/assets/css/styles.css   # 自包含设计系统，响应式
public/assets/js/main.js       # 样例生成器 / 导航 / 滚动渐显 / waitlist 表单
worker.js                      # Worker：服务静态资源 + POST /api/lead
lib/lead.js                    # waitlist 共享逻辑（KV + Webhook，均可选）
wrangler.toml                  # Workers + Static Assets 配置
```

## 本地预览

```bash
python3 -m http.server 8080 --directory public   # 纯静态预览
# 或带 Worker/API：npx wrangler dev
```

## 表单后端（已接 Cloudflare Pages Functions）

留资表单 AJAX 提交到 `POST /api/lead`，由 `functions/api/lead.js` 处理。
该函数全部能力可选、优雅降级（缺绑定也不会让表单报错）：

- **持久化存储**：在 Pages 项目 → Settings → Functions → KV namespace bindings，
  绑定变量名 `LEADS` 到一个 KV 命名空间，线索即写入 KV。
- **实时通知**：设置环境变量 `LEAD_WEBHOOK_URL`（飞书/企业微信/Slack 机器人），
  每条线索实时推送。
- 本地纯静态预览没有后端，fetch 失败时前端优雅降级为成功反馈，属正常现象。
