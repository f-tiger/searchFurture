# 项目说明与协作约定（通税云 TongTax）

## 工作流铁律（重要 · 默认遵循）

- **🔴 执行/开发任何新方向前，必须先做竞对与格局调研。** 用真实数据看清：谁已在做、
  拥挤度、巨头是否卡位、有没有 solo 能站的窄缝；据此判断方向是否值得做，避免盲目开干、
  避免战略方向错误。调研结论先同步给用户，再决定动手。这条优先于"直接开干"。

## 部署偏好（重要 · 默认遵循）

- **🟢 标准授权（用户已确认）：开发完成后，直接把功能分支合并到 `main` 并推送上线，
  无需每次再问。** 用户只给方向，部署默认自动完成。
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

**Brandloop = "听起来像你、不像 AI"的 AI 营销经理**（定位经竞对调研收窄而来）。
全行业第一痛点 = "AI 内容千篇一律、一股 AI 味"（连 Jasper 的 brand voice 都没解决）；
"会替你干完活的闭环"差异化已被 BlogBurst/Apaya 占走。故把楔子从"会干活"换到
**"真的是你的口吻"**——以"反 AI 千篇一律 + 每账号专属口吻数据越用越像你（可复利专有数据护城河）"为核心。
- **闭环仍在**：plan → create → publish → learn，但卖点是 authenticity，不是"什么都干"。
- **收窄 ICP**：**自己就是品牌门面的创始人**（个人品牌驱动 / 顾问 / 创作者 / 小工作室），
  对"像不像我"零容忍，通用 AI 直接出局。
- **当前站点目标**：waitlist 验证（注册转化率 = 需求信号），未上线真实产品。
- 注：通用"AI 营销 Agent"定位是红海(BlogBurst/Jasper/Predis)；本定位为收窄后的可防御版。

> 注：本仓库历史上曾做过"通税云/出口退税"方向，已废弃——勿再回到税务/外贸/储能等老本行。

## 目录结构

```
public/index.html              # 单页落地页（含样例周计划生成器 + 自助定价）
public/pricing/                # 定价页（Pro 自助下单 + FAQ）
public/success/                # 付款成功页（轮询取回 License Key）
public/assets/css/styles.css   # 自包含设计系统，响应式
public/assets/js/main.js       # 样例生成器 / 导航 / 滚动渐显 / waitlist 表单
public/assets/js/checkout.js   # [data-checkout] → POST /api/checkout → 跳 Stripe（降级回 waitlist）
worker.js                      # Worker：服务静态资源 + /api/lead /generate /checkout /stripe-webhook /license
lib/lead.js                    # waitlist 共享逻辑（KV + Webhook，均可选）
lib/generate.js                # AI 内容生成（Anthropic）；持 License 跳限额+升级模型
lib/billing.js                 # Stripe Checkout/Webhook/License（自助计费内核）
wrangler.toml                  # Workers + Static Assets 配置
```

## 本地预览

```bash
python3 -m http.server 8080 --directory public   # 纯静态预览
# 或带 Worker/API：npx wrangler dev
```

## AI 生成（可选 · 真·Claude）

免费内容日历工具的"✨ Generate with AI"按钮调用 `POST /api/generate`（`lib/generate.js`），
经 Anthropic Messages API 用 Claude 生成按品牌口吻的内容计划。**默认关闭、优雅降级**：
没设 key 或调用失败时，前端自动回退到本地模板生成，绝不报错。

启用与配置（Worker → Settings）：
- `ANTHROPIC_API_KEY`（加密 Secret）— 设了才启用真 AI。
- `GEN_MODEL`（可选）— 默认 `claude-haiku-4-5`（公开工具按次计费，默认偏省成本）；
  想要更高质量可设 `claude-opus-4-8`。
- `GEN_DAILY_LIMIT`（可选，默认 8）— 每 IP/天调用上限（防滥用/控成本，依赖 KV `LEADS`）。
- `GEN_MODEL_PRO`（可选）— 持有有效 License 的付费用户使用的模型，默认 `claude-opus-4-8`。

> 注：这是迈向真实产品的第一刀——免费工具从模板升级为真 AI，更强的获客磁石。

## 自助计费与许可（Stripe · 可选 · 优雅降级）

把"免费工具 + waitlist"升级为**可自助成交的商业闭环**：付费即得 License Key，
凭 key 解锁所有工具（去掉免费日限、用最高质量模型）。代码全部 drop-in、缺配置即降级
回 waitlist，**永不让漏斗断头**。

- 路由（`worker.js` → `lib/billing.js`）：
  - `POST /api/checkout` — 创建 Stripe Checkout Session（inline price_data，**店主无需在
    Stripe 后台预建商品**），返回 `{ok,url}`；前端 `assets/js/checkout.js` 跳转到 Stripe。
  - `POST /api/stripe-webhook` — 校验签名（Web Crypto HMAC-SHA256），`checkout.session.completed`
    时铸造 License（`lic:<token>` 存 KV）+ `sess:<id>→token`（7 天）+ 可选 webhook 通知。
  - `GET /api/license?session_id=...` — 成功页 `public/success/` 轮询取回 License Key。
  - `verifyLicense()` 被 `/api/generate` 调用：持 key 者跳过免费限额、走 `GEN_MODEL_PRO`。
- 前端：`public/pricing/`（定价页+FAQ）、`public/success/`（取回并展示 key，存 localStorage
  `bl_license`）、内容日历工具内置 paywall（命中免费日限弹"Go Pro"）+ License 输入框。
- 上线所需配置（Worker → Settings）：
  - `STRIPE_SECRET_KEY`（Secret，必填才启用计费）、`STRIPE_WEBHOOK_SECRET`（Secret，校验 webhook）。
  - 可选：`PRICE_USD_CENTS`（默认 1900=$19/mo）、`PLAN_NAME`（默认 "Brandloop Pro"）、
    `PUBLIC_BASE_URL`、`LEAD_WEBHOOK_URL`（成交实时通知）。
  - Stripe Dashboard → Webhooks 新增端点 `https://<域名>/api/stripe-webhook`，监听
    `checkout.session.completed`，把签名密钥填入 `STRIPE_WEBHOOK_SECRET`。
- **第一次成交所需的人工动作**（只此一次，无法由 AI 代办）：店主自建 Stripe 账号（KYC/收款），
  填上述两个 Secret。配齐后整条链路即全自动：访客点击 → Stripe 付款 → 自动发 key → 工具解锁。

### 成交链路自测（`scripts/e2e-sale.mjs`）

真实跑通"成交"管线的冒烟测试：伪造签名被拒 → 真·Stripe 签名的 `checkout.session.completed`
被接受 → KV 铸造 License → 买家取回 key。**已用本地真 Worker（`wrangler dev`）跑通 8/8**。

```bash
# 本地：.dev.vars 里设 STRIPE_WEBHOOK_SECRET=whsec_e2e_proof_secret
npx wrangler dev --port 8787 --local      # 终端 A
node scripts/e2e-sale.mjs                  # 终端 B
# 生产（配好真 webhook secret 后，可随时验证线上成交链路）：
BASE=https://searchfurture.tuoqiantu.workers.dev STRIPE_WEBHOOK_SECRET=whsec_live_xxx node scripts/e2e-sale.mjs
```

## 表单后端（已接 Cloudflare Pages Functions）

留资表单 AJAX 提交到 `POST /api/lead`，由 `functions/api/lead.js` 处理。
该函数全部能力可选、优雅降级（缺绑定也不会让表单报错）：

- **持久化存储**：在 Pages 项目 → Settings → Functions → KV namespace bindings，
  绑定变量名 `LEADS` 到一个 KV 命名空间，线索即写入 KV。
- **实时通知**：设置环境变量 `LEAD_WEBHOOK_URL`（飞书/企业微信/Slack 机器人），
  每条线索实时推送。
- 本地纯静态预览没有后端，fetch 失败时前端优雅降级为成功反馈，属正常现象。
