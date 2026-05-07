# Image Editor AI URL 台账

这份文档记录当前公开页面、业务工作台、机器发现路由，以及“页面 -> `/api/*` 路由”的真实映射。文档只描述今天代码里还存在的系统，不写旧站幻觉。

## 1. 基本真相

- 品牌：`Image Editor AI`
- 默认公开域名：`https://imageeditorai.net`
- 本地开发基地址：`http://localhost:3000`
- 仓库：`https://github.com/CharlieLZ/imageeditorai.net`
- 当前公开语言：`en`、`zh`、`de`、`fr`、`es`、`ja`、`it`、`ko`、`ar`

## 2. 路由真相源

- `src/app/`
  页面、layout、metadata、API handlers 的真实文件边界
- `src/middleware.ts`
  locale canonical、图片旧路由回收、登录拦截、`X-Robots-Tag`
- `src/config/website/public-page-metadata.ts`
  当前 canonical public page 与 last modified 真相源
- `src/shared/lib/discoverable-pages.ts`
  sitemap / discoverable public page 白名单
- `content/pages/*.mdx`
  `mission` 和法律页 slug 真相源

## 3. Locale 与 canonical 规则

- 默认 locale：`en`
- 英语 canonical public path 无前缀：
  `/`、`/pricing`、`/ai-video-generator`、`/ai-image-generator`、`/free-tools/*`
- 非默认语言使用 `/{locale}` 前缀：
  例：`/zh/pricing`、`/fr/ai-image-generator`
- `/en/*` 不是 canonical 公网路径，会被 `308` 重定向回无前缀英文路径
- 已关闭的旧图片子路由：
  - `/ai-image-generator/text-to-image`
  - `/ai-image-generator/image-to-image`
  统一 `308` 归一化到 `/ai-image-generator?mode=...`

## 4. 共享客户端壳层 API

这部分不是“某一个页面独占”的 API，而是共享 layout / header / client runtime 带来的调用。

### 4.1 所有 `src/app/[locale]/*` 页面共享

- `GET /api/config/get-configs`
  `AppContextProvider` 启动时读取前端公开配置
- `GET|POST /api/auth/[...all]`
  Better Auth catch-all；包含 `session` 读取、邮箱登录、magic link、social sign-in、sign-out、reset password、change password
- `POST /api/user/get-user-info`
  登录态同步后读取当前用户资料、通知偏好、后台标记
- `POST /api/user/get-user-credits`
  不是所有页面首屏都会打；但 Daily Claim、生成器、手动刷新 credits 时都会复用这条路由

### 4.2 落地页与后台顶部交互共享

- `POST /api/user/daily-claim`
  Landing header 和 Admin top nav 的 `DailyClaimButton`
- `POST /api/support/contact`
  已登录用户头像菜单里的 `ContactSupportDialog`
- `POST /api/notifications/unread-count`
  只在带 `NotificationBellButton` 的区域触发：
  `/activity/*`、`/settings/*`、`/admin/*`

## 5. 公开页面与页面级 API

### 5.1 核心工作台与定价页

- `/`
  首页本身挂了 `LandingImageWorkspaceShell`，不是纯静态页。页面级 API：
  - `GET /api/user/get-viewer-info`
  - `POST /api/ai/generate`
  - `POST /api/ai/query`
  - `POST /api/ai/guest-image-generate`
  - `POST /api/ai/guest-image-query`
  - `POST /api/ai/translate-prompt`
  - `POST /api/user/ai-tasks/recent`
  - `POST /api/user/ai-tasks/batch-refresh`
  - `POST /api/user/ai-tasks/delete`
  - `POST /api/storage/presign`
  - `POST /api/storage/complete`
  - `POST /api/storage/upload-image`
  - `POST /api/payment/checkout`
  - `GET /api/payment/check-status`

- `/pricing`
  页面级 API：
  - `POST /api/payment/checkout`
  - `GET /api/payment/check-status`

- `/ai-image-generator`
  页面级 API：
  - `GET /api/user/get-viewer-info`
  - `POST /api/ai/generate`
  - `POST /api/ai/query`
  - `POST /api/ai/guest-image-generate`
  - `POST /api/ai/guest-image-query`
  - `POST /api/ai/translate-prompt`
  - `POST /api/user/ai-tasks/recent`
  - `POST /api/user/ai-tasks/batch-refresh`
  - `POST /api/user/ai-tasks/delete`
  - `POST /api/storage/presign`
  - `POST /api/storage/complete`
  - `POST /api/storage/upload-image`
  - `POST /api/payment/checkout`
  - `GET /api/payment/check-status`

- `/ai-video-generator`
  root canonical 页面，页面级 API：
  - `GET /api/user/get-viewer-info`
  - `POST /api/ai/generate`
  - `POST /api/ai/query`
  - `POST /api/ai/translate-prompt`
  - `POST /api/ai/rewrite-prompt`
  - `POST /api/storage/presign`
  - `POST /api/storage/complete`
  - `POST /api/storage/upload-image`
  - `POST /api/storage/upload-media`
  - `POST /api/payment/checkout`
  - `GET /api/payment/check-status`

- `/ai-video-generator?mode=text-to-video`
- `/ai-video-generator?mode=image-to-video`
- `/ai-video-generator?mode=reference-to-video`
  工作台状态入口，`noindex`，不进 sitemap

- `/ai-video-generator/text-to-video`
- `/ai-video-generator/image-to-video`
- `/ai-video-generator/reference-to-video`
  legacy 工作流子路径，重定向到 root `?mode=` 状态 URL，不作为独立 SEO 页面
  共享的页面级 API：
  - `GET /api/user/get-viewer-info`
  - `POST /api/ai/generate`
  - `POST /api/ai/query`
  - `POST /api/ai/translate-prompt`
  - `POST /api/ai/rewrite-prompt`
  - `POST /api/storage/presign`
  - `POST /api/storage/complete`
  - `POST /api/storage/upload-image`
  - `POST /api/storage/upload-media`
  - `POST /api/payment/checkout`
  - `GET /api/payment/check-status`

说明：

- guest 图片生成只会切到 `/api/ai/guest-image-generate` / `/api/ai/guest-image-query`
- `useGeneratorTask` 只有在 `runtime.mediaType === image` 时才会切 guest route
- 当前视频工作台虽然能读 guest viewer/quota，但没有独立 guest video create/query route；代码仍然把视频创建与轮询落到 `/api/ai/generate` / `/api/ai/query`

### 5.2 Free Tools 索引与工具页（公开可访问，但 noindex）

- `/free-tools`
- `/free-tools/image-converter`
- `/free-tools/image-color-extractor`
- `/free-tools/image-compressor`
- `/free-tools/image-cropper`
- `/free-tools/image-resizer`
- `/free-tools/image-upscaler`
- `/free-tools/image-rotator`
- `/free-tools/image-metadata-remover`
- `/free-tools/video-converter`
- `/free-tools/video-trimmer`
- `/free-tools/video-to-gif`
- `/free-tools/video-thumbnail`

这些页面当前没有页面级 `/api/*` 调用，工具处理都在浏览器本地完成。它们只会继承第 4 节的共享壳层 API。

说明：

- 当前这批路径统一 `noindex`
- 当前不进入 `sitemap.xml` discoverable 白名单

### 5.3 公开内容页

- `/mission`

`/mission` 当前保留为可索引公开内容页。

### 5.4 公开 noindex 内容页

- `/privacy-policy`
- `/terms-of-service`
- `/refund-policy`
- `/acceptable-use-policy`
- `/content-moderation-policy`
- `/ai-wrapper-disclaimer`

这些 slug 页当前没有页面级 `/api/*` 调用，只继承第 4 节的共享壳层 API。

说明：

- `mission` 仍在 sitemap discoverable 白名单里
- 上面 6 个 policy / disclaimer slug 当前统一 `noindex`
- 上面 6 个 slug 当前不进入 `sitemap.xml` discoverable 白名单

## 6. 认证与 noindex 页面

- `/sign-in`
- `/sign-up`
- `/forgot-password`
- `/reset-password`
- `/reset-password/{token}`
- `/no-permission`

页面与 API 的关系：

- `/sign-in`、`/sign-up`
  - `GET|POST /api/auth/[...all]`
  - `GET /api/config/get-configs`
- `/forgot-password`
  - `GET|POST /api/auth/[...all]`
  - 具体来自 `requestPasswordReset`
- `/reset-password`
  - `GET|POST /api/auth/[...all]`
  - 具体来自 `resetPassword`
- `/reset-password/{token}`
  - 不单独执行业务；运行时归一化到 `/reset-password?token=...`
- `/no-permission`
  - 当前直接跳回 `/`

## 7. 用户工作台页面与页面级 API

### 7.1 Activity

- `/activity`
  跳转到 `/activity/ai-tasks`

- `/activity/ai-tasks`
  页面级 API：
  - `POST /api/user/ai-tasks/batch-refresh`
  说明：
  任务列表与详情数据本身由服务端直接读模型，不经过 `/api/user/ai-tasks/recent`

- `/activity/ai-tasks/{id}`
  当前没有页面级 `/api/*`；详情 SSR 直读数据

- `/activity/ai-tasks/{id}/refresh`
  当前跳回 `/activity/ai-tasks`

- `/activity/notifications`
  页面级 API：
  - `POST /api/notifications/mark-read`

- `/activity/feedbacks`
  当前直接 `notFound()`

### 7.2 Settings

- `/settings`
  跳转到 `/settings/profile`

- `/settings/profile`
  页面级 API：
  - `POST /api/storage/presign`
  - `POST /api/storage/complete`
  - `POST /api/storage/upload-image`
  说明：
  头像 `upload_image` 字段使用 `ImageUploader`；文件先走 direct upload，失败后回退 legacy upload route

- `/settings/security`
  页面级 API：
  - `GET|POST /api/auth/[...all]`
  说明：
  `ChangePasswordCard`、`RequestPasswordResetCard` 都走 Better Auth client

- `/settings/billing`
- `/settings/credits`
- `/settings/payments`
  当前没有页面级 `/api/*`；表格与面板都由服务端直接读模型

- `/settings/billing/cancel`
  当前没有 `/api/*` route；取消订阅走页面内 server action 直接调 payment service

- `/settings/billing/retrieve`
  当前没有 `/api/*` route；页面服务端直接查 provider billing portal 后 `redirect()`

- `/settings/invoices/retrieve`
  当前没有 `/api/*` route；页面服务端直接查 provider invoice URL 后 `redirect()`

- `/certificate`
  页面级 API：
  - `GET /api/certificate/download?locale=...`

- `/certificate/verify`
  当前没有页面级 `/api/*`；验真直接在服务端解 token

### 7.3 已关闭的 Settings 路由

- `/settings/apikeys`
- `/settings/apikeys/create`
- `/settings/apikeys/{id}/edit`
- `/settings/apikeys/{id}/delete`

全部返回 404。

## 8. Admin 页面与页面级 API

### 8.1 当前页面

- `/admin`
- `/admin/credits`
- `/admin/daily`
- `/admin/weekly`
- `/admin/monthly`
- `/admin/payments`
- `/admin/subscriptions`
- `/admin/users`
- `/admin/users/{id}`
- `/admin/users/{id}/edit`
- `/admin/users/{id}/edit-roles`
- `/admin/users/{id}/webhook-events/{eventRecordId}`
- `/admin/roles`
- `/admin/roles/{id}/edit`
- `/admin/roles/{id}/edit-permissions`
- `/admin/permissions`
- `/admin/settings`
- `/admin/settings/{tab}`
- `/admin/no-permission`

以上页面当前没有独占 `/api/*`，主要通过 SSR 直读模型/服务层。

- `/admin/ai-tasks`
  页面级 API：
  - `POST /api/admin/ai-tasks/batch-refresh`

- `/admin/ai-tasks/{id}/refresh`
  当前跳回 `/admin/ai-tasks`

### 8.2 已关闭后台路由

- `/admin/apikeys`
  当前由隐藏 layout 直接 `notFound()`

## 9. 当前关闭或已收口的公开路径

- `/ai-image-generator/text-to-image`
- `/ai-image-generator/image-to-image`
  已回收为 `/ai-image-generator?mode=...`

- `/blog`
- `/blog/*`
  已删除，不再恢复

- 旧图片优先公开链路
- 旧站品牌名相关公开路径
  已删除，不再恢复

## 10. Root 级机器与静态发现路由

- `/robots.txt`
- `/sitemap.xml`
- `/llm.txt`
- `/llms.txt`
- `/llms-full.txt`
- `/ads.txt`
- `/opengraph-image.png`
- `/site.webmanifest`
- `/manifest.webmanifest`
- `/browserconfig.xml`
- `/BingSiteAuth.xml`
- `/favicon.ico`
- `/favicon-16x16.png`
- `/favicon-32x32.png`
- `/favicon-48x48.png`
- `/apple-touch-icon.png`
- `/apple-touch-icon-precomposed.png`
- `/{indexNowKey}.txt`
  仅在配置了合法 IndexNow key 时存在

## 11. `/api/*` 路由反向索引

### 11.1 认证与基础信息

| 方法 | 路径 | 当前页面调用方 | 说明 |
|---|---|---|---|
| GET, POST | `/api/auth/[...all]` | `/sign-in`、`/sign-up`、`/forgot-password`、`/reset-password`、`/settings/security`、带 `SignUser` 的页面 | Better Auth catch-all，包含 session、login、logout、magic link、password flows |
| GET | `/api/config/get-configs` | 所有 locale 页面共享壳层；`/sign-in`、`/sign-up` | 公开前端配置 |
| GET | `/api/health` | 当前无页面直接调用 | 健康检查 |
| GET | `/api/guest/quota` | 当前无页面直接调用 | 独立 guest quota route，页面目前改用 `/api/user/get-viewer-info` |
| GET | `/api/user/get-viewer-info` | `/`、`/ai-image-generator`、`/ai-video-generator*` | guest / signed viewer snapshot |
| POST | `/api/user/get-user-info` | 所有已登录 locale 页面共享壳层 | 当前用户信息、后台标记、通知偏好 |
| POST | `/api/user/get-user-credits` | 共享壳层 refresh、`DailyClaimButton`、生成器完成后刷新 | 当前积分 |

### 11.2 AI 生成

| 方法 | 路径 | 当前页面调用方 | 说明 |
|---|---|---|---|
| POST | `/api/ai/generate` | `/`、`/ai-image-generator`、`/ai-video-generator*` | 登录态图片/视频创建；当前 guest video 代码路径也会落到这里 |
| POST | `/api/ai/query` | `/`、`/ai-image-generator`、`/ai-video-generator*` | 登录态任务轮询；当前 guest video 代码路径也会落到这里 |
| POST | `/api/ai/guest-image-generate` | `/`、`/ai-image-generator` | 仅 guest 图片生成 |
| POST | `/api/ai/guest-image-query` | `/`、`/ai-image-generator` | 仅 guest 图片任务轮询 |
| POST | `/api/ai/translate-prompt` | `/`、`/ai-image-generator`、`/ai-video-generator*` | prompt 翻译为英文 |
| POST | `/api/ai/rewrite-prompt` | `/ai-video-generator*` | 视频 prompt 安全改写 |
| POST | `/api/ai/notify/{provider}` | 当前无页面直接调用 | provider webhook |

### 11.3 存储

| 方法 | 路径 | 当前页面调用方 | 说明 |
|---|---|---|---|
| POST | `/api/storage/presign` | `/`、`/ai-image-generator`、`/ai-video-generator*`、`/settings/profile` | direct upload 开始 |
| POST | `/api/storage/complete` | `/`、`/ai-image-generator`、`/ai-video-generator*`、`/settings/profile` | direct upload 校验 |
| POST | `/api/storage/upload-image` | `/`、`/ai-image-generator`、`/ai-video-generator*`、`/settings/profile` | legacy image upload fallback |
| POST | `/api/storage/upload-media` | `/ai-video-generator*` | legacy video/audio upload fallback |
| GET | `/api/storage/file?key=...` | 生成器、任务列表、头像/媒体预览由浏览器按 URL 读取 | 公开文件代理 |

### 11.4 用户任务、通知、支持

| 方法 | 路径 | 当前页面调用方 | 说明 |
|---|---|---|---|
| POST | `/api/user/daily-claim` | Landing header、Admin top nav | 每日积分 |
| POST | `/api/user/ai-tasks/recent` | `/`、`/ai-image-generator` | 图片最近任务面板 |
| POST | `/api/user/ai-tasks/delete` | `/`、`/ai-image-generator` | 删除图片最近任务 |
| POST | `/api/user/ai-tasks/batch-refresh` | `/`、`/ai-image-generator`、`/activity/ai-tasks` | 批量刷新当前用户任务 |
| POST | `/api/notifications/unread-count` | `/activity/*`、`/settings/*`、`/admin/*` | 铃铛未读数 |
| POST | `/api/notifications/mark-read` | `/activity/notifications` | 批量标记已读 |
| POST | `/api/support/contact` | 带 `SignUser` 的已登录页面 | 支持联系表单 |

### 11.5 支付与证书

| 方法 | 路径 | 当前页面调用方 | 说明 |
|---|---|---|---|
| POST | `/api/payment/checkout` | `/pricing`、`/`、`/ai-image-generator`、`/ai-video-generator*` | 创建订单与 checkout session |
| GET | `/api/payment/check-status?order_no=...` | `/pricing`、`/`、`/ai-image-generator`、`/ai-video-generator*` | embedded checkout 完成后轮询支付状态 |
| GET | `/api/payment/callback?order_no=...` | 当前无页面直接调用 | provider 回跳浏览器桥接 |
| POST | `/api/payment/notify/{provider}` | 当前无页面直接调用 | provider webhook |
| GET | `/api/certificate/download?locale=...` | `/certificate` | 下载证书 PDF |

### 11.6 后台

| 方法 | 路径 | 当前页面调用方 | 说明 |
|---|---|---|---|
| POST | `/api/admin/ai-tasks/batch-refresh` | `/admin/ai-tasks` | 后台批量刷新 |
| POST | `/api/admin/storage/delete` | 当前无页面直接调用 | 后台存储删除接口，代码预留 |

## 12. Cloudflare Workers 部署备注

- 当前方案：`@opennextjs/cloudflare` + `wrangler.jsonc`（本地手动模板参考 `wrangler.toml.example`）
- 当前生产默认发布链路是 **Cloudflare Dashboard 里的 GitHub 绑定自动发布**，不是仓库内的 GitHub Actions workflow
- 也就是说：`origin/main` 上的新提交会由 Cloudflare 侧按绑定规则自动拉取并发布；repo 里看不到 workflow 属于正常现象
- `pnpm cf:deploy` 不是当前默认生产发布入口；它主要用于人工补发、手动回滚/排障、或在 Cloudflare 自动发布失效时本地兜底
- 数据库继续走 Postgres / Neon；Cloudflare 侧优先用 Hyperdrive 复用连接
- `wrangler.jsonc` / `wrangler.toml` 都保留 `nodejs_compat`
- 当前 `compatibility_date = "2026-05-03"`
- `pnpm build` / `pnpm cf:build` 后，构建清洗会把 `.open-next/cloudflare/next-env.mjs` 改写成空对象；本地 `.env` 不会自动跟随 OpenNext 产物进入 Worker 运行时
- 所以线上真实值必须来自 Cloudflare Worker `[vars]`、`wrangler secret put`，或者后台 runtime settings 覆盖；不要把“本地 `.env` 有值”当成“Worker 一定读到了”
- GitHub 自动发布和本地 `wrangler` 发布都会读取仓库里的 `wrangler.jsonc`；如果这里缺 plain-text vars，下一个 deploy 会把 Worker 上同名 plain-text 绑定一并覆盖掉
- `wrangler.toml.example` 只是本地参考模板；本地真实部署文件 `wrangler.toml` 被 `.gitignore` 排除，复制模板时要把 `wrangler.jsonc` 里的 analytics vars 一起带过去
- analytics canonical runtime keys：
  - `GOOGLE_ANALYTICS_ID`
  - `PLAUSIBLE_DOMAIN`
  - `PLAUSIBLE_SRC`
- analytics fallback / 兼容映射：
  - `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` -> `google_analytics_id`
  - `NEXT_PUBLIC_DOMAIN` / `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` -> `plausible_domain`
  - `NEXT_PUBLIC_PLAUSIBLE_URL` / `NEXT_PUBLIC_PLAUSIBLE_SCRIPT` / `NEXT_PUBLIC_Plausible_URL` -> `plausible_src`
- 推荐把 canonical keys 和 public compatibility keys 一起保存在 `wrangler.jsonc`，避免 Cloudflare 自动发布后把兼容映射冲掉
- 当前 `google_analytics_id` 会出现在 `/api/config/get-configs` 的 public configs 里；`plausible_domain` / `plausible_src` 是 server-side config，不会通过这个 public API 暴露
- 推荐上线前先核对 Worker 里至少存在下面这组值：
  - `GOOGLE_ANALYTICS_ID=G-D3SR4CETSK`
  - `PLAUSIBLE_DOMAIN=imageeditorai.net`
  - `PLAUSIBLE_SRC=https://click.pageview.click/js/script.js`
- 同时补齐这组 plain-text fallback，保证 GitHub 自动发布后的 Worker version 继续带值：
  - `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-D3SR4CETSK`
  - `NEXT_PUBLIC_DOMAIN=imageeditorai.net`
  - `NEXT_PUBLIC_PLAUSIBLE_URL=https://click.pageview.click/js/script.js`
  - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=imageeditorai.net`
  - `NEXT_PUBLIC_PLAUSIBLE_SCRIPT=https://click.pageview.click/js/script.js`
- 如果你维护的是本地 `.env`，同步到 Worker 的最短路径：
  - `pnpm cf:vars:sync`
  - `pnpm cf:secrets:sync`
- 如果要人工核查 Worker 绑定，优先看：
  - Cloudflare Dashboard -> Workers & Pages -> 对应项目 -> Git / Builds / Deployments 绑定状态
  - Cloudflare Dashboard -> Worker -> Settings -> Variables / Secrets
  - `pnpm exec wrangler secret list --name imageeditorai-net`
- 上线前体积与兼容性闸门：
  - `pnpm cf:build`
  - `pnpm exec wrangler deploy --dry-run`
- analytics 上线后的最短验收：
  - `curl -s https://imageeditorai.net/api/config/get-configs | rg "google_analytics_id"`
  - `curl -L https://imageeditorai.net | rg "googletagmanager|pageview.click|G-D3SR4CETSK"`
- 当前分享图必须保持静态 `/opengraph-image.png`
- 当前必须保留 `src/middleware.ts`，不要改成 `proxy.ts`
