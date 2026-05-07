# 页面 / API / 用户积分 / 平台 API 成本矩阵

更新时间：`2026-05-06`

这份文档只记录今天仓库里的真实链路，回答四件事：

1. 哪个页面会打哪些 API
2. 哪些 API 会扣用户积分
3. 哪些 API 只消耗 guest quota，不扣账户积分
4. 哪些 API 会产生平台侧第三方 API / 对象存储成本

适用范围：

- 默认公开域名：`https://imageeditorai.net`
- 公开语言：`en`、`zh`、`de`、`fr`、`es`、`ja`、`it`、`ko`、`ar`
- 多语言页面共用同一套业务 API 和计费逻辑，只是路由前缀不同

## 口径说明

| 字段 | 含义 |
| --- | --- |
| 用户积分 | 账户 `credits` 是否会被真实扣减 |
| guest quota | 游客图片额度；会减少游客当天额度，但不会扣登录用户 credits |
| 平台 API 成本 | 服务端是否会调用第三方 AI provider、支付 provider、邮件 provider、对象存储等 |
| 内部成本 | 只读写本站 DB、配置、会话、SSR、PDF 渲染等，不出第三方 API |

说明：

- 当前代码里没有维护第三方 API 的美元单价表，只能落到“会不会出网、会打谁、是否扣积分”这个粒度。
- 真正的用户积分扣减落点在 `createAITask -> consumeCredits`，不是在前端展示层，也不是在轮询层。

## 计费真相

### 图片生成

图片生成积分由 `scene + model + resolution` 决定。

默认相关值：

- 首页 `/`：默认挂 `ImageWorkspace`，强制 `image-to-image`
- `/ai-image-generator`：默认 `text-to-image`
- 默认分辨率：`1K`
- 前端默认模型 key：`nano-banana-2`
- 但 guest/free 访问时，VIP 模型会自动降级到非 VIP 默认模型 `gpt-image-2`

当前图片模型积分区间：

| 模型 | 积分 |
| --- | --- |
| `seedream-4` | `3` |
| `seedream-45` / `seedream-5` / `z-image` | `4` |
| `nano-banana` / `nano-banana-2` / `grok-imagine` / `qwen-image` | `5` 起 |
| `flux-2-flex` | `6` |
| `gpt-image-2` / `ideogram-character` | `8` |
| `ideogram-v3` / `nano-banana-pro` | `10` 起 |
| `flux-2-pro` | `12` |
| `nano-banana-pro 4K` | `30` |

默认页面成本：

| 页面 | guest/free 默认 | paid 默认 |
| --- | --- | --- |
| `/` | `8` | `5` |
| `/ai-image-generator` | `8` | `5` |

### 视频生成

视频生成积分公式：

`durationSeconds * perSecondRate + webSearchSurcharge`

其中：

- `480p fast`：`5 / 秒`
- `480p standard`：`6 / 秒`
- `720p fast`：`10 / 秒`
- `720p standard`：`12 / 秒`
- `webSearch`：额外 `+1`
- `reference-to-video` 如果带视频参考：额外 `+3 / 秒`

默认相关值：

- 默认 mode：`text-to-video`
- 默认时长：`15s`
- 默认分辨率：`720p`
- 默认 `fast=true`

默认页面成本：

| 页面 | 默认积分 |
| --- | --- |
| `/ai-video-generator` | `150` |
| `/ai-video-generator/text-to-video` | `150` |
| `/ai-video-generator/image-to-video` | `150` |
| `/ai-video-generator/reference-to-video` | `150`，若带视频参考则 `195` |

### guest 图片额度

- guest 图片生成走单独的 `/api/ai/guest-image-generate`
- guest quota 默认日额度：`100`
- guest 图片生成会按图片积分公式消耗额度单位
- guest 图片生成不会扣登录账户 credits

### 当前不存在的 guest video 扣费链路

当前视频工作台前端会读取 guest viewer / quota，但实际没有 guest video create/query route：

- 只有图片会切到 guest route
- 视频创建仍然落到要求登录的 `/api/ai/generate`

所以今天代码里不存在“guest video 扣积分”或“guest video 扣 quota”的真实链路。

## 完整矩阵

### 共享层

| 页面 / 页面组 | API | 用户积分 | 平台 API 成本 |
| --- | --- | --- | --- |
| 所有 `src/app/[locale]/*` 页面 | `GET /api/config/get-configs` | 不扣 | 内部配置读取 |
| 所有 `src/app/[locale]/*` 页面 | `GET|POST /api/auth/[...all]` | 不扣 | 默认是内部 session / auth 成本；登录、重置密码、magic link、social sign-in 时可能触发邮件 provider 或 OAuth provider |
| 所有 `src/app/[locale]/*` 页面 | `POST /api/user/get-user-info` | 不扣 | 内部 DB / 权限 / 通知偏好 / credits 读取 |
| 所有 `src/app/[locale]/*` 页面 | `POST /api/user/get-user-credits` | 不扣 | 内部 DB 读取 |
| 带 `DailyClaimButton` 的区域 | `POST /api/user/daily-claim` | 不扣；这是加积分，不是消耗 | 内部 DB / 配置读取 |
| 已登录用户头像菜单 | `POST /api/support/contact` | 不扣 | 邮件 provider |
| 带 `NotificationBellButton` 的区域 | `POST /api/notifications/unread-count` | 不扣 | 内部 DB |

### 公开页面

| 页面 / 页面组 | API | 用户积分 | 平台 API 成本 |
| --- | --- | --- | --- |
| `/` | `GET /api/user/get-viewer-info` | 不扣 | 内部 viewer / credits / guest quota 读取 |
| `/` | `POST /api/ai/generate` | 登录用户图片生成才扣；默认 `paid 5`，非 VIP 默认 `8`；全量区间 `3-30 / 次` | KIE 图片 provider |
| `/` | `POST /api/ai/query` | 不扣 | KIE 图片 provider 任务轮询 |
| `/` | `POST /api/ai/guest-image-generate` | 不扣账户积分；消耗 guest quota，默认 `8 / 次` | KIE 图片 provider |
| `/` | `POST /api/ai/guest-image-query` | 不扣 | KIE 图片 provider 任务轮询 |
| `/` | `POST /api/ai/translate-prompt` | 不扣 | OpenRouter：主模型 `openai/gpt-5-mini`，fallback `google/gemini-2.5-flash` |
| `/` | `POST /api/user/ai-tasks/recent` | 不扣 | 内部 DB |
| `/` | `POST /api/user/ai-tasks/batch-refresh` | 不扣 | KIE / Seedance provider 轮询；Seedance 失败任务可能触发 fallback 重派单，但不会再次扣用户积分 |
| `/` | `POST /api/user/ai-tasks/delete` | 不扣 | 内部 DB |
| `/` | `POST /api/storage/presign` | 不扣 | R2 / S3 signed upload |
| `/` | `POST /api/storage/complete` | 不扣 | R2 / S3 metadata / sample / delete 校验 |
| `/` | `POST /api/storage/upload-image` | 不扣 | R2 / S3 直传 fallback |
| `/` | `POST /api/payment/checkout` | 不扣 | 支付 provider |
| `/` | `GET /api/payment/check-status` | 不扣 | 支付 provider session 查询 |
| `/ai-image-generator` | 与 `/` 的图片工作台 API 相同 | 与 `/` 相同；默认 mode 改成 `text-to-image`，默认成本仍是 `guest/free 8`、`paid 5` | 与 `/` 相同 |
| `/ai-video-generator` | `GET /api/user/get-viewer-info` | 不扣 | 内部 viewer / credits / guest quota 读取 |
| `/ai-video-generator` | `POST /api/ai/generate` | 登录用户视频生成才扣；默认 `150 / 次`；按视频公式浮动 | Seedance provider |
| `/ai-video-generator` | `POST /api/ai/query` | 不扣 | Seedance provider 任务轮询 |
| `/ai-video-generator` | `POST /api/ai/translate-prompt` | 不扣 | OpenRouter：主模型 `openai/gpt-5-mini`，fallback `google/gemini-2.5-flash` |
| `/ai-video-generator` | `POST /api/ai/rewrite-prompt` | 不扣 | OpenRouter：主模型 `openai/gpt-5-mini`，fallback `google/gemini-2.5-flash` |
| `/ai-video-generator` | `POST /api/storage/presign` | 不扣 | R2 / S3 signed upload |
| `/ai-video-generator` | `POST /api/storage/complete` | 不扣 | R2 / S3 metadata / sample / delete 校验 |
| `/ai-video-generator` | `POST /api/storage/upload-image` | 不扣 | R2 / S3 直传 fallback |
| `/ai-video-generator` | `POST /api/storage/upload-media` | 不扣 | R2 / S3 直传 fallback |
| `/ai-video-generator` | `POST /api/payment/checkout` | 不扣 | 支付 provider |
| `/ai-video-generator` | `GET /api/payment/check-status` | 不扣 | 支付 provider session 查询 |
| `/ai-video-generator/text-to-video` | 与 `/ai-video-generator` 共用 `VideoWorkspace` | 默认 `150 / 次` | 与 `/ai-video-generator` 相同 |
| `/ai-video-generator/image-to-video` | 与 `/ai-video-generator` 共用 `VideoWorkspace` | 默认 `150 / 次` | 与 `/ai-video-generator` 相同 |
| `/ai-video-generator/reference-to-video` | 与 `/ai-video-generator` 共用 `VideoWorkspace` | 默认 `150 / 次`；带视频参考时默认 `195 / 次` | 与 `/ai-video-generator` 相同 |
| `/pricing` | `POST /api/payment/checkout` | 不扣 | 支付 provider |
| `/pricing` | `GET /api/payment/check-status` | 不扣 | 支付 provider session 查询 |
| `/free-tools`、`/free-tools/*` | 无独占页面级 API；只继承共享壳层 API | 不扣 | 无页面级第三方成本；工具处理在浏览器本地完成 |
| `/mission` | 无独占页面级 API；只继承共享壳层 API | 不扣 | 无页面级第三方成本 |
| `/privacy-policy`、`/terms-of-service`、`/refund-policy`、`/acceptable-use-policy`、`/content-moderation-policy`、`/ai-wrapper-disclaimer` | 无独占页面级 API；只继承共享壳层 API | 不扣 | 无页面级第三方成本 |
| `/sign-in`、`/sign-up`、`/forgot-password`、`/reset-password` | `GET|POST /api/auth/[...all]`；`GET /api/config/get-configs` | 不扣 | `config` 为内部；`auth` 可能触发邮件 provider 或 OAuth provider |

### 登录后页面

| 页面 / 页面组 | API | 用户积分 | 平台 API 成本 |
| --- | --- | --- | --- |
| `/activity/ai-tasks` | `POST /api/user/ai-tasks/batch-refresh` | 不扣 | KIE / Seedance provider 轮询；Seedance 失败任务可能 fallback 重派单，但不会再次扣用户积分 |
| `/activity/notifications` | `POST /api/notifications/mark-read` | 不扣 | 内部 DB |
| `/settings/profile` | `POST /api/storage/presign` | 不扣 | R2 / S3 signed upload |
| `/settings/profile` | `POST /api/storage/complete` | 不扣 | R2 / S3 metadata / sample / delete 校验 |
| `/settings/profile` | `POST /api/storage/upload-image` | 不扣 | R2 / S3 直传 fallback |
| `/settings/security` | `GET|POST /api/auth/[...all]` | 不扣 | auth；重置密码邮件可能走邮件 provider |
| `/settings/billing`、`/settings/credits`、`/settings/payments` | 无页面级 `/api` route；SSR 直读 | 不扣 | 内部读取 |
| `/settings/billing/cancel` | 无页面级 `/api` route；server action 直连 payment service | 不扣 | 支付 provider |
| `/settings/billing/retrieve` | 无页面级 `/api` route；服务端查询 billing portal 后 `redirect()` | 不扣 | 支付 provider |
| `/settings/invoices/retrieve` | 无页面级 `/api` route；服务端查询 invoice URL 后 `redirect()` | 不扣 | 支付 provider |
| `/certificate` | `GET /api/certificate/download` | 不扣 | 内部订阅读取 + 本地 PDF 渲染 |

### 后台页

| 页面 / 页面组 | API | 用户积分 | 平台 API 成本 |
| --- | --- | --- | --- |
| `/admin/ai-tasks` | `POST /api/admin/ai-tasks/batch-refresh` | 不扣 | KIE / Seedance provider 轮询；Seedance 失败任务可能 fallback 重派单，但不会再次扣用户积分 |
| 其他 `/admin/*` | 无独占页面级 `/api`，或只打 `POST /api/notifications/unread-count` | 不扣 | 基本为内部 DB / SSR；`unread-count` 为内部 DB |

## 一眼结论

| 项目 | 结论 |
| --- | --- |
| 真正扣账户积分的 API | 只有登录态生成链路里的 `POST /api/ai/generate` |
| 不扣账户积分但会消耗额度的 API | `POST /api/ai/guest-image-generate` |
| 有平台 AI 成本但不扣用户积分的 API | `POST /api/ai/query`、`POST /api/user/ai-tasks/batch-refresh`、`POST /api/admin/ai-tasks/batch-refresh`、`POST /api/ai/translate-prompt`、`POST /api/ai/rewrite-prompt` |
| 有平台非 AI 成本的 API | `POST /api/storage/presign`、`POST /api/storage/complete`、`POST /api/storage/upload-image`、`POST /api/storage/upload-media`、`POST /api/payment/checkout`、`GET /api/payment/check-status`、`POST /api/support/contact` |
| 当前不该误判为扣积分的 API | `get-user-info`、`get-user-credits`、`recent`、`delete`、`mark-read`、`unread-count`、`certificate/download` |

## 真相源

- `readurl.md`
- `src/config/ai-model-registry.ts`
- `src/extensions/ai/seedance/types.ts`
- `src/shared/models/ai_task.ts`
- `src/app/api/ai/generate/route.ts`
- `src/app/api/ai/guest-image-generate/route.ts`
- `src/shared/blocks/generator/image-workspace.tsx`
- `src/shared/blocks/generator/video-workspace.tsx`
- `src/shared/services/prompt-translation.ts`
- `src/shared/services/prompt-rewrite.ts`
