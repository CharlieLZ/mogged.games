---
name: env-runtime-mapping
description: Use when a new project needs its own environment variable inventory, Cloudflare vars, secrets, and provider toggles without carrying placeholder values from this repository.
---

# Env Runtime Mapping

参考文档：[环境变量与运行时配置](../矩阵/03-环境变量与运行时配置.md)

## 输入

- 模块开关清单
- 各 provider 的真实密钥
- Cloudflare vars / secrets 写入权限

## 必看文件

- `src/config/index.ts`
- `scripts/verify-env.ts`
- `wrangler.jsonc`
- `scripts/setup-cf-vars.mjs`
- `scripts/setup-cf-secrets.sh`
- `read-checking-list.md`

## 执行步骤

1. 从 `src/config/index.ts` 抽出所有当前项目会读的 env key。
2. 按必填 / 可选 / 已关闭模块三类整理映射表。
3. 明确哪些值放本地 `.env`，哪些值放 Cloudflare `[vars]`，哪些放 secrets。
4. 对于不需要的模块，直接关闭 flag，不要保留假值。
5. 对“开关 + key/amount”成对配置逐项检查：
   - `GOOGLE_AUTH_ENABLED` / `GOOGLE_ONE_TAP_ENABLED` + Google client keys
   - `STRIPE_ENABLED` / `DEFAULT_PAYMENT_PROVIDER` + Stripe keys
   - `INITIAL_CREDITS_ENABLED` + `INITIAL_CREDITS_AMOUNT`
   - `CONTACT_NOTIFICATION_EMAIL` / `ADMIN_NOTIFICATION_EMAIL` + email provider
6. 新增 plain-text runtime key 时，同步 `wrangler.jsonc` 和 `scripts/setup-cf-vars.mjs`。
7. 新增 secret key 时，同步 `scripts/setup-cf-secrets.sh`。
8. 同步 `read-checking-list.md` 的 env/key 总盘点和常见事故条目。
9. 运行：

```bash
pnpm verify:env
```

10. 逐条清掉 errors，再解释剩余 warnings 是否合理。

## 验证

- `pnpm verify:env` 无 error
- `pnpm build` 能通过
- 关键回调域名与支付域名已更新
- Worker runtime vars / secrets 已写入 Cloudflare，不只是本地 `.env` 已更新
- `read-checking-list.md` 已同步新增 key 和排障规则

## 停止条件

- 无法确认某个 provider 是否继续启用
- 没拿到真实 secrets，却已经计划上线 production
- 只能确认本地 `.env`，不能确认 Cloudflare Worker runtime bindings
