# Cloudflare、数据库与发布链路

## 部署真相

这个项目的默认生产发布真相是：

- **Cloudflare 侧绑定 GitHub 仓库后自动发布**

不是：

- GitHub Actions workflow
- 单独的“Workers 仓库”
- 只靠本地 `pnpm cf:deploy`

`pnpm cf:deploy` 是手动补发、排障、兜底入口。

## 真相源

- `wrangler.toml.example`
- `wrangler.jsonc`
- `scripts/setup-cf-vars.mjs`
- `scripts/setup-cf-secrets.sh`
- `read-checking-list.md`
- `open-next.config.ts`
- `src/core/db/config.ts`
- `src/config/db/schema.ts`

## Cloudflare 新项目标准步骤

### 1. 创建新的 GitHub 仓库

先把代码迁到目标仓库，再在 Cloudflare Dashboard 绑定这个新仓库。

### 2. 新建 Cloudflare Worker 项目并绑定 GitHub

建议记录：

- Worker project name
- 绑定分支
- Production 域名
- Preview 策略
- 自动发布触发分支
- Worker runtime vars / secrets 的写入方式

### 3. 复制本地 `wrangler.toml`

从：

- `wrangler.toml.example`

复制到本地忽略文件：

- `wrangler.toml`

至少改这些值：

- `name`
- `[[routes]].pattern`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_URL`
- analytics 相关 vars
- Hyperdrive binding id

同时复核 `wrangler.jsonc`：

- `keep_vars: true` 是否保留
- `routes` 是否是新域名
- 稳定 plain-text vars 是否完整
- `DEFAULT_PAYMENT_PROVIDER` / `STRIPE_ENABLED` / `INITIAL_CREDITS_ENABLED` 这类开关是否被带上
- 不要把 secret value 写进 `wrangler.jsonc`

### 4. 配数据库

当前 Drizzle/Postgres schema 默认是：

- `src/config/db/schema.ts` 里的 `pgSchema('imageeditorai_net')`

`src/core/db/config.ts` 里还有限定：

- `schemaFilter: ['imageeditorai_net']`

如果新项目要和旧项目共用同一个 Postgres 实例，强烈建议：

- 给新项目换新的 schema 名
- 同步改 `siteSchema` 和 `schemaFilter`

如果新项目用独立数据库，也建议改掉旧 schema 名，避免混淆。

### 5. 配 Hyperdrive

如果继续用 Postgres + Hyperdrive：

1. 在 Cloudflare 创建新的 Hyperdrive 连接
2. 把返回的 id 写入 `wrangler.toml`
3. 保证 `DATABASE_URL` 和 Hyperdrive 目标库一致

### 6. 配自定义域名

至少确认：

- apex 域名
- `www` 域名是否保留
- Worker route 是否与 `brand.ts` 中的 canonical host 一致

### 7. 同步 Worker runtime 配置

不要只看本地 `.env`。每次迁移或新增配置时：

1. plain-text runtime vars：同步 `wrangler.jsonc` 和 `scripts/setup-cf-vars.mjs`
2. secrets：同步 `scripts/setup-cf-secrets.sh` 并写入 Cloudflare Worker secrets
3. 数据库 config：确认非空小写 config 没有覆盖线上预期
4. 构建产物：跑 secret artifact guard

## 标准验证命令

```bash
pnpm build
pnpm cf:build
pnpm cf:preview
```

必要时再手动：

```bash
pnpm cf:deploy
```

## 验收

- Cloudflare 能从新仓库自动拉取并构建
- 新域名 route 正常生效
- 数据库 schema 指向正确
- Hyperdrive 与线上数据库连通
- preview / production 的域名、Auth 回调、支付回调一致
- Worker bindings 里关键 vars / secrets 完整，不只是本地 `.env` 完整
- 推送 `origin/main` 后 Cloudflare GitHub deploy 有触发记录

## 常见坑

- 新品牌上线了，但数据库 schema 还叫旧项目名
- 只改了 `wrangler.toml`，没改 Cloudflare Dashboard vars/secrets
- 误把 `pnpm cf:deploy` 当唯一生产发布链路
- Worker route 改了，但 `brand.ts` canonical host 没改
- `cf:vars:sync` 后线上暂时正常，但 `wrangler.jsonc` 没补稳定 vars，下一次 deploy 又漂移
- Cloudflare token 能上传 Worker script，但没有 zone route 权限，route 更新阶段 403
- Worker 线上用不到本机文件路径，例如 `GSC_SERVICE_ACCOUNT_FILE`
