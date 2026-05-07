---
name: auth-admin-cutover
description: Use when the new project keeps login, user workspace, or admin surfaces and needs its auth providers, user flows, and permission surfaces aligned with the new product scope.
---

# Auth Admin Cutover

参考文档：[认证、用户与后台迁移](../矩阵/05-认证、用户与后台迁移.md)

## 输入

- 是否保留登录体系
- 是否保留后台
- OAuth provider 清单
- 是否保留积分、通知、证书

## 必看文件

- `src/core/auth/*`
- `src/config/db/schema.ts`
- `src/app/[locale]/(auth)/*`
- `src/app/[locale]/(admin)/*`
- `src/shared/services/guest-viewer.ts`
- `src/shared/models/credit.ts`
- `scripts/assign-role.ts`
- `read-checking-list.md`

## 执行步骤

1. 明确新项目保留哪些登录方式。
2. 配置 `AUTH_SECRET`、`AUTH_URL`、OAuth keys。
3. 如果保留 Google One Tap，确认 `GOOGLE_ONE_TAP_ENABLED`、Google client id、server availability 和前端 prompt 链路。
4. 检查用户相关表和后台页面是否仍符合新业务。
5. 配置或复查首个管理员：`scripts/assign-role.ts --email=<email> --role=super_admin`。
6. 如果保留积分，确认注册赠送积分和 guest quota：
   - `INITIAL_CREDITS_ENABLED=true`
   - `INITIAL_CREDITS_AMOUNT`
   - 登录后仍保留浏览器 guest 免费额度
7. 删除或关闭不需要的后台入口、证书入口、旧权限入口。
8. 逐一验证登录、注册、退出、回调、重置密码。

## 验证

- 登录流程不跳回旧域名
- 关闭的后台入口不会继续暴露在导航里
- 邮件模板与品牌一致
- 新用户注册赠送积分到账
- 登录用户仍能使用 guest 免费额度，且不扣账号 credits
- Settings / Business Certificate 这类复用壳页面导航状态正确

## 停止条件

- 新项目不需要后台，但你还没决定是删掉还是保留
- OAuth 还没申请新域名回调地址
- 无法确认首个管理员邮箱
- 无法确认初始积分策略或 guest quota 是否保留
