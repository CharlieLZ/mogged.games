---
name: full-template-launch
description: Use when a newly cloned project must be fully cut over from this repository into a launch-ready product with updated branding, config, integrations, SEO, and Cloudflare deployment.
---

# Full Template Launch

参考文档：[上线验收与复制清单](../矩阵/09-上线验收与复制清单.md)

## 目标

在你已经买好域名、建好 GitHub 仓库之后，把当前模板完整切成一个新的可上线项目。

## 前置输入

- 新品牌映射表
- 新域名
- Cloudflare 项目权限
- 数据库与 provider 密钥
- 模块保留清单

## 执行顺序

1. 跑 [brand-domain-cutover](./brand-domain-cutover.md)
2. 跑 [env-runtime-mapping](./env-runtime-mapping.md)
3. 跑 [cloudflare-repo-bootstrap](./cloudflare-repo-bootstrap.md)
4. 跑 [auth-admin-cutover](./auth-admin-cutover.md)
5. 跑 [ai-workflow-cutover](./ai-workflow-cutover.md)
6. 跑 [business-integrations-cutover](./business-integrations-cutover.md)
7. 跑 [seo-locales-content-cutover](./seo-locales-content-cutover.md)

## 最终验证命令

```bash
pnpm verify:env
pnpm release:gate
pnpm lint:strict
pnpm typecheck
pnpm test:unit
pnpm build
pnpm cf:build
```

`pnpm release:gate` 已包含 strict lint、typecheck、unit test、frontmatter check；保留单项命令是为了排障时拆开看。

## 发布前人工检查

- 首页、Pricing、AI Image、AI Video、登录页、Mission 页
- 支付
- 上传
- 生成
- 注册赠送积分
- 登录后 guest 免费额度
- support/contact 表单
- 管理员权限和 Settings/Certificate 导航状态
- sitemap / robots / llm 路由
- favicon / 分享图 / footer 链接

## 完成定义

以下条件全部满足，才算可以推送到新仓库并让 Cloudflare 自动发布：

- 旧品牌、旧域名、旧仓库 URL 已清理
- 必要 env 和 secrets 已配置
- Worker runtime vars / secrets 已按 `read-checking-list.md` 复核
- 关键业务链路已走通
- SEO 与 locale 真相和代码一致
- 构建和测试已通过
