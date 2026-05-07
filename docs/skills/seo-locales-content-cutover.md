---
name: seo-locales-content-cutover
description: Use when public page metadata, route discoverability, locale copy, legal pages, and search-facing assets must be rewritten for a new brand or narrower product scope.
---

# SEO Locales Content Cutover

参考文档：[SEO、路由、内容与多语言迁移](../矩阵/08-SEO、路由、内容与多语言迁移.md)

## 输入

- 要保留的公开页面
- 要保留的语言
- 新品牌的 SEO 定位

## 必看文件

- `readurl.md`
- `src/middleware.ts`
- `src/config/website/public-page-metadata.ts`
- `src/shared/lib/site-discovery.ts`
- `src/config/locale/index.ts`
- `src/config/locale/messages/*`

## 执行步骤

1. 先定义保留哪些 indexable 页面、哪些 noindex 页面、哪些直接删除。
2. 再同步修改 `readurl.md`、metadata、sitemap、robots、`middleware.ts`。
3. 再处理 locale 范围和全部文案文件。
4. 最后重新扫描旧品牌、旧域名和旧路径残留。

## 验证

- sitemap 只输出目标页面
- locale alternates 正确
- `llm.txt` `llms.txt` `llms-full.txt` 内容匹配新品牌
- 其他语言不再残留旧文案

## 停止条件

- 路由还没定，就开始翻译所有语言
- 公开页面删了，但 `readurl.md` 和 sitemap 还没改
