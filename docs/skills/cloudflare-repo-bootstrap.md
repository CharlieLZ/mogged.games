---
name: cloudflare-repo-bootstrap
description: Use when a cloned project needs to be attached to a new GitHub repository and a new Cloudflare Workers project with correct routes, Hyperdrive bindings, and runtime settings.
---

# Cloudflare Repo Bootstrap

参考文档：[Cloudflare、数据库与发布链路](../矩阵/04-Cloudflare、数据库与发布链路.md)

## 输入

- 新 GitHub 仓库
- Cloudflare 账号权限
- 新域名
- 数据库连接信息

## 必看文件

- `wrangler.toml.example`
- `wrangler.jsonc`
- `scripts/setup-cf-vars.mjs`
- `scripts/setup-cf-secrets.sh`
- `read-checking-list.md`
- `open-next.config.ts`
- `src/core/db/config.ts`
- `src/config/db/schema.ts`

## 执行步骤

1. 确认代码已经在新 GitHub 仓库中。
2. 在 Cloudflare 新建 Worker 项目并绑定新仓库。
3. 复制 `wrangler.toml.example` 为本地 `wrangler.toml`，更新 `name`、`routes`、`vars`、Hyperdrive binding。
4. 复核 `wrangler.jsonc` 的 `keep_vars`、routes、稳定 plain-text vars。
5. 如果用 Postgres，决定是否更换 `pgSchema('imageeditorai_net')` 及 `schemaFilter`。
6. 在 Cloudflare 写入 vars / secrets，不要只改本地 `.env`。
7. 对照 `read-checking-list.md` 检查支付、auth、初始积分、contact、analytics、AI provider、storage 的 Worker runtime key 是否完整。
8. 本地跑：

```bash
pnpm cf:build
pnpm cf:preview
```

9. 必要时手动：

```bash
pnpm cf:deploy
```

## 验证

- Cloudflare 能从新仓库自动构建
- 新域名路由正确
- 数据库 schema 与 Hyperdrive 指向正确
- 推送 `origin/main` 后 Cloudflare GitHub deploy 能触发
- Worker bindings 能看到关键 vars / secrets
- `/api/health` 线上返回 200

## 停止条件

- Cloudflare 仍然绑定旧仓库
- 生产域名、Auth URL、Worker routes 三者不一致
- 只能手动 deploy，GitHub 自动发布链路还没打通
- Cloudflare token 缺少需要的 Worker settings/secrets/route 权限
