# Image Editor AI 模板迁移矩阵

这套文档的目标，不是把当前仓库伪装成“万能 SaaS 模板”，而是把它整理成一套可以稳定复制、稳定删减、稳定上线的 **AI 媒体产品模板**。

适用前提：

- 技术栈继续使用 Next.js + OpenNext + Cloudflare Workers
- 公共站点继续保留 SEO 页面、工作台、支付、用户、后台这条主干
- 新项目允许在当前模块上做删减，但不建议先做大重构再迁移

## 模板边界

这个模板当前真实包含：

- 公开站点与 SEO 页面
- AI 视频工作台与 AI 图片工作台
- 多语言路由与文案
- 用户认证、积分、支付、任务历史
- Cloudflare Workers、Hyperdrive、R2/S3、邮件、通知、分析、客服、联盟营销扩展

这个模板当前不应该被重新发明成：

- 公开博客系统
- 旧图片优先公开链路
- 抽象过度的“万能工具模块”
- 与当前目录职责不一致的二次框架

## 真相源

开始复制前，先看这些文件：

- `README.md`
- `AGENTS.md`
- `read-checking-list.md`
- `readurl.md`
- `src/shared/lib/brand.ts`
- `src/config/index.ts`
- `src/config/locale/index.ts`
- `src/config/website/public-page-metadata.ts`
- `src/middleware.ts`
- `wrangler.toml.example`

## 文档地图

| 文档 | 解决什么问题 |
| --- | --- |
| [00-上线检查清单深度版](./00-上线检查清单深度版.md) | 给 AI Web SaaS 上线前的产品、支付、AI、安全、监控做一份更严格的总检查 |
| [01-模板定位与复制策略](./01-模板定位与复制策略.md) | 先定义什么该复制、什么该删、什么不能抽象过头 |
| [02-品牌域名与仓库迁移](./02-品牌域名与仓库迁移.md) | 换品牌、域名、仓库、Logo、分享图、canonical host |
| [03-环境变量与运行时配置](./03-环境变量与运行时配置.md) | 盘点 env、开关和 Cloudflare runtime vars / secrets |
| [04-Cloudflare、数据库与发布链路](./04-Cloudflare、数据库与发布链路.md) | 接 GitHub、配 Worker、Hyperdrive、路由、数据库 schema |
| [05-认证、用户与后台迁移](./05-认证、用户与后台迁移.md) | Better Auth、用户模型、后台、积分、证书、权限 |
| [06-AI工作流与Provider迁移](./06-AI工作流与Provider迁移.md) | Seedance / KIE、五个工作流入口、样例媒体、任务链路 |
| [07-存储、支付与业务集成迁移](./07-存储、支付与业务集成迁移.md) | R2/S3、Stripe/Creem/PayPal、邮件、通知、客服、增长扩展 |
| [08-SEO、路由、内容与多语言迁移](./08-SEO、路由、内容与多语言迁移.md) | sitemap、robots、页面 canonical、内容页、多语言、llms 路由 |
| [09-上线验收与复制清单](./09-上线验收与复制清单.md) | 把每次新项目复制流程固定成可复查的清单 |

## 推荐迁移顺序

0. 先用上线检查清单倒推最小上线标准，明确什么必须有、什么不能带病上线。
1. 先做模板定位，决定保留哪些模块。
2. 再做品牌、域名、仓库替换。
3. 然后整理 env、运行时配置和 Cloudflare 项目。
4. 再确认数据库 schema、认证、支付、AI provider、存储。
5. 最后处理 SEO、内容、本地化和上线验收。

部署或线上排障时，先对照根目录 [read-checking-list.md](../../read-checking-list.md)。它按 git 历史归纳了 Cloudflare Worker env 漂移、支付 provider 注册、Google One Tap、注册赠送积分、guest quota、support/contact、analytics、AI provider 等高频事故。

## 模块矩阵

| 模块 | 代码真相源 | 迁移时的主要动作 |
| --- | --- | --- |
| 品牌与域名 | `src/shared/lib/brand.ts` `package.json` | 替换品牌 token、仓库 URL、支持邮箱、canonical host |
| SEO 与公开页面 | `readurl.md` `src/config/website/public-page-metadata.ts` | 确认可索引页、noindex 页、canonical 规则 |
| 多语言 | `src/config/locale/index.ts` `src/config/locale/messages/*` | 决定保留语言、补齐文案、校验 live/planned/backlog |
| 认证与用户 | `src/core/auth/*` `src/config/db/schema.ts` | 配 Auth Secret、OAuth、用户表、会话、角色权限 |
| AI 工作流 | `src/shared/services/seedance.ts` `src/shared/services/kie-image.ts` | 绑定 provider、调整工作流命名、验证生成/查询 |
| 存储 | `src/shared/services/storage.ts` `src/extensions/storage/*` | 选择 R2/S3、确认上传、回放、presign、公共域名 |
| 支付 | `src/extensions/payment/*` `src/shared/services/payment.ts` | 选支付商、商品映射、回调、Webhook、前端结账 |
| 增长扩展 | `src/extensions/analytics/*` 等 | 按需启用分析、客服、联盟、广告、通知 |
| 部署 | `wrangler.toml.example` `open-next.config.ts` | 接 Cloudflare、配 vars/secrets、绑定 GitHub 自动发布 |

补充：当前真实部署配置还包括 `wrangler.jsonc`、`scripts/setup-cf-vars.mjs`、`scripts/setup-cf-secrets.sh` 和 Cloudflare Dashboard Worker bindings。不要只看 `wrangler.toml.example`。

## 和 `docs/skills` 的关系

`docs/矩阵` 负责讲清楚“模块真相”和“迁移步骤”；`docs/skills` 负责把这些步骤拆成可以直接交给代理执行的 skill。

推荐按这个顺序使用 skill：

1. `brand-domain-cutover`
2. `env-runtime-mapping`
3. `cloudflare-repo-bootstrap`
4. `ai-workflow-cutover`
5. `business-integrations-cutover`
6. `seo-locales-content-cutover`
7. `full-template-launch`
