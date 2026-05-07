# mogged

这个仓库维护的是 **mogged** 的公开站点，以及按媒体类型拆开的托管生成工作台。

- 品牌：`mogged`
- 默认公开域名：`https://mogged.games`
- 仓库：`https://github.com/CharlieLZ/mogged.games`
- 完整 URL / 页面 / API 台账见 [readurl.md](./readurl.md)
- 页面 -> API -> 用户积分 -> 平台 API 成本矩阵见 [docs/page-api-credit-cost-matrix.md](./docs/page-api-credit-cost-matrix.md)
- 部署 / 支付 / Cloudflare 排障检查清单见 [read-checking-list.md](./read-checking-list.md)

## 当前系统边界

- 公开站：
  首页、Pricing、AI Video Generator、AI Image Generator、Free Tools 索引、法律与 Mission 页面
- 托管视频工作台：
  只服务 Seedance 2.0 视频链路
- 托管图片工作台：
  当前走 KIE 图片链路
- 公开工作流入口：
  - `text-to-video`
  - `image-to-video`
  - `reference-to-video`
  - `text-to-image`
  - `image-to-image`
- 私有业务链路：
  认证、支付、积分、AI 任务创建/轮询/回调、Cloudflare R2 / S3 上传与文件回放、通知、证书、后台管理

## Cloudflare 部署真相

- 当前生产默认发布链路是：**Cloudflare Workers 侧直接绑定 GitHub 仓库**，目标分支有新提交后会由 Cloudflare 侧自动拉取并发布
- 所以仓库里**没有 GitHub Actions workflow 也不代表没有自动发布**；这个绑定关系在 Cloudflare Dashboard，不在 repo 内声明
- `pnpm cf:deploy` 仍然保留，但它的定位是：本地手动补发、排障验证、或在 Cloudflare 自动发布异常时人工兜底；不要把它和默认生产发布路径混成一件事
- `pnpm build` / `pnpm cf:build` 之后，`.open-next/cloudflare/next-env.mjs` 会被清空；本地 `.env` 不会随构建产物自动进入 Worker 运行时
- Cloudflare Worker 线上值必须来自 `[vars]`、`wrangler secret put` 或后台 runtime settings，不要把“本地 `.env` 里有值”当成上线完成
- 自动部署和本地 `wrangler` 发布会读取仓库里的 `wrangler.jsonc`；如果这里缺 plain-text vars，下一个 deploy 会把 Worker 上同名 plain-text 绑定一并冲掉
- `wrangler.toml.example` 只是本地参考模板；真实 `wrangler.toml` 仍在 `.gitignore` 里，手动部署时要把 `wrangler.jsonc` 里的 analytics vars 一起带上
- plain-text vars 可用 `pnpm cf:vars:sync` 从本地 `.env` 补齐；它会优先使用 `CLOUDFLARE_WORKER_SECRETS_API_TOKEN`，secret 继续用 `pnpm cf:secrets:sync`
- 当前 analytics canonical runtime keys：
  - `GOOGLE_ANALYTICS_ID`
  - `PLAUSIBLE_DOMAIN`
  - `PLAUSIBLE_SRC`
- 当前 analytics public compatibility keys：
  - `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
  - `NEXT_PUBLIC_DOMAIN`
  - `NEXT_PUBLIC_PLAUSIBLE_URL`
  - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
  - `NEXT_PUBLIC_PLAUSIBLE_SCRIPT`

## 当前公开页面真相

### 核心 canonical 页面

- `/`
- `/pricing`
- `/ai-video-generator`
- `/ai-image-generator`

说明：

- 视频 3 个工作流统一收口到 `/ai-video-generator`
- `/ai-video-generator?mode=text-to-video`、`/ai-video-generator?mode=image-to-video`、`/ai-video-generator?mode=reference-to-video`
  只是工作台状态入口，不是独立可索引页面
- 图片工作流当前只保留 `/ai-image-generator` 这个 canonical 页面
- `/ai-image-generator?mode=text-to-image` 与 `/ai-image-generator?mode=image-to-image` 只是工作台默认模式入口，不是独立可索引页面

### Free Tools

公开可访问，但当前统一 `noindex`，也不进入 sitemap：

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

### 公开内容页

- `/mission`

### 公开 noindex 内容页

- `/privacy-policy`
- `/terms-of-service`
- `/refund-policy`
- `/acceptable-use-policy`
- `/content-moderation-policy`
- `/ai-wrapper-disclaimer`

### noindex / 工作台 / 后台页

- 公共 noindex 页：
  `free-tools/*`、`privacy-policy`、`terms-of-service`、`refund-policy`、`acceptable-use-policy`、`content-moderation-policy`、`ai-wrapper-disclaimer`
- 认证页：
  `/sign-in`、`/sign-up`、`/forgot-password`、`/reset-password`
- 用户工作台：
  `/activity/*`、`/settings/*`、`/certificate*`
- 后台：
  `/admin/*`

## 页面与 API 耦合速览

### 共享壳层 API

所有 `src/app/[locale]/*` 页面都会共享这组 client runtime：

- `GET /api/config/get-configs`
- `GET|POST /api/auth/[...all]`
- `POST /api/user/get-user-info`
- `POST /api/user/get-user-credits`

### 图片工作台页

`/` 与 `/ai-image-generator` 共用 `ImageWorkspace`，会涉及：

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

### 视频工作台页

`/ai-video-generator` 与它的 3 个 mode 子页共用 `VideoWorkspace`，会涉及：

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

- guest 图片有独立 `/api/ai/guest-image-*`
- 当前没有独立 guest video create/query route

### 定价、通知、支持与证书

- `/pricing` 复用：
  `POST /api/payment/checkout`、`GET /api/payment/check-status`
- `/activity/ai-tasks`：
  `POST /api/user/ai-tasks/batch-refresh`
- `/activity/notifications`：
  `POST /api/notifications/mark-read`
- `/activity/*`、`/settings/*`、`/admin/*` 的铃铛：
  `POST /api/notifications/unread-count`
- 登录用户的 header / top nav：
  `POST /api/user/daily-claim`、`POST /api/support/contact`
- `/certificate`：
  `GET /api/certificate/download`
- `/settings/profile` 头像上传：
  `POST /api/storage/presign`、`POST /api/storage/complete`、`POST /api/storage/upload-image`

### 本地浏览器工具与内容页

- `free-tools` 索引与 10 个工具页当前没有页面级 `/api/*` 调用，处理都在浏览器本地完成
- `mission` 与法律页当前没有页面级 `/api/*` 调用

## 当前明确关闭或收口的路径

- `/ai-image-generator/text-to-image`
- `/ai-image-generator/image-to-image`
  已统一回收到 `/ai-image-generator?mode=...`

- `/blog`
- `/blog/*`
  已删除，不再恢复

- `/settings/apikeys`
- `/settings/apikeys/create`
- `/settings/apikeys/{id}/edit`
- `/settings/apikeys/{id}/delete`
- `/admin/apikeys`
  当前关闭或直接 `notFound()`

## 路由文档真相源

- `src/app/`
- `src/middleware.ts`
- `src/config/website/public-page-metadata.ts`
- `src/shared/lib/discoverable-pages.ts`
- `content/pages/*.mdx`

不要把 README 当成唯一真相；README 只保留高层边界，完整页面/API 映射统一以 [readurl.md](./readurl.md) 为准。
