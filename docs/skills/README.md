# 模板迁移 Skills

这些文件不是仓库运行时代码，而是给代理或未来的你直接执行的 **迁移 skill 说明书**。  
它们和 [../矩阵/README.md](../矩阵/README.md) 的关系是：

- `docs/矩阵` 讲模块真相
- `docs/skills` 讲执行顺序

## 使用原则

1. 一次只跑一个 skill。
2. 每个 skill 都先确认输入，再改代码。
3. 每跑完一个 skill，都要做 grep 和验证，不要一口气全改完再看。
4. 默认不提交 `.env`、`.env-ref`、`.env.example`。
5. 涉及部署、env、支付、认证、积分、通知时，必须同步更新 [read-checking-list.md](../../read-checking-list.md)。
6. Cloudflare Worker runtime 是线上真相源；本地 `.env` 有值不等于生产 Worker 有值。

## 推荐执行顺序

1. [brand-domain-cutover](./brand-domain-cutover.md)
2. [env-runtime-mapping](./env-runtime-mapping.md)
3. [cloudflare-repo-bootstrap](./cloudflare-repo-bootstrap.md)
4. [auth-admin-cutover](./auth-admin-cutover.md)
5. [ai-workflow-cutover](./ai-workflow-cutover.md)
6. [business-integrations-cutover](./business-integrations-cutover.md)
7. [seo-locales-content-cutover](./seo-locales-content-cutover.md)
8. [full-template-launch](./full-template-launch.md)

## 所有 skill 的公共输入

每次新项目至少先准备这张输入表：

- 新品牌名
- 新域名
- 新支持邮箱
- 新 GitHub 仓库 URL
- Cloudflare Worker 项目名
- 是否保留图片工作台
- 是否保留视频工作台
- 是否保留后台
- 是否保留支付
- 是否保留多语言
- 要启用的 provider 列表
- 要进入 Cloudflare plain-text vars 的 key 列表
- 要进入 Cloudflare secrets 的 key 列表
- 初始积分、guest quota、管理员收件人、contact 收件人策略

没有这张表，就不要让 agent 直接开始“全仓替换”。
