# Brandloop 冷启动手册（为"粉丝 ≈ 0"设计）

> 核心认知：**0 粉丝时，分发 ≠ 向自己的粉丝广播**（你没有）。
> 分发 = ①**借别人的受众** + ②**去 ICP 已经聚集的地方** + ③**1:1 直接触达** + ④**搜索/工具这种不依赖粉丝、会复利的渠道**。
> 早期验证靠的是**50 段真实对话**，不是 5000 次冷曝光。先做不可规模化的事。

验证指标：**访客 → 注册转化率**。站点已埋 `source` 归因（注册会记录来源）。
配合免费的 **Cloudflare Web Analytics**（dashboard 一键开）看访客数当分母。
- 转化率 **> 5–8%** → 强需求，值得投开发；
- **< 2%** → 换钩子或换 ICP（站点 10 分钟可改）。

所有外链都带 UTM，便于分渠道看转化：
`...workers.dev/?utm_source=reddit&utm_medium=post&utm_campaign=launch`
（把 `utm_source` 换成 `ih` / `x` / `dm` / `ph` / `betalist` 等）

---

## 4 周作战序列

### Week 0 — 备弹药（现在）
- [ ] 开 Cloudflare Web Analytics（看访客）；绑 KV `LEADS`（存注册）；设飞书/企业微信 `LEAD_WEBHOOK_URL`（实时通知）。
- [ ] 录一段 **60–90 秒 Loom**：屏幕演示"输入业务 → 生成一周内容计划"。这是你所有外推帖的钩子。
- [ ] 备好各渠道的 UTM 短链（见上）。

### Week 1 — 1:1 直接触达（0 粉丝下信号最强，先做）
不需要任何粉丝。手动挑 **100 个 ICP**（独立开发者 / 小团队创始人 / 没营销的 SMB），逐个私信/邮件。
- 渠道：X、LinkedIn、IndieHackers、相关 Discord/Slack 成员、Reddit DM。
- 姿态：**先做用户访谈，不是推销**。问痛点，顺带给早期访问。
- 目标：**20+ 段对话、5–10 个注册**——这是最真实的需求验证。

### Week 1–2 — 社区"先给价值"（借受众）
去 ICP 聚集地**先答疑、再软提**，绝不硬广（每个社区都有规则，先读 rules）：
- Reddit：r/SaaS、r/Entrepreneur、r/smallbusiness、r/marketing、r/indiehackers、r/SideProject
- IndieHackers（发 "Show IH"）、Hacker News（Show HN，需站稳）、Peerlist
- 垂直 Discord/Slack（"build in public"、SaaS、创始人社群）、相关 Facebook 群、LinkedIn 群
- Quora / 知乎海外版回答"如何稳定做内容"类问题

### Week 2 — 上线平台（借受众，几乎免费流量）
逐个提交，每个都能带来一批早期访客：
- **BetaList**、**Product Hunt**（先挂 "Coming Soon" 蓄水，再正式 launch）
- microlaunch.io、Uneed、Startup Fame、Peerlist Launchpad、Tiny Launch、Dang.ai（AI 目录）
- 各类 "AI tools" 目录（There's An AI For That 等）

### Week 2–4＋ — Build in public（慢，但从 0 复利）
每天/隔天在 X + LinkedIn 公开做产品的过程。粉丝就是这样从 0 长出来的：**有用 + 真实 + 互动**。
- 角度：今天做了什么、一个数据、一个踩坑、一个用户洞察、一张截图。
- 多和大号/社区互动（真诚评论），比自说自话涨粉快。

### 一直做 — SEO / 内容（不依赖粉丝，长期复利）
写长尾对比/教程，目标词如 *"AI social media manager for \<niche\>"*、*"how to stay consistent posting as a solo founder"*。
- 把站内的**样例周计划生成器**单独做成一个免费工具页（"Free AI content calendar generator"），可被搜索和转发——**工具本身就是分发**。

### 可选 — 小额付费（均衡风险，买"分母"提速）
$5–10/天 在 Reddit/X/Google 投给精准 ICP，快速拿到访客做转化测试。能跑通再加预算。

---

## 可直接复制的文案

### 1) 冷私信 / 冷邮件（Week 1 主力）
> Hi {name} — saw you're building {their product} solo. Quick one: how do you keep up with
> posting content consistently while doing everything else? I kept dropping the ball, so I'm
> building **Brandloop** — an AI that plans, writes in your voice, schedules, and learns what
> converts (not just another AI writer). 60-sec demo: {loom}. Mind if I send you early access?
> Genuinely want your take on whether this is useful.

要点：个性化第一句、问问题、给 demo、要反馈而非要钱。一天 20 条，别群发。

### 2) Reddit / 社区"先给价值"帖
> **Title:** Solo founders — how do you stay consistent with content without it eating your week?
>
> I run a small {SaaS/store} and content was the first thing I'd drop. I tried generic AI
> writers but they only give you drafts — you still plan, reformat per platform, schedule, and
> guess what worked. So I built a little tool that does the whole loop and learns from results.
> Happy to share the early version if useful — but mostly curious how others here handle this.

要点：标题是真问题、正文先共情、工具一笔带过、邀请讨论。遵守各 sub 自推规则。

### 3) IndieHackers "Show IH" / Build-in-public 首帖
> **Show IH: Brandloop — an AI marketing manager that does the work, not just the words**
>
> The gap I kept hitting: AI writers hand you a draft, then you still do everything else.
> Brandloop closes the loop — plan → write on-brand → schedule → learn from what converts.
> It's pre-launch; I'm collecting a small first cohort for early-access founder pricing.
> Would love feedback on the positioning and the sample generator on the page: {url}

### 4) BetaList / Product Hunt 简介
> **Tagline:** Your AI marketing manager that does the work — not just the words.
> **Description:** Brandloop plans your content, writes in your brand voice, schedules it, and
> learns from what converts — on autopilot. Built for founders and small teams who'd rather
> build than market. Join the waitlist for early-access founder pricing.

### 5) X build-in-public 起手贴
> Starting something new: **Brandloop** — an AI marketing manager that actually *does* the
> work (plan → write on-brand → schedule → learn), not another "here's a draft" AI.
> I have ~0 audience, so I'm building it in public from zero. Follow along.
> Day 1: landing + a sample-week generator is live 👉 {url}

---

## 30 天目标线（务实）
- 100 条 1:1 触达 → 20+ 对话 → 30–80 注册
- 6–10 个社区/平台露出，带 UTM 看哪个渠道注册率最高
- 选出 1–2 个"会出注册"的渠道，集中加倍
- 拿到 **转化率 + 真实用户语言**，决定是否投入开发 / 调整定位

> 记住：0 粉丝不是劣势，是逼你做"不可规模化但高信号"的动作。能手动搞定前 50 个用户的人，才配得上自动化后面的 5000 个。
