---
name: brand-domain-cutover
description: Use when cloning this repository into a new public product and replacing brand, domain, repository URL, support mailbox, and visual identity before touching deeper business modules.
---

# Brand Domain Cutover

参考文档：[品牌域名与仓库迁移](../矩阵/02-品牌域名与仓库迁移.md)

## 输入

- `new_app_name`
- `new_app_url`
- `new_support_email`
- `new_repository_url`
- 新 logo / favicon / Open Graph 资源

## 必看文件

- `package.json`
- `src/shared/lib/brand.ts`
- `src/shared/lib/site-visuals.ts`
- `src/shared/lib/site-icons.ts`
- `README.md`
- `readurl.md`
- `public/*`

## 执行步骤

1. 全仓搜索旧品牌 token。

```bash
rg -n "Image Editor AI|imageeditorai\.net|support@imageeditorai\.net|CharlieLZ/imageeditorai\.net" .
```

2. 先改 `package.json` 和 `src/shared/lib/brand.ts`，让运行时 token 与仓库元信息先对齐。
3. 再改 `site-visuals.ts`、`site-icons.ts` 和 `public/` 里的静态资源。
4. 再改 README、路由台账、法律页、landing copy、pricing copy。
5. 重新跑一遍 grep，确认旧 token 只剩有意保留的注释或历史说明。

## 验证

- 首页 title / description 已变成新品牌
- `sitemap.xml` 和 `llm*.txt` 不再输出旧域名
- favicon、manifest、share image 都已切换

## 停止条件

以下任一情况出现时，不要继续往下跑：

- 你还没确定新域名，却已经开始改 canonical host
- 新 logo 资源没准备好
- 全仓 grep 后旧品牌残留过多但没有分类处理计划
