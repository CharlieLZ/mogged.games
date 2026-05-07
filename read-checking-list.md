# Image Editor AI 部署检查清单

这个文件用于线上事故和部署前后的快速对照。原则是先确认运行时事实，再修配置；不要把本地 `.env` 里有值当成线上 Worker 已经有值。

最常见的根因不是“代码突然坏了”，而是 **Cloudflare Worker runtime 没拿到完整 env / secret / binding**。本地 `.env`、构建时变量、`wrangler.jsonc`、Cloudflare Dashboard、数据库 `config` 表是五层东西，线上最终以 Worker runtime + 非空 DB config override 为准。

排查时只看变量名、类型、是否存在、长度和来源，不要在日志、聊天、issue、commit 或截图里暴露 secret value。

本版按以下来源整理：

- `git log --all` 的 613 条历史 commit message
- `src/config/index.ts`、`scripts/verify-env.ts`、`src/shared/services/settings.ts`
- `wrangler.jsonc`、`scripts/setup-cf-vars.mjs`、`scripts/setup-cf-secrets.sh`
- 支付、auth、AI provider、storage、通知、analytics、SEO、Cloudflare/OpenNext 相关代码路径

## 0. 工作区和发布路径

- 根目录 checkout 保持在 `main`；改代码或文档时先开 `.worktrees/<task-name>`。
- 不要提交 `.env`、`.env-ref`、本地 `wrangler.toml`、Cloudflare token、Stripe key、数据库连接串。
- 默认生产发布链路是 Cloudflare Workers 绑定 GitHub 仓库，`origin/main` 有新提交后由 Cloudflare 自动构建发布。
- `pnpm cf:deploy` 是手动兜底路径，用于补发、排障或 Cloudflare 自动发布异常时人工发布。
- 发布前先确认：
  - `git status --short`
  - `git branch --show-current`
  - `git worktree list`
  - `pnpm verify:env`
  - `pnpm release:gate`

## 1. 错误快速分诊

| 症状                                                                                | 先查什么                                                                                          | 常见修复                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `payment provider not found`                                                        | Worker runtime 是否注册了 Stripe provider                                                         | 补齐 `DEFAULT_PAYMENT_PROVIDER`、`STRIPE_ENABLED` 和 Stripe publishable/secret/signing key |
| Stripe webhook 报 `No signatures found matching the expected signature for payload` | 是否使用原始 body、是否用了当前 webhook endpoint 的 `whsec`                                       | 修 raw body 校验链路，或更新正确的 `STRIPE_SIGNING_SECRET`                 |
| 本地 `.env` 正常，线上还是缺支付 provider                                           | Cloudflare Worker bindings，而不是本地文件                                                        | 更新 `wrangler.jsonc` 和 Worker secrets 后重新发布                         |
| `cf:vars:sync` 后正常，下一次 deploy 又坏                                           | `wrangler.jsonc` 缺 plain-text vars，deploy 覆盖了 Worker settings                                | 把稳定 plain-text vars 写进 `wrangler.jsonc`，保留 `keep_vars: true`       |
| `pnpm cf:deploy` build/upload 成功，但 route 阶段失败                               | Cloudflare token 没有 zone route 权限                                                             | 使用有 route 权限的 token，或只在已有 route 不变时用 no-routes 临时发布    |
| 域名访问还是旧版本                                                                  | Cloudflare GitHub 自动发布未完成、custom domain route 未指向当前 Worker、或手动 deploy 没改 route | 查 Cloudflare Worker version、custom domain、route、health endpoint        |
| 构建产物疑似带出密钥                                                                | `.open-next` 或 `.next` 中是否残留 `.env` / secret                                                | 跑 secret artifact guard，必要时重新 build                                 |
| Worker 运行时报 DB/session/auth 错                                                  | Hyperdrive binding、`DATABASE_URL`、`AUTH_SECRET`、DB singleton 开关                              | 对照 Worker bindings 和 runtime config                                     |
| Google One Tap 不显示                                                               | public client config、server runtime availability、cookie/session 状态                            | 查 One Tap availability API 和前端 runtime config                          |
| 新用户登录后没有注册赠送积分                                                        | Worker 是否同时有 `INITIAL_CREDITS_ENABLED=true` 和 `INITIAL_CREDITS_AMOUNT`，DB config 是否覆盖    | 补齐 Worker plain-text vars，必要时用幂等补发脚本补历史账号                |
| 登录后匿名 100 免费额度消失                                                         | `get-viewer-info` 对 authenticated viewer 是否仍返回 `guestQuota`，guest route 是否拒绝登录用户    | 保留浏览器 guest cookie quota，和账号 credits ledger 分开                  |
| 订单成功但积分/通知异常                                                             | payment order、credits、webhook idempotency、admin email                                          | 查 payment/order records、manual review alerts、`ADMIN_NOTIFICATION_EMAIL` |
| Prompt 翻译 / 重写失败                                                              | `OPENROUTER_API_KEY` 是否在 env 或 DB config 中存在                                               | 补 OpenRouter key，确认 prompt tool 扣费和退款链路                         |
| KIE / Seedance 报 provider 未配置                                                   | KIE tier key、Volcengine key、provider fallback order                                             | 补 `KIE_API_KEY_TEST/FREE/PAID` 或 `VOLCENGINE_API_KEY`                    |
| 上传成功但生成输入不可访问                                                          | R2/S3 provider 是否注册、public domain/fallback URL 是否正确                                      | 查 `R2_*` / `S3_*`、storage upload claim、provider 能否读 URL              |
| 管理员日报缺 Google/Bing 数据                                                       | GSC、CRUX/PageSpeed、Bing key 是否只在本地文件                                                    | Worker 用 `GSC_SERVICE_ACCOUNT_JSON`，本地脚本才用 file path               |
| Feishu/saas 通知缺某一类消息                                                        | 对应 webhook URL/token 是否成对存在                                                               | 对照 order/checkout/error/signups/credits channel                          |
| analytics 标签线上没出现                                                            | canonical runtime key 和 public compatibility key 是否同时存在                                    | 查 `GOOGLE_ANALYTICS_ID`、`PLAUSIBLE_DOMAIN`、`PLAUSIBLE_SRC`              |
| contact/support 邮件进错收件人                                                      | `CONTACT_NOTIFICATION_EMAIL`、`ADMIN_NOTIFICATION_EMAIL`、sender fallback                         | 确认 support/contact 收件人，不要只看 `NEXT_PUBLIC_EMAIL`                  |
| contact modal 显示 `Could not send your message`                                     | 邮件 provider、contact/admin recipients、support fallback、idempotency key                         | 补 `CONTACT_NOTIFICATION_EMAIL` 或确认 admin/support fallback 可用          |
| Business Certificate 页 Settings 不高亮                                              | 证书页是否复用 settings top nav，但 active path 只按 `/settings` 前缀判断                          | 在证书页显式把 Settings nav item 标 active                                 |

## 2. Cloudflare Worker runtime vars

线上 Worker 的变量来源是 Cloudflare runtime settings、`wrangler.jsonc` 的 `vars`、以及 `wrangler secret put` 写入的 secrets。本地 `.env` 只服务本地脚本和构建，不会自动进入 Worker。

### 支付必须项

Stripe provider 注册需要同时满足：

- `DEFAULT_PAYMENT_PROVIDER=stripe`，plain-text var
- `STRIPE_ENABLED=true`，plain-text var
- `STRIPE_PUBLISHABLE_KEY`，publishable key，可作为 plain-text var 同步
- `STRIPE_SECRET_KEY`，secret text
- `STRIPE_SIGNING_SECRET`，secret text

这次 `imageeditorai.net` 线上实际缺的是两个 plain-text vars：

- `DEFAULT_PAYMENT_PROVIDER`
- `STRIPE_ENABLED`

Stripe key 当时已经在 Worker settings 里存在。缺 plain-text vars 会导致 `src/shared/services/payment.ts` 不注册 Stripe，最终在 `/api/payment/notify/stripe` 抛出 `payment provider not found`。

### 当前应保留在 `wrangler.jsonc` 的支付运行时配置

- `keep_vars: true`
- `DEFAULT_PAYMENT_PROVIDER=stripe`
- `STRIPE_ENABLED=true`
- `STRIPE_PAYMENT_METHODS=card,wechat_pay,alipay`
- `STRIPE_ALLOW_PROMOTION_CODES=false`
- `SELECT_PAYMENT_ENABLED=false`
- `PAYPAL_ENABLED=false`
- `PAYPAL_ENVIRONMENT=sandbox`
- `CREEM_ENABLED=false`
- `CREEM_ENVIRONMENT=sandbox`
- `INITIAL_CREDITS_AMOUNT=150`
- `INITIAL_CREDITS_ENABLED=true`
- `INITIAL_CREDITS_VALID_DAYS=14`
- `DAILY_CLAIM_CREDITS_AMOUNT=15`
- `NEXT_PUBLIC_EMAIL=support@imageeditorai.net`
- `NEXT_PUBLIC_DEFAULT_LOCALE=en`

`keep_vars: true` 用来避免 deploy 删除 Dashboard/API 写入但没有出现在 `wrangler.jsonc` 里的 bindings。关键的稳定 plain-text vars 仍然要写进 `wrangler.jsonc`，否则不同发布路径很容易再次漂移。

### 积分 / quota 必须成对检查

注册赠送积分不是只看 amount：

- `INITIAL_CREDITS_ENABLED=true`
- `INITIAL_CREDITS_AMOUNT=150`
- `INITIAL_CREDITS_VALID_DAYS=14`
- `INITIAL_CREDITS_DESCRIPTION` 可选，默认按代码兜底

缺 `INITIAL_CREDITS_ENABLED=true` 时，`grantCreditsForNewUser()` 会直接返回，不会写 `credit` 表。`pnpm verify:env` 应该在 `INITIAL_CREDITS_AMOUNT > 0` 但开关缺失时 fail fast。

Guest 免费额度和账号积分是两套账：

- Guest quota 绑定浏览器 guest cookie、IP hash、每日额度。
- 登录后也应该继续返回 `viewerInfo.guestQuota`。
- 能走 guest quota 的图片生成应该走 `guest-image-generate`，不要扣账号 credits。
- 购买积分、注册赠送积分、daily claim、退款 credits 都在 `credit` 表，不能和 guest quota 混成一套余额。

地域限制默认值来自 `src/shared/lib/credit-geo-gate.ts`：

```text
IN, ID, PH, VN, TH, MY, BD, PK, NG, EG, LK, MM, KH, LA, NP, KE
```

`RESTRICTED_CREDIT_COUNTRIES` 为空表示关闭地域限制；未配置时使用默认名单。这个限制主要影响 guest quota / daily claim，不应被误判为注册赠送积分没到账的原因。

### sync 脚本注意事项

- `pnpm cf:vars:sync` 从本地 `.env` 补齐 Cloudflare plain-text vars；脚本只上传缺失项，不覆盖已有项。
- `pnpm cf:secrets:sync` 通过 Wrangler 写 secrets；它可能在某个 key 已经作为 plain-text binding 存在时失败。
- 新增 plain-text runtime key 后，必须同时检查 `scripts/setup-cf-vars.mjs` 的 `VAR_KEYS` 和 `wrangler.jsonc` 的稳定 vars；只改 `.env` 等于没改线上。
- Cloudflare token 常见分工：
  - Worker settings/secrets token 能读写 Worker script settings 和 secrets。
  - Pages token 不一定能部署 Workers。
  - zone route 权限是单独能力，缺失时 route 更新会 403。
- 需要读取本机授权文件时，只在本地 shell 中使用 `/Users/charliesimmon/clawd/API.md`，不要复制或打印里面的值。

## 3. Stripe 支付和 webhook

### Provider 注册链路

先看 `src/shared/services/payment.ts`。Stripe provider 只有在 Stripe enabled 且三项 Stripe key 都非空时才会注册。

再看 `src/app/api/payment/notify/[provider]/route.ts`。如果 provider registry 中没有 `stripe`，`/api/payment/notify/stripe` 会报：

```text
payment provider not found
```

排查顺序：

- `pnpm verify:env`
- 查 Cloudflare Worker bindings 是否存在支付必须项。
- 查数据库 `config` 表是否覆盖了 env 配置。只输出 key、类型、长度和是否存在，不输出 secret value。
- 确认 `DEFAULT_PAYMENT_PROVIDER` 没被设置成 `paypal`、`creem` 或空值。
- 确认 `STRIPE_ENABLED` 是字符串 `true`，不要写成空字符串或遗漏。

### Webhook 签名错误

Stripe 签名错误通常不是 provider 注册问题，而是以下几类：

- 没有把 Stripe 原始 request body 传给 `stripe.webhooks.constructEvent`。
- 中间层、代理或转发工具改了 JSON 格式、换行或 body 编码。
- `STRIPE_SIGNING_SECRET` 不是当前 Stripe Dashboard webhook endpoint 对应的 `whsec`。
- Stripe Dashboard endpoint URL 写错环境，例如把另一个域名或测试环境的 endpoint secret 用到生产。

生产 endpoint 应对照：

```text
https://imageeditorai.net/api/payment/notify/stripe
```

### 支付后续链路

订单能创建不代表 webhook 后处理成功。继续确认：

- Checkout return / callback / check-status 页面能拿到 session 或 order 状态。
- webhook idempotency 没有重复扣积分或重复发放。
- 退款、争议、manual review、expired credits recovery 等历史修复路径仍能覆盖。
- Stripe manual review 通知需要 `ADMIN_NOTIFICATION_EMAIL`。
- `STRIPE_PROMOTION_CODES` 是合法 JSON map；非法 JSON 会在 env verify 中暴露。

## 4. Cloudflare / OpenNext 部署

### 默认发布

默认生产发布：

```bash
git push origin main
```

Cloudflare Workers 会通过 GitHub 绑定自动拉取 `origin/main` 构建并发布。仓库没有 GitHub Actions workflow 不代表没有自动发布。

### 手动兜底发布

常规手动发布：

```bash
pnpm cf:deploy
```

它会先执行 OpenNext build，再执行 deploy。build 后要确认：

- `.open-next/cloudflare/next-env.mjs` 已被清空或不含 secret。
- `pnpm sanitize:build-secrets`
- `pnpm guard:build-secrets`

如果 build/upload 成功但 route 更新失败，并且确认现有 custom domain route 已经正确指向这个 Worker，可以用临时 no-routes 配置只更新 Worker script/config。不要删除或重建生产 route。

这次事故的手动兜底事实：

- 正常 deploy 在 route 阶段因为 token 缺少 zone route 权限失败。
- 使用 no-routes 临时配置只更新 Worker script/config。
- 成功 Worker Version ID：`fa8dfe0d-c540-47ab-81e0-248217c006c7`。
- 现有 custom domain route 保持不变。

### 部署后验证

每次发布后至少确认：

```bash
curl -sS https://imageeditorai.net/api/health
```

期望 HTTP 200，并返回类似：

```json
{ "ok": true, "service": "imageeditorai" }
```

继续对照：

- Cloudflare Worker 当前 version 是否是刚发布版本。
- Worker bindings 是否有 `DEFAULT_PAYMENT_PROVIDER`、`STRIPE_ENABLED` 和 Stripe publishable/secret/signing key。
- custom domain / route 是否仍指向目标 Worker。
- `/api/payment/notify/stripe` 不应再出现 `payment provider not found`。

## 5. Secret artifact 和构建产物

历史上这里多次修过“构建产物不要带本地 env”的问题。每次 Cloudflare build 后都要保留这条底线：

- 本地 `.env` 不进入 `.open-next`。
- `.open-next/cloudflare/next-env.mjs` 不保留真实 secret。
- `.next` 中不要残留 `.env` 内容。
- 不要提交 `.open-next`、`.next`、secret artifact 或本地 Worker 输出。

常用命令：

```bash
pnpm sanitize:build-secrets
pnpm guard:build-secrets
pnpm sanitize:build-secrets:next
pnpm guard:build-secrets:next
```

## 6. Cloudflare / OpenNext 历史坑位

- 当前生产是 Workers，不是 Pages-only 部署；Cloudflare token 权限要匹配 Workers。
- `wrangler.jsonc` 是当前真实部署配置源，`wrangler.toml.example` 只是参考。
- 生产 Worker 需要 `nodejs_compat`。
- Hyperdrive binding 和 `DATABASE_URL` 要同时理解：Worker 可走 Hyperdrive，本地脚本仍可能走直连连接串。
- `localConnectionString` 只能是本地占位，不应误当成生产 DB。
- OpenNext 当前仍依赖 `src/middleware.ts`；不要只迁到 `proxy.ts` 后把 Worker middleware 入口弄丢。
- locale messages 要能被 Worker runtime 打包读取；i18n 文件移动后要重新检查 live render。
- worktree 中跑 `wrangler deploy --dry-run` 可能因为缺 `.open-next/assets` 失败；先 `pnpm cf:build`，或回到完整构建输出所在目录验证。

## 7. Env 和数据库 config

env 排查顺序：

- 本地先跑 `pnpm verify:env`，它能抓出缺失值和部分 JSON map 错误。
- 再查 Cloudflare Worker runtime bindings；线上最终以 Worker bindings 和 DB config 为准。
- 再查数据库 `config` 表是否覆盖 env。输出时只打印 name、type、length、enabled，不打印 value。

容易忘的配置：

- `AUTH_SECRET`
- `DATABASE_URL`
- `DATABASE_PROVIDER`
- `DB_SINGLETON_ENABLED`
- `ADMIN_NOTIFICATION_EMAIL`
- `CONTACT_NOTIFICATION_EMAIL`
- `DEFAULT_PAYMENT_PROVIDER`
- `STRIPE_ENABLED`
- `STRIPE_PAYMENT_METHODS`
- `STRIPE_PROMOTION_CODES`
- `CREEM_PRODUCT_IDS`
- analytics canonical keys 和 `NEXT_PUBLIC_*` compatibility keys

JSON map 类变量必须是合法 JSON。空字符串、单引号、尾逗号和注释都会导致线上行为和本地预期不一致。

注册赠送积分这类“有 amount 又有 enabled”的配置必须成对验证。`amount=150` 只代表数量，不代表功能打开；`enabled=true` 才是开关。

## 8. Auth、session 和 hydration

历史上 auth/client runtime 问题主要集中在 server env、client availability 和 cookie 状态：

- Client helper 不要直接读取 server-only env。
- Google One Tap 是否展示要看 server availability、public client id、session cookie 和页面状态。
- One Tap 需要 Google client id、server runtime availability、`initialize()`/`prompt()` 前端链路同时成立；不要只看按钮是否渲染。
- 用户信息接口要先确认 auth cookie，再确认 viewer info fallback。
- 未登录 guest viewer 和已登录 authenticated viewer 都要能返回浏览器 guest quota；登录不应该清掉匿名免费额度。
- hydration mismatch 通常来自 server/client 默认值不一致，尤其是 auth state、locale、runtime config 和 feature flag。
- Magic link / reset password / callback URL 要确认生产域名和 locale path。

## 9. AI 生成、积分和 KIE

生成链路排障先拆成四段：入口、扣费、provider task、回调/轮询。

- 图片工作台当前走 KIE 图片链路。
- 视频工作台当前服务 Seedance 2.0。
- KIE 有 test/free/paid tier key 和模型访问规则；VIP-only 模型不要误开放到 guest/free。
- Guest quota、登录后积分、退款后可用 credits、过期 credits recovery 都是历史修复点。
- 登录后仍能使用 guest 免费额度时，前端要显示 free quota 和 free queue；只有真正消耗账号 credits 时才显示账号余额和 paid/free account queue。
- Signup bonus 写 `credit` 表时要幂等：先查已有 `signup_bonus` / welcome gift，再用固定 transaction no 防并发重复发放。
- prompt 工具、free tools、AI workbench 的积分价格要对照 `docs/page-api-credit-cost-matrix.md`。
- provider callback 失败时，要查 task idempotency、provider task id、task JSONB、用户 credits ledger。

## 10. SEO、i18n 和公开页面

发布涉及页面、locale、metadata 或 route 时检查：

```bash
pnpm i18n:verify-live
pnpm content:verify-frontmatter
```

继续对照：

- canonical 页面只保留 README 中列出的公开可索引页面。
- free tools 和 legal/noindex 页面不要进入 sitemap。
- `robots.txt`、`sitemap.xml`、`llms.txt`、`llms-full.txt` 是否仍符合当前 URL 台账。
- locale message 缺 key 会在 Worker runtime 里变成线上白屏或降级文案。

## 11. 监控、通知和后台

- saas-errors 里 `payment_webhook_failed` 要先按 provider 注册和签名两条线分开看。
- saas-orders 有出单不代表本项目 webhook 一定处理完成；Stripe 可能已收款但本地 credits/order 失败。
- admin report、Google/Bing monitoring、ads click alert、IndexNow 都依赖各自 token 和 public/runtime config。
- 通知类脚本必须确认收件人配置，避免发到默认值或空值。
- support/contact 表单收件人顺序是 `CONTACT_NOTIFICATION_EMAIL` -> `ADMIN_NOTIFICATION_EMAIL` -> public/default support email。缺 CONTACT 不一定是事故，但要确认 fallback 真的能发送。
- 管理员账号不要靠“登录过一次”猜测权限；用 `scripts/assign-role.ts --email=<email> --role=super_admin` 复查或设置。

## 12. 发布前后固定 checklist

发布前：

- `git status --short`
- `pnpm verify:env`
- `pnpm release:gate`
- 确认没有 `.env`、secret、build artifact 混入 diff。
- 支付相关改动必须确认 `wrangler.jsonc` 和 Cloudflare secrets 两边都完整。
- 积分/注册赠送相关改动必须确认 `INITIAL_CREDITS_ENABLED`、`INITIAL_CREDITS_AMOUNT`、`INITIAL_CREDITS_VALID_DAYS` 同时进入 Worker runtime。
- contact/support 相关改动必须确认 `ADMIN_NOTIFICATION_EMAIL`、`CONTACT_NOTIFICATION_EMAIL`、public support email 和邮件 provider。
- 登录/One Tap 相关改动必须确认 `GOOGLE_AUTH_ENABLED`、`GOOGLE_ONE_TAP_ENABLED`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 和 OAuth callback 域名。

推送：

```bash
git push origin main
```

推送后：

- 看 Cloudflare Workers GitHub deploy 是否触发并成功。
- 查 Worker version 和 bindings。
- `curl -sS https://imageeditorai.net/api/health`
- 支付改动后重点观察 `/api/payment/notify/stripe` 错误是否消失。
- 如果临时使用 `pnpm cf:deploy`，确认 route 没被删除或改错。

## 13. 事故记录模板

新事故复盘时按这个格式补到本文件或相关 docs：

```text
时间：
域名：
接口：
错误：
真实缺失项：
本地为什么没复现：
线上为什么会发生：
修复文件：
部署方式：
版本 ID / commit：
验证命令：
后续防复发项：
```

## 14. 不要做

- 不要在聊天、日志、PR、commit message 或截图中暴露 API key、Stripe key、Cloudflare token、DB URL。
- 不要因为本地 `.env` 正常就判断生产正常。
- 不要只跑 `cf:vars:sync` 而不看 `wrangler.jsonc`，下一次 deploy 仍可能覆盖 Worker settings。
- 不要用 Pages-only token 判断 Workers deploy 权限。
- 不要在没有 route 权限和现状确认时重建生产 custom domain route。
- 不要把 `payment provider not found` 和 Stripe 签名错误混成同一个问题；前者是 provider 注册，后者是 webhook 签名校验。
- 不要在根目录 `main` 直接做开发型修改；按项目规则用 worktree。

## 15. Git 历史覆盖矩阵

这张表是从 608 条 commit message 中按排障域归纳的。遇到线上问题时，先按域名/API/错误归类，再用表里的关键词回查历史：

```bash
git log --all --date=short --pretty=format:'%h %ad %s' -- <path>
git log --all --grep='<keyword>' --oneline
git show <commit>
```

| 历史主题                              | 相关提交数量 | 代表性提交                                                                                                                                                         | 现在排障必须覆盖                                                                                  |
| ------------------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Cloudflare / OpenNext / Worker        |           53 | `5cfc883` OpenNext support, `2f54feb` wrangler + Hyperdrive, `308a945` Workers build output, `713d550` middleware entrypoint, `64f8148` payment runtime vars       | `wrangler.jsonc`、Worker bindings、routes、Hyperdrive、middleware、OpenNext build output          |
| Env / secrets / runtime config        |           47 | `4b85daa` env leak guard, `36fa59c` build artifact guard, `6a32568` local env preload, `95fdd95` JSON map validation, `e87da64` vars sync, `ff0148d` signup bonus vars | 本地 `.env`、Cloudflare vars/secrets、DB config override、secret artifact guard 分开看            |
| Payment / webhook / order             |           33 | `299b188` embedded Stripe checkout, `92bb3b1` explicit provider routing, `1250448` Stripe event envelopes, `b38d1ec` fraud/dispute recovery, `9705169` return flow | provider 注册、raw body 签名、订单状态、积分发放、manual review 通知                              |
| Credits / quota / refunds             |           59 | `e03894e` guest quota by credits, `817a9c0` restricted countries, `2b71533` delayed refund recovery, `8a0ef9e` prompt tool costs, `1ee22fc` signed-in guest quota   | guest/free/paid credit ledger、地域限制、退款后可用余额、prompt tool 扣费                         |
| Auth / session / One Tap              |           32 | `c2541f4` magic link, `23acd60` guest session cookie, `8c92e62` session runtime failures, `80d7dd1` hydration mismatch, `fc94a5e` One Tap availability             | `AUTH_SECRET`、`AUTH_URL`、cookie、client/server runtime config、Google client keys               |
| AI / KIE / Seedance providers         |          122 | `f86ebbc` KIE routing, `6838cd1` tiered KIE keys, `90fb4b1` CF deployment, Seedance provider/fallback commits                                                      | KIE test/free/paid keys、Volcengine fallback、provider task id、callback/query/fallback chain     |
| Storage / R2 / upload                 |           29 | `b589abf` and `6f365a4` direct R2 images, `32d3ddd` upload cap, storage service registration                                                                       | `R2_*` / `S3_*` provider registration、public domain、signed upload claim、provider-readable URL  |
| Email / notifications / admin report  |           24 | `2c93c6d` configured email alerts, `9eddedd` payment risk Feishu, `407c750` admin report cron, `c0ee53b` support fallback                                          | email provider、admin/contact recipients、Feishu channels、cron dispatch、Google/Bing report keys |
| SEO / i18n / routes / content         |           73 | `4b5f596` route truth, `956c65a` sitemap intl bypass, `e6f0ae6` noindex, `191ab8c` video workflow consolidation                                                    | canonical URL、localized links、sitemap/robots/llms、locale JSON、noindex policy                  |
| Build / test / dev tooling / worktree |           76 | `4c21c4d` hooks use shared tooling, `70f47dd` worktree tests, `63376c1` locale JSON test                                                                           | run-local-binary wrapper、worktree paths、pre-commit/pre-push gates、dev port guard               |

排障时不要只查最新一次事故。这个项目历史上同一个线上症状经常来自不同层：

- `payment_webhook_failed` 可能是 Stripe raw body 签名，也可能是 provider 没注册。
- “本地过、线上挂”可能是 Cloudflare Worker binding 漂移，也可能是 DB config 覆盖。
- “部署成功、域名没变”可能是 GitHub auto deploy 还没完成，也可能是 route 权限/route 绑定问题。
- “AI 生成失败”可能是 provider key、quota、storage URL、callback、poll fallback 或 credits ledger。
- “注册没送积分”优先看 Worker runtime 的 `INITIAL_CREDITS_ENABLED`，不是只看 DB 里有没有用户。
- “登录后额度变少”要先分清浏览器 guest quota 和账号 credits，不要把两套 ledger 合并修。

## 16. Env / key 总盘点

本项目有三层配置名：

- 大写 env key：本地 `.env`、Cloudflare vars/secrets、脚本读取。
- 小写 runtime config key：`src/config/index.ts` 归一化后的 `envConfigs` 和数据库 `config` 表。
- Worker binding name：Cloudflare 线上最终能读到的变量名，plain-text vars 和 secret text 都在这里体现。

数据库 `config` 表里非空值会覆盖 `envConfigs` 的同名小写 key。排查时要同时看本地 env、Worker binding、DB config override，且只输出 key/type/length，不输出 value。

### 16.1 Core / brand / URL

- `NEXT_PUBLIC_APP_URL`
- `AUTH_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_THEME`
- `NEXT_PUBLIC_APPEARANCE`
- `NEXT_PUBLIC_DEFAULT_LOCALE`
- `NEXT_PUBLIC_DOMAIN`
- `NEXT_PUBLIC_EMAIL`
- `NEXT_PUBLIC_REPOSITORY_URL`
- `REPOSITORY_URL`
- `APP_URL`
- `INDEXNOW_KEY`
- `NEXT_PUBLIC_INDEXNOW_KEY`
- `NEXT_PUBLIC_DEBUG`

对应小写 config：`app_url`、`app_name`、`auth_url`、`theme`、`appearance`、`locale`、`default_locale`、`repository_url`、`indexnow_key`。

### 16.2 Database / auth core

- `DATABASE_URL`
- `DATABASE_PROVIDER`
- `DB_SINGLETON_ENABLED`
- `DB_MAX_CONNECTIONS`
- `DB_CONNECT_TIMEOUT`
- `DB_CONNECT_MAX_RETRIES`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `TRUST_X_REAL_IP`
- `TRUST_X_FORWARDED_FOR`

线上 Worker 建议：`DATABASE_PROVIDER`、`DB_SINGLETON_ENABLED`、`DB_MAX_CONNECTIONS` 可以是 plain-text vars；`DATABASE_URL`、`AUTH_SECRET` 必须是 secret text。

### 16.3 Auth providers

- `EMAIL_AUTH_ENABLED`
- `GOOGLE_AUTH_ENABLED`
- `GOOGLE_ONE_TAP_ENABLED`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_AUTH_ENABLED`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

小写 config：`email_auth_enabled`、`google_auth_enabled`、`google_one_tap_enabled`、`google_client_id`、`google_client_secret`、`github_auth_enabled`、`github_client_id`、`github_client_secret`。

### 16.4 Credits / quota

- `INITIAL_CREDITS_ENABLED`
- `INITIAL_CREDITS_AMOUNT`
- `INITIAL_CREDITS_VALID_DAYS`
- `INITIAL_CREDITS_DESCRIPTION`
- `DAILY_CLAIM_CREDITS_AMOUNT`
- `DAILY_CLAIM_CREDITS_VALID_DAYS`
- `RESTRICTED_CREDIT_COUNTRIES`

规则：

- `INITIAL_CREDITS_AMOUNT` 和 `INITIAL_CREDITS_ENABLED` 必须成对存在；amount 不会自动打开赠送。
- `INITIAL_CREDITS_VALID_DAYS` 不配置时走代码默认 14 天，但生产建议显式写入 Worker vars，减少漂移。
- `INITIAL_CREDITS_DESCRIPTION` 可选，但变更描述会影响历史 gift 识别；新代码会额外用 `metadata.source=signup_bonus` 和固定 transaction no 兜底。
- `RESTRICTED_CREDIT_COUNTRIES` 为空表示关闭地域限制；不要把空值误判成缺配置。

### 16.5 Payment

Stripe:

- `DEFAULT_PAYMENT_PROVIDER`
- `SELECT_PAYMENT_ENABLED`
- `STRIPE_ENABLED`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_SIGNING_SECRET`
- `STRIPE_PAYMENT_METHODS`
- `STRIPE_PROMOTION_CODES`
- `STRIPE_ALLOW_PROMOTION_CODES`
- `PAYMENT_WEBHOOK_PROCESSING_LEASE_MS`

PayPal:

- `PAYPAL_ENABLED`
- `PAYPAL_ENVIRONMENT`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`

Creem:

- `CREEM_ENABLED`
- `CREEM_ENVIRONMENT`
- `CREEM_API_KEY`
- `CREEM_SIGNING_SECRET`
- `CREEM_PRODUCT_IDS`

关键规则：

- `DEFAULT_PAYMENT_PROVIDER` 必须指向已注册 provider。
- `STRIPE_ENABLED=true` 但 Stripe 三项 key 缺失时，`pnpm verify:env` 应失败。
- `STRIPE_PROMOTION_CODES`、`CREEM_PRODUCT_IDS` 必须是 JSON object map。
- endpoint signing secret 是 per webhook endpoint 的 `whsec`，不能跨域名复用。

### 16.6 Email / support / notification recipients

Email provider:

- `RESEND_API_KEY`
- `RESEND_SENDER_EMAIL`
- `ZEPTOMAIL_API_KEY`
- `ZEPTOMAIL_API_URL`
- `ZEPTOMAIL_SMTP_API_KEY`
- `ZEPTOMAIL_SENDER_EMAIL`
- `ZEPTOMAIL_SMTP_HOST`
- `ZEPTOMAIL_SMTP_PORT`

Recipients:

- `ADMIN_NOTIFICATION_EMAIL`
- `CONTACT_NOTIFICATION_EMAIL`

contact 表单的收件人兜底链路是 contact -> admin -> support email。`CONTACT_NOTIFICATION_EMAIL` 缺失时不是必然失败；真正要查的是邮件 provider 是否可用、admin/support fallback 是否能正常投递。

Feishu channels:

- `ORDER_FEISHU_WEBHOOK_URL`
- `ORDER_FEISHU_TOKEN`
- `CHECKOUT_FEISHU_WEBHOOK_URL`
- `CHECKOUT_FEISHU_TOKEN`
- `ERROR_FEISHU_WEBHOOK_URL`
- `ERROR_FEISHU_TOKEN`
- `SIGNUPS_FEISHU_WEBHOOK_URL`
- `SIGNUPS_FEISHU_TOKEN`
- `CREDITS_FEISHU_WEBHOOK_URL`
- `CREDITS_FEISHU_TOKEN`

`ORDER_FEISHU_WEBHOOK_URL` 配了但 `SIGNUPS_FEISHU_WEBHOOK_URL` 或 `CREDITS_FEISHU_WEBHOOK_URL` 缺失时，注册/积分通知会跳过。

### 16.7 Storage

Cloudflare R2:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_DOMAIN`

S3 fallback / DB config only:

- `s3_access_key`
- `s3_secret_key`
- `s3_bucket`
- `s3_endpoint`
- `s3_region`
- `s3_domain`

R2 provider 注册至少需要 `r2_access_key`、`r2_secret_key`、`r2_bucket_name`。如果 `r2_domain` 为空，会回退到 `/api/storage/file?key=` 代理 URL。

### 16.8 AI providers

Prompt tools:

- `OPENROUTER_API_KEY`

Seedance / video providers:

- `VOLCENGINE_API_KEY`
- `ARK_API_KEY`
- `APIXO_API_KEY`
- `APIXO_API_BASE_URL`
- `APIMART_API_KEY`
- `APIMART_API_BASE_URL`
- `EVOLINK_API_KEY`
- `EVOLINK_API_BASE_URL`
- `SEEDANCE_KIE_ENABLED`
- `REPLICATE_API_TOKEN`
- `FAL_API_KEY`
- `FAL_API_BASE_URL`
- `FAL_SUBMIT_TIMEOUT_MS`
- `FAL_QUEUE_TIMEOUT_MS`
- `FAL_POLL_INTERVAL_MS`

KIE image / fallback tiers:

- `KIE_API_KEY_TEST`
- `KIE_API_KEY_FREE`
- `KIE_API_KEY_PAID`
- `KIE_API_BASE_URL`

KIE 小写 runtime keys 是 `kie_api_key`、`kie_api_key_free`、`kie_api_key_paid`、`kie_api_base_url`。其中 `kie_api_key` 对应 env 的 `KIE_API_KEY_TEST`。

### 16.9 Analytics / ads / growth

Analytics:

- `ENABLE_ADS_TRACKING`
- `NEXT_PUBLIC_ENABLE_ADS_TRACKING`
- `GOOGLE_ANALYTICS_ID`
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
- `CLARITY_ID`
- `NEXT_PUBLIC_CLARITY_ID`
- `PLAUSIBLE_DOMAIN`
- `PLAUSIBLE_SRC`
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- `NEXT_PUBLIC_PLAUSIBLE_SCRIPT`
- `NEXT_PUBLIC_PLAUSIBLE_URL`
- `OPENPANEL_CLIENT_ID`
- `VERCEL_ANALYTICS_ENABLED`

Google Ads browser/server:

- `GOOGLE_ADS_CONVERSION_ID`
- `NEXT_PUBLIC_GOOGLE_ADS_IDS`
- `GOOGLE_ADS_SIGNUP_LABEL`
- `NEXT_PUBLIC_GADS_SIGNUP_LABEL`
- `GOOGLE_ADS_BEGIN_CHECKOUT_LABEL`
- `NEXT_PUBLIC_GADS_BEGIN_CHECKOUT_LABEL`
- `GOOGLE_ADS_PURCHASE_LABEL`
- `NEXT_PUBLIC_GADS_PURCHASE_LABEL`
- `GOOGLE_ADS_PURCHASE_TRACKING_MODE`
- `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_TRACKING_MODE`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
- `GOOGLE_ADS_CUSTOMER_ID`
- `GOOGLE_ADS_PURCHASE_UPLOAD_CONVERSION_ACTION_ID`
- `GOOGLE_ADS_PURCHASE_UPLOAD_PROCESSING_LEASE_MS`

Ads click alert script:

- `ADS_CLICKER_WORKSPACE_DIR`
- `ADS_CLICKER_FIRST_THRESHOLD`
- `ADS_CLICKER_INTERVAL_CLICKS`
- `ADS_CLICKER_STATE_FILE`
- `ADS_CLICKER_FEISHU_WEBHOOK_URL`
- `ADS_CLICKER_FEISHU_TOKEN`

Growth / customer service:

- `ADSENSE_CODE`
- `AFFONSO_ENABLED`
- `AFFONSO_ID`
- `AFFONSO_COOKIE_DURATION`
- `PROMOTEKIT_ENABLED`
- `PROMOTEKIT_ID`
- `CRISP_ENABLED`
- `CRISP_WEBSITE_ID`
- `TAWK_ENABLED`
- `TAWK_PROPERTY_ID`
- `TAWK_WIDGET_ID`

### 16.10 SEO / monitoring / admin reports

- `ADMIN_REPORT_TIMEZONE`
- `ADMIN_REPORT_INCLUDE_BING_SITE_MONITORING`
- `ADMIN_REPORT_DELIVERY_LEASE_MS`
- `GSC_SERVICE_ACCOUNT_JSON`
- `GSC_SERVICE_ACCOUNT_FILE`
- `GSC_SITE_URL`
- `CRUX_API_KEY`
- `GOOGLE_PAGESPEED_API_KEY`
- `PAGESPEED_API_KEY`
- `BING_WEBMASTER_API_KEY`

Worker 线上不要依赖 `GSC_SERVICE_ACCOUNT_FILE`，Cloudflare 读不到本地文件；用 `GSC_SERVICE_ACCOUNT_JSON`。

### 16.11 Cloudflare / local script controls

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_WORKER_SECRETS_API_TOKEN`
- `CLOUDFLARE_API_TOKEN`
- `CF_VARS_ENV_FILE`
- `CF_VARS_DRY_RUN`
- `CF_VARS_WORKER_NAME`
- `CF_SECRETS_ENV_FILE`
- `CF_SECRETS_DRY_RUN`
- `CF_SECRETS_WORKER_NAME`
- `OPENNEXT_CLOUDFLARE_DEV`
- `NEXT_DEV_WRANGLER_ENV`
- `ANALYZE`
- `VERCEL`
- `VERCEL_GIT_COMMIT_SHA`
- `PORT`
- `NODE_ENV`
- `NEXT_RUNTIME`

这些大多是本地脚本或构建控制项，不一定要进入 Worker runtime。不要把 Cloudflare API token 放进 repo config。

## 17. 新增 env/config key 时必须同步

新增或改名任何 env/config key 时，按这个顺序更新：

- `src/config/index.ts`：新增大写 env 到小写 config 的映射。
- `scripts/verify-env.ts`：如果启用某模块必须依赖该 key，就加 error；如果是可降级功能，加 warning。
- `src/shared/services/settings.ts`：需要后台可覆盖时，加小写 config 字段。
- `scripts/setup-cf-vars.mjs`：plain-text runtime var 需要同步到 `VAR_KEYS`。
- `wrangler.jsonc`：稳定、非敏感、生产必须的 plain-text var 直接写入 `vars`。
- Cloudflare secret：所有 `SECRET`、`TOKEN`、`API_KEY`、`DATABASE_URL`、私密 webhook URL 等用 secret text。
- `read-checking-list.md`：把 key 放进本节对应类别。
- `docs/矩阵/03-环境变量与运行时配置.md` 和 `docs/skills/env-runtime-mapping.md`：把迁移/部署步骤同步给后续 agent。
- `AGENTS.md`：如果新增的是排障流程或部署真相，补进项目规则。

验证：

```bash
pnpm verify:env
pnpm release:gate
```

如果涉及 Cloudflare Worker：

```bash
pnpm cf:build
```

生产发布后再确认：

```bash
curl -sS https://imageeditorai.net/api/health
```
